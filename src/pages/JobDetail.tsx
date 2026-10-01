import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { applyToJob, useStudentApplications, type Job } from "@/hooks/useJobs";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { getApiBase } from "@/lib/api-base";
import {
  ChevronLeft, Building2, MapPin, Clock, GraduationCap,
  Upload, FileText, CheckCircle2, Star, Loader2, AlertCircle,
} from "lucide-react";

function SkillChip({ skill, variant = "required" }: { skill: string; variant?: "required" | "preferred" }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
      variant === "required"
        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
        : "bg-muted text-muted-foreground border-border"
    }`}>
      {skill}
    </span>
  );
}

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { applications, refresh: refreshApps } = useStudentApplications(user?.uid);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [candidateName, setCandidateName] = useState(user?.displayName || "");
  const [candidateEmail, setCandidateEmail] = useState(user?.email || "");
  const [dragOver, setDragOver] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (user?.displayName && !candidateName) setCandidateName(user.displayName);
    if (user?.email && !candidateEmail) setCandidateEmail(user.email);
  }, [user]);

  // Check if already applied
  useEffect(() => {
    const alreadyApplied = applications.some((a) => (a as { jobId?: string }).jobId === jobId);
    if (alreadyApplied) setApplied(true);
  }, [applications, jobId]);

  // Fetch job details
  const loadJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/jobs/${jobId}`);
      const data = await res.json();
      if (res.ok && data.job) setJob(data.job);
    } catch (_) {}
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => { loadJob(); }, [loadJob]);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "PDF only", description: "Please upload a PDF resume.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed.", variant: "destructive" });
      return;
    }
    setResumeFile(file);
  };

  const handleApply = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!candidateName.trim()) {
      toast({ title: "Name required", description: "Please enter candidate full name.", variant: "destructive" });
      return;
    }
    if (!candidateEmail.trim()) {
      toast({ title: "Email required", description: "Please enter candidate email address.", variant: "destructive" });
      return;
    }
    if (!resumeFile) {
      toast({ title: "Upload resume", description: "Please upload candidate resume PDF.", variant: "destructive" });
      return;
    }
    if (!jobId) return;

    setApplying(true);
    const form = new FormData();
    form.append("resume", resumeFile);
    form.append("studentId", user.uid || `stu_${Date.now()}`);
    form.append("studentName", candidateName.trim());
    form.append("studentEmail", candidateEmail.trim());

    const { applicationId, error } = await applyToJob(jobId, form);
    setApplying(false);

    if (error === "already_applied") {
      toast({ title: "Already applied", description: "An application with this email has already been submitted for this job." });
      setApplied(true);
      return;
    }
    if (error) {
      toast({ title: "Application failed", description: error, variant: "destructive" });
      return;
    }
    setApplied(true);
    refreshApps();
    toast({ title: "Application submitted! 🎉", description: `Candidate ${candidateName} registered. ID: ${applicationId}` });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Loading job…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Job not found.</p>
            <Button variant="outline" onClick={() => navigate("/jobs")} className="mt-4 rounded-xl">Browse Jobs</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <button onClick={() => navigate("/jobs")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Browse Jobs
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Job Details */}
            <div className="lg:col-span-2 space-y-5">
              {/* Header card */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-card/80 p-6">
                <h1 className="text-2xl font-bold text-foreground mb-1">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{job.companyName}</span>
                  {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}
                  {job.workMode && <span className="px-2 py-0.5 rounded text-xs bg-muted border border-border">{job.workMode}</span>}
                  {job.requiredExperience && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.requiredExperience}</span>}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {job.requiredSkills.map((s) => <SkillChip key={s} skill={s} variant="required" />)}
                  {job.preferredSkills.map((s) => <SkillChip key={s} skill={s} variant="preferred" />)}
                </div>
                {job.deadline && (
                  <p className="text-xs text-orange-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Application deadline: {new Date(job.deadline).toLocaleDateString()}
                  </p>
                )}
              </motion.div>

              {/* Description */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }} className="rounded-2xl border bg-card/80 p-6">
                <h2 className="font-semibold text-base mb-3">Job Description</h2>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</div>
              </motion.div>

              {/* Skills breakdown */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} className="rounded-2xl border bg-card/80 p-6 space-y-4">
                <h2 className="font-semibold text-base">Requirements</h2>
                {job.requiredSkills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {job.requiredSkills.map((s) => <SkillChip key={s} skill={s} variant="required" />)}
                    </div>
                  </div>
                )}
                {job.preferredSkills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preferred Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {job.preferredSkills.map((s) => <SkillChip key={s} skill={s} variant="preferred" />)}
                    </div>
                  </div>
                )}
                {job.education && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>{job.education}</span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right: Apply panel */}
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.15 } }} className="rounded-2xl border bg-card/80 p-5 sticky top-24">
                {applied ? (
                  <div className="text-center py-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Application Submitted</h3>
                    <p className="text-sm text-muted-foreground mb-4">Application received successfully. You can track status or submit another candidate.</p>
                    <div className="space-y-2">
                      <Button variant="outline" onClick={() => navigate("/jobs")} className="w-full rounded-xl h-10 text-sm">
                        Browse More Jobs
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setApplied(false);
                          setResumeFile(null);
                          setCandidateName("");
                          setCandidateEmail("");
                        }}
                        className="w-full rounded-xl h-10 text-sm bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/25"
                      >
                        Submit Another Application
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400" /> Apply Now
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">Fill candidate details and upload resume PDF</p>

                    {/* Candidate Name & Email Inputs */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          Full Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          placeholder="e.g. Alex Rivera"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          Email Address <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="email"
                          value={candidateEmail}
                          onChange={(e) => setCandidateEmail(e.target.value)}
                          placeholder="e.g. alex.rivera@example.com"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        />
                      </div>
                    </div>

                    {/* Resume upload */}
                    <div
                      className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer mb-4 ${
                        dragOver ? "border-violet-500 bg-violet-500/5" :
                        resumeFile ? "border-emerald-500/50 bg-emerald-500/5" :
                        "border-border hover:border-violet-500/50 hover:bg-muted/30"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0] || null); }}
                      onClick={() => document.getElementById("resume-file-input")?.click()}
                    >
                      <input
                        id="resume-file-input"
                        type="file"
                        accept=".pdf,application/pdf"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      />
                      {resumeFile ? (
                        <div>
                          <FileText className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-emerald-400">{resumeFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}
                            className="text-xs text-muted-foreground hover:text-foreground mt-2 underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                          <p className="text-sm font-medium text-foreground">Drop resume here</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF only · Max 5MB</p>
                          <p className="text-xs text-violet-400 mt-1">or click to browse</p>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleApply}
                      disabled={applying || !resumeFile}
                      className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-lg shadow-violet-500/25"
                    >
                      {applying ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</span>
                      ) : (
                        <span className="inline-flex items-center gap-2"><Upload className="h-4 w-4" /> Submit Application</span>
                      )}
                    </Button>

                    {!user && (
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        <button onClick={() => navigate("/auth")} className="text-violet-400 hover:text-violet-300 underline">Sign in</button> to apply
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Resume analyzed against this JD</p>
                      <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Evidence-based evaluation</p>
                      <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No duplicate applications</p>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Shortlist info */}
              <div className="rounded-xl border bg-card/80 p-4 text-center">
                <Star className="h-5 w-5 text-yellow-400 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Top <strong className="text-foreground">{job.shortlistSize}</strong> candidates will be shortlisted by AI
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
