/**
 * Shared hook for the PS-11 jobs API.
 * Uses fetch against /api/jobs/* (proxied to the Node API server by Vite).
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase } from "@/lib/api-base";

export interface Job {
  id: string;
  title: string;
  description: string;
  companyName: string;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredExperience: string;
  preferredExperience: string;
  education: string;
  location: string;
  workMode: string;
  shortlistSize: number;
  status: "open" | "closed" | "draft";
  createdBy: string;
  recruiterName: string;
  deadline: string | null;
  applicantCount: number;
  analyzedCount: number;
  createdAt: string;
  jdAnalysis?: Record<string, unknown>;
}

export interface Application {
  applicationId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  resumeFileName: string;
  status: "applied" | "under_review" | "accepted" | "rejected" | string;
  aiStatus: "pending" | "analyzed" | "error";
  submittedAt: string;
  match_score?: number;
  noise_risk?: string;
  rejectionReason?: string | null;
  decisionNotes?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  missing_requirements?: string[];
}

export interface EvidenceItem {
  skill: string;
  found: boolean;
  strength: "strong" | "moderate" | "weak" | "none";
  source: string;
  evidence_text: string | null;
  context: string | null;
}

export interface CandidateAnalysis {
  applicationId: string;
  jobId: string;
  studentId: string;
  name: string;
  match_score: number;
  factor_breakdown: {
    required_skill_coverage: number;
    evidence_strength: number;
    project_relevance: number;
    experience_relevance: number;
    preferred_coverage: number;
    education_match: number;
    noise_penalty: number;
  };
  matched_requirements: Array<{ skill: string; strength: string; evidence: string }>;
  missing_requirements: string[];
  uncertain_requirements: Array<{ skill: string; note: string }>;
  preferred_matched: string[];
  noise: {
    noise_score: number;
    noise_risk: "low" | "medium" | "high";
    noise_flags: string[];
    keyword_to_evidence_ratio: number;
  };
  evidence: EvidenceItem[];
  skills_section_only: string[];
  well_evidenced_skills: string[];
  candidate_info: {
    name: string | null;
    years_experience: number;
    education: string | null;
    num_projects: number;
    num_jobs: number;
  };
  analyzedAt: string;
  status?: string;
  rejectionReason?: string | null;
  decisionNotes?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;
}

export interface ShortlistedCandidate {
  rank: number;
  applicationId: string;
  studentId: string;
  name: string;
  match_score: number;
  factor_breakdown: Record<string, number>;
  matched_requirements: Array<{ skill: string; strength: string; evidence: string }>;
  missing_requirements: string[];
  uncertain_requirements: Array<{ skill: string; note: string }>;
  preferred_matched: string[];
  noise: { noise_score: number; noise_risk: string; noise_flags: string[] };
  candidate_info: Record<string, unknown>;
  why_shortlisted: string[];
  watch_out: string[] | null;
}

export interface Shortlist {
  jobId: string;
  jobTitle: string;
  companyName: string;
  shortlisted: ShortlistedCandidate[];
  rejected: Array<{ applicationId: string; name: string; match_score: number; reason: string }>;
  total_candidates: number;
  shortlist_size_requested: number;
  shortlist_size_achieved: number;
  shortfall_explanation: string | null;
  generated_at: string;
}

const api = (path: string) => `${getApiBase()}/api${path}`;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(api("/jobs"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");
      setJobs(data.jobs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { jobs, loading, error, refresh };
}

export function useRecruiterJobs(uid: string | undefined) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recruiterId = uid || "demo-recruiter";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(api(`/jobs/recruiter/${recruiterId}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");
      setJobs(data.jobs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load recruiter jobs");
    } finally {
      setLoading(false);
    }
  }, [recruiterId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { jobs, loading, error, refresh };
}

export function useStudentApplications(uid: string | undefined) {
  const [applications, setApplications] = useState<(Application & { jobId?: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const studentId = uid || "demo-student";

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(api(`/jobs/student/${studentId}/applications`));
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (_) { /* silently fail */ }
    finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { applications, loading, refresh };
}

export async function createJob(payload: {
  title: string;
  description: string;
  companyName: string;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredExperience: string;
  preferredExperience: string;
  education: string;
  location: string;
  workMode: string;
  shortlistSize: number;
  deadline?: string;
  createdBy: string;
  recruiterName: string;
}): Promise<{ job?: Job; error?: string }> {
  try {
    const res = await fetch(api("/jobs/create"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Failed to create job" };
    return { job: data.job };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function applyToJob(jobId: string, formData: FormData): Promise<{ applicationId?: string; error?: string }> {
  try {
    const res = await fetch(api(`/jobs/${jobId}/apply`), {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409) return { error: "already_applied" };
      return { error: data.error || "Failed to submit application" };
    }
    return { applicationId: data.applicationId };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function fetchApplicants(jobId: string): Promise<{ job?: Job; applicants?: Application[]; error?: string }> {
  try {
    const res = await fetch(api(`/jobs/${jobId}/applicants`));
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { job: data.job, applicants: data.applicants || [] };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function runAnalysis(jobId: string): Promise<{ analyzed?: number; error?: string; done?: number; total?: number }> {
  try {
    const res = await fetch(api(`/jobs/${jobId}/analyze`), { method: "POST" });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return data;
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function generateShortlistAPI(jobId: string): Promise<{ shortlist?: Shortlist; error?: string }> {
  try {
    const res = await fetch(api(`/jobs/${jobId}/shortlist`), { method: "POST" });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { shortlist: data.shortlist };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function fetchShortlist(jobId: string): Promise<{ shortlist?: Shortlist | null; error?: string }> {
  try {
    const res = await fetch(api(`/jobs/${jobId}/shortlist`));
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 404) return { shortlist: null };
      return { error: data.error };
    }
    return { shortlist: data.shortlist || null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function fetchCandidateAnalysis(jobId: string, appId: string): Promise<{ analysis?: CandidateAnalysis; error?: string }> {
  try {
    const res = await fetch(api(`/jobs/${jobId}/analysis/${appId}`));
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { analysis: data.analysis };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function makeApplicationDecision(
  jobId: string,
  appId: string,
  payload: {
    status: "accepted" | "rejected";
    rejectionReason?: string;
    decisionNotes?: string;
    decidedBy?: string;
  }
): Promise<{ application?: Application; error?: string }> {
  try {
    const res = await fetch(api(`/jobs/${jobId}/applications/${appId}/decision`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Failed to submit decision" };
    return { application: data.application };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}
