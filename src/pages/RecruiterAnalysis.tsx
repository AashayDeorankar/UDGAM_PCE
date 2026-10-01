import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Users,
  Brain,
  BarChart3,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Download,
  Target,
  Sparkles,
  Star,
  TrendingUp,
  Shield,
  Info,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JDAnalysis {
  title: string;
  seniority: string;
  department: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_years: { min: number; max: number };
  education: string | null;
  responsibilities: string[];
  red_flags: string[];
  must_have_keywords: string[];
  domain: string;
  summary: string;
}

interface Candidate {
  name: string;
  match_score: number;
  skills_matched: string[];
  skills_missing: string[];
  skills_preferred_matched: string[];
  experience_years: number;
  education_match: boolean;
  keyword_overlap: string[];
  false_positives: string[];
  uncertain: string[];
  highlights: string[];
  concerns: string[];
  seniority_fit: string;
  recommendation: "Strong Yes" | "Yes" | "Maybe" | "No";
  explanation: string;
  error?: string;
}

interface ShortlistEntry {
  rank: number;
  name: string;
  match_score: number;
  recommendation: string;
  key_reason: string;
  watch_out: string | null;
  interview_priority: string;
}

interface Shortlist {
  shortlisted: ShortlistEntry[];
  rejected: { name: string; reason: string }[];
  noise_detected: string[];
  recruiter_notes: string;
}

interface InterviewPlan {
  candidate: string;
  recommended_rounds: number;
  rounds: {
    round: number;
    type: string;
    duration_minutes: number;
    focus_areas: string[];
    questions: { question: string; purpose: string; expected_depth: string }[];
  }[];
  skills_to_verify: string[];
  red_flags_to_probe: string[];
  overall_strategy: string;
}

interface ResumeInput {
  id: string;
  name: string;
  text: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Job Description", "Resumes", "Analysis", "Shortlist"] as const;
type Step = (typeof STEPS)[number];

const STEP_ICONS = [FileText, Users, Brain, BarChart3];

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
};

const SCORE_BG = (score: number) => {
  if (score >= 80) return "bg-emerald-500/15 border-emerald-500/30";
  if (score >= 60) return "bg-yellow-500/15 border-yellow-500/30";
  if (score >= 40) return "bg-orange-500/15 border-orange-500/30";
  return "bg-red-500/15 border-red-500/30";
};

const REC_BADGE = {
  "Strong Yes": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Yes: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Maybe: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  No: "bg-red-500/20 text-red-400 border-red-500/30",
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SkillPill({ label, variant = "neutral" }: { label: string; variant?: "green" | "red" | "yellow" | "neutral" }) {
  const cls = {
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    red: "bg-red-500/15 text-red-400 border-red-500/25",
    yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    neutral: "bg-muted text-muted-foreground border-border",
  }[variant];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  );
}

