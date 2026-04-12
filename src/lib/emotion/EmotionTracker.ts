import type { EmotionSample } from "@/lib/emotion/EmotionAnalyzer";

export type EmotionSummary = {
  averages: Record<string, number>;
  distribution: Record<string, number>;
  timeline: Array<{ t: number; confidence: number; stress: number; engagement: number }>;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function summarizeEmotionSamples(samples: EmotionSample[]): EmotionSummary {
  if (!samples.length) {
    return { averages: {}, distribution: {}, timeline: [] };
  }

  const sums: Record<string, number> = {
    confidence: 0,
    stress: 0,
    engagement: 0,
    smile: 0,
    eyeContact: 0,
    attention: 0,
    nervousness: 0,
  };
  const distribution: Record<string, number> = {};

  samples.forEach((sample) => {
    sums.confidence += sample.confidence;
    sums.stress += sample.stress;
    sums.engagement += sample.engagement;
    sums.smile += sample.smile;
    sums.eyeContact += sample.eyeContact;
    sums.attention += sample.attention;
    sums.nervousness += sample.nervousness;
    distribution[sample.label] = (distribution[sample.label] || 0) + 1;
  });

  const count = samples.length;
  const averages: Record<string, number> = {
    confidence: clamp(sums.confidence / count),
    stress: clamp(sums.stress / count),
    engagement: clamp(sums.engagement / count),
    smile: clamp(sums.smile / count),
    eyeContact: clamp(sums.eyeContact / count),
    attention: clamp(sums.attention / count),
    nervousness: clamp(sums.nervousness / count),
  };

  const timeline = samples.map((sample) => ({
    t: sample.ts,
    confidence: sample.confidence,
    stress: sample.stress,
    engagement: sample.engagement,
  }));

  return { averages, distribution, timeline };
}
