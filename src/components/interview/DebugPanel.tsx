import { useState } from "react";
import { Button } from "@/components/ui/button";

type DebugPanelProps = {
  liveTranscript: string;
  finalTranscript: string;
  interimTranscript: string;
  fillerCount: number;
  speakingSpeedWpm: number;
  wordCount: number;
  hesitationScore: number;
  pauseFrequency: number;
  pauseCount: number;
  openRouterResponse: string;
};

export function DebugPanel({
  liveTranscript,
  finalTranscript,
  interimTranscript,
  fillerCount,
  speakingSpeedWpm,
  wordCount,
  hesitationScore,
  pauseFrequency,
  pauseCount,
  openRouterResponse,
}: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Debug mode</p>
        <Button size="sm" variant="outline" onClick={() => setOpen((prev) => !prev)}>
          {open ? "Hide debug" : "Show debug"}
        </Button>
      </div>
      {open && (
        <div className="mt-3 space-y-3 text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Spoken words (live)</p>
            <p>{liveTranscript || "No live transcript yet."}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Final transcript</p>
            <p>{finalTranscript || "No final transcript yet."}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Interim results</p>
            <p>{interimTranscript || "No interim transcript yet."}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-muted/30 p-2">
              <p className="font-semibold text-foreground">Filler count</p>
              <p>{fillerCount}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-2">
              <p className="font-semibold text-foreground">Speaking speed</p>
              <p>{speakingSpeedWpm} wpm</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-2">
              <p className="font-semibold text-foreground">Word count</p>
              <p>{wordCount}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-2">
              <p className="font-semibold text-foreground">Hesitation score</p>
              <p>{hesitationScore}%</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-2">
              <p className="font-semibold text-foreground">Pause frequency</p>
              <p>{pauseFrequency} / min</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-2">
              <p className="font-semibold text-foreground">Pause count</p>
              <p>{pauseCount}</p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">OpenRouter response</p>
            <p>{openRouterResponse || "Awaiting evaluation."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
