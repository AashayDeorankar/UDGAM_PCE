type TranscriptPanelProps = {
  liveTranscript: string;
  isListening: boolean;
};

export function TranscriptPanel({ liveTranscript, isListening }: TranscriptPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Live transcript</p>
        <span className="text-xs text-muted-foreground">{isListening ? "Recording" : "Idle"}</span>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground min-h-[72px]">
        {liveTranscript || "Start speaking to see your words appear here."}
      </div>
    </div>
  );
}
