import { useParams, Link } from "react-router-dom";
import { useLayoutEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { INTERVIEW_COMPANIES } from "@/data/companies";
import { getCompanyDsaQuestions } from "@/data/companyDsaQuestions";
import { getSqlQuestionsList } from "@/data/sqlQuestions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";
import { useAuth } from "@/contexts/AuthContext";
import { addAssessmentResult } from "@/lib/interview-reports";

const TYPE_LABELS: Record<string, string> = {
  hr: "HR Questions",
  dsa: "DSA Questions",
  sql: "SQL Questions",
};

// Generic HR questions most companies ask
const GENERIC_HR_QUESTIONS: string[] = [
  "Tell me about yourself.",
  "Walk me through your resume.",
  "Why do you want to join our company?",
  "What do you know about our products / services?",
  "Describe a challenging project and how you handled it.",
  "Tell me about a time you had a conflict in a team. How did you resolve it?",
  "Tell me about a time you failed. What did you learn?",
  "What is your greatest strength and your biggest area of improvement?",
  "Describe a situation where you took ownership beyond your responsibilities.",
  "Tell me about a time you worked under a tight deadline.",
  "Where do you see yourself in 3–5 years?",
  "Why should we hire you over other candidates?",
];

// Company-specific HR flavors (fallbacks to GENERIC_HR_QUESTIONS)
const COMPANY_HR_QUESTIONS: Record<string, string[]> = {
  // Google – product + googleyness
  google: [
    "Why do you want to work at Google?",
    "What is your favorite Google product and how would you improve it?",
    "Tell me about a time you had to learn something completely new very quickly.",
    "Tell me about a time you influenced others without having formal authority.",
    "Describe a situation where you solved a problem in a creative way.",
    ...GENERIC_HR_QUESTIONS,
  ],

  // Amazon – leadership principles style
  amazon: [
    "Give me an example of a time you showed ownership.",
    "Tell me about a time you disagreed with your manager and what you did.",
    "Describe a time you delivered results under a very tight deadline.",
    "Tell me about a time you went above and beyond for a customer / stakeholder.",
    "Give an example where you dived deep into a problem to find the root cause.",
    ...GENERIC_HR_QUESTIONS,
  ],

  // Microsoft – collaboration & growth mindset
  microsoft: [
    "Why do you want to join Microsoft?",
    "Tell me about a time you had to collaborate across teams.",
    "Describe a situation where you received critical feedback. How did you respond?",
    "Tell me about a time you mentored or helped a teammate grow.",
    ...GENERIC_HR_QUESTIONS,
  ],

  // Oracle – enterprise / client focus
  oracle: [
    "Why do you want to work at Oracle?",
    "Tell me about a time you dealt with an unhappy customer or stakeholder.",
    "Describe a time you had to quickly understand a complex system or domain.",
    ...GENERIC_HR_QUESTIONS,
  ],

  // Infosys / TCS / Accenture / Capgemini – typical Indian service MNC patterns
  infosys: [
    "Why do you want to start your career at Infosys?",
    "Are you open to relocation and working in different technologies?",
    "Tell me about a time you had to quickly pick up a new technology or subject.",
    ...GENERIC_HR_QUESTIONS,
  ],
  tcs: [
    "Why do you want to join TCS?",
    "Are you comfortable with relocation and working in any project / domain?",
    "Tell me about a time you adapted to a completely new environment.",
    ...GENERIC_HR_QUESTIONS,
  ],
  accenture: [
    "Why Accenture and not other service companies?",
    "Tell me about a time you worked on a client-facing project.",
    "Describe a situation where you had to manage multiple tasks at once.",
    ...GENERIC_HR_QUESTIONS,
  ],
  capgemini: [
    "Why do you want to join Capgemini?",
    "Tell me about a time you worked in a diverse team.",
    ...GENERIC_HR_QUESTIONS,
  ],

  // JP Morgan / Goldman Sachs – finance focus
  "jpmorgan": [
    "Why are you interested in working at JPMorgan?",
    "Tell me about a time you handled a high-pressure or high-stakes situation.",
    "Describe a situation where attention to detail was critical.",
    ...GENERIC_HR_QUESTIONS,
  ],
  "goldman-sachs": [
    "Why do you want to work at Goldman Sachs?",
    "Tell me about a time you worked very long hours on a project.",
    "Describe a time you handled confidential or sensitive information.",
    ...GENERIC_HR_QUESTIONS,
  ],
};

// Placeholder questions for SQL (DSA uses company-wise data from companyDsaQuestions.ts)
const PLACEHOLDER_QUESTIONS: Record<string, string[]> = {
  hr: GENERIC_HR_QUESTIONS,
  sql: [
    "Second highest salary",
    "Nth highest salary",
    "Duplicate emails",
    "Employees earning more than their manager",
    "Department-wise max salary",
    "Rank/dense_rank window functions",
    "Self join practice",
    "Subquery vs JOIN performance",
  ],
};

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

// --- HR answer analysis (feedback API) ---
type HRAnalysisResult = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvedAnswer: string;
  criteria?: Record<string, number>;
};

