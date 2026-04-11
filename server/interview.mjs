/**
 * Mock interview + question generator.
 * Endpoints:
 * - POST /api/interview/start
 * - POST /api/interview/message
 * - POST /api/interview/questions
 */
import crypto from "crypto";
import { callOpenRouter, safeJsonParse } from "./openrouter.mjs";

const sessions = new Map();

function now() {
  return Date.now();
}

function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function confidenceFromResponse({ text, responseTimeMs }) {
  const len = (text || "").trim().length;
  const time = Number(responseTimeMs) || 0;
  if (len >= 90 && time > 0 && time < 45000) return "High";
  if (len >= 45 && time > 0 && time < 90000) return "Medium";
  return "Low";
}

function getStage(asked) {
  return asked < 3 ? "hr" : "technical";
}

const NEXT_Q_SYSTEM = `You are a mock interview conductor. Ask ONE question at a time.
Return JSON ONLY in this exact shape:
{"question": "...", "stage": "hr|technical", "focus": "communication|resume|dsa|sql|system-design|projects"}
Rules:
- Keep question to 1-2 sentences.
- Prefer HR for early questions, technical later.
- Use role/company/topics for relevance.
- Never include extra text or markdown.`;

const GENERATE_Q_SYSTEM = `You generate interview questions.
Return JSON ONLY in this exact shape:
{"questions": ["q1", "q2", ...]}
Rules:
- 5 to 10 questions.
- Mix HR + technical based on role and topics.
- One question per string, no numbering.`;

function buildNextQuestionPrompt(session, lastAnswer) {
  const topics = session.topics.length ? session.topics.join(", ") : "Not specified";
  const stage = getStage(session.asked);
  return `Role: ${session.role || "Not specified"}
Company: ${session.company || "Not specified"}
Level: ${session.level || "Not specified"}
Topics: ${topics}
Stage now: ${stage}
Questions asked so far: ${session.asked}
Last candidate answer: ${lastAnswer || "(none)"}
Ask the next question now.`;
}

export async function handleInterviewStart(body) {
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const sessionId = crypto.randomUUID();
  const session = {
    id: sessionId,
    userId: payload.userId || "anonymous",
    role: String(payload.role || ""),
    company: String(payload.company || ""),
    level: String(payload.level || ""),
    topics: toList(payload.topics),
    asked: 0,
    messages: [],
    createdAt: now(),
    updatedAt: now(),
  };
  sessions.set(sessionId, session);

  const { content, error } = await callOpenRouter({
    system: NEXT_Q_SYSTEM,
    messages: [{ role: "user", content: buildNextQuestionPrompt(session, "") }],
    max_tokens: 250,
    temperature: 0.2,
  });

  if (error || !content) {
    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId, question: "Tell me about yourself.", stage: "hr" }),
    };
  }

  const parsed = safeJsonParse(content) || {};
  const question = parsed.question || "Tell me about yourself.";
  const stage = parsed.stage || "hr";
  session.asked += 1;
  session.messages.push({ role: "assistant", content: question });
  session.updatedAt = now();

  return { statusCode: 200, body: JSON.stringify({ sessionId, question, stage }) };
}

export async function handleInterviewMessage(body) {
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const sessionId = payload.sessionId;
  const message = String(payload.message || "");
  const responseTimeMs = Number(payload.responseTimeMs) || 0;
  const session = sessions.get(sessionId);
  if (!session) {
    return { statusCode: 200, body: JSON.stringify({ error: "Session not found" }) };
  }

  session.messages.push({ role: "user", content: message });
  const confidence = confidenceFromResponse({ text: message, responseTimeMs });

  const { content, error } = await callOpenRouter({
    system: NEXT_Q_SYSTEM,
    messages: [{ role: "user", content: buildNextQuestionPrompt(session, message) }],
    max_tokens: 250,
    temperature: 0.2,
  });

  if (error || !content) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId,
        question: "Thanks. Can you walk me through a challenging project?",
        stage: getStage(session.asked),
        confidence,
      }),
    };
  }

  const parsed = safeJsonParse(content) || {};
  const question = parsed.question || "Thanks. Can you walk me through a challenging project?";
  const stage = parsed.stage || getStage(session.asked);
  session.asked += 1;
  session.messages.push({ role: "assistant", content: question });
  session.updatedAt = now();

  return { statusCode: 200, body: JSON.stringify({ sessionId, question, stage, confidence }) };
}

export async function handleInterviewQuestions(body) {
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const role = String(payload.role || "");
  const company = String(payload.company || "");
  const topics = toList(payload.topics);
  const count = Math.min(10, Math.max(5, Number(payload.count) || 6));

  const userPrompt = `Role: ${role || "Not specified"}
Company: ${company || "Not specified"}
Topics: ${topics.join(", ") || "Not specified"}
Generate ${count} interview questions now.`;

  const { content, error } = await callOpenRouter({
    system: GENERATE_Q_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 450,
    temperature: 0.3,
  });

  if (error || !content) {
    const fallback = [
      "Tell me about yourself.",
      "Why are you interested in this role?",
      "Describe a challenging project and your contribution.",
      "Explain a data structure you used recently and why.",
      "What would you improve in a system you built?",
      "Describe a time you handled a deadline conflict.",
    ].slice(0, count);
    return { statusCode: 200, body: JSON.stringify({ questions: fallback }) };
  }

  const parsed = safeJsonParse(content);
  if (!parsed || !Array.isArray(parsed.questions)) {
    return { statusCode: 200, body: JSON.stringify({ questions: [] }) };
  }

  return { statusCode: 200, body: JSON.stringify({ questions: parsed.questions.slice(0, count) }) };
}
