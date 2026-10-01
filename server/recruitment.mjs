/**
 * PS-11: AI Recruitment Intelligence Pipeline
 * server/recruitment.mjs
 *
 * Pipeline stages (explicit, structured):
 *   1. analyzeJD          — parse JD into structured requirements
 *   2. parseResumeText    — extract resume text via PDF
 *   3. SKILL_MAP          — deterministic skill normalization
 *   4. extractEvidence    — per-skill evidence from resume (LLM, structured JSON)
 *   5. matchCandidate     — weighted multi-factor scoring (no raw keyword count)
 *   6. detectNoise        — keyword-to-evidence consistency / false-positive risk
 *   7. generateShortlist  — ranked, explainable shortlist capped at N
 */

import Busboy from "busboy";
import { PDFParse } from "pdf-parse";
import { callOpenRouter, safeJsonParse } from "./openrouter.mjs";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_CHARS = 5000;

/**
 * MATCHING WEIGHTS — documented, configurable
 * Total = 1.0
 */
const WEIGHTS = {
  required_skill_coverage: 0.30,   // fraction of required skills with ANY evidence
  evidence_strength:        0.25,   // avg evidence strength (strong=1, moderate=0.6, weak=0.25, none=0)
  project_relevance:        0.15,   // projects mention required tech
  experience_relevance:     0.15,   // work experience mentions required tech
  preferred_coverage:       0.08,   // fraction of preferred skills found
  education_match:          0.04,   // education criterion matched
  noise_penalty:            0.03,   // deducted for keyword-only claims (inverted noise)
};

// ─── Stage 0: Deterministic Skill Normalization ───────────────────────────────

/**
 * Canonical skill name → aliases.
 * Used before LLM calls so normalized names are consistent.
 */
const SKILL_ALIASES = {
  "JavaScript":   ["js", "javascript", "ecmascript", "es6", "es2015", "es2020"],
  "TypeScript":   ["ts", "typescript"],
  "Python":       ["python3", "python 3", "py"],
  "Java":         ["java 8", "java 11", "java 17", "java se", "core java"],
  "C++":          ["cpp", "c plus plus", "c/c++"],
  "C#":           ["csharp", "c sharp", "dotnet c#"],
  "Kotlin":       ["kotlin android"],
  "Go":           ["golang"],
  "Rust":         ["rust-lang"],
  "PHP":          ["php7", "php8"],
  "Ruby":         ["ruby on rails"],
  "Swift":        ["swift ios"],
  "React":        ["reactjs", "react.js", "react js", "react native web"],
  "Vue":          ["vuejs", "vue.js", "vue js"],
  "Angular":      ["angularjs", "angular2", "angular js"],
  "Next.js":      ["nextjs", "next js"],
  "Node.js":      ["nodejs", "node js", "node"],
  "Express":      ["expressjs", "express.js"],
  "Spring Boot":  ["springboot", "spring framework", "spring mvc"],
  "Django":       ["django rest framework", "drf"],
  "FastAPI":      ["fast api"],
  "Flask":        ["python flask"],
  "REST API":     ["restful api", "rest apis", "restful services", "rest services", "rest", "restful", "api development", "rest api development"],
  "GraphQL":      ["graph ql"],
  "PostgreSQL":   ["postgres", "postgresql db", "psql"],
  "MySQL":        ["my sql", "mysql db"],
  "MongoDB":      ["mongo", "mongo db", "mongodb atlas"],
  "Redis":        ["redis cache", "redis db"],
  "Elasticsearch":["elastic search", "elastic"],
  "SQLite":       ["sqlite3"],
  "SQL":          ["structured query language", "sql queries", "relational database", "rdbms", "relational db"],
  "NoSQL":        ["no-sql", "nosql database"],
  "AWS":          ["amazon web services", "amazon aws", "aws cloud"],
  "GCP":          ["google cloud", "google cloud platform", "gcp cloud"],
  "Azure":        ["microsoft azure", "azure cloud"],
  "Docker":       ["docker container", "containerization"],
  "Kubernetes":   ["k8s", "kube", "container orchestration"],
  "CI/CD":        ["cicd", "continuous integration", "continuous deployment", "continuous delivery", "github actions", "jenkins", "travis ci"],
  "Terraform":    ["infrastructure as code", "iac terraform"],
  "Git":          ["github", "gitlab", "bitbucket", "version control"],
  "Linux":        ["unix", "ubuntu", "centos", "bash"],
  "DSA":          ["data structures", "algorithms", "data structures and algorithms", "data structures & algorithms", "dsa problems", "competitive programming"],
  "OOP":          ["object oriented programming", "object-oriented programming", "oops", "oop concepts"],
  "Machine Learning": ["ml", "machine learning algorithms", "ml models"],
  "Deep Learning":    ["dl", "neural networks", "deep neural"],
  "AI":           ["artificial intelligence"],
  "NLP":          ["natural language processing"],
  "TensorFlow":   ["tensor flow"],
  "PyTorch":      ["pytorch"],
  "Pandas":       ["pandas python"],
  "NumPy":        ["numpy", "num py"],
  "Microservices":["micro services", "micro-services", "service oriented architecture", "soa"],
  "System Design":["system architecture", "distributed systems", "scalable systems", "high level design", "low level design"],
  "Linux/Unix":   ["shell scripting", "bash scripting"],
  "Agile":        ["agile methodology", "scrum", "kanban"],
  "React Native": ["reactnative", "react-native"],
  "Flutter":      ["flutter dart"],
  "Android":      ["android development", "android sdk"],
  "iOS":          ["ios development", "ios sdk"],
};

