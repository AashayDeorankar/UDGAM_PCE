import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export type AnalyticsData = {
  overall_score: number;
  best_roles: { role: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
  skill_gaps: { skill: string; progress: number }[];
  github_score: number;
  leetcode_score: number;
  resume_score: number;
  roadmap: {
    short_term: string[];
    mid_term: string[];
    long_term: string[];
  };
  github_activity: { week: string; commits: number }[];
  leetcode_breakdown: { level: string; value: number }[];
};

const DEFAULT_DATA: AnalyticsData = {
  overall_score: 78,
  best_roles: [
    { role: "Frontend Engineer", score: 86 },
    { role: "Full Stack Engineer", score: 79 },
    { role: "Product Engineer", score: 74 },
    { role: "Data Engineer", score: 62 },
  ],
  strengths: [
    "Readable, component-first UI architecture",
    "Consistent feature delivery velocity",
    "Strong problem breakdown and planning",
    "Clean API contracts and UI state handling",
  ],
  weaknesses: [
    "Limited depth in distributed systems",
    "Needs more advanced algorithm coverage",
    "Sparse leadership signals in resume",
  ],
  skill_gaps: [
    { skill: "System design fundamentals", progress: 48 },
    { skill: "Advanced DSA", progress: 55 },
    { skill: "Testing strategy", progress: 62 },
    { skill: "Cloud deployment", progress: 38 },
  ],
  github_score: 72,
  leetcode_score: 68,
  resume_score: 82,
  roadmap: {
    short_term: ["Add system design notes", "Polish resume bullet impact", "Daily LeetCode medium"],
    mid_term: ["Ship a full-stack case study", "Add CI + tests", "Interview mock sessions"],
    long_term: ["Open-source contributions", "Leadership/project ownership", "Targeted role outreach"],
  },
  github_activity: [
    { week: "W1", commits: 8 },
    { week: "W2", commits: 11 },
    { week: "W3", commits: 7 },
    { week: "W4", commits: 15 },
    { week: "W5", commits: 10 },
    { week: "W6", commits: 18 },
  ],
  leetcode_breakdown: [
    { level: "Easy", value: 42 },
    { level: "Medium", value: 33 },
    { level: "Hard", value: 12 },
  ],
};

const cardMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const cardBase = "paper-card card-hover rounded-2xl";

const chartColors = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted-foreground))",
  border: "hsl(var(--border))",
};

const getScoreTone = (score: number) => {
  if (score >= 85) return "badge-accent";
  if (score >= 70) return "badge-primary";
  return "badge";
};

const getScoreLabel = (score: number) => {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Steady";
  return "Developing";
};

type AnalyticsDashboardProps = {
  data?: AnalyticsData | null;
  loading?: boolean;
};

export function AnalyticsDashboard({ data, loading = false }: AnalyticsDashboardProps) {
  const resolved = data === undefined ? DEFAULT_DATA : data;
  const isEmpty = !resolved ||
    (resolved.best_roles.length === 0 &&
      resolved.strengths.length === 0 &&
      resolved.weaknesses.length === 0 &&
      resolved.skill_gaps.length === 0 &&
      resolved.github_activity.length === 0 &&
      resolved.leetcode_breakdown.length === 0);

  if (loading) {
    return <AnalyticsDashboardSkeleton />;
  }

  if (isEmpty) {
    return (
      <div className="paper-card rounded-2xl text-center">
        <h2 className="text-xl font-semibold text-foreground">No analysis available yet</h2>
        <p className="text-muted-foreground mt-2">
          Connect your Resume, GitHub, and LeetCode to generate a full analytics snapshot.
        </p>
      </div>
    );
  }

  if (!resolved) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ScoreCard
          title="Overall score"
          score={resolved.overall_score}
          subtitle="Composite of resume, GitHub, and coding"
        />
        <ScoreCard title="Resume score" score={resolved.resume_score} subtitle="Clarity, impact, and role fit" />
        <ScoreCard title="GitHub score" score={resolved.github_score} subtitle="Consistency and engineering depth" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RoleChart roles={resolved.best_roles} />
        <RadarSkills gaps={resolved.skill_gaps} />
        <LeetCodeChart data={resolved.leetcode_breakdown} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ActivityChart data={resolved.github_activity} />
        <SkillGaps gaps={resolved.skill_gaps} />
        <SplitInsights strengths={resolved.strengths} weaknesses={resolved.weaknesses} />
      </div>

      <RoadmapTimeline roadmap={resolved.roadmap} />
    </div>
  );
}

