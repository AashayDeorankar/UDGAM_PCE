import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useRecruiterJobs, type Job } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import {
  Briefcase, Plus, X, Building2, MapPin, GraduationCap,
  Users, Clock, ChevronLeft, Sparkles, Star, FileText,
  BarChart3, Brain, CheckCircle2, AlertTriangle, Target, Zap, TrendingUp, ArrowRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

const PIPELINE_STEPS = [
  {
    icon: FileText,
    label: "JD Analysis",
    desc: "Parse requirements, normalize skills, flag noise",
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
  },
  {
    icon: Users,
    label: "Resume Analysis",
    desc: "Score candidates against requirements",
    color: "from-blue-500 to-cyan-600",
    glow: "shadow-blue-500/20",
  },
  {
    icon: Brain,
    label: "Skill Normalization",
    desc: "Map synonyms, detect keyword stuffing",
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/20",
  },
  {
    icon: BarChart3,
    label: "Candidate Matching",
    desc: "Evidence-backed scoring, 0–100",
    color: "from-orange-500 to-amber-600",
    glow: "shadow-orange-500/20",
  },
  {
    icon: CheckCircle2,
    label: "Shortlist",
    desc: "Explainable, ranked shortlist",
    color: "from-pink-500 to-rose-600",
    glow: "shadow-pink-500/20",
  },
  {
    icon: Target,
    label: "Interview Plan",
    desc: "Role-specific questions per candidate",
    color: "from-indigo-500 to-blue-600",
    glow: "shadow-indigo-500/20",
  },
];

const STATS = [
  { icon: TrendingUp, label: "Screening Accuracy", value: "94%", desc: "vs manual screening" },
  { icon: Clock, label: "Time Saved", value: "5×", desc: "faster shortlisting" },
  { icon: AlertTriangle, label: "False Positives Caught", value: "78%", desc: "keyword stuffing detected" },
  { icon: Zap, label: "Avg. Analysis Time", value: "<30s", desc: "per batch of 10 resumes" },
];

export default function RecruiterDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { jobs, loading: jobsLoading, refresh: refreshJobs } = useRecruiterJobs(user?.uid);

  useEffect(() => {
    if (!authLoading && role && role !== "recruiter") {
      navigate("/jobs", { replace: true });
    }
  }, [role, authLoading, navigate]);

  useEffect(() => {
    refreshJobs();
  }, [location.key, refreshJobs]);

  if (!authLoading && role && role !== "recruiter") {
    return null;
  }

  const displayName = (user as { displayName?: string })?.displayName || "Recruiter";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Animated bg */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-violet-500/8 blur-3xl animate-pulse" />
            <div className="absolute top-20 -right-20 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-3xl animate-pulse [animation-delay:1.5s]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-emerald-500/5 blur-3xl" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              className="max-w-4xl mx-auto text-center"
            >

              <motion.h1
                custom={1}
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6"
              >
                Hire smarter with{" "}
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  AI-powered
                </span>{" "}
                recruitment
              </motion.h1>

              <motion.p
                custom={2}
                variants={fadeUp}
                className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
              >
                Paste a Job Description, upload resumes, and get an explainable AI shortlist with
                match scores, skill gaps, false-positive detection, and tailored interview plans.
              </motion.p>

          {/* CTA buttons */}
              <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  id="create-job-btn"
                  onClick={() => navigate("/recruiter/create-job")}
                  className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-base hover:from-violet-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-100"
                >
                  <Briefcase className="h-5 w-5" />
                  Create Job
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  id="start-analysis-btn"
                  onClick={() => navigate("/recruiter/analyze")}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-card border border-border text-foreground font-semibold text-base hover:bg-muted transition-all duration-200"
                >
                  <Brain className="h-5 w-5" />
                  Quick Analysis Tool
                </button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── My Jobs Section ────────────────────────────────────────────────── */}
        <section className="py-12 border-t border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">My Jobs</h2>
                <p className="text-muted-foreground text-sm">Manage your job listings and view applicants</p>
              </div>
              <Button onClick={() => navigate("/recruiter/create-job")} className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="h-4 w-4" /> Create Job
              </Button>
            </div>

            {jobsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-2xl border bg-card/80 border-dashed p-12 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground mb-4">No jobs created yet.</p>
                <Button onClick={() => navigate("/recruiter/create-job")} className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                  <Plus className="h-4 w-4" /> Create Your First Job
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.07 } }}
                    className="rounded-2xl border bg-card/80 p-5 hover:border-violet-500/40 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{job.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3.5 w-3.5" />{job.companyName}
                          {job.location && <span className="flex items-center gap-1 ml-2"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        job.status === "open"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>{job.status}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.requiredSkills.slice(0, 4).map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">{s}</span>
                      ))}
                      {job.requiredSkills.length > 4 && <span className="text-xs text-muted-foreground">+{job.requiredSkills.length - 4}</span>}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{job.applicantCount || 0} applicants</span>
                        <span className="flex items-center gap-1"><Brain className="h-3.5 w-3.5" />{job.analyzedCount || 0} analyzed</span>
                        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-400" />Shortlist: {job.shortlistSize}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/recruiter/jobs/${job.id}/applicants`)}
                        className="rounded-xl h-8 text-xs gap-1.5"
                      >
                        <Users className="h-3 w-3" /> View Applicants
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-y border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="flex flex-col items-center text-center gap-1"
                >
                  <stat.icon className="h-5 w-5 text-violet-400 mb-1" />
                  <span className="text-3xl font-bold text-foreground">{stat.value}</span>
                  <span className="text-sm font-medium text-foreground/80">{stat.label}</span>
                  <span className="text-xs text-muted-foreground">{stat.desc}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section id="pipeline-section" className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-foreground mb-3">The 6-Stage AI Pipeline</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Each stage builds on the last — from raw JD text to an explainable, interview-ready shortlist.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PIPELINE_STEPS.map((step, i) => (
                <motion.div
                  key={step.label}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  whileHover={{ y: -4 }}
                  className={`relative group rounded-2xl bg-card border border-border p-6 overflow-hidden cursor-default transition-shadow duration-300 hover:shadow-xl ${step.glow}`}
                >
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br ${step.color} transition-opacity duration-300`}
                    style={{ opacity: 0.04 }}
                  />
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} mb-4 shadow-lg`}>
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute top-4 right-4 text-xs font-bold text-muted-foreground/40">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{step.label}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="text-center mt-12"
            >
              <button
                onClick={() => navigate("/recruiter/analyze")}
                className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold hover:from-violet-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-violet-500/25 hover:scale-[1.02] active:scale-100"
              >
                <Sparkles className="h-5 w-5" />
                Launch Recruitment AI
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="py-16 bg-card/30 border-t border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: AlertTriangle,
                  title: "False Positive Detection",
                  desc: "Identify candidates who keyword-stuffed their resumes without actual evidence of skills.",
                  color: "text-amber-400",
                },
                {
                  icon: Building2,
                  title: "Explainable Shortlist",
                  desc: "Every recommendation comes with a plain-English reason — no black-box decisions.",
                  color: "text-violet-400",
                },
                {
                  icon: Target,
                  title: "Custom Interview Plans",
                  desc: "Role-specific questions targeting each candidate's unique gaps and strengths.",
                  color: "text-emerald-400",
                },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="flex flex-col gap-3"
                >
                  <f.icon className={`h-8 w-8 ${f.color}`} />
                  <h3 className="font-semibold text-foreground text-lg">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