/** Build reverse lookup: alias → canonical */
const ALIAS_TO_CANONICAL = new Map();
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
  ALIAS_TO_CANONICAL.set(canonical.toLowerCase(), canonical);
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical);
  }
}

export function normalizeSkill(raw) {
  const lower = String(raw || "").toLowerCase().trim();
  if (!lower) return raw;
  return ALIAS_TO_CANONICAL.get(lower) || raw.trim();
}

export function normalizeSkillList(list) {
  return [...new Set((list || []).map(normalizeSkill))];
}

// ─── Stage 1: JD Analysis ────────────────────────────────────────────────────

/**
 * Analyzes a job description using LLM to produce structured requirements.
 * Required/preferred skills are also passed explicitly from the form.
 */
export async function analyzeJD({ title, description, requiredSkills = [], preferredSkills = [], requiredExperience = "", education = "" }) {
  const jdText = `
Job Title: ${title}
Required Skills: ${requiredSkills.join(", ")}
Preferred Skills: ${preferredSkills.join(", ")}
Required Experience: ${requiredExperience}
Education: ${education}
Description:
${description}
`.trim();

  const system = `You are an expert technical recruiter. Analyze the job description and extract structured requirements.
CRITICAL: Normalize skill names (e.g. "RESTful API development" → "REST API", "Amazon Web Services" → "AWS").
Return ONLY valid JSON, no markdown.`;

  const prompt = `Job Description:
"""
${jdText.slice(0, 4000)}
"""

Return this EXACT JSON structure:
{
  "title": "job title",
  "required_skills": ["normalized required skill names — use canonical names"],
  "preferred_skills": ["normalized preferred skill names"],
  "experience_min_years": 0,
  "experience_max_years": 0,
  "education_requirement": "degree required or null",
  "key_responsibilities": ["list of main responsibilities"],
  "technical_concepts": ["important technical concepts beyond named skills"],
  "synonyms": { "skill": ["alternate terms for the skill"] },
  "requirement_priority": { "skill_name": "critical|important|nice_to_have" }
}`;

  const { content, error } = await callOpenRouter({
    system,
    messages: [{ role: "user", content: prompt }],
    model: process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo",
    max_tokens: 1500,
    temperature: 0.1,
  });

  if (error) return { error, jdAnalysis: buildFallbackJD({ title, requiredSkills, preferredSkills, requiredExperience, education }) };

  const parsed = safeJsonParse(content);
  if (!parsed) return { error: "AI returned invalid JSON", jdAnalysis: buildFallbackJD({ title, requiredSkills, preferredSkills, requiredExperience, education }) };

  // Always merge form-provided required/preferred skills (they're authoritative)
  parsed.required_skills = normalizeSkillList([...new Set([...(parsed.required_skills || []), ...requiredSkills])]);
  parsed.preferred_skills = normalizeSkillList([...new Set([...(parsed.preferred_skills || []), ...preferredSkills])]);

  return { jdAnalysis: parsed };
}

