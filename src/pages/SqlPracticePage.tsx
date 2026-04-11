import { useParams, Link } from "react-router-dom";
import { useLayoutEffect, useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft, Database, Play, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { INTERVIEW_COMPANIES } from "@/data/companies";
import { getSqlQuestion } from "@/data/sqlQuestions";
import { Button } from "@/components/ui/button";

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

const DEFAULT_SQL = "-- Write your SQL here\nSELECT * FROM Employee;";

export default function SqlPracticePage() {
  const { company, questionIndex } = useParams();
  const [code, setCode] = useState(DEFAULT_SQL);
  const [result, setResult] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [sqlJs, setSqlJs] = useState<{ Database: new () => { run: (s: string) => void; exec: (s: string) => { columns: string[]; values: unknown[][] }[]; close: () => void } } | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => scrollToTop(), [company, questionIndex]);

  useEffect(() => {
    import("sql.js")
      .then((m) =>
        m.default({
          locateFile: (f: string) =>
            `https://unpkg.com/sql.js@1.13.0/dist/${f}`,
        })
      )
      .then(setSqlJs)
      .catch(() => setSqlJs(null));
  }, []);

  const index = Math.max(0, parseInt(String(questionIndex ?? "0"), 10));
  const question = getSqlQuestion(index);
  const companyName = INTERVIEW_COMPANIES.find((c) => c.id === company)?.name ?? company;

  // Reset output when switching question
  useEffect(() => {
    setError(null);
    setResult(null);
  }, [index]);

  const runQuery = async () => {
    if (!sqlJs || !question) return;
    setError(null);
    setResult(null);
    setIsRunning(true);
    let db: InstanceType<typeof sqlJs.Database> | null = null;
    try {
      db = new sqlJs.Database();
      db.run(question.schemaAndSeed);
      const sqlToRun = code.trim().replace(/^--.*$/gm, "").trim() || "SELECT 1";
      const execResult = db.exec(sqlToRun);
      db.close();
      db = null;
      // Only set result on success — wrong query throws before this
      if (execResult.length) {
        setResult({ columns: execResult[0].columns, rows: execResult[0].values as unknown[][] });
      } else {
        setResult({ columns: ["OK"], rows: [["Done"]] });
      }
    } catch (e) {
      if (db) try { db.close(); } catch (_) {}
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setResult(null);
    } finally {
      setIsRunning(false);
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  if (!question) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-16 container">
          <p className="text-muted-foreground">Question not found.</p>
          <Link to={`/interview-prep/${company}/sql`} className="text-primary underline mt-4 inline-block">
            Back to SQL Questions
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden min-h-[calc(100vh-8rem)]">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative">
          <Link
            to={`/interview-prep/${company}/sql`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {companyName} SQL Questions
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 min-h-[calc(100vh-14rem)]">
            <section className="flex flex-col min-h-0">
              <div className="rounded-xl border-2 border-border bg-card p-5 md:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">{question.title}</h1>
                </div>
                <div className="border-t border-border pt-4 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-1">Problem</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {question.problem}
                    </p>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-1">Schema and Sample Data</h2>
                    <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-48 font-mono text-muted-foreground">
                      {question.schemaAndSeed.trim()}
                    </pre>
                  </div>
                  {question.hint && (
                    <div>
                      <h2 className="text-sm font-semibold text-foreground mb-1">Hint</h2>
                      <p className="text-sm text-muted-foreground">{question.hint}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="flex flex-col flex-1 min-h-0">
              <div className="rounded-xl border-2 border-border bg-card overflow-hidden flex-1 min-h-0 grid grid-rows-[auto_1fr_auto]">
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
                  <span className="text-sm font-medium text-foreground">SQL Editor</span>
                  <Button size="sm" className="gap-1.5" onClick={runQuery} disabled={isRunning || !sqlJs}>
                    <Play className="h-3.5 w-3.5" />
                    {isRunning ? "Running…" : "Run"}
                  </Button>
                </div>
                <div className="min-h-[200px] overflow-hidden border-b border-border">
                  <CodeMirror
                    value={code}
                    height="100%"
                    theme="dark"
                    extensions={[sql()]}
                    onChange={setCode}
                    basicSetup={{ lineNumbers: true, foldGutter: false }}
                    className="text-sm h-full [&_.cm-editor]:h-full [&_.cm-scroller]:min-h-[200px]"
                  />
                </div>
                <div ref={outputRef} className="p-3 bg-muted/20 border-t border-border min-h-0 overflow-auto">
                  <h3 className="text-xs font-semibold text-foreground mb-2">Output</h3>
                  {!sqlJs && <p className="text-xs text-muted-foreground">Loading SQL engine…</p>}
                  {sqlJs && !error && !result && (
                    <p className="text-xs text-muted-foreground py-1">Run your query to see results.</p>
                  )}
                  {error && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-destructive/15 text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Error
                        </span>
                      </div>
                      <pre className="text-xs text-destructive bg-destructive/10 p-2.5 rounded overflow-auto max-h-48 border border-destructive/30">
                        {error}
                      </pre>
                    </div>
                  )}
                  {result && !error && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded",
                          "bg-green-500/15 text-green-700 dark:text-green-400",
                        )}>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Success
                        </span>
                      </div>
                      <div className="overflow-auto max-h-64 rounded border border-border bg-background">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            {result.columns.map((c) => (
                              <th key={c} className="text-left px-2 py-1.5 font-medium text-foreground">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, i) => (
                            <tr key={i} className="border-b border-border/50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-2 py-1.5 text-muted-foreground">
                                  {cell == null ? "NULL" : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.rows.length === 0 && (
                        <p className="px-2 py-3 text-muted-foreground text-xs">No rows returned.</p>
                      )}
                    </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
