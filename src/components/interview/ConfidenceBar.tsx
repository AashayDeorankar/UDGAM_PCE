type ConfidenceBarProps = {
  label: string;
  value: number;
  hint?: string;
};

const clamp = (value: number) => Math.min(Math.max(Math.round(value), 0), 100);

export function ConfidenceBar({ label, value, hint }: ConfidenceBarProps) {
  const clampedValue = clamp(value);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{clampedValue}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${clampedValue}%` }} />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
