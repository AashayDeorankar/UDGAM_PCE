/**
 * POST /api/matchmaking
 * Body: { skills: string[], targetRole: string, weakAreas: string[], mentors: Mentor[] }
 * Returns: { ranked: [{ name, score, reason }], top: string[] }
 */
import { callOpenRouter, safeJsonParse } from "./openrouter.mjs";

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((v) => String(v || "").trim()).filter(Boolean);
}

function simpleMatchRank({ skills, targetRole, weakAreas, mentors }) {
  const skillSet = new Set(normalizeList(skills).map((s) => s.toLowerCase()));
  const weakSet = new Set(normalizeList(weakAreas).map((s) => s.toLowerCase()));
  const target = String(targetRole || "").toLowerCase();

  const scored = (mentors || []).map((m) => {
    const expertise = normalizeList(m.expertise).map((s) => s.toLowerCase());
    const role = String(m.role || "").toLowerCase();
    let score = 0;
    for (const s of expertise) {
      if (skillSet.has(s)) score += 12;
      if (weakSet.has(s)) score += 10;
      if (target && (s.includes(target) || target.includes(s))) score += 8;
    }
    if (target && role.includes(target)) score += 12;
    return { name: m.name, score: Math.min(100, score || 15) };
  });

  scored.sort((a, b) => b.score - a.score);
  return {
    ranked: scored.slice(0, 8).map((s) => ({ name: s.name, score: s.score, reason: "Matched by expertise overlap." })),
    top: scored.slice(0, 3).map((s) => s.name),
  };
}

const SYSTEM_PROMPT = `You are an expert mentor matchmaking engine. Rank mentors for the user.
Return JSON ONLY in this exact shape:
{"ranked": [{"name": "", "score": 0-100, "reason": ""}], "top": ["name1", "name2", "name3"]}
Rules:
- Use ONLY mentor names from the provided list.
- Score 0-100, higher is better. Sort ranked by score desc.
- Reason: 1 short sentence, mention exact overlap (skills/role/weak areas).
- Return 3-6 ranked items and 3 top names.`;

export async function handleMatchmaking(body) {
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const skills = normalizeList(payload.skills);
  const weakAreas = normalizeList(payload.weakAreas);
  const targetRole = String(payload.targetRole || "");
  const mentors = Array.isArray(payload.mentors) ? payload.mentors : [];

  if (!mentors.length) {
    return { statusCode: 200, body: JSON.stringify({ ranked: [], top: [] }) };
  }

  const userPrompt = `User profile:\n- Target role: ${targetRole || "Not specified"}\n- Skills: ${skills.join(", ") || "Not specified"}\n- Weak areas: ${weakAreas.join(", ") || "Not specified"}\n\nMentors (name, role, expertise, experience):\n${mentors
    .map(
      (m) =>
        `- ${m.name} | ${m.role} | ${normalizeList(m.expertise).join(";")} | ${m.experience}`,
    )
    .join("\n")}`;

  const { content, error } = await callOpenRouter({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 600,
    temperature: 0.2,
  });

  if (error || !content) {
    const fallback = simpleMatchRank({ skills, targetRole, weakAreas, mentors });
    return { statusCode: 200, body: JSON.stringify({ ...fallback, error }) };
  }

  const parsed = safeJsonParse(content);
  if (!parsed || !Array.isArray(parsed.ranked)) {
    const fallback = simpleMatchRank({ skills, targetRole, weakAreas, mentors });
    return { statusCode: 200, body: JSON.stringify({ ...fallback, error: "Bad AI response" }) };
  }

  return { statusCode: 200, body: JSON.stringify(parsed) };
}
