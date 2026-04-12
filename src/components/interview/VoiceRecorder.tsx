import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILLER_WORDS = new Set(["uh", "umm", "ah", "hmm", "like"]);
const FILLER_PHRASES = ["you know"];

export type SpeechRecognitionState = {
  liveTranscript: string;
  interimTranscript: string;
  finalTranscript: string;
  wordCount: number;
  fillerWords: string[];
  fillerCount: number;
  hesitationScore: number;
  speakingSpeedWpm: number;
  pauseFrequency: number;
  pauseCount: number;
  durationMs: number;
  confidence: number;
  fluency: number;
  communication: number;
  overall: number;
  isListening: boolean;
  error: string;
};

export const EMPTY_SPEECH_STATE: SpeechRecognitionState = {
  liveTranscript: "",
  interimTranscript: "",
  finalTranscript: "",
  wordCount: 0,
  fillerWords: [],
  fillerCount: 0,
  hesitationScore: 0,
  speakingSpeedWpm: 0,
  pauseFrequency: 0,
  pauseCount: 0,
  durationMs: 0,
  confidence: 0,
  fluency: 0,
  communication: 0,
  overall: 0,
  isListening: false,
  error: "",
};

type VoiceRecorderProps = {
  onStateChange?: (state: SpeechRecognitionState) => void;
  active?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const countWords = (text: string) => {
  const matches = text.trim().match(/\b[\w']+\b/g);
  return matches ? matches.length : 0;
};

const countFillers = (text: string) => {
  const matches = text.toLowerCase().match(/\b[\w']+\b/g);
  const wordMatches = matches || [];
  const wordCount = wordMatches.reduce((count, word) => (FILLER_WORDS.has(word) ? count + 1 : count), 0);
  const lower = text.toLowerCase();
  const phraseCount = FILLER_PHRASES.reduce((count, phrase) => {
    const regex = new RegExp(`\\b${phrase}\\b`, "g");
    return count + (lower.match(regex)?.length ?? 0);
  }, 0);
  return wordCount + phraseCount;
};

const listFillers = (text: string) => {
  const lowered = text.toLowerCase();
  const words = lowered.match(/\b[\w']+\b/g) || [];
  const found = words.filter((word) => FILLER_WORDS.has(word));
  for (const phrase of FILLER_PHRASES) {
    const regex = new RegExp(`\\b${phrase}\\b`, "g");
    const hits = lowered.match(regex) || [];
    for (let i = 0; i < hits.length; i += 1) {
      found.push(phrase);
    }
  }
  return found;
};

const buildSpeechState = (
  prev: SpeechRecognitionState,
  finalTranscript: string,
  interimTranscript: string,
  pauseCount: number,
  startTime: number | null,
  extra?: Partial<SpeechRecognitionState>
): SpeechRecognitionState => {
  const liveTranscript = [finalTranscript, interimTranscript].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const wordCount = countWords(liveTranscript);
  const fillerWords = listFillers(liveTranscript);
  const fillerCount = countFillers(liveTranscript);
  const hesitationScore = wordCount ? Math.round((fillerCount / wordCount) * 100) : 0;
  const durationMs = startTime ? Date.now() - startTime : 0;
  const minutes = durationMs ? durationMs / 60000 : 0;
  const speakingSpeedWpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;
  const pauseFrequency = minutes > 0 ? Math.round((pauseCount / minutes) * 10) / 10 : 0;
  const fillerScore = clamp(100 - Math.round((fillerCount / Math.max(1, wordCount)) * 200), 0, 100);
  const pauseScore = clamp(100 - Math.round(pauseFrequency * 8), 0, 100);
  const speedScore = clamp(100 - Math.round(Math.abs(speakingSpeedWpm - 140) * 0.8), 0, 100);
  const confidence = clamp(Math.round(fillerScore * 0.45 + speedScore * 0.35 + pauseScore * 0.2), 0, 100);
  const fluency = clamp(Math.round(fillerScore * 0.5 + pauseScore * 0.3 + speedScore * 0.2), 0, 100);
  const communication = clamp(Math.round((confidence + fluency) / 2), 0, 100);
  const overall = clamp(Math.round((confidence + fluency + communication) / 3), 0, 100);

  return {
    ...prev,
    finalTranscript,
    interimTranscript,
    liveTranscript,
    wordCount,
    fillerWords,
    fillerCount,
    hesitationScore,
    speakingSpeedWpm,
    pauseFrequency,
    pauseCount,
    durationMs,
    confidence,
    fluency,
    communication,
    overall,
    ...extra,
  };
};

export function VoiceRecorder({ onStateChange, active = true }: VoiceRecorderProps) {
  const [speechState, setSpeechState] = useState<SpeechRecognitionState>(EMPTY_SPEECH_STATE);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pauseCountRef = useRef(0);
  const lastFinalAtRef = useRef<number | null>(null);
  const shouldRestartRef = useRef(false);
  const isListeningRef = useRef(false);

  const isSupported = useMemo(
    () => typeof window !== "undefined" && "webkitSpeechRecognition" in window,
    []
  );

  useEffect(() => {
    onStateChange?.(speechState);
  }, [speechState, onStateChange]);

  useEffect(() => {
    isListeningRef.current = speechState.isListening;
  }, [speechState.isListening]);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!active && speechState.isListening) {
      stopListening();
    }
  }, [active, speechState.isListening]);

  const setupRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += ` ${transcript}`;
        } else {
          interimText += ` ${transcript}`;
        }
      }

      const now = Date.now();
      if (finalChunk.trim()) {
        if (lastFinalAtRef.current) {
          const gapMs = now - lastFinalAtRef.current;
          if (gapMs > 1800) {
            pauseCountRef.current += 1;
          }
        }
        lastFinalAtRef.current = now;
      }

      setSpeechState((prev) => {
        const nextFinal = finalChunk.trim()
          ? [prev.finalTranscript, finalChunk.trim()].filter(Boolean).join(" ")
          : prev.finalTranscript;
        const nextInterim = interimText.trim();
        return buildSpeechState(prev, nextFinal, nextInterim, pauseCountRef.current, startTimeRef.current);
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorKey = event.error || "unknown";
      const isPermissionError = errorKey === "not-allowed" || errorKey === "service-not-allowed";
      shouldRestartRef.current = !isPermissionError;
      setSpeechState((prev) =>
        buildSpeechState(prev, prev.finalTranscript, prev.interimTranscript, pauseCountRef.current, startTimeRef.current, {
          error: isPermissionError ? "Microphone permission denied." : `Speech recognition error: ${errorKey}.`,
          isListening: !isPermissionError,
        })
      );
    };

    recognition.onend = () => {
      if (shouldRestartRef.current && isListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Falls through to stop listening state.
        }
      }
      setSpeechState((prev) =>
        buildSpeechState(prev, prev.finalTranscript, prev.interimTranscript, pauseCountRef.current, startTimeRef.current, {
          isListening: false,
        })
      );
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const startListening = () => {
    if (!isSupported) {
      setSpeechState((prev) => ({ ...prev, error: "Speech recognition is not supported in this browser." }));
      return;
    }
    if (!active) return;
    const recognition = setupRecognition();
    pauseCountRef.current = 0;
    lastFinalAtRef.current = null;
    startTimeRef.current = Date.now();
    shouldRestartRef.current = true;
    setSpeechState((prev) =>
      buildSpeechState(prev, "", "", pauseCountRef.current, startTimeRef.current, {
        isListening: true,
        error: "",
      })
    );
    try {
      recognition.start();
    } catch {
      setSpeechState((prev) => ({ ...prev, error: "Unable to start speech recognition." }));
    }
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setSpeechState((prev) =>
      buildSpeechState(prev, prev.finalTranscript, prev.interimTranscript, pauseCountRef.current, startTimeRef.current, {
        isListening: false,
      })
    );
  };

  return (
    <div className="rounded-xl border-2 border-border bg-card p-3 space-y-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-3 w-3 rounded-full",
              speechState.isListening ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
            )}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">Voice recorder</p>
            <p className="text-xs text-muted-foreground">
              {speechState.isListening ? "Listening..." : "Ready to capture your response"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-2">
        <Button size="sm" className="gap-2" onClick={startListening} disabled={speechState.isListening || !active}>
          <Mic className="h-4 w-4" />
          Start speaking
        </Button>
        <Button size="sm" variant="outline" className="gap-2" onClick={stopListening} disabled={!speechState.isListening || !active}>
          <MicOff className="h-4 w-4" />
          Stop speaking
        </Button>
      </div>
      {speechState.error && <p className="text-xs text-destructive">{speechState.error}</p>}
    </div>
  );
}
