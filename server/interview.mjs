/**
 * Mock interview + question generator.
 * Endpoints:
 * - POST /api/interview/start
 * - POST /api/interview/message
 * - POST /api/interview/questions
<<<<<<< HEAD
 * - POST /api/interview/evaluate
=======
 * - POST /api/interview/report
 * - POST /api/interview/submit
>>>>>>> origin/jayesh-mock-interview
 */
import crypto from "crypto";
import { callOpenRouter, safeJsonParse } from "./openrouter.mjs";
import { recordInterviewScore } from "./analytics.mjs";

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

<<<<<<< HEAD
const GENERATE_MCQ_SYSTEM = `You generate multiple-choice interview questions.
Return JSON ONLY in this exact shape:
{"questions": [{"prompt": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0}]}
Rules:
- 5 to 10 questions.
- 4 options per question, one correct and 3 plausible distractors.
- correctIndex must be 0-3 and point to the correct option.
- No option labels like A/B/C/D.
- Keep prompts concise and role/topic relevant.`;

const EVALUATE_SYSTEM = `You are an interview evaluator.
Return JSON ONLY in this exact shape:
{"evaluations":[{"score":0,"correctAnswer":"...","strengths":["..."],"missingPoints":["..."],"mistakes":["..."],"topic":"..."}]}
Rules:
- score must be integer 0-10.
- correctAnswer must be concise and interview-ready (3-6 lines).
- strengths, missingPoints, mistakes: 1-3 short bullet strings each.
- Be strict but fair.
- No markdown, no extra text.`;

const EVALUATE_MCQ_SYSTEM = `You are an interview evaluator for multiple-choice questions.
Return JSON ONLY in this exact shape:
{"evaluations":[{"correctAnswer":"...","strengths":["..."],"missingPoints":["..."],"mistakes":["..."],"topic":"..."}]}
Rules:
- Do NOT include a score.
- correctAnswer must be a short explanation (2-4 lines) of why the correct option is right.
- strengths, missingPoints, mistakes: 1-2 short bullet strings each.
- No markdown, no extra text.`;
=======
const EVAL_SYSTEM = `You are a professional interviewer evaluating candidate responses.
Return JSON ONLY in this exact shape:
{"technical_score": 0, "correctness": "Correct|Partially Correct|Incorrect", "remark": "...", "improvement": "..."}
Rules:
- technical_score is 0-100.
- remark is 1-2 short sentences.
- improvement is 1 short actionable sentence.
- No extra text or markdown.`;

const REPORT_SYSTEM = `You are an AI interview coach generating final performance report.
Return JSON ONLY in this exact shape:
{"summary": "...", "strengths": ["..."], "weakness": ["..."], "suggestions": ["..."], "recommended_level": "Beginner|Intermediate|Advanced"}
Rules:
- Summary is 1-2 sentences.
- Strengths/weakness/suggestions are short bullets.
- No extra text or markdown.`;

