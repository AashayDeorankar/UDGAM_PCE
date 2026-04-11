import { useState, useRef, useEffect, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { StreamLanguage } from "@codemirror/language";
import { clike } from "@codemirror/legacy-modes/mode/clike";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Code2, Play, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { runCodeInBrowser, runCodeOnServer, type RunResult } from "@/lib/runCode";

const DEFAULT_STUBS: Record<string, string> = {
  javascript: `// Write your solution here
function solve(input) {
  // your code
  return;
}

// Example: Two Sum
// function twoSum(nums, target) {
//   const map = new Map();
//   for (let i = 0; i < nums.length; i++) {
//     const need = target - nums[i];
//     if (map.has(need)) return [map.get(need), i];
//     map.set(nums[i], i);
//   }
//   return [];
// }
`,
  python: `# Write your solution here
def solve(input):
    # your code
    pass

# Example: Two Sum
# def two_sum(nums, target):
#     seen = {}
#     for i, n in enumerate(nums):
#         if target - n in seen:
#             return [seen[target - n], i]
#         seen[n] = i
#     return []
`,
  typescript: `// Write your solution here
function solve(input: number[]): unknown {
  // your code
  return;
}

// Example: Two Sum
// function twoSum(nums: number[], target: number): number[] {
//   const map = new Map<number, number>();
//   for (let i = 0; i < nums.length; i++) {
//     const need = target - nums[i];
//     if (map.has(need)) return [map.get(need)!, i];
//     map.set(nums[i], i);
//   }
//   return [];
// }
`,
  java: `// Write your solution here
// solve(String input) receives JSON string, e.g. "[[2,7,11,15], 9]". Return result as JSON string.
import java.util.*;

class Solution {
    public static String solve(String input) {
        // parse input (JSON string), compute answer, return result as JSON string e.g. "[0, 1]"
        return "null";
    }
}
`,
  cpp: `// Write your solution here
#include <vector>
#include <unordered_map>
using namespace std;

// input: pass as needed (e.g. vector<int>& nums, int target)
// return your result
vector<int> solve(vector<int>& nums, int target) {
    // your code
    return {};
}

// Example: Two Sum
// vector<int> twoSum(vector<int>& nums, int target) {
//     unordered_map<int, int> map;
//     for (int i = 0; i < nums.size(); i++) {
//         int need = target - nums[i];
//         if (map.count(need)) return {map[need], i};
//         map[nums[i]] = i;
//     }
//     return {};
// }
`,
  c: `// Write your solution here
#include <stdlib.h>

// Implement your solution; input format depends on the problem
// Return result (e.g. indices array, or pointer to result)
int* solve(int* nums, int numsSize, int target, int* returnSize) {
    *returnSize = 0;
    // your code
    return NULL;
}
`,
};

const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
] as const;

type LangId = (typeof LANGUAGE_OPTIONS)[number]["value"];

export type DsaCodeEditorProps = {
  question: string;
  initialCode?: string;
  className?: string;
  height?: string | number;
  onCodeChange?: (code: string, language: string) => void;
};

const DEFAULT_TEST_INPUT = "[[2, 7, 11, 15], 9]";

