import { useState, type FormEvent } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsDashboard, type AnalyticsData } from "@/components/analytics/AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type AnalysisInputs = {
  resumeFile: File | null;
  githubUrl: string;
  leetcodeUrl: string;
};

const initialInputs: AnalysisInputs = {
  resumeFile: null,
  githubUrl: "",
  leetcodeUrl: "",
};

const requestAnalysis = async (resumeFile: File, githubUrl: string, leetcodeUrl: string) => {
  const formData = new FormData();
  formData.append("resume", resumeFile);
  formData.append("githubUrl", githubUrl);
  formData.append("leetcodeUrl", leetcodeUrl);

  const res = await fetch("/api/personal-analysis", {
    method: "POST",
    body: formData,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || "Analysis request failed.");
  }
  return payload as AnalyticsData;
};

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export default function PersonalAnalysis() {
  const { toast } = useToast();
  const [inputs, setInputs] = useState<AnalysisInputs>(initialInputs);
  const [analysis, setAnalysis] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [resumeKey, setResumeKey] = useState(0);

  const handleInputChange = (key: keyof AnalysisInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resumeFile = inputs.resumeFile;
    const githubUrl = inputs.githubUrl.trim();
    const leetcodeUrl = inputs.leetcodeUrl.trim();

    if (!resumeFile || !githubUrl || !leetcodeUrl) {
      toast({ title: "Missing data", description: "Please add your resume PDF and profile links." });
      return;
    }

    if (!isValidUrl(githubUrl) || !isValidUrl(leetcodeUrl)) {
      toast({ title: "Invalid URL", description: "Please ensure each link is a valid URL." });
      return;
    }

    if (!githubUrl.includes("github.com")) {
      toast({ title: "GitHub link needed", description: "Please use a github.com profile URL." });
      return;
    }

    if (!leetcodeUrl.includes("leetcode.com")) {
      toast({ title: "LeetCode link needed", description: "Please use a leetcode.com profile URL." });
      return;
    }

    setLoading(true);
    try {
      if (resumeFile.type !== "application/pdf") {
        toast({ title: "Resume must be PDF", description: "Please upload a .pdf resume file." });
        return;
      }

      const data = await requestAnalysis(resumeFile, githubUrl, leetcodeUrl);
      setAnalysis(data);
      setLastRun(new Date().toLocaleString());
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background personal-dashboard-theme">
      <Navbar />
      <main className="section-padding">
        <div className="container max-w-6xl space-y-8">
          <div className="paper-card card-hover rounded-2xl">
            <div className="flex flex-col gap-3">
              <span className="sticker-green-soft w-fit">Personal analysis</span>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Your <span className="underline-sketch">career signal</span> dashboard
              </h1>
              <p className="text-muted-foreground">
                A single view of your resume, GitHub, and LeetCode signals to plan your next moves.
              </p>
              {lastRun && (
                <p className="text-xs text-muted-foreground">Last updated: {lastRun}</p>
              )}
            </div>
          </div>

          <div className="paper-card rounded-2xl">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-foreground">Connect your sources</h2>
              <p className="text-sm text-muted-foreground">
                Upload a resume PDF and paste your public profile links. We will analyze and summarize your readiness.
              </p>
            </div>
            <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={handleAnalyze}>
              <div className="space-y-2">
                <Label htmlFor="resume-file">Resume PDF</Label>
                <Input
                  id="resume-file"
                  type="file"
                  accept="application/pdf"
                  key={resumeKey}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setInputs((prev) => ({ ...prev, resumeFile: file }));
                  }}
                />
                {inputs.resumeFile && (
                  <p className="text-xs text-muted-foreground">Selected: {inputs.resumeFile.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-url">GitHub profile</Label>
                <Input
                  id="github-url"
                  placeholder="https://github.com/username"
                  value={inputs.githubUrl || ""}
                  onChange={(e) => handleInputChange("githubUrl", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leetcode-url">LeetCode profile</Label>
                <Input
                  id="leetcode-url"
                  placeholder="https://leetcode.com/username"
                  value={inputs.leetcodeUrl || ""}
                  onChange={(e) => handleInputChange("leetcodeUrl", e.target.value)}
                />
              </div>
              <div className="md:col-span-3 flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={loading} className="btn-punch">
                  {loading ? "Analyzing..." : "Analyze"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="btn-punch"
                  onClick={() => {
                    setInputs(initialInputs);
                    setAnalysis(null);
                    setLastRun(null);
                    setResumeKey((value) => value + 1);
                  }}
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
            </form>
          </div>
          <AnalyticsDashboard data={analysis} loading={loading} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
