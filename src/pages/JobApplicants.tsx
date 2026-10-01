import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  fetchApplicants, runAnalysis, generateShortlistAPI, fetchShortlist, fetchCandidateAnalysis,
  makeApplicationDecision,
  type Job, type Application, type Shortlist, type ShortlistedCandidate, type CandidateAnalysis,
} from "@/hooks/useJobs";
import {
  ChevronLeft, Users, Brain, Star, AlertTriangle, CheckCircle2,
  RefreshCw, Zap, Target, FileText, TrendingUp, Info, ExternalLink,
  ShieldAlert, Award, ChevronDown, ChevronUp, Eye, X, Loader2,
  Briefcase, GraduationCap, FolderGit2, Clock, Sparkles,
  XCircle, AlertCircle,
} from "lucide-react";

function NoiseBadge({ risk }: { risk: string }) {
  const c = risk === "high" ? "bg-red-500/20 text-red-400 border-red-500/30"
          : risk === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  const icon = risk === "high" ? <AlertTriangle className="h-3 w-3" />
             : risk === "medium" ? <ShieldAlert className="h-3 w-3" />
             : <CheckCircle2 className="h-3 w-3" />;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c}`}>
      {icon} {risk} noise
    </span>
  );
}

function ScoreBar({ score, max = 100, color = "violet" }: { score: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const colors: Record<string, string> = {
    violet: "bg-violet-500",
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };
  const bg = colors[color] || colors.violet;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{score}</span>
    </div>
  );
}

function ShortlistedCard({ c, rank, onOpenDetails }: { c: ShortlistedCandidate; rank: number; onOpenDetails?: (appId: string) => void }) {
  const [open, setOpen] = useState(false);
  const noiseColor = c.noise?.noise_risk === "high" ? "red" : c.noise?.noise_risk === "medium" ? "orange" : "green";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card/80 backdrop-blur overflow-hidden"
    >
      <div className="p-4 flex items-start gap-4">
        {/* Rank badge */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${rank <= 3 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-muted text-muted-foreground"}`}>
          #{rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-semibold text-foreground">{c.name}</h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-medium text-violet-400">{c.match_score}/100</span>
                {c.noise && <NoiseBadge risk={c.noise.noise_risk} />}
                {c.missing_requirements?.length === 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <Award className="h-3 w-3" /> All required skills matched
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(!open)} className="rounded-xl h-8 text-xs gap-1">
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {open ? "Hide" : "Why shortlisted?"}
              </Button>
              {onOpenDetails && (
                <Button size="sm" variant="ghost" onClick={() => onOpenDetails(c.applicationId)} className="rounded-xl h-8 text-xs gap-1 text-violet-400 hover:text-violet-300">
                  <Eye className="h-3 w-3" /> Full Evidence
                </Button>
              )}
            </div>
          </div>
          <div className="mt-3">
            <ScoreBar score={c.match_score} color="violet" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/50"
          >
            <div className="p-4 space-y-4">
              {/* Why shortlisted */}
              {c.why_shortlisted?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Evidence Summary</p>
                  <div className="space-y-1">
                    {c.why_shortlisted.map((reason, i) => (
                      <p key={i} className={`text-sm ${reason.startsWith("✓") ? "text-emerald-400" : reason.startsWith("✗") ? "text-red-400" : "text-yellow-400"}`}>
                        {reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Factor breakdown */}
              {c.factor_breakdown && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Score Breakdown</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      { label: "Required Coverage", key: "required_skill_coverage", color: "blue" },
                      { label: "Evidence Strength", key: "evidence_strength", color: "violet" },
                      { label: "Project Relevance", key: "project_relevance", color: "green" },
                      { label: "Experience Match", key: "experience_relevance", color: "orange" },
                    ].map(({ label, key, color }) => (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <ScoreBar score={c.factor_breakdown[key] || 0} color={color} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched requirements */}
              {c.matched_requirements?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Matched Requirements</p>
                  <div className="flex flex-wrap gap-2">
                    {c.matched_requirements.map((m, i) => (
                      <span key={i} className={`px-2 py-1 rounded-lg text-xs border ${m.strength === "strong" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-blue-500/15 text-blue-400 border-blue-500/30"}`}>
                        {m.strength === "strong" ? "✓" : "~"} {m.skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing */}
              {c.missing_requirements?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Missing Requirements</p>
                  <div className="flex flex-wrap gap-2">
                    {c.missing_requirements.map((s, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg text-xs border bg-red-500/10 text-red-400 border-red-500/25">✗ {s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Noise */}
              {c.noise?.noise_flags?.length > 0 && (
                <div className="rounded-xl p-3 bg-yellow-500/5 border border-yellow-500/20">
                  <p className="text-xs font-semibold text-yellow-400 mb-1 flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Noise Indicators</p>
                  {c.noise.noise_flags.map((f, i) => <p key={i} className="text-xs text-muted-foreground">{f}</p>)}
                </div>
              )}

              {/* Watch out */}
              {c.watch_out && c.watch_out.length > 0 && (
                <div className="rounded-xl p-3 bg-orange-500/5 border border-orange-500/20">
                  <p className="text-xs font-semibold text-orange-400 mb-1">Watch Out</p>
                  {c.watch_out.map((w, i) => <p key={i} className="text-xs text-muted-foreground">{w}</p>)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CandidateDetailsDialog({
  isOpen,
  onClose,
  jobId,
  appId,
  applicant,
  analysis,
  loading,
  onAnalyze,
  analyzing,
  onDecisionSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  appId: string | null;
  applicant?: Application;
  analysis: CandidateAnalysis | null;
  loading: boolean;
  onAnalyze: () => void;
  analyzing: boolean;
  onDecisionSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [decisionMode, setDecisionMode] = useState<"idle" | "accept" | "reject">("idle");
  const [rejectionReason, setRejectionReason] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    setRejectionReason(analysis?.rejectionReason || applicant?.rejectionReason || "");
    setDecisionNotes(analysis?.decisionNotes || applicant?.decisionNotes || "");
    setDecisionMode("idle");
  }, [analysis, applicant]);

  if (!isOpen) return null;

  const candidateName = analysis?.name || applicant?.studentName || "Candidate";
  const candidateEmail = applicant?.studentEmail || "";
  const resumeFile = applicant?.resumeFileName || "resume.pdf";
  const currentStatus = analysis?.status || applicant?.status || "applied";

  const suggestedReasons = [
    analysis?.missing_requirements && analysis.missing_requirements.length > 0
      ? `Missing required technical skills: ${analysis.missing_requirements.slice(0, 3).join(", ")}.`
      : null,
    analysis?.noise?.noise_risk === "high"
      ? "Skills listed in resume keywords lack demonstrated project evidence or quantifiable results."
      : null,
    analysis?.candidate_info?.years_experience !== undefined && analysis.candidate_info.years_experience < 2
      ? "Demonstrated experience is below the required threshold for this role."
      : null,
    "Profile does not meet the key qualification requirements for this position.",
    "Selected other candidates with closer alignment to the immediate project stack.",
  ].filter(Boolean) as string[];

  const handleSaveDecision = async (status: "accepted" | "rejected") => {
    if (!jobId || !appId) return;
    if (status === "rejected" && !rejectionReason.trim()) {
      toast({ title: "Reason required", description: "Please enter or select a reason for rejection.", variant: "destructive" });
      return;
    }
    setSubmittingDecision(true);
    const res = await makeApplicationDecision(jobId, appId, {
      status,
      rejectionReason: status === "rejected" ? rejectionReason.trim() : undefined,
      decisionNotes: status === "accepted" ? (decisionNotes.trim() || "Congratulations! You have been accepted for the next round.") : undefined,
      decidedBy: "Recruiter",
    });
    setSubmittingDecision(false);
    if (res.error) {
      toast({ title: "Failed to record decision", description: res.error, variant: "destructive" });
      return;
    }
    toast({
      title: status === "accepted" ? "Candidate Accepted! 🎉" : "Candidate Rejected",
      description: status === "accepted"
        ? "Application marked as accepted. Updated on student dashboard."
        : "Rejection decision and reason recorded. Updated on student dashboard.",
    });
    setDecisionMode("idle");
    await onDecisionSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-border/60 flex items-start justify-between gap-4 bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-violet-500/20">
              {candidateName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg text-foreground">{candidateName}</h3>
                {analysis?.match_score !== undefined && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {analysis.match_score}/100 Match
                  </span>
                )}
                {analysis?.noise && <NoiseBadge risk={analysis.noise.noise_risk} />}
                {currentStatus === "accepted" && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ✓ Accepted
                  </span>
                )}
                {currentStatus === "rejected" && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                    ✗ Rejected
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>{candidateEmail}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{resumeFile}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Extracting Evidence & Verification…</p>
              <p className="text-xs text-muted-foreground mt-1">Analyzing resume claims against JD requirements</p>
            </div>
          ) : analysis ? (
            <>
              {/* Quick Profile Stats */}
              {analysis.candidate_info && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/30">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Briefcase className="h-3.5 w-3.5 text-blue-400" /> Experience
                    </p>
                    <p className="text-sm font-semibold">{analysis.candidate_info.years_experience || 0} yrs</p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/30">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <GraduationCap className="h-3.5 w-3.5 text-violet-400" /> Education
                    </p>
                    <p className="text-sm font-semibold truncate" title={analysis.candidate_info.education || "Degree in CS"}>
                      {analysis.candidate_info.education || "CS / Eng Degree"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/30">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <FolderGit2 className="h-3.5 w-3.5 text-emerald-400" /> Projects
                    </p>
                    <p className="text-sm font-semibold">{analysis.candidate_info.num_projects || 0} documented</p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/30">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Clock className="h-3.5 w-3.5 text-amber-400" /> Work History
                    </p>
                    <p className="text-sm font-semibold">{analysis.candidate_info.num_jobs || 0} positions</p>
                  </div>
                </div>
              )}

              {/* Score Factor Breakdown */}
              {analysis.factor_breakdown && (
                <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evaluation Breakdown</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                    {[
                      { label: "Required Skills Coverage", val: analysis.factor_breakdown.required_skill_coverage, color: "blue" },
                      { label: "Evidence Strength & Verification", val: analysis.factor_breakdown.evidence_strength, color: "violet" },
                      { label: "Project Relevance", val: analysis.factor_breakdown.project_relevance, color: "green" },
                      { label: "Experience Alignment", val: analysis.factor_breakdown.experience_relevance, color: "orange" },
                      { label: "Preferred Skills", val: analysis.factor_breakdown.preferred_coverage, color: "blue" },
                      { label: "Noise / False-Positive Penalty", val: analysis.factor_breakdown.noise_penalty || 0, color: "red" },
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono font-medium">{val}</span>
                        </div>
                        <ScoreBar score={val} color={color} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Requirements with Verified Quotes */}
              {analysis.matched_requirements && analysis.matched_requirements.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Matched Requirements & Resume Evidence
                  </p>
                  <div className="space-y-2">
                    {analysis.matched_requirements.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-border/50 bg-muted/20 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {m.skill}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            m.strength === "strong"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                          }`}>
                            {m.strength === "strong" ? "Strong Evidence" : "Moderate Evidence"}
                          </span>
                        </div>
                        {m.evidence && (
                          <p className="text-muted-foreground italic bg-background/40 p-2 rounded-lg border border-border/30 mt-1">
                            “{m.evidence}”
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Requirements */}
              {analysis.missing_requirements && analysis.missing_requirements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Missing Job Requirements
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.missing_requirements.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-medium border border-red-500/30 bg-red-500/10 text-red-300">
                        ✗ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills section only warning (Keyword stuffing detection) */}
              {analysis.skills_section_only && analysis.skills_section_only.length > 0 && (
                <div className="p-3.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 space-y-1">
                  <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" /> Listed Only in Skills Section (No Supporting Projects)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    These skills appear only in keyword lists with zero verifiable impact or work experience:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysis.skills_section_only.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-300 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Noise detection summary */}
              {analysis.noise && analysis.noise.noise_flags && analysis.noise.noise_flags.length > 0 && (
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" /> AI Resume Noise & Anti-Gaming Report
                  </p>
                  <div className="space-y-1">
                    {analysis.noise.noise_flags.map((flag, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-violet-400" /> {flag}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Recruiter Decision Panel */}
              <div className="rounded-2xl border border-border/80 bg-muted/25 p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Award className="h-4 w-4 text-violet-400" />
                      Recruiter Decision & Candidate Outcome
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Accept or reject this candidate. Results and reasons are instantly updated on the student's dashboard.
                    </p>
                  </div>
                  <div>
                    {currentStatus === "accepted" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Candidate Accepted
                      </span>
                    ) : currentStatus === "rejected" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                        <XCircle className="h-3.5 w-3.5" /> Candidate Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                        Pending Decision
                      </span>
                    )}
                  </div>
                </div>

                {/* If already decided and not editing */}
                {decisionMode === "idle" && (currentStatus === "accepted" || currentStatus === "rejected") && (
                  <div className={`p-4 rounded-xl border ${currentStatus === "accepted" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"} text-xs space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm flex items-center gap-1.5">
                        {currentStatus === "accepted" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                        {currentStatus === "accepted" ? "Accepted for Next Interview Round" : "Rejection Reason Shared with Student"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDecisionMode(currentStatus === "accepted" ? "accept" : "reject")}
                        className="h-7 text-xs px-2.5 underline hover:bg-black/20"
                      >
                        Change Decision
                      </Button>
                    </div>
                    {currentStatus === "rejected" && (
                      <p className="text-foreground/90 pl-5 leading-relaxed bg-background/50 p-2.5 rounded-lg border border-border/40 font-mono text-[11px]">
                        “{rejectionReason || "Application did not meet requirements."}”
                      </p>
                    )}
                    {currentStatus === "accepted" && decisionNotes && (
                      <p className="text-foreground/90 pl-5 leading-relaxed bg-background/50 p-2.5 rounded-lg border border-border/40">
                        “{decisionNotes}”
                      </p>
                    )}
                  </div>
                )}

                {/* Idle Mode: Show Buttons */}
                {decisionMode === "idle" && currentStatus !== "accepted" && currentStatus !== "rejected" && (
                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      onClick={() => setDecisionMode("accept")}
                      className="flex-1 rounded-xl h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Accept Candidate
                    </Button>
                    <Button
                      onClick={() => {
                        setDecisionMode("reject");
                        if (!rejectionReason && suggestedReasons[0]) {
                          setRejectionReason(suggestedReasons[0]);
                        }
                      }}
                      className="flex-1 rounded-xl h-10 gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-600/20"
                    >
                      <XCircle className="h-4 w-4" /> Reject Candidate
                    </Button>
                  </div>
                )}

                {/* Accept Mode */}
                {decisionMode === "accept" && (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                    <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Accept Candidate & Send Next Steps
                    </p>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Note / Next steps for candidate (shown on their dashboard):
                      </label>
                      <textarea
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        placeholder="e.g. Congratulations! Your profile has been shortlisted. We will reach out to schedule your interview."
                        rows={2}
                        className="w-full text-xs p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDecisionMode("idle")}
                        className="h-8 text-xs rounded-lg"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={submittingDecision}
                        onClick={() => handleSaveDecision("accepted")}
                        className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
                      >
                        {submittingDecision ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Confirm Acceptance
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reject Mode */}
                {decisionMode === "reject" && (
                  <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-3">
                    <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                      <XCircle className="h-4 w-4" /> Reject Candidate & Specify Reason
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This constructive reason will be displayed directly on the student's dashboard so they know why they were not selected.
                    </p>

                    {/* AI Suggestions */}
                    {suggestedReasons.length > 0 && (
                      <div>
                        <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                          Quick AI Suggested Reasons (click to select):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestedReasons.map((sug, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setRejectionReason(sug)}
                              className="text-left text-xs p-1.5 px-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Reason for Rejection <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Specify the reason why this candidate was rejected (e.g. Missing required Docker skills, project experience was not verifiable)..."
                        rows={3}
                        className="w-full text-xs p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDecisionMode("idle")}
                        className="h-8 text-xs rounded-lg"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={submittingDecision || !rejectionReason.trim()}
                        onClick={() => handleSaveDecision("rejected")}
                        className="h-8 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white gap-1.5 font-semibold"
                      >
                        {submittingDecision ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-violet-500/15 text-violet-400 flex items-center justify-center mx-auto">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Candidate Pending AI Analysis</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  This candidate application has not been evaluated against the job description yet.
                </p>
              </div>
              <Button
                onClick={onAnalyze}
                disabled={analyzing}
                className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Run AI Analysis Now
              </Button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/60 flex items-center justify-end gap-2 bg-muted/10">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs h-9">
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function JobApplicants() {
  const { role, loading: authLoading } = useAuth();
  const { jobId, appId } = useParams<{ jobId: string; appId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && role && role !== "recruiter") {
      navigate("/jobs", { replace: true });
    }
  }, [role, authLoading, navigate]);

  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingShortlist, setGeneratingShortlist] = useState(false);
  const [view, setView] = useState<"applicants" | "shortlist">("applicants");

  // Candidate Details Modal State
  const [selectedAppId, setSelectedAppId] = useState<string | null>(appId || null);
  const [candidateAnalysis, setCandidateAnalysis] = useState<CandidateAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (appId) {
      setSelectedAppId(appId);
    }
  }, [appId]);

  useEffect(() => {
    if (!jobId || !selectedAppId) {
      setCandidateAnalysis(null);
      return;
    }
    const loadAnalysis = async () => {
      setLoadingAnalysis(true);
      const res = await fetchCandidateAnalysis(jobId, selectedAppId);
      if (res.analysis) {
        setCandidateAnalysis(res.analysis);
      } else {
        setCandidateAnalysis(null);
      }
      setLoadingAnalysis(false);
    };
    loadAnalysis();
  }, [jobId, selectedAppId]);

  const handleOpenDetails = (targetAppId: string) => {
    setSelectedAppId(targetAppId);
    navigate(`/recruiter/candidate/${jobId}/${targetAppId}`);
  };

  const handleCloseDetails = () => {
    setSelectedAppId(null);
    setCandidateAnalysis(null);
    navigate(`/recruiter/jobs/${jobId}/applicants`, { replace: true });
  };

  if (!authLoading && role && role !== "recruiter") {
    return null;
  }

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    const [appData, slData] = await Promise.all([
      fetchApplicants(jobId),
      fetchShortlist(jobId).catch(() => ({ shortlist: null })),
    ]);
    if (appData.job) setJob(appData.job);
    if (appData.applicants) setApplicants(appData.applicants);
    if (slData.shortlist) setShortlist(slData.shortlist);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const handleDecisionSaved = async () => {
    await load();
    if (jobId && selectedAppId) {
      const res = await fetchCandidateAnalysis(jobId, selectedAppId);
      if (res.analysis) {
        setCandidateAnalysis(res.analysis);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!jobId) return;
    setAnalyzing(true);
    toast({ title: "Analysis started", description: "Running AI evidence pipeline on all resumes…" });
    const result = await runAnalysis(jobId);
    setAnalyzing(false);
    if (result.error) {
      toast({ title: "Analysis error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: `Analysis complete! ✅`, description: `${result.analyzed} resumes analyzed (${result.done}/${result.total} total done)` });
    await load();
  };

  const handleShortlist = async () => {
    if (!jobId) return;
    setGeneratingShortlist(true);
    toast({ title: "Generating shortlist…", description: "Evidence-based ranking in progress" });
    const result = await generateShortlistAPI(jobId);
    setGeneratingShortlist(false);
    if (result.error) {
      toast({ title: "Shortlist error", description: result.error, variant: "destructive" });
      return;
    }
    setShortlist(result.shortlist || null);
    setView("shortlist");
    toast({ title: "Shortlist generated! 🎯", description: `${result.shortlist?.shortlist_size_achieved} candidates shortlisted from ${result.shortlist?.total_candidates}` });
  };

  const analyzedCount = applicants.filter((a) => a.aiStatus === "analyzed").length;
  const pendingCount = applicants.length - analyzedCount;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Loading applicants…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <button onClick={() => navigate("/recruiter")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back to Dashboard
            </button>
            {job && (
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
                  <p className="text-muted-foreground">{job.companyName} · Shortlist size: {job.shortlistSize}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={load}
                    size="sm"
                    className="rounded-xl h-9 gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing || applicants.length === 0}
                    className="rounded-xl h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {analyzing ? (
                      <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Analyzing…</>
                    ) : (
                      <><Brain className="h-3.5 w-3.5" /> Run AI Analysis</>
                    )}
                  </Button>
                  <Button
                    onClick={handleShortlist}
                    disabled={generatingShortlist || analyzedCount === 0}
                    className="rounded-xl h-9 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {generatingShortlist ? (
                      <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Generating…</>
                    ) : (
                      <><Zap className="h-3.5 w-3.5" /> Generate Shortlist</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          {job && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { icon: Users, label: "Total Applicants", value: applicants.length, color: "blue" },
                { icon: Brain, label: "Analyzed", value: `${analyzedCount}/${applicants.length}`, color: "violet" },
                { icon: Target, label: "Pending", value: pendingCount, color: pendingCount > 0 ? "orange" : "green" },
                { icon: Star, label: "Shortlist Size", value: job.shortlistSize, color: "yellow" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-xl border bg-card/80 p-3 flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${color}-500/15`}>
                    <Icon className={`h-4 w-4 text-${color}-400`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-bold text-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analysis progress bar */}
          {applicants.length > 0 && (
            <div className="rounded-xl border bg-card/80 p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">AI Analysis Progress</p>
                <span className="text-sm text-muted-foreground">{analyzedCount}/{applicants.length}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
                  style={{ width: applicants.length ? `${(analyzedCount / applicants.length) * 100}%` : "0%" }}
                />
              </div>
              {pendingCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {pendingCount} resume{pendingCount !== 1 ? "s" : ""} pending analysis — click "Run AI Analysis" to process
                </p>
              )}
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-2 mb-6">
            {(["applicants", "shortlist"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  view === tab
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card/80 text-muted-foreground border-border hover:border-foreground/30"
                }`}
              >
                {tab === "applicants" ? `Applicants (${applicants.length})` : `Shortlist${shortlist ? ` (${shortlist.shortlist_size_achieved})` : ""}`}
              </button>
            ))}
          </div>

          {/* Applicants Table */}
          {view === "applicants" && (
            <div className="rounded-2xl border bg-card/80 overflow-hidden">
              {applicants.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground">No applications yet. Students will appear here once they apply.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-medium text-muted-foreground">Candidate</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Resume</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Applied</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">AI Status</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Score</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Noise</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Decision</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicants.map((app, i) => (
                        <motion.tr
                          key={app.applicationId}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04 } }}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-foreground">{app.studentName}</p>
                              <p className="text-xs text-muted-foreground">{app.studentEmail}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
                              <FileText className="h-3.5 w-3.5" />
                              {app.resumeFileName || "resume.pdf"}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                              app.aiStatus === "analyzed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                              app.aiStatus === "error" ? "bg-red-500/15 text-red-400 border-red-500/25" :
                              "bg-muted text-muted-foreground border-border"
                            }`}>
                              {app.aiStatus === "analyzed" ? <CheckCircle2 className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                              {app.aiStatus || "Pending"}
                            </span>
                          </td>
                          <td className="p-4">
                            {app.match_score !== undefined ? (
                              <div className="flex items-center gap-2 min-w-[80px]">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${app.match_score}%` }} />
                                </div>
                                <span className="text-xs font-mono">{app.match_score}</span>
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="p-4">
                            {app.noise_risk ? <NoiseBadge risk={app.noise_risk} /> : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="p-4">
                            {app.status === "accepted" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3" /> Accepted
                              </span>
                            ) : app.status === "rejected" ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30"
                                title={app.rejectionReason || "Application Rejected"}
                              >
                                <XCircle className="h-3 w-3" /> Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <Button
                              size="sm"
                              variant={app.aiStatus === "analyzed" ? "outline" : "ghost"}
                              onClick={() => handleOpenDetails(app.applicationId)}
                              className={`h-8 px-2.5 rounded-xl text-xs gap-1.5 transition-colors ${
                                app.aiStatus === "analyzed"
                                  ? "border-violet-500/30 text-violet-300 hover:bg-violet-500/15 hover:text-violet-200"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {app.aiStatus === "analyzed" ? "Review & Decide" : "View"}
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Shortlist View */}
          {view === "shortlist" && (
            <div className="space-y-4">
              {!shortlist ? (
                <div className="rounded-2xl border bg-card/80 p-12 text-center">
                  <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground mb-4">No shortlist generated yet.</p>
                  <Button
                    onClick={handleShortlist}
                    disabled={generatingShortlist || analyzedCount === 0}
                    className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Zap className="h-4 w-4" /> Generate Evidence-Based Shortlist
                  </Button>
                  {analyzedCount === 0 && <p className="text-xs text-muted-foreground mt-3">Run AI Analysis first</p>}
                </div>
              ) : (
                <>
                  {/* Shortlist header */}
                  <div className="rounded-2xl border bg-gradient-to-r from-violet-500/10 to-blue-500/10 p-5">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <h2 className="font-bold text-lg flex items-center gap-2"><Star className="h-5 w-5 text-yellow-400" /> AI Shortlist</h2>
                        <p className="text-muted-foreground text-sm">
                          {shortlist.shortlist_size_achieved} of {shortlist.shortlist_size_requested} positions filled
                          · from {shortlist.total_candidates} candidates
                          · generated {new Date(shortlist.generated_at).toLocaleString()}
                        </p>
                        {shortlist.shortfall_explanation && (
                          <p className="text-xs text-orange-400 mt-1"><AlertTriangle className="h-3 w-3 inline mr-1" />{shortlist.shortfall_explanation}</p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={handleShortlist} disabled={generatingShortlist} className="rounded-xl h-8 gap-1.5 text-xs">
                        <RefreshCw className="h-3 w-3" /> Regenerate
                      </Button>
                    </div>
                  </div>

                  {/* Job requirements reference */}
                  {job && (
                    <div className="rounded-xl border bg-card/80 p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Job Requirements</p>
                      <div className="flex flex-wrap gap-2">
                        {job.requiredSkills.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-lg text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">Required: {s}</span>
                        ))}
                        {job.preferredSkills.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-lg text-xs border bg-muted text-muted-foreground border-border">Preferred: {s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shortlisted candidates */}
                  {shortlist.shortlisted.map((c) => (
                    <ShortlistedCard
                      key={c.applicationId || c.rank}
                      c={c}
                      rank={c.rank}
                      onOpenDetails={handleOpenDetails}
                    />
                  ))}

                  {/* Rejected summary */}
                  {shortlist.rejected?.length > 0 && (
                    <div className="rounded-2xl border bg-card/80 p-5">
                      <p className="text-sm font-semibold text-muted-foreground mb-3">
                        <TrendingUp className="h-4 w-4 inline mr-1 text-red-400" />
                        {shortlist.rejected.length} candidates below threshold
                      </p>
                      <div className="space-y-2">
                        {shortlist.rejected.map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                            <span className="text-foreground">{r.name}</span>
                            <span className="text-xs text-muted-foreground">{r.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Candidate Details Modal */}
          <CandidateDetailsDialog
            isOpen={!!selectedAppId}
            onClose={handleCloseDetails}
            jobId={jobId || ""}
            appId={selectedAppId}
            applicant={applicants.find((a) => a.applicationId === selectedAppId)}
            analysis={candidateAnalysis}
            loading={loadingAnalysis}
            onAnalyze={handleAnalyze}
            analyzing={analyzing}
            onDecisionSaved={handleDecisionSaved}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