const CRITERIA_CHART_CONFIG = {
  structure: { label: "Structure", color: "hsl(220 70% 50%)" },
  relevance: { label: "Relevance", color: "hsl(160 55% 45%)" },
  clarity: { label: "Clarity", color: "hsl(35 90% 50%)" },
  impact: { label: "Impact", color: "hsl(35 90% 50%)" },
};

export default function InterviewPrepQuestions() {
  const { company, type } = useParams<{ company: string; type: string }>();
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, HRAnalysisResult | { raw: string }>>({});

  useLayoutEffect(() => {
    scrollToTop();
  }, [company, type]);

  const companyName =
    INTERVIEW_COMPANIES.find((c) => c.id === company)?.name ?? company;
  const typeLabel = TYPE_LABELS[type ?? ""] ?? type;
  let questions: string[] = [];
  let dsaDifficulty: ("easy" | "medium" | "hard")[] = [];
  if (type === "hr") {
    questions = COMPANY_HR_QUESTIONS[company ?? ""] ?? PLACEHOLDER_QUESTIONS.hr;
  } else if (type === "dsa") {
    const dsaSet = getCompanyDsaQuestions(company);
    questions = [...dsaSet.easy, ...dsaSet.medium, ...dsaSet.hard];
    dsaDifficulty = [
      ...dsaSet.easy.map(() => "easy" as const),
      ...dsaSet.medium.map(() => "medium" as const),
      ...dsaSet.hard.map(() => "hard" as const),
    ];
  } else if (type === "sql") {
    questions = getSqlQuestionsList();
  } else if (type) {
    questions = PLACEHOLDER_QUESTIONS[type] ?? [];
  }

  const isHR = type === "hr";
  const isDSA = type === "dsa";
  const isSQL = type === "sql";


  const analyzeAnswer = async (index: number, question: string, answer: string) => {
    const trimmed = answer.trim();
    if (!trimmed) return;
    setLoadingIndex(index);
    setResults((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    try {
      const res = await fetch(`${getApiBase()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer: trimmed,
          type: "hr",
          role: "",
          company: companyName,
          userId: user?.uid || "anonymous",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error || typeof data.score !== "number") {
        setResults((prev) => ({
          ...prev,
          [index]: { raw: data.error || "Could not get analysis. Try again." },
        }));
        return;
      }
      setResults((prev) => ({
        ...prev,
        [index]: data as HRAnalysisResult,
      }));
      if (user?.uid) {
        addAssessmentResult({
          userId: user.uid,
          label: `${companyName} - ${typeLabel}`,
          score: Number(data.score) || 0,
        });
      }
    } catch {
      setResults((prev) => ({
        ...prev,
        [index]: { raw: "Network error. Try again." },
      }));
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative">
          <Link
            to={`/interview-prep?company=${company}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Prep
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {companyName} – {typeLabel}
            </h1>
            <p className="text-muted-foreground">
              {isHR
                ? "Practice your answers below. Type your answer, then get AI feedback with a score graph and an improved version."
                : isDSA
                  ? "Click a question to open the practice page with explanation and code editor."
                  : isSQL
                    ? "Click a question to practice SQL with schema, sample data, and run in the browser."
                    : `Practice these commonly asked questions for ${companyName} interviews.`}
            </p>
          </div>

          <div
            className={cn(
              "grid grid-cols-1 gap-8 lg:gap-10",
              isHR && "lg:grid-cols-[1fr_300px]",
            )}
          >
          <ul className="space-y-6 min-w-0">
            {questions.map((q, i) => (
              <li
                key={i}
                className={cn(
                  "p-4 md:p-5 border-2 border-border bg-card rounded-xl hover:border-primary/30 transition-colors",
                  (isDSA || isSQL) && "cursor-pointer",
                )}
              >
                {isDSA ? (
                  <Link
                    to={`/interview-prep/${company}/dsa/practice/${i}`}
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg -m-1 p-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {dsaDifficulty[i] && (
                        <span
                          className={[
                            "text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                            dsaDifficulty[i] === "easy" &&
                              "bg-green-500/15 text-green-700 dark:text-green-400",
                            dsaDifficulty[i] === "medium" &&
                              "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                            dsaDifficulty[i] === "hard" &&
                              "bg-red-500/15 text-red-700 dark:text-red-400",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {dsaDifficulty[i]}
                        </span>
                      )}
                      <span className="font-medium text-foreground">{q}</span>
                    </div>
                  </Link>
                ) : isSQL ? (
                  <Link
                    to={`/interview-prep/${company}/sql/practice/${i}`}
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg -m-1 p-1"
                  >
                    <span className="font-medium text-foreground">{q}</span>
                  </Link>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {dsaDifficulty[i] && (
                      <span
                        className={[
                          "text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                          dsaDifficulty[i] === "easy" &&
                            "bg-green-500/15 text-green-700 dark:text-green-400",
                          dsaDifficulty[i] === "medium" &&
                            "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                          dsaDifficulty[i] === "hard" &&
                            "bg-red-500/15 text-red-700 dark:text-red-400",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {dsaDifficulty[i]}
                      </span>
                    )}
                    <span className="font-medium text-foreground">{q}</span>
                  </div>
                )}

                {isHR ? (
                  <>
                    <Textarea
                      placeholder="Type your answer here and click Analyze to get feedback..."
                      value={answers[i] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                      }
                      className="min-h-[120px] mb-3 resize-y"
                      disabled={loadingIndex === i}
                    />
                    <Button
                      variant="primary"
                      onClick={() => analyzeAnswer(i, q, answers[i] ?? "")}
                      disabled={loadingIndex === i || !(answers[i] ?? "").trim()}
                      className="gap-2"
                    >
                      {loadingIndex === i ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {loadingIndex === i ? "Analyzing…" : "Analyze with AI"}
                    </Button>

                    {results[i] && (
                      <div className="mt-6 pt-6 border-t border-border">
                        {"raw" in results[i] ? (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {results[i].raw}
                          </p>
                        ) : (
                          <>
                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Overall: {results[i].score}/100
                            </p>
                            {results[i].criteria && (
                              <div className="h-[200px] w-full mb-4">
                                <ChartContainer
                                  config={CRITERIA_CHART_CONFIG}
                                  className="h-full w-full"
                                >
                                  <BarChart
                                    data={Object.entries(results[i].criteria).map(
                                      ([name, value]) => ({
                                        name,
                                        score: value,
                                        fill:
                                          CRITERIA_CHART_CONFIG[name as keyof typeof CRITERIA_CHART_CONFIG]?.color ??
                                          "hsl(220 70% 50%)",
                                      })
                                    )}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                      dataKey="name"
                                      tickFormatter={(v) =>
                                        CRITERIA_CHART_CONFIG[v as keyof typeof CRITERIA_CHART_CONFIG]?.label ?? v
                                      }
                                    />
                                    <YAxis domain={[0, 10]} />
                                    <ChartTooltip
                                      content={
                                        <ChartTooltipContent
                                          formatter={(v) => [v, "Score"]}
                                          labelFormatter={(_, payload) =>
                                            payload?.[0]?.payload?.name
                                              ? CRITERIA_CHART_CONFIG[payload[0].payload.name as keyof typeof CRITERIA_CHART_CONFIG]?.label ?? payload[0].payload.name
                                              : ""
                                          }
                                        />
                                      }
                                    />
                                    <Bar
                                      dataKey="score"
                                      fill="fill"
                                      radius={[4, 4, 0, 0]}
                                    />
                                  </BarChart>
                                </ChartContainer>
                              </div>
                            )}
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm font-semibold text-foreground mb-1">Strengths</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {results[i].strengths.map((f, j) => (
                                    <li key={j}>{f}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground mb-1">Weaknesses</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {results[i].weaknesses.map((f, j) => (
                                    <li key={j}>{f}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3 text-sm">
                              <p className="font-medium text-foreground mb-1">
                                Improved answer
                              </p>
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {results[i].improvedAnswer}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : !isDSA && !isSQL ? (
                  <span className="text-muted-foreground text-sm">
                    (Practice coming soon)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {isHR && (
            <aside className="hidden lg:block lg:sticky lg:top-24 self-start space-y-4">
              <div className="p-5 rounded-xl border-2 border-border bg-card shadow-sm">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Tips for HR answers
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Keep answers concise (1–2 min when spoken).</li>
                  <li>Use the <strong className="text-foreground">STAR</strong> method for situation-based questions.</li>
                  <li>Mention impact and what you learned, not just what you did.</li>
                  <li>Match your examples to the company and role.</li>
                </ul>
              </div>
              <div className="p-5 rounded-xl border-2 border-border bg-card shadow-sm">
                <h3 className="font-semibold text-foreground mb-3">What we score</h3>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li><span className="font-medium text-foreground">Structure</span> — clear flow, intro–body–conclusion</li>
                  <li><span className="font-medium text-foreground">Relevance</span> — answers the question asked</li>
                  <li><span className="font-medium text-foreground">STAR</span> — situation, task, action, result</li>
                  <li><span className="font-medium text-foreground">Clarity</span> — clear language, no filler</li>
                </ul>
              </div>
              <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
                <p className="text-xs font-medium text-foreground mb-1">STAR method</p>
                <p className="text-xs text-muted-foreground">
                  <strong>S</strong>ituation — context<br />
                  <strong>T</strong>ask — your responsibility<br />
                  <strong>A</strong>ction — what you did<br />
                  <strong>R</strong>esult — outcome & learnings
                </p>
              </div>
            </aside>
          )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