export function ScoreCard({ title, subtitle, score }: { title: string; subtitle: string; score: number }) {
  const data = useMemo(() => [{ name: "Score", value: score }], [score]);
  const tone = getScoreTone(score);
  const label = getScoreLabel(score);
  const needleAngle = 180 - (score / 100) * 180;

  return (
    <motion.div {...cardMotion} className={cardBase}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`badge ${tone}`}>Score</span>
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mt-3">{subtitle}</h3>
          <p className="text-xs text-muted-foreground mt-2">
            Current signal: <span className="text-foreground font-medium">{label}</span>
          </p>
        </div>
        <div className="h-24 w-28 relative">
          <ChartContainer
            config={{ score: { label: "Score", color: chartColors.primary } }}
            className="h-full w-full aspect-square"
          >
            <RadialBarChart
              data={data}
              startAngle={180}
              endAngle={0}
              innerRadius={34}
              outerRadius={48}
            >
              <RadialBar dataKey="value" cornerRadius={0} fill={chartColors.accent} background={{ fill: "hsl(var(--muted) / 0.6)" }} />
              <Tooltip
                content={<ChartTooltipContent formatter={(v) => [v, "Score"]} />}
                cursor={false}
              />
            </RadialBarChart>
          </ChartContainer>
          <div
            className="absolute left-1/2 top-[52%] h-10 w-[2px] bg-foreground"
            style={{
              transform: `translate(-50%, -100%) rotate(${needleAngle}deg)`,
              transformOrigin: "bottom",
            }}
          />
          <div className="absolute left-1/2 top-[52%] h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-foreground bg-background" />
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <span className="text-lg font-semibold text-foreground font-mono leading-none">{score}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">/100</span>
          </div>
        </div>
      </div>
      <div className="mt-4 h-1 w-full border border-border">
        <div
          className="h-full"
          style={{ width: `${score}%`, background: "hsl(var(--primary))" }}
        />
      </div>
    </motion.div>
  );
}

export function RoleChart({ roles }: { roles: { role: string; score: number }[] }) {
  if (!roles.length) {
    return (
      <motion.div {...cardMotion} className={cardBase}>
        <h3 className="text-lg font-semibold text-foreground">Role suitability</h3>
        <p className="text-sm text-muted-foreground">No role data yet.</p>
      </motion.div>
    );
  }

  const topScore = Math.max(...roles.map((r) => r.score));
  const topRole = roles.find((role) => role.score === topScore);

  return (
    <motion.div {...cardMotion} className={cardBase}>
      <h3 className="text-lg font-semibold text-foreground">Role suitability</h3>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Top alignment</p>
      <div className="mt-4 h-56">
        <div className="h-full border-2 border-foreground p-2 relative">
          <span className="sticker-outline absolute -top-3 left-3">ROLE FIT</span>
          <ChartContainer
            config={{
              primary: { label: "Top role", color: chartColors.primary },
              muted: { label: "Other roles", color: chartColors.muted },
            }}
            className="h-full w-full aspect-auto"
          >
            <ComposedChart
              data={roles}
              layout="vertical"
              margin={{ top: 8, right: 18, left: 4, bottom: 8 }}
            >
              <CartesianGrid horizontal={false} stroke={chartColors.border} strokeWidth={1.75} />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="role" type="category" width={110} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltipContent formatter={(v) => [v, "Score"]} />} />
              <Bar dataKey="score" barSize={6} radius={0}>
                {roles.map((role) => (
                  <Cell
                    key={role.role}
                    fill={role.score === topScore ? chartColors.accent : chartColors.muted}
                  />
                ))}
              </Bar>
              <Scatter dataKey="score" fill="hsl(var(--foreground))" />
            </ComposedChart>
          </ChartContainer>
        </div>
      </div>
      {topRole && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Best fit</span>
          <span className="text-foreground font-medium">{topRole.role}</span>
        </div>
      )}
    </motion.div>
  );
}

