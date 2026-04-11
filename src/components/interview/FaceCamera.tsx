import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { analyzeEmotionFrame, type EmotionSample, loadEmotionModels } from "@/lib/emotion/EmotionAnalyzer";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

type FaceCameraProps = {
  active: boolean;
  onSample?: (sample: EmotionSample) => void;
};

export function FaceCamera({ active, onSample }: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState("");
  const [lastSample, setLastSample] = useState<EmotionSample | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const start = async () => {
      if (!active) return;
      try {
        await loadEmotionModels();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Camera permission denied");
        setReady(false);
      }
    };

    start();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      setReady(false);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !ready) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      if (!videoRef.current || cancelled) return;
      const sample = await analyzeEmotionFrame(videoRef.current);
      if (!sample || cancelled) return;
      setLastSample(sample);
      onSample?.(sample);
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [active, ready, onSample]);

  if (!active) return null;

  const confidence = clamp(lastSample?.confidence ?? 0);
  const stress = clamp(lastSample?.stress ?? 0);
  const engagement = clamp(lastSample?.engagement ?? 0);

  return (
    <div className="fixed bottom-5 right-5 z-[999] flex flex-col items-end gap-2">
      <div className="rounded-lg border border-white/20 bg-white/15 px-2.5 py-1 text-[11px] text-white shadow-lg backdrop-blur-md">
        {error ? "Camera off" : lastSample?.label || "Analyzing"}
      </div>
      <div className="w-[220px] h-[160px] rounded-xl border border-white/20 bg-black/60 shadow-xl overflow-hidden relative">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-white">
            <span>Confidence</span>
            <span>{confidence}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/20">
            <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${confidence}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-white">
            <span>Stress</span>
            <span>{stress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/20">
            <div className="h-1.5 rounded-full bg-rose-400" style={{ width: `${stress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-white">
            <span>Engagement</span>
            <span>{engagement}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/20">
            <div className="h-1.5 rounded-full bg-sky-400" style={{ width: `${engagement}%` }} />
          </div>
        </div>
      </div>
      {error && (
        <div className={cn("mt-2 rounded-lg border border-border bg-card px-2 py-1 text-xs text-muted-foreground")}>{error}</div>
      )}
    </div>
  );
}
