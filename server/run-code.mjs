/**
 * POST /api/run-code — run user code (Python, Java, C++, C).
 * Body: { language: "python"|"java"|"cpp"|"c", code: string, input: any }
 * Returns: { output?: string, result?: string, error?: string, logs?: string[] }
 */
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, mkdtempSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const RUN_TIMEOUT_MS = 10000; // 10s for compile + run
const COMPILE_TIMEOUT_MS = 8000;

function sendResult(resolve, body) {
  resolve({ statusCode: 200, body: JSON.stringify(body) });
}

function sendError(resolve, error, logs = []) {
  resolve({ statusCode: 200, body: JSON.stringify({ error, logs }) });
}

function runProcess(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], ...opts });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (c) => { stdout += c.toString(); });
    proc.stderr?.on("data", (c) => { stderr += c.toString(); });
    proc.on("close", (code, signal) => {
      if (code !== 0 || signal) reject(new Error(stderr || `Exit ${code} ${signal}`));
      else resolve({ stdout, stderr });
    });
    proc.on("error", reject);
    if (proc.stdin) proc.stdin.end(opts.stdin, "utf8");
  });
}

export async function handleRunCode(body) {
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }
  const { language, code, input } = payload;
  const supported = ["python", "java", "cpp", "c"];
  if (!supported.includes(language)) {
    return { statusCode: 400, body: JSON.stringify({ error: `Language ${language} not supported` }) };
  }
  if (typeof code !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid code" }) };
  }

  const dir = mkdtempSync(join(tmpdir(), "run-code-"));
  const inputStr = input !== undefined ? JSON.stringify(input) : "null";

  const cleanup = () => {
    try {
      const files = readdirSync(dir);
      for (const f of files) unlinkSync(join(dir, f));
    } catch (_) {}
  };

  if (language === "python") {
    const script = [
      "import json, sys",
      "input_data = json.load(sys.stdin) if not sys.stdin.isatty() else None",
      "",
      code,
      "",
      "if __name__ == '__main__':",
      "    result = solve(input_data)",
      "    print(json.dumps(result) if result is not None else 'null')",
    ].join("\n");
    writeFileSync(join(dir, "script.py"), script, "utf8");
    return runAndCapture(dir, "python3", ["script.py"], inputStr, cleanup, sendResult, sendError);
  }

  if (language === "java") {
    const solutionPath = join(dir, "Solution.java");
    let javaCode = code.trim();
    if (!javaCode.includes("public static void main")) {
      const main = `
  public static void main(String[] args) {
    java.util.Scanner sc = new java.util.Scanner(System.in);
    String line = sc.hasNextLine() ? sc.nextLine() : "null";
    try { System.out.println(solve(line)); } catch (Exception e) { e.printStackTrace(); }
  }`;
      const lastBrace = javaCode.lastIndexOf("}");
      if (lastBrace >= 0) javaCode = javaCode.slice(0, lastBrace) + main + "\n" + javaCode.slice(lastBrace);
    }
    writeFileSync(solutionPath, javaCode, "utf8");
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        sendError(resolve, "Timeout (10s)", []);
      }, RUN_TIMEOUT_MS);
      runProcess("javac", ["Solution.java"], { cwd: dir })
        .then(() => runProcess("java", ["Solution"], { cwd: dir, stdin: inputStr }))
        .then(({ stdout, stderr }) => {
          clearTimeout(timeout);
          cleanup();
          const lines = stdout.trim().split("\n").filter(Boolean);
          const lastLine = lines[lines.length - 1] ?? "";
          const logs = [...(lines.length > 1 ? lines.slice(0, -1) : []), ...(stderr ? [stderr] : [])];
          sendResult(resolve, { output: lastLine, result: lastLine, logs });
        })
        .catch((err) => {
          clearTimeout(timeout);
          cleanup();
          sendError(resolve, err.message || "Compile or run failed", []);
        });
    });
  }

  if (language === "cpp" || language === "c") {
    const ext = language === "cpp" ? "cpp" : "c";
    const srcPath = join(dir, `main.${ext}`);
    const inputArr = Array.isArray(input) ? input : [input];
    const first = inputArr[0];
    const second = inputArr[1];
    const line1 = Array.isArray(first) ? first.join(",") : String(first ?? "");
    const line2 = second !== undefined ? String(second) : "";
    const stdinSimple = line2 ? `${line1}\n${line2}` : line1;

    let mainCode = "";
    if (language === "cpp") {
      mainCode = `
#include <iostream>
#include <vector>
#include <sstream>
using namespace std;
vector<int> parseLine(const string& s) {
  vector<int> v;
  stringstream ss(s);
  string t;
  while (getline(ss, t, ',')) { v.push_back(stoi(t)); }
  return v;
}
int main() {
  string line1, line2;
  getline(cin, line1);
  getline(cin, line2);
  vector<int> nums = parseLine(line1);
  int target = line2.empty() ? 0 : stoi(line2);
  vector<int> res = solve(nums, target);
  for (size_t i = 0; i < res.size(); i++) cout << (i?" ": "") << res[i];
  cout << endl;
}`;
    } else {
      mainCode = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main() {
  char line1[4096], line2[256];
  if (!fgets(line1, sizeof(line1), stdin)) return 1;
  if (!fgets(line2, sizeof(line2), stdin)) line2[0] = '\\0';
  int n = 0, cap = 8;
  int* nums = (int*)malloc(cap * sizeof(int));
  char* p = strtok(line1, ",\\n ");
  while (p) {
    if (n >= cap) { cap *= 2; nums = (int*)realloc(nums, cap * sizeof(int)); }
    nums[n++] = atoi(p);
    p = strtok(NULL, ",\\n ");
  }
  int target = atoi(line2);
  int retLen = 0;
  int* res = solve(nums, n, target, &retLen);
  for (int i = 0; i < retLen; i++) printf("%s%d", i ? " " : "", res ? res[i] : 0);
  printf("\\n");
  if (res) free(res);
  free(nums);
}`;
    }
    const fullSource = code.trimEnd() + "\n" + mainCode;
    writeFileSync(srcPath, fullSource, "utf8");
    const outBin = join(dir, "out");
    const compiler = language === "cpp" ? "g++" : "gcc";
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        sendError(resolve, "Timeout (10s)", []);
      }, RUN_TIMEOUT_MS);
      runProcess(compiler, language === "cpp" ? ["-o", "out", "main.cpp"] : ["-o", "out", "main.c"], { cwd: dir })
        .then(() => runProcess(outBin, [], { cwd: dir, stdin: stdinSimple }))
        .then(({ stdout, stderr }) => {
          clearTimeout(timeout);
          cleanup();
          const out = stdout.trim().split("\n").pop() || stdout.trim();
          sendResult(resolve, { output: out, result: out, logs: stderr ? [stderr] : [] });
        })
        .catch((err) => {
          clearTimeout(timeout);
          cleanup();
          sendError(resolve, err.message || `${compiler} not found or compile/run failed`, []);
        });
    });
  }

  return { statusCode: 400, body: JSON.stringify({ error: "Unsupported language" }) };
}

function runAndCapture(dir, cmd, args, stdinStr, cleanup, sendResult, sendError) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], cwd: dir });
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      cleanup();
      sendError(resolve, "Timeout (5s)", []);
    }, RUN_TIMEOUT_MS);
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (c) => { stdout += c.toString(); });
    proc.stderr?.on("data", (c) => { stderr += c.toString(); });
    proc.on("close", (code, signal) => {
      clearTimeout(timeout);
      cleanup();
      const logs = stderr.trim() ? stderr.trim().split("\n") : [];
      if (code !== 0 || signal) {
        sendError(resolve, stderr.trim() || `Exit ${code} ${signal}`, logs);
        return;
      }
      const lines = stdout.trim().split("\n").filter(Boolean);
      const lastLine = lines[lines.length - 1] ?? "";
      const allLogs = [...(lines.length > 1 ? lines.slice(0, -1) : []), ...(stderr.trim() ? [stderr.trim()] : [])];
      try {
        const parsed = lastLine ? JSON.parse(lastLine) : null;
        sendResult(resolve, { output: lastLine, result: parsed, logs: allLogs });
      } catch (_) {
        sendResult(resolve, { output: stdout.trim(), result: stdout.trim(), logs: allLogs });
      }
    });
    proc.on("error", (err) => {
      clearTimeout(timeout);
      cleanup();
      sendError(resolve, err.message || `Failed to run ${cmd}`, []);
    });
    proc.stdin?.end(stdinStr, "utf8");
  });
}