const SUBMIT_SYSTEM = `You are a professional interview evaluator. Analyze full interview and generate performance report.
Return JSON ONLY in this exact shape:
{
  "confidence": 0,
  "fluency": 0,
  "communication": 0,
  "technical": 0,
  "overall": 0,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."],
  "summary": "..."
}
Rules:
- Scores are 0-100.
- Summary is 1-2 sentences.
- Arrays contain short bullets.
- No extra text or markdown.`;
>>>>>>> origin/jayesh-mock-interview

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
  const mode = String(payload.mode || "theory").toLowerCase();

  const userPrompt = `Role: ${role || "Not specified"}
Company: ${company || "Not specified"}
Topics: ${topics.join(", ") || "Not specified"}
Generate ${count} interview questions now.`;

  const { content, error } = await callOpenRouter({
    system: mode === "mcq" ? GENERATE_MCQ_SYSTEM : GENERATE_Q_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
<<<<<<< HEAD
    max_tokens: mode === "mcq" ? 900 : 450,
=======
    model: "google/gemini-2.0-flash-001",
    max_tokens: 450,
>>>>>>> origin/jayesh-mock-interview
    temperature: 0.3,
  });

  if (error || !content) {
    if (mode === "mcq") {
      const fallback = [
        {
          prompt: "Which data structure offers average O(1) lookup?",
          options: ["Hash map", "Binary search tree", "Heap", "Linked list"],
        },
        {
          prompt: "What does SQL GROUP BY do?",
          options: [
            "Aggregates rows by a column",
            "Orders rows ascending",
            "Filters rows by condition",
            "Joins two tables",
          ],
        },
        {
          prompt: "Which HTTP method is idempotent?",
          options: ["GET", "POST", "PATCH", "CONNECT"],
        },
        {
          prompt: "What is a primary key used for?",
          options: ["Uniquely identifying rows", "Sorting rows", "Encrypting data", "Indexing all columns"],
        },
        {
          prompt: "Which runtime is typically used for JavaScript on the server?",
          options: ["Node.js", "JVM", "CLR", "CPython"],
        },
      ].slice(0, count);
      return { statusCode: 200, body: JSON.stringify({ questions: fallback }) };
    }

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

  if (mode === "mcq") {
    const normalized = parsed.questions
      .map((item) => {
        const options = Array.isArray(item?.options)
          ? item.options.map((opt) => String(opt).trim()).filter(Boolean).slice(0, 4)
          : [];
        const correctIndex = Number(item?.correctIndex);
        return {
          prompt: String(item?.prompt || item?.question || "").trim(),
          options,
          correctIndex: Number.isFinite(correctIndex) ? correctIndex : -1,
        };
      })
      .filter((item) => item.prompt && item.options.length === 4 && item.correctIndex >= 0 && item.correctIndex <= 3)
      .slice(0, count);
    return { statusCode: 200, body: JSON.stringify({ questions: normalized }) };
  }

  return { statusCode: 200, body: JSON.stringify({ questions: parsed.questions.slice(0, count) }) };
}

