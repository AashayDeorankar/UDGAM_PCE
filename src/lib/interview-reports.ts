import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
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
  createdAt?: { toDate: () => Date } | null;
};

export type InterviewReportInput = Omit<InterviewReportRecord, "id" | "createdAt">;

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
