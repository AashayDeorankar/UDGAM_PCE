import { useState, useLayoutEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Briefcase, MessageCircle, Code, Database, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INTERVIEW_COMPANIES, type CompanyId } from "@/data/companies";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";
import { useAuth } from "@/contexts/AuthContext";

const QUESTION_TYPES = [
  {
    id: "hr" as const,
    title: "Company-wise HR Questions",
    description: "Behavioral and HR round questions for this company.",
    icon: MessageCircle,
    slug: "hr",
  },
  {
    id: "dsa" as const,
    title: "Company-wise DSA Questions",
    description: "Data Structures & Algorithms questions asked in interviews.",
    icon: Code,
    slug: "dsa",
  },
  {
    id: "sql" as const,
    title: "Company-wise SQL Questions",
    description: "SQL and database questions for this company.",
    icon: Database,
    slug: "sql",
  },
] as const;

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

const VALID_IDS = new Set(INTERVIEW_COMPANIES.map((c) => c.id));

type AssessmentMode = "theory" | "mcq";

type AssessmentQuestion =
  | { type: "theory"; prompt: string }
  | { type: "mcq"; prompt: string; options: string[]; correctIndex: number };

type AssessmentEvaluation = {
  score: number;
  topic: string;
  correctAnswer: string;
  strengths: string[];
  missingPoints: string[];
  mistakes: string[];
};

