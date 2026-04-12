import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { analyzeEmotionFrame, type EmotionSample, loadEmotionModels } from "@/lib/emotion/EmotionAnalyzer";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

type FaceCameraProps = {
  active: boolean;
  onSample?: (sample: EmotionSample) => void;
  onDisplaySample?: (sample: EmotionSample) => void;
  containerClassName?: string;
  frameClassName?: string;
  showMetrics?: boolean;
  showLabelBadge?: boolean;
};

export function FaceCamera({
  active,
  onSample,
  onDisplaySample,
  containerClassName,
  frameClassName,
  showMetrics = true,
  showLabelBadge = true,
}: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState("");
  const [lastSample, setLastSample] = useState<EmotionSample | null>(null);
  const [ready, setReady] = useState(false);
  const [targetSample, setTargetSample] = useState<EmotionSample | null>(null);
  const [displaySample, setDisplaySample] = useState<EmotionSample | null>(null);
  const lastTargetAtRef = useRef(0);
  const lastNotifyAtRef = useRef(0);

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
      const t = 0.06;
      setDisplaySample((prev) => {
        const nextSample = prev ? {
          ...prev,
          label: targetSample.label,
          confidence: lerp(prev.confidence, targetSample.confidence, t),
          stress: lerp(prev.stress, targetSample.stress, t),
          engagement: lerp(prev.engagement, targetSample.engagement, t),
          smile: lerp(prev.smile, targetSample.smile, t),
          eyeContact: lerp(prev.eyeContact, targetSample.eyeContact, t),
          attention: lerp(prev.attention, targetSample.attention, t),
          nervousness: lerp(prev.nervousness, targetSample.nervousness, t),
        } : targetSample;
        if (onDisplaySample) {
          const now = Date.now();
          if (now - lastNotifyAtRef.current > 250) {
            lastNotifyAtRef.current = now;
            onDisplaySample(nextSample);
          }
        }
        return nextSample;
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

  const wrapperClassName = containerClassName || "fixed bottom-0 right-0 z-[999] flex flex-col items-end gap-2";
  const frameClass = frameClassName || "w-[220px] h-[160px] rounded-xl border border-white/20 bg-black/60 shadow-xl overflow-hidden relative";

  return (
    <div className={wrapperClassName}>
      {showLabelBadge && (
        <div className="rounded-lg border border-white/20 bg-white/15 px-2.5 py-1 text-[11px] text-white shadow-lg backdrop-blur-md">
          {error ? "Camera off" : displaySample?.label || lastSample?.label || "Analyzing"}
        </div>
      )}
      <div className={frameClass}>
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>
      {error && (
        <div className={cn("mt-2 rounded-lg border border-border bg-card px-2 py-1 text-xs text-muted-foreground")}>{error}</div>
      )}
    </div>
  );
}