function CandidateCard({ candidate, jdAnalysis, onViewPlan }: { candidate: Candidate; jdAnalysis: JDAnalysis; onViewPlan: (c: Candidate) => void }) {
  const [open, setOpen] = useState(false);

  if (candidate.error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
        <strong>{candidate.name}:</strong> {candidate.error}
      </div>
    );
  }

  const rec = candidate.recommendation as keyof typeof REC_BADGE;

  return (
    <motion.div
      layout
      className="rounded-2xl border border-border bg-card overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-5">
        <ScoreRing score={candidate.match_score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-semibold text-foreground text-base">{candidate.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {candidate.experience_years}y exp · {candidate.seniority_fit} fit
              </p>
            </div>
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border ${REC_BADGE[rec] || REC_BADGE["Maybe"]}`}>
              {candidate.recommendation}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{candidate.explanation}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle details"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills Matched</p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills_matched.length > 0
                    ? candidate.skills_matched.map((s) => <SkillPill key={s} label={s} variant="green" />)
                    : <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills Missing</p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills_missing.length > 0
                    ? candidate.skills_missing.map((s) => <SkillPill key={s} label={s} variant="red" />)
                    : <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
              {candidate.false_positives.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> False Positives (keyword stuffing detected)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.false_positives.map((s) => <SkillPill key={s} label={s} variant="yellow" />)}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Highlights</p>
                <ul className="space-y-1">
                  {candidate.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" /> {h}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Concerns</p>
                <ul className="space-y-1">
                  {candidate.concerns.map((c, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => onViewPlan(candidate)}
                className="inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                <Target className="h-4 w-4" />
                Generate Interview Plan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InterviewPlanView({ plan, onClose }: { plan: InterviewPlan; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-border bg-card z-10">
          <div>
            <h2 className="font-bold text-foreground text-lg">Interview Plan</h2>
            <p className="text-sm text-muted-foreground">{plan.candidate} · {plan.recommended_rounds} rounds</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Strategy */}
          <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Overall Strategy</p>
            <p className="text-sm text-foreground">{plan.overall_strategy}</p>
          </div>

          {/* Skills to verify */}
          {plan.skills_to_verify.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills to Verify Live</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.skills_to_verify.map((s) => <SkillPill key={s} label={s} variant="yellow" />)}
              </div>
            </div>
          )}

          {/* Red flags to probe */}
          {plan.red_flags_to_probe.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Red Flags to Probe
              </p>
              <ul className="space-y-1">
                {plan.red_flags_to_probe.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-400">•</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rounds */}
          {plan.rounds.map((round) => (
            <div key={round.round} className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Round {round.round}
                  </span>
                  <span className="font-semibold text-foreground text-sm">{round.type}</span>
                </div>
                <span className="text-xs text-muted-foreground">{round.duration_minutes} min</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {round.focus_areas.map((a) => <SkillPill key={a} label={a} />)}
                </div>
                <div className="space-y-3">
                  {round.questions.map((q, qi) => (
                    <div key={qi} className="rounded-lg bg-muted/30 p-3">
                      <p className="text-sm text-foreground font-medium">{q.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Purpose: <span className="text-violet-400">{q.purpose}</span> · Depth:{" "}
                        <span className="text-blue-400">{q.expected_depth}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RecruiterAnalysis() {
  const { role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && role && role !== "recruiter") {
      navigate("/jobs", { replace: true });
    }
  }, [role, authLoading, navigate]);

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>("Job Description");

  if (!authLoading && role && role !== "recruiter") {
    return null;
  }

  // JD
  const [jdText, setJdText] = useState("");
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysis | null>(null);
  const [jdLoading, setJdLoading] = useState(false);

  // Resumes
  const [resumes, setResumes] = useState<ResumeInput[]>([
    { id: crypto.randomUUID(), name: "", text: "" },
  ]);

  // Candidates
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Shortlist
  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [shortlistLoading, setShortlistLoading] = useState(false);

  // Interview Plan
  const [interviewPlan, setInterviewPlan] = useState<InterviewPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  // ── Step 1: Analyze JD ─────────────────────────────────────────────────────

  const analyzeJD = async () => {
    if (jdText.trim().length < 50) {
      toast({ variant: "destructive", title: "JD too short", description: "Please paste a proper job description." });
      return;
    }
    setJdLoading(true);
    try {
      const res = await fetch("/api/recruiter/analyze-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setJdAnalysis(data.jdAnalysis);
      setCurrentStep("Resumes");
      toast({ title: "JD Analyzed ✨", description: `${data.jdAnalysis.title} · ${data.jdAnalysis.seniority}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setJdLoading(false);
    }
  };

  // ── Step 2: Add Resumes ────────────────────────────────────────────────────

  const addResume = () => {
    if (resumes.length >= 20) {
      toast({ title: "Max 20 resumes", description: "Remove one to add another." });
      return;
    }
    setResumes((prev) => [...prev, { id: crypto.randomUUID(), name: "", text: "" }]);
  };

  const removeResume = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const updateResume = (id: string, field: "name" | "text", value: string) => {
    setResumes((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // ── Step 3: Analyze Resumes ─────────────────────────────────────────────────

  const analyzeResumes = async () => {
    const valid = resumes.filter((r) => r.name.trim() && r.text.trim().length > 50);
    if (valid.length === 0) {
      toast({ variant: "destructive", title: "No valid resumes", description: "Add candidate name and resume text." });
      return;
    }
    setAnalysisLoading(true);
    try {
      const res = await fetch("/api/recruiter/analyze-resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdAnalysis, resumes: valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setCandidates(data.candidates);
      setCurrentStep("Analysis");
      toast({ title: "Candidates Scored 🎯", description: `${data.candidates.length} candidates analyzed` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ── Step 4: Generate Shortlist ─────────────────────────────────────────────

  const generateShortlist = async () => {
    setShortlistLoading(true);
    try {
      const res = await fetch("/api/recruiter/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdAnalysis, candidates, topN: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Shortlist failed");
      setShortlist(data.shortlist);
      setCurrentStep("Shortlist");
      toast({ title: "Shortlist Ready ✅", description: `Top ${data.shortlist.shortlisted.length} candidates selected` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setShortlistLoading(false);
    }
  };

  // ── Interview Plan ─────────────────────────────────────────────────────────

  const fetchInterviewPlan = async (candidate: Candidate) => {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/recruiter/interview-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate, jdAnalysis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Plan failed");
      setInterviewPlan(data.interviewPlan);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setPlanLoading(false);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportReport = () => {
    const data = { jdAnalysis, candidates, shortlist, generatedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recruitment-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const stepIndex = STEPS.indexOf(currentStep);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Loading overlay for interview plan */}
      <AnimatePresence>
        {planLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
              <p className="text-sm text-muted-foreground">Generating interview plan…</p>
            </div>
          </motion.div>
        )}
        {interviewPlan && !planLoading && (
          <InterviewPlanView plan={interviewPlan} onClose={() => setInterviewPlan(null)} />
        )}
      </AnimatePresence>

      <main className="flex-1 pt-20 md:pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Back */}
          <button
            onClick={() => navigate("/recruiter")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Recruiter Hub
          </button>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-10 relative">
            <div className="absolute left-0 right-0 top-5 h-px bg-border -z-0" />
            {STEPS.map((step, i) => {
              const Icon = STEP_ICONS[i];
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={step} className="flex flex-col items-center gap-2 z-10">
                  <button
                    disabled={i > stepIndex}
                    onClick={() => i <= stepIndex && setCurrentStep(step)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      done
                        ? "bg-violet-600 border-violet-600 text-white"
                        : active
                        ? "bg-card border-violet-500 text-violet-400 shadow-lg shadow-violet-500/25"
                        : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </button>
                  <span className={`text-xs font-medium hidden sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">

            {/* ── STEP 1: JD ────────────────────────────────────────────── */}
            {currentStep === "Job Description" && (
              <motion.div key="jd" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-1">Paste Job Description</h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    Paste the full JD and our AI will extract required skills, detect noise, and build a scoring rubric.
                  </p>
                  <textarea
                    id="jd-textarea"
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the full job description here…"
                    rows={14}
                    className="w-full rounded-xl bg-muted border border-border text-foreground text-sm p-4 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-muted-foreground/50 font-mono"
                  />
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">{jdText.length} chars</span>
                    <button
                      id="analyze-jd-btn"
                      onClick={analyzeJD}
                      disabled={jdLoading || jdText.trim().length < 50}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {jdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                      {jdLoading ? "Analyzing…" : "Analyze JD"}
                    </button>
                  </div>
                </div>

                {/* JD Analysis results */}
                {jdAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <h3 className="font-semibold text-foreground">JD Parsed Successfully</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      {[
                        { label: "Role", value: jdAnalysis.title },
                        { label: "Seniority", value: jdAnalysis.seniority },
                        { label: "Domain", value: jdAnalysis.domain },
                        { label: "Exp.", value: `${jdAnalysis.experience_years.min}–${jdAnalysis.experience_years.max}y` },
                        { label: "Dept.", value: jdAnalysis.department },
                        { label: "Education", value: jdAnalysis.education || "Not specified" },
                      ].map((kv) => (
                        <div key={kv.label} className="rounded-lg bg-card border border-border p-3">
                          <p className="text-xs text-muted-foreground">{kv.label}</p>
                          <p className="text-sm font-semibold text-foreground truncate">{kv.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {jdAnalysis.required_skills.map((s) => <SkillPill key={s} label={s} variant="green" />)}
                      </div>
                    </div>
                    {jdAnalysis.red_flags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Potential Noise / Vague Requirements
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {jdAnalysis.red_flags.map((f) => <SkillPill key={f} label={f} variant="yellow" />)}
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-4 italic">{jdAnalysis.summary}</p>
                    <button
                      onClick={() => setCurrentStep("Resumes")}
                      className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-blue-500 transition-all duration-200"
                    >
                      Continue to Resumes <ChevronRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Resumes ───────────────────────────────────────── */}
            {currentStep === "Resumes" && (
              <motion.div key="resumes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Add Candidate Resumes</h2>
                    <p className="text-muted-foreground text-sm">Paste each candidate's resume text. Max 20 candidates.</p>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground bg-card border border-border px-3 py-1 rounded-lg">
                    {resumes.length}/20
                  </span>
                </div>

                {resumes.map((resume, i) => (
                  <motion.div
                    key={resume.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 text-xs font-bold">
                        {i + 1}
                      </span>
                      <input
                        id={`candidate-name-${i}`}
                        value={resume.name}
                        onChange={(e) => updateResume(resume.id, "name", e.target.value)}
                        placeholder="Candidate name"
                        className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                      {resumes.length > 1 && (
                        <button
                          onClick={() => removeResume(resume.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <textarea
                      id={`resume-text-${i}`}
                      value={resume.text}
                      onChange={(e) => updateResume(resume.id, "text", e.target.value)}
                      placeholder="Paste the candidate's full resume text here…"
                      rows={6}
                      className="w-full rounded-xl bg-muted border border-border text-foreground text-xs p-3 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-muted-foreground/50 font-mono"
                    />
                  </motion.div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <button
                    id="add-resume-btn"
                    onClick={addResume}
                    disabled={resumes.length >= 20}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Candidate
                  </button>
                  <button
                    id="analyze-resumes-btn"
                    onClick={analyzeResumes}
                    disabled={analysisLoading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 transition-all duration-200"
                  >
                    {analysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                    {analysisLoading ? "Scoring Candidates…" : "Score All Candidates"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Analysis ──────────────────────────────────────── */}
            {currentStep === "Analysis" && (
              <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Candidate Analysis</h2>
                    <p className="text-muted-foreground text-sm">{candidates.length} candidates scored · sorted by match score</p>
                  </div>
                  <button
                    id="generate-shortlist-btn"
                    onClick={generateShortlist}
                    disabled={shortlistLoading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 transition-all duration-200"
                  >
                    {shortlistLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {shortlistLoading ? "Generating…" : "Generate Shortlist"}
                  </button>
                </div>

                {candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.name}
                    candidate={candidate}
                    jdAnalysis={jdAnalysis!}
                    onViewPlan={fetchInterviewPlan}
                  />
                ))}
              </motion.div>
            )}

            {/* ── STEP 4: Shortlist ─────────────────────────────────────── */}
            {currentStep === "Shortlist" && shortlist && (
              <motion.div key="shortlist" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">AI Shortlist</h2>
                    <p className="text-muted-foreground text-sm">Explainable, ranked shortlist</p>
                  </div>
                  <button
                    id="export-report-btn"
                    onClick={exportReport}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <Download className="h-4 w-4" /> Export Report
                  </button>
                </div>

                {/* Recruiter Notes */}
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/8 p-5">
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" /> Recruiter Intelligence Notes
                  </p>
                  <p className="text-sm text-foreground">{shortlist.recruiter_notes}</p>
                </div>

                {/* Noise detected */}
                {shortlist.noise_detected.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-4">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Keyword Stuffing Detected
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {shortlist.noise_detected.join(", ")} — these candidates listed skills not evidenced by actual experience.
                    </p>
                  </div>
                )}

                {/* Shortlisted */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400" /> Shortlisted Candidates
                  </h3>
                  <div className="space-y-3">
                    {shortlist.shortlisted.map((entry) => {
                      const fullCandidate = candidates.find((c) => c.name === entry.name);
                      return (
                        <motion.div
                          key={entry.rank}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: entry.rank * 0.07 }}
                          className={`rounded-xl border p-4 ${SCORE_BG(entry.match_score)}`}
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                              entry.rank === 1 ? "bg-yellow-500 text-yellow-950" :
                              entry.rank === 2 ? "bg-slate-400 text-slate-950" :
                              entry.rank === 3 ? "bg-amber-700 text-amber-50" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              #{entry.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{entry.name}</span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${SCORE_COLOR(entry.match_score)} bg-transparent border-current`}>
                                  {entry.match_score}%
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded border ${
                                  entry.interview_priority === "High" ? "text-emerald-400 border-emerald-400/30" :
                                  entry.interview_priority === "Medium" ? "text-yellow-400 border-yellow-400/30" :
                                  "text-muted-foreground border-border"
                                }`}>
                                  {entry.interview_priority} priority
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{entry.key_reason}</p>
                              {entry.watch_out && (
                                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 shrink-0" /> {entry.watch_out}
                                </p>
                              )}
                            </div>
                            {fullCandidate && (
                              <button
                                onClick={() => fetchInterviewPlan(fullCandidate)}
                                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                              >
                                <Target className="h-3.5 w-3.5" /> Interview Plan
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Rejected */}
                {shortlist.rejected.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" /> Not Shortlisted
                    </h3>
                    <div className="space-y-2">
                      {shortlist.rejected.map((r) => (
                        <div key={r.name} className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-3">
                          <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium text-foreground text-sm">{r.name}</span>
                            <p className="text-xs text-muted-foreground">{r.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Restart */}
                <button
                  id="restart-analysis-btn"
                  onClick={() => {
                    setCurrentStep("Job Description");
                    setJdAnalysis(null);
                    setJdText("");
                    setResumes([{ id: crypto.randomUUID(), name: "", text: "" }]);
                    setCandidates([]);
                    setShortlist(null);
                    setInterviewPlan(null);
                  }}
                  className="w-full mt-2 py-3 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted transition-colors"
                >
                  Start New Analysis
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