export default function InterviewPrep() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const companyFromUrl = searchParams.get("company") || "";
  const [company, setCompany] = useState<CompanyId | "">(
    (VALID_IDS.has(companyFromUrl) ? companyFromUrl : "") as CompanyId | ""
  );
  const [companyOpen, setCompanyOpen] = useState(false);
  const [roleInput, setRoleInput] = useState("");
  const [topicsInput, setTopicsInput] = useState("");
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>("theory");
  const [assessmentCount, setAssessmentCount] = useState(6);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState<string[]>([]);
  const [assessmentEvaluations, setAssessmentEvaluations] = useState<AssessmentEvaluation[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentSubmitting, setAssessmentSubmitting] = useState(false);

  useLayoutEffect(() => {
    scrollToTop();
  }, []);

  useLayoutEffect(() => {
    if (companyFromUrl && VALID_IDS.has(companyFromUrl) && company !== companyFromUrl) {
      setCompany(companyFromUrl as CompanyId);
    }
  }, [companyFromUrl]);


  const startAssessment = async () => {
    if (assessmentLoading) return;
    setAssessmentLoading(true);
    setAssessmentEvaluations([]);
    try {
      const res = await fetch(`${getApiBase()}/api/interview/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleInput,
          company,
          topics: topicsInput,
          count: assessmentCount,
          mode: assessmentMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (assessmentMode === "mcq") {
        const mcqs = Array.isArray(data.questions) ? data.questions : [];
        const normalized = mcqs
          .map((item) => ({
            type: "mcq" as const,
            prompt: String(item?.prompt || "").trim(),
            options: Array.isArray(item?.options)
              ? item.options.map((opt: string) => String(opt).trim()).filter(Boolean)
              : [],
            correctIndex: Number.isFinite(Number(item?.correctIndex)) ? Number(item?.correctIndex) : -1,
          }))
          .filter((item) => item.prompt && item.options.length >= 2 && item.correctIndex >= 0)
          .slice(0, assessmentCount);
        setAssessmentQuestions(normalized);
        setAssessmentAnswers(Array(normalized.length).fill(""));
      } else {
        const qs = Array.isArray(data.questions) ? data.questions : [];
        const normalized = qs
          .map((q: string) => String(q).trim())
          .filter(Boolean)
          .slice(0, assessmentCount)
          .map((prompt: string) => ({ type: "theory" as const, prompt }));
        setAssessmentQuestions(normalized);
        setAssessmentAnswers(Array(normalized.length).fill(""));
      }
    } catch {
      setAssessmentQuestions([]);
      setAssessmentAnswers([]);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const submitAssessment = async () => {
    if (assessmentSubmitting || !assessmentQuestions.length) return;
    setAssessmentSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/interview/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleInput,
          company,
          topics: topicsInput,
          questions: assessmentQuestions.map((q) => q.prompt),
          answers: assessmentAnswers,
          mode: assessmentMode,
          correctOptions:
            assessmentMode === "mcq"
              ? assessmentQuestions.map((q) =>
                  q.type === "mcq" && q.correctIndex >= 0 ? q.options[q.correctIndex] : ""
                )
              : [],
          userId: user?.uid || "anonymous",
        }),
      });
      const data = await res.json().catch(() => ({}));
      setAssessmentEvaluations(Array.isArray(data.evaluations) ? data.evaluations : []);
    } catch {
      setAssessmentEvaluations([]);
    } finally {
      setAssessmentSubmitting(false);
    }
  };

  const totalScore = assessmentEvaluations.reduce((sum, ev) => sum + (Number(ev.score) || 0), 0);
  const maxScore = assessmentEvaluations.length * 10;
  const scorePercent = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;
  const scoreBadge =
    scorePercent >= 85 ? "Legend" : scorePercent >= 70 ? "Gold" : scorePercent >= 55 ? "Silver" : "Bronze";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.span
              className="sticker-green-soft mb-4 inline-block"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              Interview Prep
            </motion.span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="underline-sketch">Company-wise</span> Questions
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Select a company to see HR, DSA, and SQL questions asked in their interviews.
            </p>
          </motion.div>

          <motion.div
            className="max-w-xl mx-auto mb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <label className="block text-sm font-medium mb-2">Select Company</label>
            <p className="text-xs text-muted-foreground mb-2">
              Search by name or scroll to see all {INTERVIEW_COMPANIES.length} companies
            </p>
            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={companyOpen}
                  className={cn(
                    "w-full h-12 justify-between border-2 border-foreground rounded-xl bg-background hover:border-primary/50 font-normal",
                    !company && "text-muted-foreground"
                  )}
                >
                  {company
                    ? INTERVIEW_COMPANIES.find((c) => c.id === company)?.name
                    : "Search or choose company..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search company..." className="h-11" />
                  <CommandList>
                    <CommandEmpty>No company found.</CommandEmpty>
                    <CommandGroup>
                      {INTERVIEW_COMPANIES.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setCompany(c.id as CompanyId);
                            setCompanyOpen(false);
                          }}
                        >
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </motion.div>

          <div className="max-w-4xl mx-auto mb-10 border-2 border-foreground bg-card shadow-[6px_6px_0_0_hsl(var(--foreground))] p-4 md:p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="space-y-2">
                <span className="sticker-outline text-[10px]">ASSESSMENT MODE</span>
                <h3 className="text-xl font-bold text-foreground">Assessment Test</h3>
                <p className="text-xs text-muted-foreground">Pick a mode, generate questions, then submit for AI scoring.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={assessmentMode === "theory" ? "default" : "outline"}
                  size="sm"
                  className={assessmentMode === "theory" ? "btn-punch" : "border-2"}
                  onClick={() => setAssessmentMode("theory")}
                >
                  Theory
                </Button>
                <Button
                  variant={assessmentMode === "mcq" ? "default" : "outline"}
                  size="sm"
                  className={assessmentMode === "mcq" ? "btn-punch" : "border-2"}
                  onClick={() => setAssessmentMode("mcq")}
                >
                  MCQ
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/30 border-2 border-border rounded-lg p-3">
                <label className="text-xs font-medium text-muted-foreground">Target role</label>
                <Input
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="SDE / Data Analyst"
                  className="mt-2 border-2"
                />
              </div>
              <div className="bg-muted/30 border-2 border-border rounded-lg p-3">
                <label className="text-xs font-medium text-muted-foreground">Topics (comma-separated)</label>
                <Input
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  placeholder="DSA, SQL, System Design"
                  className="mt-2 border-2"
                />
              </div>
              <div className="bg-muted/30 border-2 border-border rounded-lg p-3">
                <label className="text-xs font-medium text-muted-foreground">Question count</label>
                <Input
                  type="number"
                  min={5}
                  max={10}
                  value={assessmentCount}
                  onChange={(e) => setAssessmentCount(Math.min(10, Math.max(5, Number(e.target.value) || 5)))}
                  className="mt-2 border-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2 border-2" onClick={startAssessment} disabled={assessmentLoading}>
                {assessmentLoading ? "Generating..." : "Start Assessment"}
              </Button>
              <Button
                className="gap-2 btn-punch"
                onClick={submitAssessment}
                disabled={assessmentSubmitting || !assessmentQuestions.length}
              >
                {assessmentSubmitting ? "Evaluating..." : "Submit for Evaluation"}
              </Button>
            </div>

            {assessmentQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="border-2 border-border bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-foreground">Assessment questions</p>
                    <span className="sticker text-[10px]">GOOD LUCK</span>
                  </div>
                  <div className="space-y-5">
                    {assessmentQuestions.map((q, i) => (
                      <div key={`${q.prompt}-${i}`} className="border-2 border-dashed border-border rounded-lg p-4 bg-card">
                        <p className="text-sm font-semibold text-foreground">
                          {i + 1}. {q.prompt}
                        </p>
                        {q.type === "theory" ? (
                          <Textarea
                            value={assessmentAnswers[i] || ""}
                            onChange={(e) => {
                              const next = [...assessmentAnswers];
                              next[i] = e.target.value;
                              setAssessmentAnswers(next);
                            }}
                            placeholder="Write your answer..."
                            className="mt-3 min-h-[120px] border-2 bg-muted/20"
                          />
                        ) : (
                          <div className="grid gap-2 md:grid-cols-2 mt-3">
                            {q.options.map((opt, idx) => {
                              const selected = assessmentAnswers[i] === opt;
                              return (
                                <Button
                                  key={`${opt}-${idx}`}
                                  type="button"
                                  variant={selected ? "default" : "outline"}
                                  className={`justify-start whitespace-normal text-left border-2 ${selected ? "btn-punch" : "bg-muted/20"}`}
                                  onClick={() => {
                                    const next = [...assessmentAnswers];
                                    next[i] = opt;
                                    setAssessmentAnswers(next);
                                  }}
                                >
                                  {opt}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {assessmentEvaluations.length > 0 && (
              <div className="space-y-4">
                <div className="border-2 border-foreground bg-card p-4 rounded-lg shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Assessment Results</p>
                      <p className="text-sm text-muted-foreground">Badge: {scoreBadge} · Points: {totalScore * 10}</p>
                    </div>
                    <div className="text-sm font-semibold text-foreground">Score: {scorePercent}%</div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-border">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {assessmentEvaluations.map((ev, i) => (
                    <div key={`${ev.topic}-${i}`} className="paper-card p-4 border-2 border-border">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Q{i + 1} · {ev.topic}</p>
                        <span className="sticker text-[10px]">{ev.score}/10</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Ideal answer</p>
                      <p className="text-sm text-foreground whitespace-pre-line">{ev.correctAnswer}</p>
                      <div className="grid md:grid-cols-3 gap-3 mt-3 text-xs text-muted-foreground">
                        <div className="bg-muted/30 border-2 border-border rounded-lg p-2">
                          <p className="font-semibold text-foreground mb-1">Strengths</p>
                          <ul className="list-disc list-inside space-y-1">
                            {ev.strengths?.length ? ev.strengths.map((item, idx) => <li key={idx}>{item}</li>) : <li>—</li>}
                          </ul>
                        </div>
                        <div className="bg-muted/30 border-2 border-border rounded-lg p-2">
                          <p className="font-semibold text-foreground mb-1">Missing</p>
                          <ul className="list-disc list-inside space-y-1">
                            {ev.missingPoints?.length ? ev.missingPoints.map((item, idx) => <li key={idx}>{item}</li>) : <li>—</li>}
                          </ul>
                        </div>
                        <div className="bg-muted/30 border-2 border-border rounded-lg p-2">
                          <p className="font-semibold text-foreground mb-1">Mistakes</p>
                          <ul className="list-disc list-inside space-y-1">
                            {ev.mistakes?.length ? ev.mistakes.map((item, idx) => <li key={idx}>{item}</li>) : <li>—</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {company ? (
            <motion.div
              className="grid md:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {QUESTION_TYPES.map((type, index) => (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, type: "spring", stiffness: 200, damping: 20 }}
                >
                  <Link to={`/interview-prep/${company}/${type.slug}`} className="group block h-full">
                    <div
                      className="paper-card h-full p-6 border-2 border-border hover:border-primary/50 hover:shadow-lg hover:shadow-foreground/10 transition-all duration-300 flex flex-col"
                      style={{ transform: `rotate(${index % 2 === 0 ? -0.5 : 0.5}deg)` }}
                    >
                    <div className="p-3 w-fit rounded-lg bg-primary/10 border border-primary/20 mb-4">
                      <type.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                      {type.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 flex-grow">
                      {type.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Open
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
                  </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
              <p className="text-muted-foreground">
                Select a company above to view HR, DSA & SQL questions.
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />

    </div>
  );
}
