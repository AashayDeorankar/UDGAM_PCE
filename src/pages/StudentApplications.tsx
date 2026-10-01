import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentApplications, type StudentApplication } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  ArrowRight,
  ExternalLink,
  Search,
  Sparkles,
} from "lucide-react";

export default function StudentApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { applications, loading } = useStudentApplications(user?.uid);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/15 border border-primary/25">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
                  <p className="text-muted-foreground text-sm">
                    Track the status, recruiter decisions, and feedback for your job applications
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/jobs")}
                className="gap-2 rounded-xl self-start sm:self-auto"
              >
                <Search className="h-4 w-4" /> Browse More Jobs
              </Button>
            </div>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-20">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Loading applications…</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && applications.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-card/40 max-w-md mx-auto"
            >
              <div className="p-4 rounded-full bg-muted/60 w-fit mx-auto mb-4 text-muted-foreground">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-1">No applications yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                You haven&apos;t applied to any job postings yet. Browse open opportunities to get started.
              </p>
              <Button onClick={() => navigate("/jobs")} className="gap-2 rounded-xl">
                Browse Jobs <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Applications List */}
          {!loading && applications.length > 0 && (
            <div className="space-y-4">
              {applications.map((app: StudentApplication, idx: number) => {
                const isAccepted = app.status === "accepted";
                const isRejected = app.status === "rejected";

                const dateStr = app.submittedAt
                  ? new Date(app.submittedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Recently";

                return (
                  <motion.div
                    key={app.id || app.applicationId || idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`rounded-2xl border bg-card/80 backdrop-blur p-5 transition-all duration-200 ${
                      isAccepted
                        ? "border-emerald-500/40 shadow-sm shadow-emerald-500/5 hover:border-emerald-500/60"
                        : isRejected
                        ? "border-red-500/30 hover:border-red-500/50"
                        : "hover:border-primary/40"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-semibold text-foreground text-base">
                            {app.jobTitle || "Role Application"}
                          </h3>

                          {/* Dynamic Status Badge */}
                          {isAccepted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                              <XCircle className="h-3.5 w-3.5" /> Not Selected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25">
                              <Clock className="h-3.5 w-3.5" /> Under Review
                            </span>
                          )}

                          {app.match_score !== undefined && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-violet-500/15 text-violet-300 border border-violet-500/25">
                              <Sparkles className="h-3 w-3" /> {app.match_score}% Match
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          {app.companyName && (
                            <span className="flex items-center gap-1 font-medium text-foreground/80">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {app.companyName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Applied on {dateStr}
                          </span>
                          {app.resumeFileName && (
                            <span className="flex items-center gap-1 font-mono">
                              <FileText className="h-3.5 w-3.5" />
                              {app.resumeFileName}
                            </span>
                          )}
                        </div>
                      </div>

                      {app.jobId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/jobs/${app.jobId}`)}
                          className="rounded-xl h-8 text-xs gap-1.5 self-start sm:self-auto shrink-0"
                        >
                          View Job <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Rejection Feedback Box */}
                    {isRejected && (
                      <div className="mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-2.5">
                        <div className="flex items-center gap-2 text-red-400 font-semibold text-xs tracking-wider uppercase">
                          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                          Recruiter Rejection Reason
                        </div>
                        <div className="bg-background/80 p-3 rounded-lg border border-red-500/20 text-xs text-foreground/90 leading-relaxed font-mono">
                          “{app.rejectionReason || "Application did not meet the key requirements for this position."}”
                        </div>
                        {app.missing_requirements && app.missing_requirements.length > 0 && (
                          <div className="pt-1">
                            <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">
                              Identified Skill Gaps to Focus On:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {app.missing_requirements.map((skill, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-red-500/10 text-red-300 border border-red-500/20"
                                >
                                  ✗ {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Acceptance Next Steps Box */}
                    {isAccepted && (
                      <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase">
                          <Award className="h-4 w-4 text-emerald-400 shrink-0" />
                          Application Accepted & Next Steps
                        </div>
                        <div className="bg-background/80 p-3 rounded-lg border border-emerald-500/20 text-xs text-foreground/90 leading-relaxed">
                          {app.decisionNotes || "Congratulations! Your profile has been accepted for this role. The recruiter will reach out soon regarding next steps."}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
