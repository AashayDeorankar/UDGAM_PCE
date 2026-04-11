/**
 * Shared OpenRouter helper.
 * Returns plain content from the assistant or an error string.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-3.5-turbo";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callOpenRouter({
  system,
  messages,
  model,
  max_tokens,
  temperature,
}) {
  loadEnv();
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return { content: null, error: "OPENROUTER_API_KEY not set in .env" };
  }

  const payload = {
    model: model || process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    messages: [{ role: "system", content: system }, ...(messages || [])],
    max_tokens: max_tokens ?? 700,
    temperature: temperature ?? 0.2,
  };

  const attempts = [0, 350, 900];
  let lastError = null;
  for (const delay of attempts) {
    if (delay) await sleep(delay);
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
        lastError = typeof msg === "string" ? msg : String(msg);
        continue;
      }

      const content = result.choices?.[0]?.message?.content ?? "";
      return { content, error: null };
    } catch (err) {
      lastError = err?.message || "OpenRouter request failed. Check network or try again.";
    }
  }

  return { content: null, error: lastError || "OpenRouter request failed." };
}

export function safeJsonParse(text) {
  if (typeof text !== "string") return null;
  const raw = text.trim();
  if (!raw) return null;
  let jsonStr = raw;
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1].trim();
  try {
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}