export function DsaCodeEditor({
  question,
  initialCode,
  className,
  height = 320,
  onCodeChange,
}: DsaCodeEditorProps) {
  const [language, setLanguage] = useState<LangId>("javascript");
  const [code, setCode] = useState(
    () => initialCode ?? DEFAULT_STUBS.javascript,
  );
  const [testInput, setTestInput] = useState(DEFAULT_TEST_INPUT);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const outputSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (runResult && outputSectionRef.current) {
      outputSectionRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [runResult]);

  const extensions = useMemo(() => {
    if (language === "python") return [python()];
    if (language === "typescript") return [javascript({ typescript: true })];
    if (language === "javascript") return [javascript()];
    if (language === "java") return [java()];
    if (language === "cpp") return [cpp()];
    if (language === "c") return [StreamLanguage.define(clike)];
    return [javascript()];
  }, [language]);

  const handleEditorChange = (value: string) => {
    setCode(value);
    onCodeChange?.(value, language);
  };

  const handleLanguageChange = (val: string) => {
    const next = val as LangId;
    setLanguage(next);
    setCode(DEFAULT_STUBS[next] ?? DEFAULT_STUBS.javascript);
  };

  const resetToStub = () => {
    const stub = DEFAULT_STUBS[language] ?? DEFAULT_STUBS.javascript;
    setCode(stub);
    onCodeChange?.(stub, language);
  };

  const runSupported = true; // all languages: JS/TS in browser, Python/Java/C++/C on server

  const handleRun = async () => {
    setRunResult(null);
    setIsRunning(true);
    try {
      let result: RunResult;
      if (["python", "java", "cpp", "c"].includes(language)) {
        result = await runCodeOnServer(code, testInput, language);
      } else {
        result = runCodeInBrowser(code, testInput);
      }
      setRunResult(result);
      setShowOutput(true);
    } finally {
      setIsRunning(false);
    }
  };

  const fillHeight = height === "100%";
  const editorHeight = fillHeight ? "100%" : typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-border bg-card overflow-hidden flex flex-col",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Code practice</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleRun}
            disabled={isRunning}
          >
            <Play className="h-3.5 w-3.5" />
            {isRunning ? "Running…" : "Run"}
          </Button>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetToStub}>
            Reset template
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "flex flex-col min-h-0",
          fillHeight ? "flex-1" : undefined,
        )}
        style={fillHeight ? undefined : { height: typeof height === "number" ? `${height}px` : height }}
      >
        <div className={cn("flex-1 min-h-[200px]", fillHeight && "min-h-0")}>
          <CodeMirror
            value={code}
            height={editorHeight}
            theme="dark"
            extensions={extensions}
            onChange={handleEditorChange}
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: true,
              highlightSelectionMatches: false,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: false,
            }}
            className={cn("text-sm", fillHeight && "h-full [&_.cm-editor]:h-full [&_.cm-scroller]:min-h-[200px]")}
          />
        </div>

        {/* Test input + Output */}
        <div ref={outputSectionRef} className="border-t border-border bg-muted/20 shrink-0">
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
            onClick={() => setShowOutput((v) => !v)}
          >
            {showOutput ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            Test input & Output
          </button>
          {showOutput && (
            <div className="px-3 pb-3 pt-0 space-y-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Test input (JSON — e.g. <code className="bg-muted px-1 rounded">[[2,7,11,15], 9]</code> for Two Sum)
                </label>
                <textarea
                  className="w-full h-16 rounded border border-border bg-background px-2.5 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder='e.g. [[2,7,11,15], 9] or {"nums":[2,7,11,15],"target":9}'
                  spellCheck={false}
                />
              </div>
              {runResult && (
                <div className="space-y-1.5">
                  {(() => {
                    const isUndefinedOutput =
                      runResult.ok &&
                      (runResult.output === "undefined" ||
                        runResult.output === "null" ||
                        runResult.output.trim() === "");
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded",
                              !runResult.ok
                                ? "bg-destructive/15 text-destructive"
                                : isUndefinedOutput
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "bg-green-500/15 text-green-700 dark:text-green-400",
                            )}
                          >
                            {!runResult.ok
                              ? "✗ Error"
                              : isUndefinedOutput
                                ? "No return value"
                                : "✓ Success"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {runResult.ok ? "Output:" : "Message:"}
                          </span>
                        </div>
                        <pre
                          className={cn(
                            "rounded border p-2.5 text-xs font-mono overflow-auto max-h-32",
                            runResult.ok
                              ? "border-border bg-background text-foreground"
                              : "border-destructive/50 bg-destructive/10 text-destructive",
                          )}
                        >
                          {runResult.ok
                            ? runResult.output || "undefined"
                            : runResult.error}
                          {isUndefinedOutput && (
                            <span className="block mt-2 text-muted-foreground border-t border-border pt-2">
                              Implement solve() and return the result for your test input.
                            </span>
                          )}
                          {runResult.logs.length > 0 && (
                            <span className="block mt-2 text-muted-foreground border-t border-border pt-2">
                              console: {runResult.logs.join(" ")}
                            </span>
                          )}
                        </pre>
                      </>
                    );
                  })()}
                </div>
              )}
              {language === "python" && (
                <p className="text-xs text-muted-foreground">
                  Python runs on the server. Ensure <code className="bg-muted px-1 rounded">python3</code> is installed.
                </p>
              )}
              {["java", "cpp", "c"].includes(language) && (
                <p className="text-xs text-muted-foreground">
                  Run uses server (javac/java, g++/gcc). Ensure JDK or GCC is installed on the dev server.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
