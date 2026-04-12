export type EmotionSample = {
  ts: number;
  label: string;
  confidence: number;
  stress: number;
  engagement: number;
  smile: number;
  eyeContact: number;
  attention: number;
  nervousness: number;
};

const EMOTION_API_BASE = import.meta.env.VITE_EMOTION_API_BASE || "http://localhost:8001";
let warmupPromise: Promise<void> | null = null;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function mapLabel(label: string) {
  switch (label) {
    case "happy":
      return "Happy";
    case "surprise":
      return "Surprised";
    case "fear":
      return "Nervous";
    case "angry":
      return "Stressed";
    case "disgust":
      return "Confused";
    case "sad":
      return "Confused";
    case "neutral":
    default:
      return "Neutral";
  }
}

export async function loadEmotionModels() {
  if (!warmupPromise) {
    warmupPromise = fetch(`${EMOTION_API_BASE}/api/emotion/health`)
      .then((res) => {
        if (!res.ok) throw new Error("Emotion API unavailable");
      })
      .then(() => undefined);
  }
  return warmupPromise;
}

async function captureFrame(video: HTMLVideoElement): Promise<string | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export async function analyzeEmotionFrame(video: HTMLVideoElement): Promise<EmotionSample | null> {
  if (!video || video.readyState < 2) return null;
  try {
    await loadEmotionModels();
  } catch {
    return null;
  }
  const image = await captureFrame(video);
  if (!image) return null;

  const res = await fetch(`${EMOTION_API_BASE}/api/emotion/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data) return null;

  const rawLabel = typeof data.label === "string" ? data.label : "Neutral";
  const label = mapLabel(rawLabel.toLowerCase());
  const confidence = clamp(Number(data.confidence ?? 0));
  const stress = clamp(Number(data.stress ?? 0));
  const engagement = clamp(Number(data.engagement ?? 0));
  const smile = clamp(Number(data.smile ?? 0));
  const eyeContact = clamp(Number(data.eyeContact ?? 0));
  const attention = clamp(Number(data.attention ?? 0));
  const nervousness = clamp(Number(data.nervousness ?? 0));

  const derivedLabel = (() => {
    if (stress >= 65) return "Stressed";
    if (attention >= 70 && stress <= 35) return "Focused";
    if (confidence >= 70 && stress <= 35) return "Confident";
    if (nervousness >= 60) return "Nervous";
    return label;
  })();

  return {
    ts: Date.now(),
    label: derivedLabel,
    confidence,
    stress,
    engagement,
    smile,
    eyeContact,
    attention,
    nervousness,
  };
}
