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
  const [targetSample, setTargetSample] = useState<EmotionSample | null>(null);
  const [displaySample, setDisplaySample] = useState<EmotionSample | null>(null);
  const lastTargetAtRef = useRef(0);

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
      const now = Date.now();
      if (!lastTargetAtRef.current || now - lastTargetAtRef.current >= 3_000) {
        lastTargetAtRef.current = now;
        setTargetSample(sample);
        setDisplaySample((prev) => prev ?? sample);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [active, ready, onSample]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
    const tick = () => {
      if (cancelled || !targetSample) return;
      setDisplaySample((prev) => {
        if (!prev) return targetSample;
        const t = 0.06;
        return {
          ...prev,
          label: targetSample.label,
          confidence: lerp(prev.confidence, targetSample.confidence, t),
          stress: lerp(prev.stress, targetSample.stress, t),
          engagement: lerp(prev.engagement, targetSample.engagement, t),
          smile: lerp(prev.smile, targetSample.smile, t),
          eyeContact: lerp(prev.eyeContact, targetSample.eyeContact, t),
          attention: lerp(prev.attention, targetSample.attention, t),
          nervousness: lerp(prev.nervousness, targetSample.nervousness, t),
        };
      });
      requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [active, targetSample]);

  if (!active) return null;

  const confidence = clamp(displaySample?.confidence ?? lastSample?.confidence ?? 0);
  const stress = clamp(displaySample?.stress ?? lastSample?.stress ?? 0);
  const engagement = clamp(displaySample?.engagement ?? lastSample?.engagement ?? 0);

  return (
    <div className="fixed bottom-5 right-5 z-[999] flex flex-col items-end gap-2">
      <div className="rounded-lg border border-white/20 bg-white/15 px-2.5 py-1 text-[11px] text-white shadow-lg backdrop-blur-md">
        {error ? "Camera off" : displaySample?.label || lastSample?.label || "Analyzing"}
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