function buildFallbackJD({ title, requiredSkills, preferredSkills, requiredExperience, education }) {
  const expMatch = String(requiredExperience).match(/\d+/g) || ["0"];
  return {
    title,
    required_skills: normalizeSkillList(requiredSkills),
    preferred_skills: normalizeSkillList(preferredSkills),
    experience_min_years: parseInt(expMatch[0]) || 0,
    experience_max_years: parseInt(expMatch[1]) || parseInt(expMatch[0]) || 3,
    education_requirement: education || null,
    key_responsibilities: [],
    technical_concepts: [],
    synonyms: {},
    requirement_priority: {},
  };
}

// ─── Stage 2: PDF Resume Parsing ─────────────────────────────────────────────

export const parseMultipartResume = (req) =>
  new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_BYTES } });
    const fields = {};
    let fileBuffer = null;
    let fileInfo = null;

    busboy.on("file", (fieldname, file, info) => {
      if (fieldname !== "resume") { file.resume(); return; }
      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("limit", () => reject(new Error("Resume file too large (max 5MB)")));
      file.on("end", () => { fileBuffer = Buffer.concat(chunks); fileInfo = info; });
    });
    busboy.on("field", (name, value) => { fields[name] = value; });
    busboy.on("error", reject);
    busboy.on("finish", () => resolve({ fields, fileBuffer, fileInfo }));
    req.pipe(busboy);
  });

export async function extractResumeText(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.length === 0) return "";
  const header = pdfBuffer.slice(0, 5).toString("utf8");
  if (!header.startsWith("%PDF")) {
    return pdfBuffer.toString("utf8").trim();
  }
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const parsed = await parser.getText();
    return (parsed.text || "").trim();
  } catch (_) {
    return pdfBuffer.toString("utf8").trim();
  } finally {
    try { await parser.destroy(); } catch (_) {}
  }
}

// ─── Stage 3: Evidence Extraction (LLM) ──────────────────────────────────────

/**
 * For each required/preferred skill in the JD, identify evidence from the resume.
 * Evidence sources: projects, experience, certifications, education.
 * Evidence strengths: strong | moderate | weak | none
 *
 * A skill mentioned ONLY in the skills section = weak.
 * A skill demonstrated in a project/experience = moderate or strong.
 * A skill with quantified impact/achievement = strong.
 */
export async function extractEvidence({ resumeText, jdAnalysis, candidateName = "Candidate" }) {
  const requiredSkills = jdAnalysis.required_skills || [];
  const preferredSkills = jdAnalysis.preferred_skills || [];
  const allSkills = [...new Set([...requiredSkills, ...preferredSkills])];

  if (allSkills.length === 0) return buildEmptyEvidence(allSkills);

  const system = `You are a rigorous resume evidence analyzer.
For each skill, identify WHERE in the resume there is evidence (projects, work experience, achievements, education).
CRITICAL RULE: A skill listed only in the "Skills" section with no supporting project/experience is "weak" evidence.
Strong evidence = the skill is demonstrated in a concrete project, work experience, or achievement with measurable results.
Moderate evidence = skill is used in a project/experience but without quantifiable impact.
Weak evidence = skill appears only in a skills list or is mentioned briefly with no context.
None = skill is not found in the resume at all.
Return ONLY valid JSON, no markdown.`;

  const prompt = `Candidate: ${candidateName}

Resume:
"""
${resumeText.slice(0, MAX_RESUME_CHARS)}
"""

Skills to analyze: ${allSkills.join(", ")}

For each skill return:
{
  "evidence": [
    {
      "skill": "normalized skill name",
      "found": true|false,
      "strength": "strong|moderate|weak|none",
      "source": "experience|project|certification|education|skills_section_only|not_found",
      "evidence_text": "exact quote or description from resume showing evidence, or null",
      "context": "brief description of what they did with this skill"
    }
  ],
  "candidate_info": {
    "name": "extracted name or null",
    "years_experience": estimated years (number),
    "education": "degree and institution if found",
    "num_projects": number of projects listed,
    "num_jobs": number of work experiences listed
  },
  "skills_section_only": ["skills that appear ONLY in skills list with no supporting evidence"],
  "well_evidenced_skills": ["skills with strong or moderate evidence from projects/experience"]
}`;

  const { content, error } = await callOpenRouter({
    system,
    messages: [{ role: "user", content: prompt }],
    model: process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo",
    max_tokens: 2000,
    temperature: 0.1,
  });

  if (error || !content) {
    return buildHeuristicEvidence({ resumeText, skills: allSkills, candidateName });
  }

  const parsed = safeJsonParse(content);
  if (!parsed || !Array.isArray(parsed.evidence)) {
    return buildHeuristicEvidence({ resumeText, skills: allSkills, candidateName });
  }

  // Normalize skill names in evidence
  if (Array.isArray(parsed.evidence)) {
    parsed.evidence = parsed.evidence.map((e) => ({
      ...e,
      skill: normalizeSkill(e.skill || ""),
    }));
  }

  return parsed;
}

