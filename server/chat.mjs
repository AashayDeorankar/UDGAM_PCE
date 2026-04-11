/**
 * Chat API – OpenRouter only (from scratch).
 * Reads OPENROUTER_API_KEY from .env. Used by api.mjs and Vite dev middleware.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseEnv(content) {
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[m[1]] = value;
  }
}

function loadEnv() {
  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), ".env.local"),
    join(__dirname, "..", ".env"),
    join(__dirname, "..", ".env.local"),
  ];
  for (const envPath of candidates) {
    try {
      const content = readFileSync(envPath, "utf-8");
      parseEnv(content);
    } catch (_) {}
  }
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Paid key – use a paid model (no :free). Cheap & good: openai/gpt-3.5-turbo
const DEFAULT_MODEL = "openai/gpt-3.5-turbo";

/**
 * Handle one chat request. Body = JSON string with { messages, system?, max_tokens?, temperature? }.
 * @param {string} body
 * @returns {Promise<{ statusCode: number, body: string }>}
 */
export async function handleChat(body) {
  try {
    loadEnv();
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";

    if (!apiKey) {
      return {
        statusCode: 200,
        body: JSON.stringify({ content: null, error: "OPENROUTER_API_KEY not set in .env" }),
      };
    }

    let data;
    try {
      data = JSON.parse(String(body || "{}"));
    } catch {
      return { statusCode: 200, body: JSON.stringify({ content: null, error: "Invalid JSON" }) };
    }

    const rawMessages = Array.isArray(data.messages) ? data.messages : [];
    const systemMsg = rawMessages.find((m) => m && m.role === "system");
    const chatMessages = rawMessages.filter((m) => m && m.role !== "system");
    const systemText =
      (systemMsg && systemMsg.content) ||
      (typeof data.system === "string" ? data.system : null) ||
      "You are TechPrep AI, a friendly study buddy for BTech students. Always answer in English only. Be clear and concise. If the user says they still didn't get it, explain the same concept again in simpler English with more real-world examples—still in English only, no Hindi.";

    const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
    const payload = {
      model,
      messages: [{ role: "system", content: systemText }, ...chatMessages],
      max_tokens: data.max_tokens ?? 800,
      temperature: data.temperature ?? 0.7,
    };

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:8080",
        "X-Title": "TechPrep",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err =
        result?.error?.message ?? result?.error ?? result?.message ?? `HTTP ${res.status}`;
      const errStr = String(err).toLowerCase();
      const msg =
        res.status === 401 || /invalid|unauthorized|credits|endpoints/i.test(errStr)
          ? "OpenRouter: key invalid or out of credits. Get a new key at https://openrouter.ai/keys and set OPENROUTER_API_KEY in .env"
          : err;
      try {
        console.error("[OpenRouter]", res.status, result?.error || result);
      } catch (_) {}
      return {
        statusCode: 200,
        body: JSON.stringify({
          content: null,
          error: typeof msg === "string" ? msg : String(msg),
        }),
      };
    }

    const content = result.choices?.[0]?.message?.content ?? "No response.";
    return { statusCode: 200, body: JSON.stringify({ content, usage: result.usage }) };
  } catch (err) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        content: null,
        error: err?.message || "OpenRouter request failed. Check network or try again.",
      }),
    };
  }
  } catch (e) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        content: null,
        error: (e && (e.message || e.code)) || "Chat failed. Try again.",
      }),
    };
  }
}
