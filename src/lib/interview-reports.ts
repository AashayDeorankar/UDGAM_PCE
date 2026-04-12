import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  writeBatch,
  where,
} from "firebase/firestore";
import { getFirestoreDb } from "@/integrations/firebase/config";

export type InterviewReportRecord = {
  id: string;
  userId: string;
  role: string;
  company: string;
  topics: string;
  summary: string;
  confidence: number;
  fluency: number;
  communication: number;
  technical: number;
  overall: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  durationMs?: number;
  emotionAverages?: Record<string, number>;
  emotionDistribution?: Record<string, number>;
  emotionTimeline?: Array<{ t: number; confidence: number; stress: number; engagement: number }>;
  emotionReport?: string[];
  createdAt?: { toDate: () => Date } | null;
};

export type InterviewReportInput = Omit<InterviewReportRecord, "id" | "createdAt">;

export type EmotionSampleRecord = {
  userId: string;
  reportId: string;
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

export type SpeechStatRecord = {
  userId: string;
  reportId: string;
  ts: number;
  question: string;
  answer: string;
  duration: number;
  wordCount: number;
  fillerWords: string[];
  pauseCount: number;
};

export type AssessmentResultRecord = {
  id: string;
  userId: string;
  label: string;
  score: number;
  createdAt?: { toDate: () => Date } | null;
};

export type AssessmentResultInput = Omit<AssessmentResultRecord, "id" | "createdAt">;

export async function addInterviewReport(input: InterviewReportInput): Promise<{ id: string } | { error: string }> {
  try {
    const db = getFirestoreDb();
    const reportsRef = collection(db, "mockInterviewReports");
    const docRef = await addDoc(reportsRef, {
      ...input,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id };
  } catch (err) {
    console.error("[Firestore] addInterviewReport error:", err);
    return { error: err instanceof Error ? err.message : "Failed to save report" };
  }
}

export async function addEmotionSamples(
  userId: string,
  reportId: string,
  samples: Array<Omit<EmotionSampleRecord, "userId" | "reportId">>
): Promise<void> {
  if (!samples.length) return;
  const db = getFirestoreDb();
  const batchSize = 400;
  for (let i = 0; i < samples.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = samples.slice(i, i + batchSize);
    chunk.forEach((sample) => {
      const docRef = doc(collection(db, "mockInterviewEmotionSamples"));
      batch.set(docRef, { userId, reportId, ...sample });
    });
    await batch.commit();
  }
}

export async function addSpeechStats(
  userId: string,
  reportId: string,
  stats: SpeechStatRecord[]
): Promise<void> {
  if (!stats.length) return;
  const db = getFirestoreDb();
  const batchSize = 400;
  for (let i = 0; i < stats.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = stats.slice(i, i + batchSize);
    chunk.forEach((stat) => {
      const docRef = doc(collection(db, "mockInterviewSpeechStats"));
      batch.set(docRef, stat);
    });
    await batch.commit();
  }
}

export async function loadInterviewReports(userId: string, max = 10): Promise<InterviewReportRecord[]> {
  try {
    const db = getFirestoreDb();
    const reportsRef = collection(db, "mockInterviewReports");
    const q = query(
      reportsRef,
      where("userId", "==", userId),
      limit(max)
    );
    const snapshot = await getDocs(q);
    const reports: InterviewReportRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<InterviewReportRecord, "id">;
      reports.push({ id: docSnap.id, ...data });
    });
    reports.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return bTime - aTime;
    });
    return reports;
  } catch (err) {
    console.error("[Firestore] loadInterviewReports error:", err);
    return [];
  }
}

export async function loadEmotionSamples(userId: string, days = 30, max = 2000): Promise<EmotionSampleRecord[]> {
  try {
    const db = getFirestoreDb();
    const samplesRef = collection(db, "mockInterviewEmotionSamples");
    const q = query(samplesRef, where("userId", "==", userId), limit(max));
    const snapshot = await getDocs(q);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const samples: EmotionSampleRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as EmotionSampleRecord;
      if (data.ts >= cutoff) samples.push(data);
    });
    samples.sort((a, b) => a.ts - b.ts);
    return samples;
  } catch (err) {
    console.error("[Firestore] loadEmotionSamples error:", err);
    return [];
  }
}

export async function loadSpeechStats(userId: string, days = 30, max = 2000): Promise<SpeechStatRecord[]> {
  try {
    const db = getFirestoreDb();
    const statsRef = collection(db, "mockInterviewSpeechStats");
    const q = query(statsRef, where("userId", "==", userId), limit(max));
    const snapshot = await getDocs(q);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const stats: SpeechStatRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as SpeechStatRecord;
      if (data.ts >= cutoff) stats.push(data);
    });
    stats.sort((a, b) => a.ts - b.ts);
    return stats;
  } catch (err) {
    console.error("[Firestore] loadSpeechStats error:", err);
    return [];
  }
}

export async function addAssessmentResult(
  input: AssessmentResultInput
): Promise<{ id: string } | { error: string }> {
  try {
    const db = getFirestoreDb();
    const resultsRef = collection(db, "assessmentResults");
    const docRef = await addDoc(resultsRef, {
      ...input,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id };
  } catch (err) {
    console.error("[Firestore] addAssessmentResult error:", err);
    return { error: err instanceof Error ? err.message : "Failed to save assessment result" };
  }
}

export async function loadAssessmentResults(userId: string, max = 50): Promise<AssessmentResultRecord[]> {
  try {
    const db = getFirestoreDb();
    const resultsRef = collection(db, "assessmentResults");
    const q = query(resultsRef, where("userId", "==", userId), limit(max));
    const snapshot = await getDocs(q);
    const results: AssessmentResultRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<AssessmentResultRecord, "id">;
      results.push({ id: docSnap.id, ...data });
    });
    results.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return aTime - bTime;
    });
    return results;
  } catch (err) {
    console.error("[Firestore] loadAssessmentResults error:", err);
    return [];
  }
}

export function subscribeInterviewReports(
  userId: string,
  max: number,
  onUpdate: (reports: InterviewReportRecord[]) => void
): () => void {
  const db = getFirestoreDb();
  const reportsRef = collection(db, "mockInterviewReports");
  const q = query(
    reportsRef,
    where("userId", "==", userId),
    limit(max)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reports: InterviewReportRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<InterviewReportRecord, "id">;
        reports.push({ id: docSnap.id, ...data });
      });
      reports.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
      onUpdate(reports);
    },
    (err) => {
      console.error("[Firestore] subscribeInterviewReports error:", err);
      onUpdate([]);
    }
  );
}
