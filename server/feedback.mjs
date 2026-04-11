/**
 * POST /api/feedback
 * Body: { question, answer, role?, company?, type?, userId? }
 * Returns: { score: 0-100, strengths: [], weaknesses: [], improvedAnswer: "", criteria?: {} }
 */
import { callOpenRouter, safeJsonParse } from "./openrouter.mjs";
import { recordInterviewScore } from "./analytics.mjs";

const FEEDBACK_SYSTEM = `You are an interview coach. Evaluate one answer.
Return JSON ONLY in this exact shape:
{"score": 0-100, "strengths": [""], "weaknesses": [""], "improvedAnswer": "", "criteria": {"structure":0-10, "relevance":0-10, "clarity":0-10, "impact":0-10}}
Rules:
- score is overall 0-100.
- strengths: 2-4 bullets, specific to this answer.
- weaknesses: 2-4 bullets, specific to this answer.
- improvedAnswer: 2-5 sentences, uses candidate details if present.
- criteria: each 0-10 for charting.
- Do NOT add markdown or extra text.`;

export async function handleFeedback(body) {
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const question = String(payload.question || "");
  const answer = String(payload.answer || "");
  const role = String(payload.role || "");
  const company = String(payload.company || "");
  const type = String(payload.type || "hr");
  const userId = payload.userId || "anonymous";

  if (!question || !answer.trim()) {
    return { statusCode: 200, body: JSON.stringify({ error: "Missing question or answer" }) };
  }

  const userPrompt = `Question: "${question}"
Answer: "${answer}"
Role: ${role || "Not specified"}
Company: ${company || "Not specified"}
Type: ${type}`;

  const { content, error } = await callOpenRouter({
    system: FEEDBACK_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 700,
    temperature: 0.3,
  });

  if (error || !content) {
    return { statusCode: 200, body: JSON.stringify({ error: error || "No response" }) };
  }

  const parsed = safeJsonParse(content);
  if (!parsed || typeof parsed.score !== "number") {
    return { statusCode: 200, body: JSON.stringify({ error: "Bad AI response" }) };
  }

  recordInterviewScore({ userId, score: parsed.score, type, company });

  return { statusCode: 200, body: JSON.stringify(parsed) };
}
