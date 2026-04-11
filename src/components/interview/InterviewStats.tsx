import { ConfidenceBar } from "@/components/interview/ConfidenceBar";

type InterviewStatsProps = {
  confidence: number;
  fluency: number;
  communication: number;
  overall: number;
  technical: number;
  speakingSpeedWpm: number;
  pauseFrequency: number;
  fillerCount: number;
  hesitationScore: number;
  correctness: string;
  remark: string;
  improvement: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

export function InterviewStats({
  confidence,
  fluency,
  communication,
  overall,
  technical,
  speakingSpeedWpm,
  pauseFrequency,
  fillerCount,
  hesitationScore,
  correctness,
  remark,
  improvement,
  summary,
  strengths,
  weaknesses,
  suggestions,
}: InterviewStatsProps) {
  return (
    <div className="rounded-xl border-2 border-border bg-card p-3 space-y-3 shadow-sm">
      <p className="text-sm font-semibold text-foreground">Interview stats</p>
      <div className="grid gap-2">
        <ConfidenceBar label="Confidence" value={confidence} hint="Based on fillers, pace, pauses" />
        <ConfidenceBar label="Fluency" value={fluency} hint="Consistency and hesitation tracking" />
        <ConfidenceBar label="Communication" value={communication} hint="Clarity and tempo balance" />
        <ConfidenceBar label="Technical" value={technical} hint="AI correctness evaluation" />
        <ConfidenceBar label="Overall" value={overall} hint="Aggregate performance" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <p className="font-semibold text-foreground">Speaking speed</p>
          <p>{speakingSpeedWpm} wpm</p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <p className="font-semibold text-foreground">Pause frequency</p>
          <p>{pauseFrequency} / min</p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <p className="font-semibold text-foreground">Filler count</p>
          <p>{fillerCount}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <p className="font-semibold text-foreground">Hesitation score</p>
          <p>{hesitationScore}%</p>
        </div>
      </div>
      <div className="rounded-md border border-border bg-muted/20 p-2 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">AI remark</p>
        <p>{summary || remark || "AI evaluation will appear once a response is captured."}</p>
        {correctness && <p className="mt-1">Correctness: {correctness}</p>}
        {improvement && <p className="mt-1">Improvement: {improvement}</p>}
        {strengths.length > 0 && <p className="mt-1">Strengths: {strengths.join(", ")}</p>}
        {weaknesses.length > 0 && <p className="mt-1">Weaknesses: {weaknesses.join(", ")}</p>}
        {suggestions.length > 0 && <p className="mt-1">Suggestions: {suggestions.join(", ")}</p>}
      </div>
    </div>
  );
}