function buildEmptyEvidence(skills) {
  return {
    evidence: skills.map((skill) => ({
      skill,
      found: false,
      strength: "none",
      source: "not_found",
      evidence_text: null,
      context: null,
    })),
    candidate_info: { name: null, years_experience: 0, education: null, num_projects: 0, num_jobs: 0 },
    skills_section_only: [],
    well_evidenced_skills: [],
  };
}

function buildHeuristicEvidence({ resumeText = "", skills = [], candidateName = "Candidate" }) {
  const lines = resumeText.split("\n").map((l) => l.trim()).filter(Boolean);

  let curSection = "general";
  const sections = {
    experience: [],
    projects: [],
    skills: [],
    education: [],
    general: [],
  };

  for (const line of lines) {
    const l = line.toLowerCase();
    if (/^(work\s+)?experience|employment|work\s+history/i.test(l) && l.length < 35) {
      curSection = "experience";
      continue;
    } else if (/^(key\s+|featured\s+|academic\s+)?projects?/i.test(l) && l.length < 35) {
      curSection = "projects";
      continue;
    } else if (/^(technical\s+|core\s+)?skills?(\s*&|\s+tools)?/i.test(l) && l.length < 35) {
      curSection = "skills";
      continue;
    } else if (/^education|academics?|qualifications/i.test(l) && l.length < 35) {
      curSection = "education";
      continue;
    }
    if (sections[curSection]) sections[curSection].push(line);
    else sections.general.push(line);
  }

  const expText = sections.experience.join("\n");
  const projText = sections.projects.join("\n");
  const skillsText = sections.skills.join("\n");
  const eduText = sections.education.join("\n");

  const yearsMatch = resumeText.match(/(\d+)\+?\s*years?(?:\s+of)?(?:\s+experience)?/i);
  const yearsExp = yearsMatch ? parseInt(yearsMatch[1], 10) : (sections.experience.length > 3 ? 2 : 1);
  const eduMatch = (eduText + "\n" + resumeText).match(/(B\.?Tech|B\.?E\.?|B\.?S\.?|Bachelor|Master|M\.?Tech|M\.?S\.?)[^\n,\.]*/i);
  const numProjects = Math.max(sections.projects.filter((l) => l.startsWith("-") || l.startsWith("•") || l.includes(":")).length, sections.projects.length > 0 ? 1 : 0);
  const numJobs = Math.max(sections.experience.filter((l) => l.includes("20") || l.includes("Present") || l.includes("–") || l.includes("-")).length, sections.experience.length > 0 ? 1 : 0);

  const candidate_info = {
    name: candidateName && candidateName !== "Candidate" && !/^(unknown|null|undefined)$/i.test(candidateName)
      ? candidateName
      : (lines[0] && lines[0].length <= 40 && !/^(resume|cv|contact)/i.test(lines[0]) ? lines[0] : null),
    years_experience: yearsExp,
    education: eduMatch ? eduMatch[0].trim() : null,
    num_projects: numProjects,
    num_jobs: numJobs,
  };

  const evidence = [];
  const skills_section_only = [];
  const well_evidenced_skills = [];

  for (const skill of skills) {
    const norm = normalizeSkill(skill);
    const aliases = (SKILL_ALIASES[norm] || [norm.toLowerCase()]).map((a) => a.toLowerCase());
    if (!aliases.includes(norm.toLowerCase())) aliases.push(norm.toLowerCase());

    const regexes = aliases.map((a) => new RegExp(`\\b${a.replace(/([+*?^$.[\]{}()|])/g, "\\$1")}\\b`, "i"));

    const findMatch = (str) => regexes.some((r) => r.test(str));
    const findMatchingLine = (strList) => strList.find((l) => regexes.some((r) => r.test(l)));

    const inExp = findMatch(expText);
    const inProj = findMatch(projText);
    const inSkills = findMatch(skillsText);
    const inAny = findMatch(resumeText);

    if (!inAny) {
      evidence.push({
        skill: norm,
        found: false,
        strength: "none",
        source: "not_found",
        evidence_text: null,
        context: null,
      });
      continue;
    }

    if (inExp) {
      const matchLine = findMatchingLine(sections.experience) || "Demonstrated in work experience";
      const hasMetric = /\b(\d+%?|\d+x|reduced|improved|scaled|deployed|architected|optimized|led|designed)\b/i.test(matchLine);
      evidence.push({
        skill: norm,
        found: true,
        strength: hasMetric ? "strong" : "moderate",
        source: "experience",
        evidence_text: matchLine.slice(0, 200),
        context: hasMetric ? "Applied with measurable impact in professional experience" : "Demonstrated in work experience",
      });
      well_evidenced_skills.push(norm);
    } else if (inProj) {
      const matchLine = findMatchingLine(sections.projects) || "Demonstrated in project work";
      const hasMetric = /\b(\d+%?|built|developed|implemented|created|designed)\b/i.test(matchLine);
      evidence.push({
        skill: norm,
        found: true,
        strength: hasMetric ? "strong" : "moderate",
        source: "project",
        evidence_text: matchLine.slice(0, 200),
        context: "Demonstrated in hands-on project",
      });
      well_evidenced_skills.push(norm);
    } else if (inSkills || inAny) {
      evidence.push({
        skill: norm,
        found: true,
        strength: "weak",
        source: "skills_section_only",
        evidence_text: "Listed in skills section without project or work evidence",
        context: "Skill claimed without demonstrable project evidence",
      });
      skills_section_only.push(norm);
    }
  }

  return {
    evidence,
    candidate_info,
    skills_section_only,
    well_evidenced_skills,
  };
}

