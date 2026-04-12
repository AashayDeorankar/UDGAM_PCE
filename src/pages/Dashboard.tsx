import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase } from "@/lib/api-base";
import { useNavigate } from "react-router-dom";
import {
  loadAssessmentResults,
  loadInterviewReports,
  type AssessmentResultRecord,
  type InterviewReportRecord,
} from "@/lib/interview-reports";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const dashboardColors = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  primarySoft: "hsl(var(--primary) / 0.55)",
  accentSoft: "hsl(var(--accent) / 0.55)",
  primaryStrong: "hsl(var(--primary) / 0.85)",
  accentStrong: "hsl(var(--accent) / 0.85)",
};

function formatDate(value?: { toDate: () => Date } | null) {
  if (!value?.toDate) return "";
  return value.toDate().toLocaleDateString();
}

function inferInterviewType(topics: string) {
  const t = topics.toLowerCase();
  if (t.includes("system")) return "System Design";
  if (t.includes("dsa") || t.includes("algo") || t.includes("data structure") || t.includes("sql") || t.includes("tech")) {
    return "Technical";
  }
  if (t.includes("behavior") || t.includes("hr") || t.includes("communication")) return "Behavioral";
  return "HR";
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<InterviewReportRecord[]>([]);
    useEffect(() => {
      if (role === "alumni") {
        navigate("/alumni/connect", { replace: true });
      }
    }, [navigate, role]);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResultRecord[]>([]);
  const [summary, setSummary] = useState<{ summary: string; strengths: string[]; weaknesses: string[]; suggestions: string[] } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const lastSummaryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    loadInterviewReports(user.uid, 50).then(setReports);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    loadAssessmentResults(user.uid, 50).then(setAssessmentResults);
  }, [user?.uid]);

  useEffect(() => {
    if (reports.length === 0) return;
    const signature = `${reports.length}-${reports[0]?.id}`;
    if (lastSummaryRef.current === signature) return;
    lastSummaryRef.current = signature;
    setSummaryLoading(true);
    fetch(`${getApiBase()}/api/dashboard/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reports: reports.map((report) => ({
          overall: report.overall,
          confidence: report.confidence,
          fluency: report.fluency,
          communication: report.communication,
          technical: report.technical,
          summary: report.summary,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          suggestions: report.suggestions,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.error) return;
        setSummary({
          summary: String(data.summary || ""),
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        });
      })
      .catch(() => {
        setSummary(null);
      })
      .finally(() => setSummaryLoading(false));
  }, [reports]);

  const metrics = useMemo(() => {
    if (reports.length === 0) {
      return {
        total: 0,
        average: 0,
        confidence: 0,
        communication: 0,
        technical: 0,
        fluency: 0,
        lastDate: "",
      };
    }
    const total = reports.length;
    const average = reports.reduce((acc, r) => acc + r.overall, 0) / total;
    const confidence = reports.reduce((acc, r) => acc + r.confidence, 0) / total;
    const communication = reports.reduce((acc, r) => acc + r.communication, 0) / total;
    const technical = reports.reduce((acc, r) => acc + r.technical, 0) / total;
    const fluency = reports.reduce((acc, r) => acc + r.fluency, 0) / total;
    return {
      total,
      average: clamp(average),
      confidence: clamp(confidence),
      communication: clamp(communication),
      technical: clamp(technical),
      fluency: clamp(fluency),
      lastDate: formatDate(reports[0]?.createdAt ?? null),
    };
  }, [reports]);

  const radarData = useMemo(() => {
    if (reports.length === 0) return [];
    return [
      { metric: "Communication", score: metrics.communication },
      { metric: "Confidence", score: metrics.confidence },
      { metric: "Technical Knowledge", score: metrics.technical },
      { metric: "Problem Solving", score: clamp((metrics.technical + metrics.confidence) / 2) },
      { metric: "Clarity", score: clamp((metrics.communication + metrics.fluency) / 2) },
      { metric: "Time Management", score: clamp((metrics.fluency + metrics.confidence) / 2) },
    ];
  }, [reports, metrics]);

  const radialData = useMemo(() => {
    if (reports.length === 0) return [];
    return [
      { name: "Voice Clarity", value: metrics.communication, fill: dashboardColors.primary },
      { name: "Speaking Speed", value: metrics.fluency, fill: dashboardColors.accent },
      { name: "Confidence", value: metrics.confidence, fill: dashboardColors.primaryStrong },
      { name: "Filler Words", value: clamp(100 - metrics.confidence), fill: dashboardColors.accentStrong },
    ];
  }, [reports, metrics]);

  const lineData = useMemo(() => {
    if (reports.length === 0) return [];
    const sorted = [...reports].sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return aTime - bTime;
    });
    return sorted.map((report) => ({
      label: formatDate(report.createdAt ?? null),
      overall: report.overall,
      confidence: report.confidence,
      communication: report.communication,
      technical: report.technical,
    }));
  }, [reports]);

  const assessmentLine = useMemo(() => {
    if (assessmentResults.length === 0) return [];
    return assessmentResults.map((result) => ({
      label: formatDate(result.createdAt ?? null),
      score: clamp(result.score),
      assessmentLabel: result.label,
    }));
  }, [assessmentResults]);

  const strengthData = useMemo(() => {
    if (reports.length === 0) return [];
    const items = [
      { metric: "Communication", score: metrics.communication },
      { metric: "Technical", score: metrics.technical },
      { metric: "Confidence", score: metrics.confidence },
      { metric: "Problem Solving", score: clamp((metrics.technical + metrics.confidence) / 2) },
    ];
    return items.map((item) => ({
      metric: item.metric,
      score: item.score,
      gap: clamp(100 - item.score),
    }));
  }, [reports, metrics]);

  const emotionAggregates = useMemo(() => {
    const filtered = reports.filter((report) => report.emotionAverages && Object.keys(report.emotionAverages).length);
    if (filtered.length === 0) {
      return {
        averages: {},
        distribution: {},
        timeline: [],
      };
    }

    const sums: Record<string, number> = {};
    const distribution: Record<string, number> = {};
    filtered.forEach((report) => {
      Object.entries(report.emotionAverages || {}).forEach(([key, value]) => {
        sums[key] = (sums[key] || 0) + Number(value || 0);
      });
      Object.entries(report.emotionDistribution || {}).forEach(([key, value]) => {
        distribution[key] = (distribution[key] || 0) + Number(value || 0);
      });
    });

    const count = filtered.length;
    const averages = Object.fromEntries(
      Object.entries(sums).map(([key, value]) => [key, clamp(value / count)])
    );

    const timeline = filtered[0]?.emotionTimeline || [];

    return { averages, distribution, timeline };
  }, [reports]);

  const emotionRadar = useMemo(() => {
    if (!Object.keys(emotionAggregates.averages).length) return [];
    const averages = emotionAggregates.averages;
    return [
      { metric: "Confidence", score: averages.confidence ?? 0 },
      { metric: "Eye Contact", score: averages.eyeContact ?? 0 },
      { metric: "Engagement", score: averages.engagement ?? 0 },
      { metric: "Stress Control", score: clamp(100 - (averages.stress ?? 0)) },
      { metric: "Attention", score: averages.attention ?? 0 },
      { metric: "Facial Expression", score: averages.smile ?? 0 },
    ];
  }, [emotionAggregates]);

  const emotionLine = useMemo(() => {
    if (!emotionAggregates.timeline.length) return [];
    return emotionAggregates.timeline.map((item) => ({
      label: new Date(item.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      confidence: clamp(item.confidence),
      stress: clamp(item.stress),
      engagement: clamp(item.engagement),
    }));
  }, [emotionAggregates]);

  const emotionPie = useMemo(() => {
    const entries = Object.entries(emotionAggregates.distribution || {}).filter(([, value]) => value > 0);
    return entries.map(([name, value], index) => ({
      name,
      value,
      fill: [
        dashboardColors.primary,
        dashboardColors.accent,
        dashboardColors.primarySoft,
        dashboardColors.accentSoft,
        dashboardColors.primaryStrong,
      ][index % 5],
    }));
  }, [emotionAggregates]);

  const emotionRadial = useMemo(() => {
    const averages = emotionAggregates.averages;
    if (!Object.keys(averages).length) return [];
    return [
      { name: "Eye Contact", value: averages.eyeContact ?? 0, fill: dashboardColors.primary },
      { name: "Confidence", value: averages.confidence ?? 0, fill: dashboardColors.primaryStrong },
      { name: "Smile", value: averages.smile ?? 0, fill: dashboardColors.accent },
      { name: "Attention", value: averages.attention ?? 0, fill: dashboardColors.accentSoft },
    ];
  }, [emotionAggregates]);

  const latestReport = reports[0];

  return (
    <div className="min-h-screen bg-white text-black personal-dashboard-theme">
      <Navbar />
      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#00000010_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="container relative">
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.2)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
              AI Mock Interview Dashboard
            </p>
            <h1 className="text-3xl md:text-4xl font-black mt-4">Performance dashboard</h1>
            <p className="text-black/70 mt-2 max-w-2xl">
              Track mock interview performance, speech analytics, and AI coaching insights based on your latest sessions.
            </p>
          </motion.div>

          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6 mb-10">
            {[
              { label: "Total Interviews", value: metrics.total.toString() },
              { label: "Average Score", value: `${metrics.average}%` },
              { label: "Confidence Score", value: `${metrics.confidence}%` },
              { label: "Communication Score", value: `${metrics.communication}%` },
              { label: "Technical Score", value: `${metrics.technical}%` },
              { label: "Last Interview Date", value: metrics.lastDate || "" },
            ].map((card) => (
              <div
                key={card.label}
                className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]"
              >
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-black/60">{card.label}</p>
                <p className="text-lg font-semibold mt-2">{card.value || "-"}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Overall Performance</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-black/60">Radar Chart</span>
              </div>
              {radarData.length === 0 ? (
                <p className="text-sm text-black/60 mt-6">Complete interviews to unlock performance analytics.</p>
              ) : (
                <ChartContainer
                  config={{ score: { label: "Score", color: dashboardColors.primary } }}
                  className="h-64 mt-4"
                >
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Radar dataKey="score" fill="var(--color-score)" fillOpacity={0.45} stroke="var(--color-score)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
              )}
            </div>
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Speech Analytics</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-black/60">Radial Bar</span>
              </div>
              {radialData.length === 0 ? (
                <p className="text-sm text-black/60 mt-6">Speech analytics appear after submissions.</p>
              ) : (
                <ChartContainer
                  config={{ value: { label: "Value", color: dashboardColors.primary } }}
                  className="h-64 mt-4"
                >
                  <RadialBarChart innerRadius={40} outerRadius={120} data={radialData} startAngle={90} endAngle={-270}>
                    <PolarGrid radialLines={false} stroke="hsl(var(--border))" />
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--muted))" }} />
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </RadialBarChart>
                </ChartContainer>
              )}
            </div>
          </section>

          <section className="grid gap-6 mt-8">
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Performance Over Time</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-black/60">Line Chart</span>
              </div>
              {lineData.length === 0 ? (
                <p className="text-sm text-black/60 mt-6">No timeline data yet.</p>
              ) : (
                <ChartContainer
                  config={{
                    overall: { label: "Interview Score", color: dashboardColors.primary },
                    confidence: { label: "Confidence", color: dashboardColors.accent },
                  }}
                  className="w-full h-80 md:h-96 mt-4 aspect-auto justify-start"
                >
                  <LineChart data={lineData} margin={{ left: 8, right: 8, top: 12, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="overall" stroke="var(--color-overall)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="confidence" stroke="var(--color-confidence)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </section>

          <section className="grid gap-6 mt-8">
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Assessment Scores Over Time</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-black/60">Line Chart</span>
              </div>
              {assessmentLine.length === 0 ? (
                <p className="text-sm text-black/60 mt-6">Complete assessment tests to see your score trend.</p>
              ) : (
                <ChartContainer
                  config={{ score: { label: "Assessment Score", color: dashboardColors.primary } }}
                  className="w-full h-72 md:h-80 mt-4 aspect-auto justify-start"
                >
                  <LineChart data={assessmentLine} margin={{ left: 8, right: 8, top: 12, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={[0, 100]} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => [value, "Score"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.assessmentLabel || ""}
                    />
                    <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2 mt-8">
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Strength vs Weakness</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-black/60">Bar Chart</span>
              </div>
              {strengthData.length === 0 ? (
                <p className="text-sm text-black/60 mt-6">No strength data yet.</p>
              ) : (
                <ChartContainer
                  config={{
                    score: { label: "Strength", color: dashboardColors.primary },
                    gap: { label: "Gap", color: dashboardColors.accent },
                  }}
                  className="h-64 mt-4"
                >
                  <BarChart data={strengthData} margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="score" fill="var(--color-score)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="gap" fill="var(--color-gap)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </div>
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">AI Performance Summary</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-black/60">OpenRouter</span>
              </div>
              {summaryLoading && <p className="text-sm text-black/60 mt-4">Generating summary…</p>}
              {!summaryLoading && !summary && (
                <p className="text-sm text-black/60 mt-4">Complete interviews to generate AI insights.</p>
              )}
              {summary && (
                <div className="mt-4 space-y-4">
                  <p className="text-sm">{summary.summary}</p>
                  <div className="grid gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-black/60">Strengths</p>
                      <p>{summary.strengths.join(", ") || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-black/60">Weaknesses</p>
                      <p>{summary.weaknesses.join(", ") || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-black/60">Suggestions</p>
                      <p>{summary.suggestions.join(", ") || "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Emotion Analytics</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-black/60">Face analysis</span>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Emotional Performance</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-black/60">Radar Chart</span>
                </div>
                {emotionRadar.length === 0 ? (
                  <p className="text-sm text-black/60 mt-6">Emotion analytics appear after camera sessions.</p>
                ) : (
                  <ChartContainer
                    config={{ score: { label: "Score", color: dashboardColors.primary } }}
                    className="h-64 mt-4"
                  >
                    <RadarChart data={emotionRadar}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Radar dataKey="score" fill="var(--color-score)" fillOpacity={0.45} stroke="var(--color-score)" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadarChart>
                  </ChartContainer>
                )}
              </div>
              <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Emotion Timeline</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-black/60">Line Chart</span>
                </div>
                {emotionLine.length === 0 ? (
                  <p className="text-sm text-black/60 mt-6">No emotion timeline yet.</p>
                ) : (
                  <ChartContainer
                    config={{
                      confidence: { label: "Confidence", color: dashboardColors.primary },
                      stress: { label: "Stress", color: dashboardColors.accent },
                      engagement: { label: "Engagement", color: dashboardColors.primaryStrong },
                    }}
                    className="h-64 mt-4"
                  >
                    <LineChart data={emotionLine} margin={{ left: 8, right: 8, top: 12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="confidence" stroke="var(--color-confidence)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="stress" stroke="var(--color-stress)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="engagement" stroke="var(--color-engagement)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                )}
              </div>
              <div className="xl:col-span-2 xl:flex xl:justify-center">
                <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)] w-full xl:max-w-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Face Analysis Score</h3>
                    <span className="text-xs uppercase tracking-[0.2em] text-black/60">Radial Bar</span>
                  </div>
                  {emotionRadial.length === 0 ? (
                    <p className="text-sm text-black/60 mt-6">No face analysis data yet.</p>
                  ) : (
                    <ChartContainer config={{ value: { label: "Value", color: dashboardColors.primary } }} className="h-64 mt-4">
                      <RadialBarChart innerRadius={40} outerRadius={120} data={emotionRadial} startAngle={90} endAngle={-270}>
                        <PolarGrid radialLines={false} stroke="hsl(var(--border))" />
                        <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--muted))" }} />
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </RadialBarChart>
                    </ChartContainer>
                  )}
                </div>
              </div>
            </div>
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)] mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Emotion Report</h3>
                <span className="text-xs uppercase tracking-[0.2em] text-black/60">OpenRouter</span>
              </div>
              {latestReport?.emotionReport?.length ? (
                <ul className="text-sm text-black/60 mt-3 space-y-2">
                  {latestReport.emotionReport.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-black/60 mt-4">Emotion feedback appears after camera sessions.</p>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3 mt-8">
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
              <h3 className="text-lg font-semibold">Behavioral Interview Prep</h3>
              <ul className="text-sm text-black/60 mt-3 space-y-2">
                {(latestReport?.weaknesses.length ? latestReport.weaknesses : ["Complete interviews to unlock insights."])
                  .slice(0, 3)
                  .map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
              </ul>
            </div>
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
              <h3 className="text-lg font-semibold">Technical Interview Prep</h3>
              <ul className="text-sm text-black/60 mt-3 space-y-2">
                {(latestReport?.strengths.length ? latestReport.strengths : ["Complete interviews to unlock insights."])
                  .slice(0, 3)
                  .map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
              </ul>
            </div>
            <div className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
              <h3 className="text-lg font-semibold">AI Suggestions</h3>
              <ul className="text-sm text-black/60 mt-3 space-y-2">
                {(summary?.suggestions.length ? summary.suggestions : ["Complete interviews to unlock insights."])
                  .slice(0, 3)
                  .map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
              </ul>
            </div>
          </section>

          <section className="border-2 border-black bg-white p-5 mt-8 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Interviews</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-black/60">Click a row for details</span>
            </div>
            {reports.length === 0 ? (
              <p className="text-sm text-black/60 mt-4">No interviews recorded yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-black/60">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Interview Type</th>
                      <th className="py-2">Score</th>
                      <th className="py-2">Duration</th>
                      <th className="py-2">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 6).map((report) => (
                      <tr key={report.id} className="border-t border-black/15">
                        <td className="py-3 pr-4">{formatDate(report.createdAt ?? null)}</td>
                        <td className="py-3 pr-4">{inferInterviewType(report.topics || "")}</td>
                        <td className="py-3 pr-4">{report.overall}%</td>
                        <td className="py-3 pr-4">{report.durationMs ? `${Math.round(report.durationMs / 60000)} min` : "-"}</td>
                        <td className="py-3">{report.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-3 mt-8">
            {[
              { title: "Confidence Trend", key: "confidence", color: dashboardColors.primary },
              { title: "Communication Trend", key: "communication", color: dashboardColors.accent },
              { title: "Technical Improvement", key: "technical", color: dashboardColors.primarySoft },
            ].map((trend) => (
              <div key={trend.key} className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{trend.title}</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-black/60">Trend</span>
                </div>
                {lineData.length === 0 ? (
                  <p className="text-sm text-black/60 mt-4">No trend data yet.</p>
                ) : (
                  <ChartContainer
                    config={{ [trend.key]: { label: trend.title, color: trend.color } }}
                    className="h-48 mt-4"
                  >
                    <LineChart data={lineData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey={trend.key} stroke={`var(--color-${trend.key})`} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                )}
              </div>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
