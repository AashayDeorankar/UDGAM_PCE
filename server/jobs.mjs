/**
 * server/jobs.mjs — PS-11 Job & Application REST endpoints
 * All data persisted in Firestore via Firebase Admin SDK.
 *
 * Endpoints:
 *   POST   /api/jobs/create           — recruiter creates job
 *   GET    /api/jobs                  — list OPEN jobs (students)
 *   GET    /api/jobs/:id              — job details
 *   POST   /api/jobs/:id/apply        — student applies (multipart/form-data, resume PDF)
 *   GET    /api/jobs/:id/applicants   — recruiter views applicants
 *   POST   /api/jobs/:id/analyze      — run AI analysis (batch, per-application)
 *   GET    /api/jobs/:id/shortlist    — fetch stored shortlist
 *   POST   /api/jobs/:id/shortlist    — generate + store shortlist
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  analyzeJD,
  extractEvidence,
  extractResumeText,
  matchCandidate,
  detectNoise,
  generateShortlist,
  normalizeSkillList,
  parseMultipartResume,
} from "./recruitment.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_FILE = join(__dirname, ".jobs-store.json");

// ─── Env & Firestore Admin ────────────────────────────────────────────────────

function loadEnv() {
  for (const p of [join(process.cwd(), ".env"), join(__dirname, "..", ".env")]) {
    try { const c = readFileSync(p, "utf-8"); for (const l of c.split("\n")) { const m = l.match(/^([A-Za-z_]\w*)\s*=\s*(.*)/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim(); } } catch (_) {}
  }
}
loadEnv();

let _adminApp = null;
let _db = null;

async function getAdminDb() {
  if (_db) return _db;
  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    loadEnv();

    if (!_adminApp) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

      if (!serviceAccountJson && !projectId) {
        return null; // Firebase not configured — use fallback store
      }

      const existingApps = getApps();
      if (existingApps.length > 0) {
        _adminApp = existingApps.find((a) => a.name === "jobs") || existingApps[0];
      } else {
        const credential = serviceAccountJson
          ? cert(JSON.parse(serviceAccountJson))
          : undefined;
        _adminApp = initializeApp(
          credential ? { credential, projectId } : { projectId },
          "jobs"
        );
      }
    }
    _db = getFirestore(_adminApp);
    return _db;
  } catch (err) {
    console.warn("[jobs] Firebase Admin unavailable, using local store:", err.message);
    return null;
  }
}

// ─── Fallback Local Store (persisted to server/.jobs-store.json) ───────────────

const MEM = {
  jobs: new Map(),
  applications: new Map(),
  candidateAnalyses: new Map(),
  analyses: new Map(),
  shortlists: new Map(),
};

function loadMemStore() {
  try {
    if (existsSync(STORE_FILE)) {
      const raw = JSON.parse(readFileSync(STORE_FILE, "utf-8"));
      for (const [key, items] of Object.entries(raw)) {
        if (!MEM[key]) MEM[key] = new Map();
        for (const [id, val] of Object.entries(items)) {
          MEM[key].set(id, val);
        }
      }
    }
  } catch (e) {
    console.warn("[jobs] Could not load local jobs store:", e.message);
  }
}

function saveMemStore() {
  try {
    const serialized = {};
    for (const [key, map] of Object.entries(MEM)) {
      serialized[key] = Object.fromEntries(map.entries());
    }
    writeFileSync(STORE_FILE, JSON.stringify(serialized, null, 2), "utf-8");
  } catch (e) {
    console.warn("[jobs] Could not save local jobs store:", e.message);
  }
}

loadMemStore();

function memId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonRes(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8") || "{}";
}

function getUserFromHeader(authHeader) {
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const parts = token.split(":");
    if (parts[0] && parts[0].startsWith("demo-")) {
      return { uid: parts[0], role: parts[1] || "student" };
    }
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1] + "==", "base64").toString());
      return { uid: payload.user_id || payload.sub || payload.uid, role: payload.role || "student", email: payload.email };
    } catch (_) {}
  }
  return null;
}

// ─── DB Abstraction ───────────────────────────────────────────────────────────

async function dbSet(collection, id, data) {
  const db = await getAdminDb();
  if (db) {
    await db.collection(collection).doc(id).set({ ...data, _id: id, id }, { merge: true });
  } else {
    if (!MEM[collection]) MEM[collection] = new Map();
    const existing = MEM[collection].get(id) || {};
    MEM[collection].set(id, { ...existing, ...data, _id: id, id });
    saveMemStore();
  }
}

async function dbGet(collection, id) {
  const db = await getAdminDb();
  if (db) {
    const snap = await db.collection(collection).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
  return MEM[collection]?.get(id) || null;
}

async function dbQuery(collection, filters = []) {
  const db = await getAdminDb();
  if (db) {
    let q = db.collection(collection);
    for (const [field, op, value] of filters) q = q.where(field, op, value);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  // In-memory: apply simple equality filters
  if (!MEM[collection]) MEM[collection] = new Map();
  const items = [...MEM[collection].values()];
  return items.filter((item) =>
    filters.every(([field, op, value]) => {
      if (op === "==") return item[field] === value;
      if (op === "array-contains") return Array.isArray(item[field]) && item[field].includes(value);
      return true;
    })
  );
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/** POST /api/jobs/create — recruiter creates a job */
export async function handleCreateJob(req, res) {
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return jsonRes(res, 400, { error: "Invalid JSON" }); }

  const { title, description, companyName, requiredSkills, preferredSkills,
    requiredExperience, preferredExperience, education, location, workMode,
    shortlistSize = 5, deadline, createdBy, recruiterName } = body;

  if (!title || !description || !companyName || !createdBy) {
    return jsonRes(res, 400, { error: "title, description, companyName, and createdBy are required" });
  }
  if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
    return jsonRes(res, 400, { error: "At least one required skill must be specified" });
  }

  const id = memId();
  const normalizedReq = normalizeSkillList(requiredSkills);
  const normalizedPref = normalizeSkillList(preferredSkills || []);

  // Analyze JD (async, but don't block creation)
  analyzeJD({ title, description, requiredSkills: normalizedReq, preferredSkills: normalizedPref, requiredExperience: requiredExperience || "", education: education || "" })
    .then(({ jdAnalysis }) => {
      if (jdAnalysis) dbSet("jobs", id, { jdAnalysis, jdAnalyzedAt: new Date().toISOString() });
    })
    .catch(() => {});

  const job = {
    id,
    title,
    description,
    companyName,
    requiredSkills: normalizedReq,
    preferredSkills: normalizedPref,
    requiredExperience: requiredExperience || "",
    preferredExperience: preferredExperience || "",
    education: education || "",
    location: location || "",
    workMode: workMode || "",
    shortlistSize: Math.max(1, Math.min(100, parseInt(shortlistSize) || 5)),
    status: "open",
    createdBy,
    recruiterName: recruiterName || "",
    deadline: deadline || null,
    applicantCount: 0,
    analyzedCount: 0,
    createdAt: new Date().toISOString(),
  };

  await dbSet("jobs", id, job);
  return jsonRes(res, 201, { job });
}