// ─── Stage 4: Noise Detection ─────────────────────────────────────────────────

/**
 * Detects keyword-heavy / false-positive candidates.
 * A candidate with many skills in their skills section but no supporting
 * projects/experience for those skills is flagged as high-noise.
 *
 * The noise score is NOT used to disqualify candidates — it informs the recruiter.
 */
export function detectNoise({ evidence, candidateInfo }) {
  const evidenceList = evidence || [];
  const total = evidenceList.length;
  if (total === 0) return { noise_score: 0, noise_risk: "low", noise_flags: [], keyword_to_evidence_ratio: 1 };

  const skillsOnlyCount = evidenceList.filter((e) => e.source === "skills_section_only").length;
  const foundCount = evidenceList.filter((e) => e.found).length;
  const strongOrModerate = evidenceList.filter((e) => e.strength === "strong" || e.strength === "moderate").length;

  const keywordToEvidenceRatio = foundCount > 0 ? strongOrModerate / foundCount : 0;
  const skillsSectionBias = foundCount > 0 ? skillsOnlyCount / foundCount : 0;

  // Noise score: high = many keyword-only claims, low evidence depth
  const rawNoise = clamp(skillsSectionBias * 80 + (1 - keywordToEvidenceRatio) * 20, 0, 100);
  const noise_score = Math.round(rawNoise);

  const noise_risk = noise_score >= 60 ? "high" : noise_score >= 35 ? "medium" : "low";

  const noise_flags = [];
  if (skillsSectionBias > 0.5) noise_flags.push(`${skillsOnlyCount} of ${foundCount} matched skills appear only in skills section without project/experience evidence`);
  if (keywordToEvidenceRatio < 0.4) noise_flags.push("Low evidence depth: skills mentioned but rarely demonstrated in projects or work");
  if ((candidateInfo?.num_projects || 0) === 0 && foundCount > 3) noise_flags.push("No projects listed despite claiming multiple technical skills");

  return { noise_score, noise_risk, noise_flags, keyword_to_evidence_ratio: Math.round(keywordToEvidenceRatio * 100) / 100 };
}

function clamp(v, min = 0, max = 100) { return Math.min(max, Math.max(min, Math.round(v))); }

// ─── Stage 5: Candidate-JD Matching ──────────────────────────────────────────

/**
 * Multi-factor weighted scoring.
 * Input: structured evidence for all required/preferred skills.
 * Output: match score 0–100 with per-factor breakdown.
 *
 * DOES NOT count keywords. Uses evidence strength per skill.
 */
