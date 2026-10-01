import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useJobs, useStudentApplications, type Job } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase, Search, Building2, MapPin, Clock, Star,
  CheckCircle2, ArrowRight, RefreshCw, GraduationCap,
} from "lucide-react";

function SkillChip({ skill, variant = "required" }: { skill: string; variant?: "required" | "preferred" }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
      variant === "required"
        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
        : "bg-muted text-muted-foreground border-border"
    }`}>
      {skill}
    </span>
  );
}

function JobCard({ job, appliedIds, onApply }: { job: Job; appliedIds: Set<string>; onApply: (id: string) => void }) {
  const applied = appliedIds.has(job.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card/80 backdrop-blur p-5 hover:border-violet-500/40 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-semibold text-foreground text-base">{job.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.companyName}</span>
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
            {job.workMode && <span className="px-1.5 py-0.5 rounded text-xs bg-muted border border-border">{job.workMode}</span>}
          </div>
        </div>
        {applied && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="h-3.5 w-3.5" /> Applied
          </span>
        )}
      </div>

      {/* Description snippet */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {job.description.slice(0, 150)}{job.description.length > 150 ? "…" : ""}
      </p>

      {/* Required skills */}
      {job.requiredSkills.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Required</p>
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.slice(0, 6).map((s) => <SkillChip key={s} skill={s} variant="required" />)}
            {job.requiredSkills.length > 6 && <span className="text-xs text-muted-foreground">+{job.requiredSkills.length - 6} more</span>}
          </div>
        </div>
      )}

      {/* Preferred skills */}
      {job.preferredSkills.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Preferred</p>
          <div className="flex flex-wrap gap-1.5">
            {job.preferredSkills.slice(0, 4).map((s) => <SkillChip key={s} skill={s} variant="preferred" />)}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {job.requiredExperience && (
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.requiredExperience}</span>
          )}
          {job.education && (
            <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{job.education}</span>
          )}
          {job.deadline && (
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onApply(job.id)} className="rounded-xl h-8 text-xs gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" /> View & Apply
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function StudentJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { jobs, loading, error, refresh } = useJobs();
  const { applications } = useStudentApplications(user?.uid);
  const [search, setSearch] = useState("");

  const appliedIds = new Set(applications.map((a) => (a as { jobId?: string }).jobId || ""));

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.title.toLowerCase().includes(q) || j.companyName.toLowerCase().includes(q) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-500/15 border border-blue-500/25">
                <Briefcase className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Job Opportunities</h1>
                <p className="text-muted-foreground text-sm">Apply with your resume — AI analyzes your fit for each job</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, company, or skill…"
                className="pl-10 h-11 rounded-xl border-2 bg-background"
              />
            </div>
          </motion.div>

          {/* Applied count */}
          {applications.length > 0 && (
            <div className="rounded-xl border bg-card/80 p-3 flex items-center gap-2 mb-5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>You have applied to <strong>{applications.length}</strong> job{applications.length !== 1 ? "s" : ""}</span>
              <button onClick={() => navigate("/student/applications")} className="ml-auto text-xs text-violet-400 hover:text-violet-300 transition-colors">View my applications →</button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Loading jobs…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-2xl border bg-red-500/5 border-red-500/20 p-8 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={refresh} className="rounded-xl gap-2">
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            </div>
          )}

          {/* No jobs */}
          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-2xl border bg-card/80 p-12 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground mb-2">
                {search ? "No jobs match your search." : "No open positions right now."}
              </p>
              {search && (
                <Button variant="outline" onClick={() => setSearch("")} className="rounded-xl text-xs">Clear search</Button>
              )}
            </div>
          )}

          {/* Job cards */}
          {!loading && !error && (
            <div className="space-y-4">
              {filtered.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  appliedIds={appliedIds}
                  onApply={(id) => navigate(`/jobs/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