export function RadarSkills({ gaps }: { gaps: { skill: string; progress: number }[] }) {
  const data = useMemo(() => {
    const baseline = {
      dsa: 68,
      development: 80,
      "system design": 54,
      "ai/ml": 46,
      "problem solving": 70,
    };
    const normalized = new Map(
      gaps.map((gap) => [gap.skill.toLowerCase(), gap.progress]),
    );

    return [
      { skill: "DSA", value: normalized.get("dsa") ?? baseline.dsa },
      { skill: "Development", value: normalized.get("development") ?? baseline.development },
      { skill: "System Design", value: normalized.get("system design") ?? baseline["system design"] },
      { skill: "AI/ML", value: normalized.get("ai/ml") ?? baseline["ai/ml"] },
      { skill: "Problem Solving", value: normalized.get("problem solving") ?? baseline["problem solving"] },
    ];
  }, [gaps]);

  return (
    <motion.div {...cardMotion} className={cardBase}>
      <h3 className="text-lg font-semibold text-foreground">Skills balance</h3>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Strength vs weakness</p>
      <div className="mt-4 h-56">
        <div className="h-full border-2 border-foreground p-2 relative">
          <span className="sticker-outline absolute -top-3 left-3">SKILL MAP</span>
          <ChartContainer
            config={{
              skills: { label: "Skill strength", color: chartColors.primary },
            }}
            className="h-full w-full aspect-auto"
          >
            <RadarChart data={data} outerRadius={90}>
              <PolarGrid stroke={chartColors.border} strokeWidth={1.75} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" fill={chartColors.accent} fillOpacity={0.35} stroke={chartColors.primary} />
              <Tooltip content={<ChartTooltipContent formatter={(v) => [v, "Score"]} />} />
            </RadarChart>
          </ChartContainer>
        </div>
      </div>
    </motion.div>
  );
}

export function LeetCodeChart({ data }: { data: { level: string; value: number }[] }) {
  const mapped = data.map((item) => ({
    key: item.level.toLowerCase(),
    label: item.level,
    value: item.value,
  }));
  const countData = mapped;

  return (
    <motion.div {...cardMotion} className={cardBase}>
      <h3 className="text-lg font-semibold text-foreground">LeetCode performance</h3>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Difficulty split</p>
      <div className="mt-4 h-56">
        <div className="h-full border-2 border-foreground p-2 relative">
          <span className="sticker-outline absolute -top-3 left-3">DIFFICULTY</span>
          <ChartContainer
            config={{
              percent: { label: "Solved", color: chartColors.accent },
            }}
            className="h-full w-full aspect-auto"
          >
            <LineChart data={countData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke={chartColors.border} strokeWidth={1.75} />
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip content={<ChartTooltipContent formatter={(v) => [v, "Solved"]} />} />
              <Line type="linear" dataKey="value" stroke={chartColors.accent} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </motion.div>
  );
}

export function ActivityChart({ data }: { data: { week: string; commits: number }[] }) {
  const trend = useMemo(() => {
    if (!data.length) return [];
    return data.map((point, index) => {
      const slice = data.slice(Math.max(0, index - 2), index + 1);
      const avg = slice.reduce((sum, entry) => sum + entry.commits, 0) / slice.length;
      return { ...point, avg: Number(avg.toFixed(1)) };
    });
  }, [data]);

  return (
    <motion.div {...cardMotion} className={cardBase}>
      <h3 className="text-lg font-semibold text-foreground">GitHub activity</h3>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last 6 weeks</p>
      <div className="mt-4 h-56">
        <div className="h-full border-2 border-foreground p-2 relative">
          <span className="sticker-outline absolute -top-3 left-3">COMMITS</span>
          <ChartContainer
            config={{ activity: { label: "Commits", color: chartColors.primary } }}
            className="h-full w-full aspect-auto"
          >
            <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartColors.border} vertical={false} strokeWidth={1.75} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltipContent formatter={(v) => [v, "Commits"]} />} />
              <Area
                type="linear"
                dataKey="commits"
                stroke="hsl(var(--accent))"
                fill="url(#activityFill)"
                strokeWidth={2}
              />
              <Line type="linear" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        </div>
      </div>
    </motion.div>
  );
}