export function matchCandidate({ jdAnalysis, evidenceResult }) {
  const required = jdAnalysis.required_skills || [];
  const preferred = jdAnalysis.preferred_skills || [];
  const evidenceList = evidenceResult.evidence || [];

  const evidenceBySkill = new Map();
  for (const e of evidenceList) {
    evidenceBySkill.set(normalizeSkill(e.skill), e);
  }

  const strengthScore = (s) => {
    if (s === "strong")   return 1.0;
    if (s === "moderate") return 0.6;
    if (s === "weak")     return 0.25;
    return 0;
  };

  // Required skill coverage: fraction of required skills with ANY evidence
  const requiredFound = required.filter((s) => {
    const ev = evidenceBySkill.get(normalizeSkill(s));
    return ev && ev.found && ev.strength !== "none";
  });
  const requiredCoverage = required.length > 0 ? requiredFound.length / required.length : 0;

  // Evidence strength score: avg strength across required skills
  const requiredStrengths = required.map((s) => {
    const ev = evidenceBySkill.get(normalizeSkill(s));
    return ev ? strengthScore(ev.strength) : 0;
  });
  const avgStrength = requiredStrengths.length > 0
    ? requiredStrengths.reduce((a, b) => a + b, 0) / requiredStrengths.length
    : 0;

  // Project relevance: projects that mention required skills
  const wellEvidenced = new Set((evidenceResult.well_evidenced_skills || []).map(normalizeSkill));
  const projectCount = evidenceResult.candidate_info?.num_projects || 0;
  const projectRelevance = required.length > 0
    ? required.filter((s) => wellEvidenced.has(normalizeSkill(s))).length / required.length
    : 0;

  // Experience relevance: similar to project relevance, use job count as proxy
  const jobCount = evidenceResult.candidate_info?.num_jobs || 0;
  const experienceRelevance = Math.min(1, (jobCount * 0.3) + projectRelevance * 0.7);

  // Preferred skill coverage
  const preferredFound = preferred.filter((s) => {
    const ev = evidenceBySkill.get(normalizeSkill(s));
    return ev && ev.found && ev.strength !== "none";
  });
  const preferredCoverage = preferred.length > 0 ? preferredFound.length / preferred.length : 0;

  // Education match (simplified)
  const educationRequired = jdAnalysis.education_requirement;
  const candidateEducation = (evidenceResult.candidate_info?.education || "").toLowerCase();
  const educationMatch = !educationRequired || candidateEducation.includes("b.tech") || candidateEducation.includes("b.e") || candidateEducation.includes("bachelor") || candidateEducation.includes("master") || candidateEducation.includes("m.tech");

  // Noise penalty (keyword stuffing)
  const noiseResult = detectNoise({ evidence: evidenceList, candidateInfo: evidenceResult.candidate_info });
  const noisePenalty = noiseResult.noise_score / 100; // 0=no penalty, 1=full penalty

  // Weighted final score
  const rawScore =
    requiredCoverage   * WEIGHTS.required_skill_coverage * 100 +
    avgStrength        * WEIGHTS.evidence_strength       * 100 +
    projectRelevance   * WEIGHTS.project_relevance       * 100 +
    experienceRelevance * WEIGHTS.experience_relevance   * 100 +
    preferredCoverage  * WEIGHTS.preferred_coverage      * 100 +
    (educationMatch ? 1 : 0) * WEIGHTS.education_match  * 100 -
    noisePenalty       * WEIGHTS.noise_penalty           * 100;

  const match_score = clamp(rawScore, 0, 100);

  // Identify matched / missing / uncertain requirements
  const matched_requirements = [];
  const missing_requirements = [];
  const uncertain_requirements = [];
  const partially_matched = [];

  for (const skill of required) {
    const ev = evidenceBySkill.get(normalizeSkill(skill));
    if (!ev || !ev.found || ev.strength === "none") {
      missing_requirements.push(skill);
    } else if (ev.strength === "strong" || ev.strength === "moderate") {
      matched_requirements.push({ skill, strength: ev.strength, evidence: ev.evidence_text || ev.context });
    } else if (ev.strength === "weak") {
      partially_matched.push({ skill, note: "mentioned but no supporting evidence" });
      uncertain_requirements.push({ skill, note: ev.context || "appears in skills list only" });
    }
  }

  return {
    match_score,
    factor_breakdown: {
      required_skill_coverage: Math.round(requiredCoverage * 100),
      evidence_strength: Math.round(avgStrength * 100),
      project_relevance: Math.round(projectRelevance * 100),
      experience_relevance: Math.round(experienceRelevance * 100),
      preferred_coverage: Math.round(preferredCoverage * 100),
      education_match: educationMatch ? 100 : 0,
      noise_penalty: noiseResult.noise_score,
    },
    matched_requirements,
    missing_requirements,
    uncertain_requirements,
    partially_matched,
    preferred_matched: preferredFound,
    noise: noiseResult,
    candidate_info: evidenceResult.candidate_info,
  };
}

