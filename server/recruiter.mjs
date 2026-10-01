/**
 * Recruiter AI pipeline (PS-11: AI Recruitment Intelligence Agent)
 * Endpoints:
 *   POST /api/recruiter/analyze-jd        — parse & structure a job description
 *   POST /api/recruiter/analyze-resumes   — score & rank resumes against a JD
 *   POST /api/recruiter/shortlist         — produce explainable shortlist
 *   POST /api/recruiter/interview-plan    — generate interview questions for a candidate
 */

import { callOpenRouter, safeJsonParse } from "./openrouter.mjs";

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonRes(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8") || "{}";
}

// ─── 1. Analyze Job Description ─────────────────────────────────────────────

export async function handleAnalyzeJD(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return jsonRes(res, 400, { error: "Invalid JSON body" });
  }

  const { jd } = body;
  if (!jd || typeof jd !== "string" || jd.trim().length < 30) {
    return jsonRes(res, 400, { error: "Job description too short (min 30 chars)" });
  }

  const system = `You are an expert technical recruiter and AI analyst.
Analyze the given job description and return a structured JSON object.
Return ONLY valid JSON. No markdown, no explanation.`;

  const prompt = `Job Description:
"""
${jd.trim().slice(0, 6000)}
"""

Return this EXACT JSON structure:
{
  "title": "inferred job title",
  "seniority": "Junior|Mid|Senior|Lead|Principal",
  "department": "Engineering|Product|Design|Data|DevOps|Other",
  "required_skills": ["list of must-have skills, normalized"],
  "preferred_skills": ["list of nice-to-have skills"],
  "experience_years": { "min": 0, "max": 0 },
  "education": "required education level or null",
  "responsibilities": ["key responsibilities list"],
  "red_flags": ["keyword-stuffed or vague requirements that may be noise"],
  "must_have_keywords": ["top 10 keywords that are truly critical"],
  "domain": "Backend|Frontend|Fullstack|Mobile|AI/ML|DevOps|Data|Security|Other",
  "summary": "2-sentence human-readable summary"
}`;

  const { content, error } = await callOpenRouter({
    system,
    messages: [{ role: "user", content: prompt }],
    model: "openai/gpt-3.5-turbo",
    max_tokens: 1200,
    temperature: 0.1,
  });

  if (error) return jsonRes(res, 502, { error });

  const parsed = safeJsonParse(content);
  if (!parsed) return jsonRes(res, 502, { error: "AI returned invalid JSON", raw: content });

  return jsonRes(res, 200, { jdAnalysis: parsed });
}

// ─── 2. Analyze Resumes ─────────────────────────────────────────────────────

export async function handleAnalyzeResumes(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return jsonRes(res, 400, { error: "Invalid JSON body" });
  }

  const { jdAnalysis, resumes } = body;
  if (!jdAnalysis || !Array.isArray(resumes) || resumes.length === 0) {
    return jsonRes(res, 400, { error: "Provide jdAnalysis and resumes array" });
  }
  if (resumes.length > 20) {
    return jsonRes(res, 400, { error: "Max 20 resumes per request" });
  }

  const system = `You are an expert technical recruiter AI.
You analyze candidate resumes against a structured job description.
Return ONLY valid JSON. No markdown, no explanation.`;

  const jdContext = JSON.stringify({
    title: jdAnalysis.title,
    required_skills: jdAnalysis.required_skills,
    preferred_skills: jdAnalysis.preferred_skills,
    experience_years: jdAnalysis.experience_years,
    must_have_keywords: jdAnalysis.must_have_keywords,
    seniority: jdAnalysis.seniority,
    domain: jdAnalysis.domain,
  });

  const results = [];

  for (const resume of resumes) {
    if (!resume.name || !resume.text) {
      results.push({ name: resume.name || "Unknown", error: "Missing resume text" });
      continue;
    }

    const prompt = `Job Description Analysis:
${jdContext}

Candidate Resume (${resume.name}):
"""
${(resume.text || "").trim().slice(0, 4000)}
"""

Analyze this candidate and return this EXACT JSON:
{
  "name": "${resume.name}",
  "match_score": 0-100,
  "skills_matched": ["matched required skills"],
  "skills_missing": ["missing required skills"],
  "skills_preferred_matched": ["matched preferred skills"],
  "experience_years": estimated years of relevant experience as number,
  "education_match": true|false,
  "keyword_overlap": ["actual JD keywords found in resume"],
  "false_positives": ["skills listed but not evidenced by experience"],
  "uncertain": ["requirements that are unclear from resume"],
  "highlights": ["top 3 strengths for this role"],
  "concerns": ["top 2 concerns or gaps"],
  "seniority_fit": "Under|Match|Over",
  "recommendation": "Strong Yes|Yes|Maybe|No",
  "explanation": "2-3 sentence explainable justification"
}`;

    const { content, error } = await callOpenRouter({
      system,
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-3.5-turbo",
      max_tokens: 1000,
      temperature: 0.1,
    });

    if (error) {
      results.push({ name: resume.name, error });
      continue;
    }

    const parsed = safeJsonParse(content);
    if (!parsed) {
      results.push({ name: resume.name, error: "AI returned invalid JSON", raw: content });
      continue;
    }

    results.push(parsed);
  }

  // Sort by match_score descending
  results.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  return jsonRes(res, 200, { candidates: results });
}