/** GET /api/jobs — list open jobs */
export async function handleListJobs(req, res) {
  try {
    const jobs = await dbQuery("jobs", [["status", "==", "open"]]);
    jobs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return jsonRes(res, 200, { jobs });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}

/** GET /api/jobs/:id — single job details */
export async function handleGetJob(req, res, jobId) {
  try {
    const job = await dbGet("jobs", jobId);
    if (!job) return jsonRes(res, 404, { error: "Job not found" });
    return jsonRes(res, 200, { job });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}

/**
 * Intelligently infer candidate name from:
 * 1. Explicit name provided (if not "Unknown", "Candidate", "demo-student", etc.)
 * 2. Top lines of resume text
 * 3. File name (e.g. Alex_Rivera_Resume.pdf -> Alex Rivera)
 * 4. Email address prefix (e.g. alex.rivera@gmail.com -> Alex Rivera)
 */
export function inferCandidateName(resumeText = "", filename = "", email = "", fallback = "") {
  // 1. Explicit name if provided and not generic
  if (fallback && typeof fallback === "string") {
    const clean = fallback.trim();
    if (clean && !/^(unknown|demo|candidate|null|undefined|applicant|student|n\/a)$/i.test(clean)) {
      return clean;
    }
  }

  // 2. Extract from resume text (first 8 lines)
  if (resumeText && typeof resumeText === "string") {
    const lines = resumeText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const line = lines[i];
      if (/^(resume|curriculum\s+vitae|cv|contact|profile|education|experience|summary|skills|objective|about\s+me)/i.test(line)) {
        continue;
      }
      if (/@|https?:\/\/|www\.|\.com|\.edu|\.org|\+|[0-9]{4}|•|\|/i.test(line)) {
        continue;
      }
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 4 && line.length >= 3 && line.length <= 36) {
        if (/^[A-Za-z][A-Za-z\s.'-]+$/.test(line) && !/^(software\s+engineer|full\s+stack|frontend|developer|student|bachelor|master|university|college|phd|fresher)/i.test(line)) {
          return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        }
      }
    }
  }

  // 3. Extract from filename (e.g. "John_Doe_Resume.pdf", "Priya-Patel-CV.pdf")
  if (filename && typeof filename === "string") {
    const base = filename.replace(/\.(pdf|docx|txt|md)$/i, "");
    const cleaned = base
      .replace(/[_\-.]+/g, " ")
      .replace(/\b(resume|cv|latest|final|updated|v\d+|application|profile|doc)\b/gi, "")
      .trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4 && /^[A-Za-z\s.'-]+$/.test(cleaned)) {
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }

  // 4. Extract from email prefix
  if (email && typeof email === "string" && email.includes("@")) {
    const prefix = email.split("@")[0].replace(/[0-9]+/g, "").trim();
    const parts = prefix.split(/[._-]+/).filter((p) => p.length >= 2);
    if (parts.length >= 2 && parts.length <= 3) {
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
    }
  }

  return "Candidate";
}

/** POST /api/jobs/:id/apply — student applies with resume PDF (multipart) */
export async function handleApply(req, res, jobId) {
  let fields, fileBuffer, fileInfo;
  try {
    ({ fields, fileBuffer, fileInfo } = await parseMultipartResume(req));
  } catch (err) {
    return jsonRes(res, 400, { error: err.message });
  }

  const rawStudentId = (fields.studentId || "").trim();
  const rawStudentName = (fields.studentName || "").trim();
  const rawStudentEmail = (fields.studentEmail || "").trim().toLowerCase();

  if (!fileBuffer || fileBuffer.length === 0) return jsonRes(res, 400, { error: "Resume file is required" });
  const allowedMimes = ["application/pdf", "text/plain", "text/markdown", "application/octet-stream"];
  if (fileInfo?.mimeType && !allowedMimes.includes(fileInfo.mimeType) && !fileInfo.filename?.match(/\.(pdf|txt|md)$/i)) {
    return jsonRes(res, 400, { error: "Resume must be a PDF or text file" });
  }

  // Check job exists
  const job = await dbGet("jobs", jobId);
  if (!job) return jsonRes(res, 404, { error: "Job not found" });
  if (job.status !== "open") return jsonRes(res, 400, { error: "Job is not accepting applications" });

  // Extract resume text first to infer name & check details
  let resumeText = "";
  try { resumeText = await extractResumeText(fileBuffer); } catch (_) {}

  // Infer real candidate name
  const candidateName = inferCandidateName(
    resumeText,
    fileInfo?.filename || "",
    rawStudentEmail,
    rawStudentName
  );

  // In demo mode or local testing, generate a distinct studentId so multiple applications succeed
  const isDemo = !rawStudentId || rawStudentId.startsWith("demo-") || rawStudentId.startsWith("guest_") || rawStudentId === "anonymous";
  const studentId = isDemo
    ? `stu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    : rawStudentId;

  // Duplicate check: prevent duplicate submissions with the same email for this job
  if (rawStudentEmail) {
    const existingByEmail = await dbQuery("applications", [
      ["jobId", "==", jobId],
      ["studentEmail", "==", rawStudentEmail],
    ]);
    if (existingByEmail.length > 0) {
      return jsonRes(res, 409, { error: "An application with this email has already been submitted for this job", applicationId: existingByEmail[0].id });
    }
  } else if (!isDemo) {
    const existingById = await dbQuery("applications", [
      ["jobId", "==", jobId],
      ["studentId", "==", rawStudentId],
    ]);
    if (existingById.length > 0) {
      return jsonRes(res, 409, { error: "You have already applied for this job", applicationId: existingById[0].id });
    }
  }

  const appId = memId();
  const studentEmail = rawStudentEmail || `${candidateName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`;
  const application = {
    id: appId,
    jobId,
    jobTitle: job.title,
    companyName: job.companyName,
    studentId,
    applicantUid: rawStudentId || studentId,
    studentName: candidateName,
    studentEmail,
    resumeText: resumeText.slice(0, 10000),
    resumeFileName: fileInfo?.filename || "resume.pdf",
    status: "applied",
    aiStatus: "pending",
    rejectionReason: null,
    decisionNotes: null,
    decidedAt: null,
    decidedBy: null,
    submittedAt: new Date().toISOString(),
  };

  await dbSet("applications", appId, application);

  // Increment applicant count
  await dbSet("jobs", jobId, { applicantCount: (job.applicantCount || 0) + 1 });

  return jsonRes(res, 201, { applicationId: appId, studentName: candidateName, message: "Application submitted successfully" });
}

/** GET /api/jobs/:id/applicants — recruiter views applicants */
export async function handleGetApplicants(req, res, jobId) {
  try {
    const [job, applications] = await Promise.all([
      dbGet("jobs", jobId),
      dbQuery("applications", [["jobId", "==", jobId]]),
    ]);

    if (!job) return jsonRes(res, 404, { error: "Job not found" });

    // Fetch analyses if available
    const analysisIds = applications.map((a) => a.id);
    const analyses = await Promise.all(analysisIds.map((id) => dbGet("candidateAnalyses", id)));
    const analysisMap = new Map();
    for (const a of analyses) if (a) analysisMap.set(a.applicationId || a.id, a);

    const enriched = applications.map((app) => {
      const analysis = analysisMap.get(app.id);
      const studentName = (app.studentName && !/^(unknown|null|undefined)$/i.test(app.studentName.trim()))
        ? app.studentName
        : (analysis?.name && !/^(unknown|null|undefined)$/i.test(analysis.name.trim()))
        ? analysis.name
        : inferCandidateName(app.resumeText, app.resumeFileName, app.studentEmail, "");
      return {
        applicationId: app.id,
        studentId: app.studentId,
        studentName,
        studentEmail: app.studentEmail,
        resumeFileName: app.resumeFileName,
        status: app.status || "applied",
        rejectionReason: app.rejectionReason || null,
        decisionNotes: app.decisionNotes || null,
        decidedAt: app.decidedAt || null,
        decidedBy: app.decidedBy || null,
        aiStatus: app.aiStatus || "pending",
        submittedAt: app.submittedAt,
        match_score: analysis?.match_score,
        noise_risk: analysis?.noise?.noise_risk,
      };
    });

    enriched.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    return jsonRes(res, 200, { job, applicants: enriched, total: enriched.length });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}

/**
 * POST /api/jobs/:id/analyze — run AI analysis on ALL pending applications.
 * Processes in batches of 5 to avoid LLM timeouts.
 * Stores results in candidateAnalyses/{applicationId}.
 */
export async function handleAnalyzeApplications(req, res, jobId) {
  try {
    const job = await dbGet("jobs", jobId);
    if (!job) return jsonRes(res, 404, { error: "Job not found" });

    // Ensure JD is analyzed
    let jdAnalysis = job.jdAnalysis;
    if (!jdAnalysis) {
      const { jdAnalysis: freshJD } = await analyzeJD({
        title: job.title,
        description: job.description,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        requiredExperience: job.requiredExperience,
        education: job.education,
      });
      jdAnalysis = freshJD;
      await dbSet("jobs", jobId, { jdAnalysis });
    }

    const applications = await dbQuery("applications", [["jobId", "==", jobId]]);
    const pending = applications.filter((a) => a.aiStatus !== "analyzed");

    if (pending.length === 0) {
      return jsonRes(res, 200, { message: "All applications already analyzed", analyzed: 0 });
    }

    let analyzed = 0;
    const errors = [];

    for (const app of pending) {
      try {
        const resumeText = app.resumeText || "";
        const candidateName = (app.studentName && !/^(unknown|null|undefined)$/i.test(app.studentName.trim()))
          ? app.studentName
          : inferCandidateName(resumeText, app.resumeFileName, app.studentEmail, "");

        // Keep application doc synchronized with inferred name
        if (!app.studentName || /^(unknown|null|undefined)$/i.test(app.studentName.trim())) {
          await dbSet("applications", app.id, { studentName: candidateName });
        }

        if (!resumeText.trim()) {
          await dbSet("candidateAnalyses", app.id, {
            applicationId: app.id,
            jobId,
            studentId: app.studentId,
            name: candidateName,
            error: "No resume text extracted",
            match_score: 0,
          });
          await dbSet("applications", app.id, { aiStatus: "error", studentName: candidateName });
          errors.push({ id: app.id, name: candidateName, error: "No resume text" });
          continue;
        }

        // Stage 3: Evidence extraction
        const evidenceResult = await extractEvidence({
          resumeText,
          jdAnalysis,
          candidateName,
        });

        // Stage 4: Noise detection
        const noiseResult = detectNoise({
          evidence: evidenceResult.evidence,
          candidateInfo: evidenceResult.candidate_info,
        });

        // Stage 5: Candidate-JD matching
        const matchResult = matchCandidate({ jdAnalysis, evidenceResult });

        const resolvedAnalysisName = candidateName || evidenceResult.candidate_info?.name || "Candidate";

        const analysisDoc = {
          applicationId: app.id,
          jobId,
          studentId: app.studentId,
          name: resolvedAnalysisName,
          ...matchResult,
          evidence: evidenceResult.evidence,
          skills_section_only: evidenceResult.skills_section_only,
          well_evidenced_skills: evidenceResult.well_evidenced_skills,
          candidate_info: evidenceResult.candidate_info,
          noise: noiseResult,
          analyzedAt: new Date().toISOString(),
        };

        await dbSet("candidateAnalyses", app.id, analysisDoc);
        await dbSet("applications", app.id, { aiStatus: "analyzed", studentName: resolvedAnalysisName });
        analyzed++;
      } catch (err) {
        errors.push({ id: app.id, name: app.studentName, error: err.message });
        await dbSet("applications", app.id, { aiStatus: "error" });
      }
    }

    // Update analyzed count on job
    const allAnalyzed = await dbQuery("applications", [["jobId", "==", jobId]]);
    const doneCount = allAnalyzed.filter((a) => a.aiStatus === "analyzed").length;
    await dbSet("jobs", jobId, { analyzedCount: doneCount });

    return jsonRes(res, 200, { analyzed, errors, total: applications.length, done: doneCount });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}

/** GET /api/jobs/:id/shortlist — fetch stored shortlist */
export async function handleGetShortlist(req, res, jobId) {
  try {
    const shortlist = await dbGet("shortlists", jobId);
    if (!shortlist) return jsonRes(res, 200, { shortlist: null });
    return jsonRes(res, 200, { shortlist });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}

/** POST /api/jobs/:id/shortlist — generate + store shortlist */
export async function handleGenerateShortlist(req, res, jobId) {
  try {
    const job = await dbGet("jobs", jobId);
    if (!job) return jsonRes(res, 404, { error: "Job not found" });

    const applications = await dbQuery("applications", [["jobId", "==", jobId]]);
    if (applications.length === 0) return jsonRes(res, 400, { error: "No applications for this job" });

    // Fetch all candidate analyses
    const analyses = await Promise.all(
      applications.map((a) => dbGet("candidateAnalyses", a.id))
    );
    const appMap = new Map(applications.map((a) => [a.id, a]));
    const candidates = analyses
      .filter(Boolean)
      .map((a) => {
        const app = appMap.get(a.applicationId || a.id);
        const resolvedName = (a.name && !/^(unknown|null|undefined)$/i.test(a.name.trim()))
          ? a.name
          : (app?.studentName && !/^(unknown|null|undefined)$/i.test(app.studentName.trim()))
          ? app.studentName
          : inferCandidateName(app?.resumeText, app?.resumeFileName, app?.studentEmail, "Candidate");
        return { ...a, name: resolvedName };
      });

    if (candidates.length === 0) {
      return jsonRes(res, 400, { error: "No analyses found. Run AI analysis first." });
    }

    const shortlist = generateShortlist({
      candidates,
      topN: job.shortlistSize || 5,
      minScore: 15,
    });

    shortlist.jobId = jobId;
    shortlist.jobTitle = job.title;
    shortlist.companyName = job.companyName;

    await dbSet("shortlists", jobId, shortlist);

    return jsonRes(res, 200, { shortlist });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}

/** GET /api/jobs/:id/analysis/:appId — single candidate analysis */
export async function handleGetCandidateAnalysis(req, res, appId) {
  try {
    const [analysis, application] = await Promise.all([
      dbGet("candidateAnalyses", appId),
      dbGet("applications", appId),
    ]);
    if (!analysis && !application) return jsonRes(res, 404, { error: "Analysis not found" });

    const merged = {
      ...(analysis || {}),
      applicationId: appId,
      jobId: analysis?.jobId || application?.jobId,
      studentId: analysis?.studentId || application?.studentId,
      name: analysis?.name || application?.studentName || "Candidate",
      status: application?.status || "applied",
      rejectionReason: application?.rejectionReason || null,
      decisionNotes: application?.decisionNotes || null,
      decidedAt: application?.decidedAt || null,
      decidedBy: application?.decidedBy || null,
    };
    return jsonRes(res, 200, { analysis: merged });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}

/** GET /api/jobs/recruiter/:uid — list jobs by recruiter */
export async function handleGetRecruiterJobs(req, res, uid) {
  try {
    let jobs;
    if (!uid || uid === "all" || uid === "demo" || uid === "demo-recruiter") {
      jobs = await dbQuery("jobs");
    } else {
      const userJobs = await dbQuery("jobs", [["createdBy", "==", uid]]);
      const demoJobs = await dbQuery("jobs", [["createdBy", "==", "demo-recruiter"]]);
      const map = new Map();
      for (const j of [...userJobs, ...demoJobs]) map.set(j.id, j);
      jobs = [...map.values()];
    }
    jobs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return jsonRes(res, 200, { jobs });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}

/** GET /api/jobs/student/:uid/applications — list student's applications */
export async function handleGetStudentApplications(req, res, uid) {
  try {
    let apps;
    if (!uid || uid === "demo-student" || uid.startsWith("demo-")) {
      const all = await dbQuery("applications");
      apps = all.filter((a) =>
        a.applicantUid === uid ||
        a.studentId === uid ||
        a.applicantUid === "demo-student" ||
        (a.studentId && a.studentId.startsWith("stu_"))
      );
    } else {
      const byStudentId = await dbQuery("applications", [["studentId", "==", uid]]);
      const byApplicantUid = await dbQuery("applications", [["applicantUid", "==", uid]]);
      const map = new Map();
      for (const a of [...byStudentId, ...byApplicantUid]) map.set(a.id, a);
      apps = [...map.values()];
    }

    const enriched = await Promise.all(
      apps.map(async (app) => {
        let jobTitle = app.jobTitle;
        let companyName = app.companyName;
        if ((!jobTitle || !companyName) && app.jobId) {
          const j = await dbGet("jobs", app.jobId);
          if (j) {
            jobTitle = jobTitle || j.title;
            companyName = companyName || j.companyName;
          }
        }
        const analysis = await dbGet("candidateAnalyses", app.id);
        return {
          ...app,
          jobTitle: jobTitle || "Position",
          companyName: companyName || "Company",
          match_score: analysis?.match_score,
          missing_requirements: analysis?.missing_requirements,
        };
      })
    );
    enriched.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
    return jsonRes(res, 200, { applications: enriched });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}

/** POST /api/jobs/:id/applications/:appId/decision — recruiter accepts or rejects candidate */
export async function handleApplicationDecision(req, res, jobId, appId) {
  try {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return jsonRes(res, 400, { error: "Invalid JSON" });
    }

    const { status, rejectionReason = "", decisionNotes = "", decidedBy = "Recruiter" } = body;

    if (!status || !["accepted", "rejected"].includes(status)) {
      return jsonRes(res, 400, { error: "status must be 'accepted' or 'rejected'" });
    }

    if (status === "rejected" && !rejectionReason.trim()) {
      return jsonRes(res, 400, { error: "A rejection reason is required when rejecting a candidate" });
    }

    const app = await dbGet("applications", appId);
    if (!app) {
      return jsonRes(res, 404, { error: "Application not found" });
    }

    const updates = {
      status,
      rejectionReason: status === "rejected" ? rejectionReason.trim() : null,
      decisionNotes: decisionNotes ? decisionNotes.trim() : null,
      decidedAt: new Date().toISOString(),
      decidedBy,
    };

    await dbSet("applications", appId, updates);

    return jsonRes(res, 200, {
      message: `Candidate application marked as ${status}`,
      application: { ...app, ...updates },
    });
  } catch (err) {
    return jsonRes(res, 500, { error: err.message });
  }
}