// ─── Stage 6: Generate Explainable Shortlist ──────────────────────────────────

/**
 * Ranks candidates by match_score and generates explainable justifications.
 * Does NOT use raw keyword count.
 * Caps at topN; explains why fewer candidates may be shortlisted.
 */
export function generateShortlist({ candidates, topN = 5, minScore = 20 }) {
  // Filter to candidates that have at least minimal evidence
  const eligible = candidates.filter((c) => !c.error && c.match_score !== undefined);
  eligible.sort((a, b) => b.match_score - a.match_score);

  const shortlisted = [];
  const rejected = [];

  for (const candidate of eligible) {
    if (shortlisted.length < topN && candidate.match_score >= minScore) {
      shortlisted.push({
        rank: shortlisted.length + 1,
        applicationId: candidate.applicationId,
        studentId: candidate.studentId,
        name: candidate.name,
        match_score: candidate.match_score,
        factor_breakdown: candidate.factor_breakdown,
        matched_requirements: candidate.matched_requirements,
        missing_requirements: candidate.missing_requirements,
        uncertain_requirements: candidate.uncertain_requirements,
        preferred_matched: candidate.preferred_matched,
        noise: candidate.noise,
        candidate_info: candidate.candidate_info,
        why_shortlisted: buildWhyShortlisted(candidate),
        watch_out: buildWatchOut(candidate),
      });
    } else {
      rejected.push({
        applicationId: candidate.applicationId,
        name: candidate.name,
        match_score: candidate.match_score,
        reason: buildRejectionReason(candidate, minScore),
      });
    }
  }

  const shortfall = topN - shortlisted.length;

  return {
    shortlisted,
    rejected,
    total_candidates: eligible.length,
    shortlist_size_requested: topN,
    shortlist_size_achieved: shortlisted.length,
    shortfall_explanation: shortfall > 0
      ? `Only ${shortlisted.length} of ${topN} requested spots filled. ${shortfall} more candidates below minimum evidence threshold (score < ${minScore}).`
      : null,
    generated_at: new Date().toISOString(),
  };
}

function buildWhyShortlisted(candidate) {
  const reasons = [];
  const matched = candidate.matched_requirements || [];
  const noise = candidate.noise || {};

  for (const m of matched.slice(0, 4)) {
    if (m.strength === "strong") reasons.push(`✓ Strong ${m.skill} evidence${m.evidence ? ": " + m.evidence.slice(0, 80) : ""}`);
    else if (m.strength === "moderate") reasons.push(`✓ ${m.skill} demonstrated in projects/experience`);
  }

  const preferred = candidate.preferred_matched || [];
  if (preferred.length > 0) reasons.push(`△ Preferred skills also matched: ${preferred.slice(0, 3).join(", ")}`);

  if (noise.noise_risk === "low") reasons.push("✓ Low keyword noise — evidence backs up all claims");

  const missing = candidate.missing_requirements || [];
  for (const s of missing.slice(0, 2)) reasons.push(`✗ ${s} not found`);

  return reasons;
}

function buildWatchOut(candidate) {
  const uncertain = candidate.uncertain_requirements || [];
  const noise = candidate.noise || {};
  const concerns = [];
  if (noise.noise_risk === "high") concerns.push("High keyword-to-evidence inconsistency detected");
  for (const u of uncertain.slice(0, 2)) concerns.push(`Uncertain: ${u.skill} — ${u.note}`);
  return concerns.length > 0 ? concerns : null;
}

function buildRejectionReason(candidate, minScore) {
  if (candidate.match_score < minScore) return `Score ${candidate.match_score} below minimum threshold (${minScore})`;
  const missing = candidate.missing_requirements || [];
  if (missing.length >= 3) return `Missing ${missing.length} required skills: ${missing.slice(0, 3).join(", ")}`;
  return `Insufficient evidence for required skills (score: ${candidate.match_score})`;
}