<<<<<<< HEAD
export async function handleInterviewEvaluate(body) {
=======
export async function handleInterviewReport(body) {
>>>>>>> origin/jayesh-mock-interview
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

<<<<<<< HEAD
  const role = String(payload.role || "");
  const company = String(payload.company || "");
  const topics = toList(payload.topics);
  const questions = Array.isArray(payload.questions) ? payload.questions.map((q) => String(q || "")) : [];
  const answers = Array.isArray(payload.answers) ? payload.answers.map((a) => String(a || "")) : [];
  const mode = String(payload.mode || "theory").toLowerCase();
  const correctOptions = Array.isArray(payload.correctOptions)
    ? payload.correctOptions.map((c) => String(c || ""))
    : [];
  const userId = payload.userId || "anonymous";

  if (!questions.length) {
    return { statusCode: 200, body: JSON.stringify({ evaluations: [] }) };
  }

  if (mode === "mcq" && correctOptions.length) {
    const qaBlock = questions
      .map((question, index) => {
        const answer = answers[index] || "";
        const correctAnswer = correctOptions[index] || "";
        const topic = topics.length ? topics[index % topics.length] : "General";
        return `Q${index + 1} [${topic}]: ${question}\nSelected: ${answer || "(no answer)"}\nCorrect: ${correctAnswer}`;
      })
      .join("\n\n");

    const userPrompt = `Role: ${role || "Not specified"}
Company: ${company || "Not specified"}
Topics: ${topics.join(", ") || "Not specified"}

Evaluate these MCQs:\n\n${qaBlock}

Return one evaluation per question in the same order.`;

    const { content, error } = await callOpenRouter({
      system: EVALUATE_MCQ_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 1200,
      temperature: 0.2,
    });

    const parsed = content && !error ? safeJsonParse(content) : null;
    const aiEvaluations = Array.isArray(parsed?.evaluations) ? parsed.evaluations : [];

    const evaluations = questions.map((question, index) => {
      const answer = (answers[index] || "").trim();
      const correctAnswer = correctOptions[index] || "";
      const score = answer && correctAnswer && answer === correctAnswer ? 10 : 0;
      const topic = topics.length ? topics[index % topics.length] : "General";
      const ai = aiEvaluations[index] || {};
      return {
        score,
        topic: String(ai.topic || topic),
        correctAnswer: String(ai.correctAnswer || correctAnswer),
        strengths: Array.isArray(ai.strengths) ? ai.strengths.map((v) => String(v)).slice(0, 2) : score ? ["Selected the correct option"] : [],
        missingPoints: Array.isArray(ai.missingPoints)
          ? ai.missingPoints.map((v) => String(v)).slice(0, 2)
          : score
          ? []
          : ["Review the concept and eliminate distractors"],
        mistakes: Array.isArray(ai.mistakes)
          ? ai.mistakes.map((v) => String(v)).slice(0, 2)
          : score
          ? []
          : ["Selected an incorrect option"],
      };
    });
    const totalScore = evaluations.reduce((sum, ev) => sum + (Number(ev.score) || 0), 0);
    const maxScore = evaluations.length * 10;
    if (maxScore > 0) {
      const percent = Math.round((totalScore / maxScore) * 100);
      recordInterviewScore({
        userId,
        score: percent,
        type: `assessment_${mode}`,
        company,
      });
    }
    return { statusCode: 200, body: JSON.stringify({ evaluations }) };
  }

  const qaBlock = questions
    .map((question, index) => {
      const answer = answers[index] || "";
      const topic = topics.length ? topics[index % topics.length] : "General";
      return `Q${index + 1} [${topic}]: ${question}\nA${index + 1}: ${answer || "(no answer)"}`;
    })
    .join("\n\n");

  const userPrompt = `Role: ${role || "Not specified"}
Company: ${company || "Not specified"}
Topics: ${topics.join(", ") || "Not specified"}

Evaluate these answers:\n\n${qaBlock}

Return one evaluation per question in the same order.`;

  const { content, error } = await callOpenRouter({
    system: EVALUATE_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 1800,
=======
  const results = payload.results;
  if (!Array.isArray(results) || results.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ error: "Missing results" }) };
  }

  const userPrompt = `Based on following interview results generate summary report: ${JSON.stringify(results)}`;

  const { content, error } = await callOpenRouter({
    system: REPORT_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    model: "google/gemini-2.0-flash-001",
    max_tokens: 300,
    temperature: 0.3,
  });

  if (error || !content) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        summary: "Final report unavailable.",
        strengths: [],
        weakness: [],
        suggestions: [],
        recommended_level: "",
        raw: error || "",
      }),
    };
  }

  const parsed = safeJsonParse(content) || {};
  return {
    statusCode: 200,
    body: JSON.stringify({
      summary: String(parsed.summary || ""),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weakness: Array.isArray(parsed.weakness) ? parsed.weakness : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      recommended_level: String(parsed.recommended_level || ""),
      raw: content,
    }),
  };
}

export async function handleInterviewSubmit(body) {
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const interviewData = payload.interview_data;
  const chatTranscript = String(payload.chat_transcript || "");
  if (!Array.isArray(interviewData) || interviewData.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ error: "Missing interview data" }) };
  }

  const transcriptBlock = chatTranscript
    ? `Full chat transcript:\n${chatTranscript}\n\n`
    : "";
  const userPrompt = `\n\nEvaluate this interview:\n\n${transcriptBlock}Questions and Answers:\n${JSON.stringify(interviewData)}\n\nEvaluate based on:\n\n1. Confidence (based on hesitation, fillers, clarity)\n2. Fluency (speech flow and pauses)\n3. Communication (clarity and structure)\n4. Technical correctness of answers\n\nReturn JSON in the required format.`;

  const attempt = async (extraRule) => {
    const prompt = extraRule ? `${userPrompt}\n\n${extraRule}` : userPrompt;
    return await callOpenRouter({
      system: SUBMIT_SYSTEM,
      messages: [{ role: "user", content: prompt }],
      model: "google/gemini-2.0-flash-001",
      max_tokens: 450,
      temperature: 0.2,
    });
  };

  let { content, error } = await attempt("");
  let parsed = safeJsonParse(content || "");
  if (!parsed) {
    const retry = await attempt("Return ONLY valid JSON. No markdown.");
    content = retry.content;
    error = retry.error;
    parsed = safeJsonParse(content || "");
  }

  if (error || !parsed) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        confidence: 0,
        fluency: 0,
        communication: 0,
        technical: 0,
        overall: 0,
        strengths: [],
        weaknesses: [],
        suggestions: [],
        summary: "OpenRouter evaluation unavailable.",
        raw: error || content || "",
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      confidence: Number(parsed.confidence) || 0,
      fluency: Number(parsed.fluency) || 0,
      communication: Number(parsed.communication) || 0,
      technical: Number(parsed.technical) || 0,
      overall: Number(parsed.overall) || 0,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      summary: String(parsed.summary || ""),
      raw: content || "",
    }),
  };
}

