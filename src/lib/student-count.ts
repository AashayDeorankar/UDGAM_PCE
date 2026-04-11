/**
 * Happy Students count: starts at 623, increments in Firestore when a new visitor
 * hits the site (once per device via localStorage). Read from Firestore for display.
 */
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { getFirestoreDb } from "@/integrations/firebase/config";

const STATS_COLLECTION = "stats";
const STUDENT_COUNT_DOC = "studentCount";
const COUNT_FIELD = "count";
const INITIAL_COUNT = 623;
const VISITED_KEY = "techprep_student_visited";

export function getStudentCount(): Promise<number> {
  try {
    const db = getFirestoreDb();
    const ref = doc(db, STATS_COLLECTION, STUDENT_COUNT_DOC);
    return getDoc(ref).then((snap) => {
      if (snap.exists() && typeof snap.get(COUNT_FIELD) === "number") {
        return snap.get(COUNT_FIELD) as number;
      }
      return INITIAL_COUNT;
    });
  } catch {
    return Promise.resolve(INITIAL_COUNT);
  }
}

/** Call once per device/session; increments Firestore count for new visitors. */
export function recordNewVisit(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(VISITED_KEY)) return;

  try {
    const db = getFirestoreDb();
    const ref = doc(db, STATS_COLLECTION, STUDENT_COUNT_DOC);

    getDoc(ref).then((snap) => {
      if (!snap.exists()) {
        // Seed doc with 623; this visitor is not counted so count stays 623
        return setDoc(ref, { [COUNT_FIELD]: INITIAL_COUNT });
      }
      return updateDoc(ref, { [COUNT_FIELD]: increment(1) });
    }).then(() => {
      localStorage.setItem(VISITED_KEY, "1");
    }).catch(() => {});
  } catch {
    // Firebase not configured or disabled
  }
}

/** React hook: returns live student count (starts at 623), records new visit on mount. */
export function useStudentCount(): number {
  const [count, setCount] = useState<number>(INITIAL_COUNT);

  useEffect(() => {
    recordNewVisit();
    getStudentCount().then(setCount);
  }, []);

  return count;
}