export function SkillGaps({ gaps }: { gaps: { skill: string; progress: number }[] }) {
  if (!gaps.length) {
    return (
      <motion.div {...cardMotion} className={cardBase}>
        <h3 className="text-lg font-semibold text-foreground">Skill gaps</h3>
        <p className="text-sm text-muted-foreground">No skill gap data yet.</p>
      </motion.div>
    );
  }

  return (
    <motion.div {...cardMotion} className={cardBase}>
      <h3 className="text-lg font-semibold text-foreground">Skill gaps</h3>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Industry progress</p>
      <div className="mt-4 space-y-4">
        {gaps.map((gap) => (
          <div key={gap.skill} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{gap.skill}</span>
              <span className="text-muted-foreground">{gap.progress}%</span>
            </div>
            <div className="h-2 rounded-full border border-border bg-background">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${gap.progress}%`,
                  backgroundColor: gap.progress >= 70 ? "hsl(var(--primary) / 0.35)" : "hsl(var(--accent) / 0.35)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function SplitInsights({ strengths, weaknesses }: { strengths: string[]; weaknesses: string[] }) {
  return (
    <motion.div {...cardMotion} className={cardBase}>
      <h3 className="text-lg font-semibold text-foreground">Strengths vs weaknesses</h3>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Quick scan</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div
          className="rounded-xl border-2 border-border p-4"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), transparent)" }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Strengths</p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {strengths.length ? strengths.map((item) => <li key={item}>{item}</li>) : "No strengths yet."}
          </ul>
        </div>
        <div
          className="rounded-xl border-2 border-border p-4"
          style={{ background: "linear-gradient(135deg, hsl(var(--muted-foreground) / 0.08), transparent)" }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-foreground">Weaknesses</p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {weaknesses.length ? weaknesses.map((item) => <li key={item}>{item}</li>) : "No weaknesses yet."}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export function RoadmapTimeline({ roadmap }: { roadmap: AnalyticsData["roadmap"] }) {
  const entries = [
    { label: "Short term", items: roadmap.short_term },
    { label: "Mid term", items: roadmap.mid_term },
    { label: "Long term", items: roadmap.long_term },
  ];

  return (
    <motion.div {...cardMotion} className={cardBase}>
      <h3 className="text-lg font-semibold text-foreground">Growth roadmap</h3>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Next 90 days+</p>
      <div className="mt-6 space-y-6">
        {entries.map((entry) => (
          <div key={entry.label} className="relative pl-6">
            <div className="absolute left-0 top-1.5 h-full border-l border-border" />
            <div className="absolute left-[-5px] top-1.5 h-3 w-3 rounded-full border border-border bg-background" />
            <p className="text-sm font-semibold text-primary">{entry.label}</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {entry.items.length ? entry.items.map((item) => <li key={item}>{item}</li>) : "No items yet."}
            </ul>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AnalyticsDashboardSkeleton() {
  const blocks = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {blocks.slice(0, 3).map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-background p-6 shadow-md animate-pulse">
            <div className="h-4 w-32 rounded-md border border-border" />
            <div className="mt-3 h-6 w-48 rounded-md border border-border" />
            <div className="mt-6 h-24 rounded-xl border border-border" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-background p-6 shadow-md animate-pulse">
            <div className="h-4 w-32 rounded-md border border-border" />
            <div className="mt-3 h-3 w-48 rounded-md border border-border" />
            <div className="mt-6 h-40 rounded-xl border border-border" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-background p-6 shadow-md animate-pulse">
        <div className="h-4 w-32 rounded-md border border-border" />
        <div className="mt-3 h-3 w-48 rounded-md border border-border" />
        <div className="mt-6 h-40 rounded-xl border border-border" />
      </div>
    </div>
  );
}
