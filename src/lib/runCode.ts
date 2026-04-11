/**
 * Run user code in the browser (JS/TS) or via API (Python).
 * Expects code to define a function `solve` that we call with parsed input.
 */
import { getApiBase } from "@/lib/api-base";

const RUN_TIMEOUT_MS = 5000;

export type RunResult =
  | { ok: true; output: string; result: string; logs: string[] }
  | { ok: false; error: string; logs: string[] };

/** Run JavaScript or TypeScript (as JS) in the browser */
export function runCodeInBrowser(code: string, inputJson: string): RunResult {
  const logs: string[] = [];
  const captureLog = (...args: unknown[]) => {
    logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
  };
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = captureLog;
  console.warn = captureLog;
  console.error = captureLog;

  try {
    let input: unknown;
    const trimmed = inputJson.trim();
    if (trimmed === "") {
      input = undefined;
    } else {
      try {
        input = JSON.parse(trimmed);
      } catch {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        return { ok: false, error: "Invalid JSON in test input", logs: [] };
      }
    }

    const fn = new Function(
      "input",
      `
      ${code};
      if (typeof solve !== "function") throw new Error("No function named 'solve' found. Define: function solve(input) { ... }");
      return solve(input);
    `,
    );

    const result = runWithTimeout(() => fn(input), RUN_TIMEOUT_MS);
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;

    const resultStr =
      result === undefined
        ? "undefined"
        : typeof result === "object"
          ? JSON.stringify(result)
          : String(result);
    return {
      ok: true,
      output: resultStr,
      result: resultStr,
      logs,
    };
  } catch (err) {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message, logs };
  }
}

function runWithTimeout<T>(fn: () => T, ms: number): T {
  let resolved = false;
  let result: T;
  let error: unknown;
  const timeoutId = setTimeout(() => {
    if (resolved) return;
    resolved = true;
    throw new Error("Timeout (5s)");
  }, ms);
  try {
    result = fn();
    resolved = true;
    clearTimeout(timeoutId);
    return result;
  } catch (e) {
    resolved = true;
    clearTimeout(timeoutId);
    throw e;
  }
}

/** Run Python/Java/C++/C via API (server must implement POST /api/run-code) */
export async function runCodeOnServer(
  code: string,
  inputJson: string,
  language: "python" | "java" | "cpp" | "c",
): Promise<RunResult> {
  const trimmed = inputJson.trim();
  let input: unknown = undefined;
  if (trimmed !== "") {
    try {
      input = JSON.parse(trimmed);
    } catch {
      return { ok: false, error: "Invalid JSON in test input", logs: [] };
    }
  }
  try {
    const res = await fetch(`${getApiBase()}/api/run-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code, input }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Server error", logs: data.logs || [] };
    }
    if (data.error) {
      return { ok: false, error: data.error, logs: data.logs || [] };
    }
    return {
      ok: true,
      output: data.output ?? String(data.result ?? ""),
      result: data.result != null ? String(data.result) : "",
      logs: data.logs || [],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, logs: [] };
  }
}