// ─── 3. Generate Shortlist ──────────────────────────────────────────────────

export async function handleShortlist(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return jsonRes(res, 400, { error: "Invalid JSON body" });
  }

  const { jdAnalysis, candidates, topN = 5 } = body;
  if (!jdAnalysis || !Array.isArray(candidates) || candidates.length === 0) {
    return jsonRes(res, 400, { error: "Provide jdAnalysis and candidates array" });
  }

  const system = `You are a senior technical recruiter AI producing an explainable candidate shortlist.
Return ONLY valid JSON. No markdown, no explanation.`;

  const candidatesSummary = candidates
    .filter((c) => !c.error)
    .slice(0, 15)
    .map((c) => ({
      name: c.name,
      match_score: c.match_score,
      recommendation: c.recommendation,
      seniority_fit: c.seniority_fit,
      highlights: c.highlights,
      concerns: c.concerns,
      false_positives: c.false_positives,
      explanation: c.explanation,
    }));

  const prompt = `Job: ${jdAnalysis.title} (${jdAnalysis.seniority})
Required Skills: ${(jdAnalysis.required_skills || []).join(", ")}

Candidates:
${JSON.stringify(candidatesSummary, null, 2)}

Produce an explainable shortlist of the top ${topN} candidates.
Return this EXACT JSON:
{
  "shortlisted": [
    {
      "rank": 1,
      "name": "candidate name",
      "match_score": 0-100,
      "recommendation": "Strong Yes|Yes|Maybe",
      "key_reason": "single sentence why they are shortlisted",
      "watch_out": "single sentence concern or null",
      "interview_priority": "High|Medium|Low"
    }
  ],
  "rejected": [
    {
      "name": "candidate name",
      "reason": "concise rejection reason"
    }
  ],
  "noise_detected": ["names of candidates whose resumes had keyword stuffing / false positives"],
  "recruiter_notes": "2-3 sentence strategic hiring observation"
}`;

  const { content, error } = await callOpenRouter({
    system,
    messages: [{ role: "user", content: prompt }],
    model: "openai/gpt-3.5-turbo",
    max_tokens: 1500,
    temperature: 0.1,
  });

  if (error) return jsonRes(res, 502, { error });

  const parsed = safeJsonParse(content);
  if (!parsed) return jsonRes(res, 502, { error: "AI returned invalid JSON", raw: content });

  return jsonRes(res, 200, { shortlist: parsed });
}

// ─── 4. Interview Plan ───────────────────────────────────────────────────────

export async function handleInterviewPlan(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return jsonRes(res, 400, { error: "Invalid JSON body" });
  }

  const { candidate, jdAnalysis } = body;
  if (!candidate || !jdAnalysis) {
    return jsonRes(res, 400, { error: "Provide candidate and jdAnalysis" });
  }

  const system = `You are a senior technical interviewer.
Generate a structured interview plan for a specific candidate.
Return ONLY valid JSON. No markdown, no explanation.`;

  const prompt = `Job: ${jdAnalysis.title} (${jdAnalysis.seniority}, ${jdAnalysis.domain})
Required Skills: ${(jdAnalysis.required_skills || []).join(", ")}

Candidate: ${candidate.name}
Match Score: ${candidate.match_score}
Highlights: ${(candidate.highlights || []).join("; ")}
Concerns: ${(candidate.concerns || []).join("; ")}
Missing Skills: ${(candidate.skills_missing || []).join(", ")}

Generate interview plan as EXACT JSON:
{
  "candidate": "${candidate.name}",
  "recommended_rounds": 2-4,
  "rounds": [
    {
      "round": 1,
      "type": "HR Screen|Technical|System Design|Coding|Cultural Fit",
      "duration_minutes": 30-60,
      "focus_areas": ["what to probe"],
      "questions": [
        { "question": "...", "purpose": "skill/gap/verification", "expected_depth": "Junior|Mid|Senior" }
      ]
    }
  ],
  "skills_to_verify": ["skills that need live demonstration"],
  "red_flags_to_probe": ["concerns to address in interview"],
  "overall_strategy": "1-2 sentence interview approach"
}`;

  const { content, error } = await callOpenRouter({
    system,
    messages: [{ role: "user", content: prompt }],
    model: "openai/gpt-3.5-turbo",
    max_tokens: 1500,
    temperature: 0.2,
  });

  if (error) return jsonRes(res, 502, { error });

  const parsed = safeJsonParse(content);
  if (!parsed) return jsonRes(res, 502, { error: "AI returned invalid JSON", raw: content });

  return jsonRes(res, 200, { interviewPlan: parsed });
}