export async function handleInterviewEvaluation(body) {
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const question = String(payload.question || "");
  const transcript = String(payload.transcript || "");
  if (!question || !transcript) {
    return { statusCode: 200, body: JSON.stringify({ error: "Missing question or transcript" }) };
  }

  const userPrompt = `Question: ${question}\nCandidate Answer: ${transcript}\nEvaluate correctness and provide score.`;

  const { content, error } = await callOpenRouter({
    system: EVAL_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 250,
>>>>>>> origin/jayesh-mock-interview
    temperature: 0.2,
  });

  if (error || !content) {
<<<<<<< HEAD
    const fallback = questions.map((question, index) => {
      const answer = (answers[index] || "").trim();
      const score = !answer ? 0 : Math.min(10, Math.max(2, Math.floor(answer.split(/\s+/).length / 6)));
      const topic = topics.length ? topics[index % topics.length] : "General";
      return {
        score,
        topic,
        correctAnswer: `A strong answer should clearly define the concept in context, include one practical example, mention trade-offs, and end with impact for the ${role || "target"} role.`,
        strengths: answer ? ["Attempted a response", "Included relevant context"] : ["No attempt provided"],
        missingPoints: ["Add structure: situation, approach, result", "Include specific technical depth"],
        mistakes: answer ? ["Answer is too generic", "Missing measurable impact"] : ["Question left unanswered"],
      };
    });
    return { statusCode: 200, body: JSON.stringify({ evaluations: fallback }) };
  }

  const parsed = safeJsonParse(content);
  if (!parsed || !Array.isArray(parsed.evaluations)) {
    return { statusCode: 200, body: JSON.stringify({ evaluations: [] }) };
  }

  const normalized = questions.map((_, index) => {
    const raw = parsed.evaluations[index] || {};
    const topic = topics.length ? topics[index % topics.length] : "General";
    const numericScore = Number(raw.score);
    return {
      score: Number.isFinite(numericScore) ? Math.min(10, Math.max(0, Math.round(numericScore))) : 0,
      topic: String(raw.topic || topic),
      correctAnswer: String(raw.correctAnswer || ""),
      strengths: Array.isArray(raw.strengths) ? raw.strengths.map((v) => String(v)).slice(0, 3) : [],
      missingPoints: Array.isArray(raw.missingPoints) ? raw.missingPoints.map((v) => String(v)).slice(0, 3) : [],
      mistakes: Array.isArray(raw.mistakes) ? raw.mistakes.map((v) => String(v)).slice(0, 3) : [],
    };
  });

  const totalScore = normalized.reduce((sum, ev) => sum + (Number(ev.score) || 0), 0);
  const maxScore = normalized.length * 10;
  if (maxScore > 0) {
    const percent = Math.round((totalScore / maxScore) * 100);
    recordInterviewScore({
      userId,
      score: percent,
      type: `assessment_${mode}`,
      company,
    });
  }

  return { statusCode: 200, body: JSON.stringify({ evaluations: normalized }) };
=======
    return {
      statusCode: 200,
      body: JSON.stringify({
        technical_score: 0,
        correctness: "",
        remark: "OpenRouter evaluation unavailable.",
        improvement: "",
        raw: error || "",
      }),
    };
  }

  const parsed = safeJsonParse(content) || {};
  const technicalScore = Number(parsed.technical_score);
  return {
    statusCode: 200,
    body: JSON.stringify({
      technical_score: Number.isFinite(technicalScore) ? Math.min(100, Math.max(0, technicalScore)) : 0,
      correctness: String(parsed.correctness || ""),
      remark: String(parsed.remark || ""),
      improvement: String(parsed.improvement || ""),
      raw: content,
    }),
  };
>>>>>>> origin/jayesh-mock-interview
}
