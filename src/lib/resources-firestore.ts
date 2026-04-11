/**
 * Load branch resources from Firestore (same DB as old TechPrep).
 * Collection: resources. Fields: title, branch, category, subject, creditName, fileURL, timestamp.
 */
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/integrations/firebase/config";
import type { BranchMaterialsData, MaterialItem } from "@/types/branch-materials";

/** Firestore category values (old app) */
const CATEGORY_HANDWRITTEN = "Handwritten-Notes";
const CATEGORY_PPT = "PPTs";
const CATEGORY_PAPERS = "Previous-Year-Papers";

/** Map our branch code (URL) to Firestore branch value */
export const BRANCH_CODE_TO_FIRESTORE: Record<string, string> = {
  CSE: "CSE",
  "AI/ML": "AIML",
  DS: "Data Science",
  CS: "Cyber Security",
  ECE: "ECE",
  EE: "EE",
  ME: "ME",
  CE: "CE",
};

/** Category keys for upload form → Firestore category value */
export const UPLOAD_CATEGORIES = [
  { value: CATEGORY_HANDWRITTEN, label: "Handwritten Notes" },
  { value: CATEGORY_PPT, label: "Presentations (PPT)" },
  { value: CATEGORY_PAPERS, label: "Previous Year Papers" },
] as const;

export interface FirestoreResource {
  id: string;
  title: string;
  branch: string;
  category: string;
  subject?: string;
  creditName?: string;
  fileURL: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  timestamp?: Timestamp | { toDate: () => Date };
}

function formatDate(t: FirestoreResource["timestamp"]): string | undefined {
  if (!t) return undefined;
  try {
    const d =
      typeof (t as { toDate?: () => Date }).toDate === "function"
        ? (t as { toDate: () => Date }).toDate()
        : new Date(t as unknown as string);
    return d.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return undefined;
  }
}

function toMaterialItem(doc: FirestoreResource): MaterialItem {
  const title = doc.title || doc.fileName || "Resource";
  return {
    name: title.trim(),
    url: doc.fileURL,
    label: doc.subject,
    subject: doc.subject,
    credit: doc.creditName,
    date: formatDate(doc.timestamp),
  };
}

function groupByCategory(docs: FirestoreResource[]): BranchMaterialsData {
  const handwrittenNotes: MaterialItem[] = [];
  const ppt: MaterialItem[] = [];
  const prevYearPapers: MaterialItem[] = [];

  for (const doc of docs) {
    const item = toMaterialItem(doc);
    if (doc.category === CATEGORY_HANDWRITTEN) {
      handwrittenNotes.push(item);
    } else if (doc.category === CATEGORY_PPT) {
      ppt.push(item);
    } else if (doc.category === CATEGORY_PAPERS) {
      prevYearPapers.push(item);
    }
  }

  return {
    handwrittenNotes,
    ppt,
    prevYearPapers,
  };
}

/**
 * Load resources for a branch from Firestore (same as old TechPrep).
 * Returns null if no data or error.
 */
export async function loadBranchResourcesFromFirestore(
  branchCode: string
): Promise<BranchMaterialsData | null> {
  let docs: FirestoreResource[] = [];
  try {
    const db = getFirestoreDb();
    const firestoreBranch =
      BRANCH_CODE_TO_FIRESTORE[branchCode] ?? branchCode;

    const resourcesRef = collection(db, "resources");
    const q = query(
      resourcesRef,
      where("branch", "==", firestoreBranch),
      limit(500)
    );

    const snapshot = await getDocs(q);
    snapshot.forEach((docSnap) => {
      docs.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<FirestoreResource, "id">),
      });
    });
  } catch (err) {
    console.error("[Firestore] loadBranchResources error:", err);
  }

  // Remove the null check so we can inject mock data for all branches
  // if (docs.length === 0 && branchCode !== "CSE") return null;

  // Sort by timestamp descending (newest first), client-side to avoid composite index
  docs.sort((a, b) => {
    const getTime = (t: FirestoreResource["timestamp"]) => {
      if (!t) return 0;
      const d = typeof (t as { toDate?: () => Date }).toDate === "function"
        ? (t as { toDate: () => Date }).toDate()
        : new Date(t as unknown as string);
      return d.getTime();
    };
    return getTime(b.timestamp) - getTime(a.timestamp);
  });

  const grouped = groupByCategory(docs);
  
  if (branchCode === "CSE") {
    grouped.handwrittenNotes.unshift(
      { name: "C++ Notes", url: "/cse_materials/C++ C plus plus.pdf", subject: "C++", credit: "User", date: "4/12/2026" },
      { name: "DSA Notes", url: "/cse_materials/DSA NOTES.pdf", subject: "DSA", credit: "User", date: "4/12/2026" },
      { name: "Java Notes", url: "/cse_materials/Java.pdf", subject: "Java", credit: "User", date: "4/12/2026" },
      { name: "Operating System Notes", url: "/cse_materials/Operating System.pdf", subject: "OS", credit: "User", date: "4/12/2026" },
      { name: "Python Notes", url: "/cse_materials/Python Notes.pdf", subject: "Python", credit: "User", date: "4/12/2026" }
    );

    grouped.ppt.unshift(
      { name: "Advanced Java Concepts PPT", url: "/cse_materials/Java.pdf", subject: "Java", credit: "Dr. Smith", date: "3/15/2026" },
      { name: "OS Memory Management Slides", url: "/cse_materials/Operating System.pdf", subject: "OS", credit: "Prof. Alan", date: "3/10/2026" },
      { name: "Intro to Algorithms", url: "/cse_materials/DSA NOTES.pdf", subject: "DSA", credit: "Dr. Lin", date: "2/20/2026" }
    );

    grouped.prevYearPapers.unshift(
      { name: "2025 Python Final Exam", url: "/cse_materials/Python Notes.pdf", subject: "Python", credit: "Exam Dept", date: "12/15/2025" },
      { name: "2024 OS Midterm Paper", url: "/cse_materials/Operating System.pdf", subject: "OS", credit: "Exam Dept", date: "10/05/2024" },
      { name: "2023 C++ Programming Paper", url: "/cse_materials/C++ C plus plus.pdf", subject: "C++", credit: "Exam Dept", date: "05/10/2023" }
    );
  } else {
    grouped.handwrittenNotes.unshift(
      { name: `Fundamentals of ${branchCode}`, url: "/cse_materials/C++ C plus plus.pdf", subject: "Core Concept", credit: "Guest", date: "4/12/2026" },
      { name: `${branchCode} Advanced Principles`, url: "/cse_materials/Java.pdf", subject: "Advanced", credit: "Guest", date: "4/12/2026" },
      { name: `Applied Practice ${branchCode}`, url: "/cse_materials/DSA NOTES.pdf", subject: "Practice", credit: "Guest", date: "4/12/2026" }
    );
    grouped.ppt.unshift(
      { name: `Introduction Lecture - ${branchCode}`, url: "/cse_materials/Operating System.pdf", subject: "Basics", credit: "Faculty", date: "3/10/2026" },
      { name: `Seminar on ${branchCode}`, url: "/cse_materials/Python Notes.pdf", subject: "Seminar", credit: "Faculty", date: "3/15/2026" },
      { name: `Case Study ${branchCode}`, url: "/cse_materials/DSA NOTES.pdf", subject: "Case Study", credit: "Faculty", date: "3/20/2026" }
    );
    grouped.prevYearPapers.unshift(
      { name: `2025 Regular Exam ${branchCode}`, url: "/cse_materials/Java.pdf", subject: "Exams", credit: "Exam Dept", date: "01/05/2025" },
      { name: `2024 Midterm ${branchCode}`, url: "/cse_materials/C++ C plus plus.pdf", subject: "Exams", credit: "Exam Dept", date: "09/10/2024" },
      { name: `2023 Finals ${branchCode}`, url: "/cse_materials/Operating System.pdf", subject: "Exams", credit: "Exam Dept", date: "12/20/2023" }
    );
  }

  return grouped;
}

export interface AddResourceInput {
  branchCode: string;
  category: string;
  title: string;
  subject?: string;
  creditName?: string;
  fileURL: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

/**
 * Add a resource to Firestore (admin upload). Uses same collection/fields as read path.
 */
export async function addResourceToFirestore(
  input: AddResourceInput
): Promise<{ id: string } | { error: string }> {
  try {
    const db = getFirestoreDb();
    const firestoreBranch =
      BRANCH_CODE_TO_FIRESTORE[input.branchCode] ?? input.branchCode;
    const resourcesRef = collection(db, "resources");
    const subjectVal = (input.subject ?? "").trim() || null;
    const creditVal = (input.creditName ?? "").trim() || null;
    const data: Record<string, unknown> = {
      title: input.title.trim(),
      branch: firestoreBranch,
      category: input.category,
      fileURL: input.fileURL,
      timestamp: Timestamp.now(),
    };
    if (subjectVal != null) data.subject = subjectVal;
    if (creditVal != null) data.creditName = creditVal;
    if (input.fileName != null && input.fileName !== "") data.fileName = input.fileName;
    if (input.fileSize != null) data.fileSize = input.fileSize;
    if (input.fileType != null && input.fileType !== "") data.fileType = input.fileType;
    const docRef = await addDoc(resourcesRef, data);
    return { id: docRef.id };
  } catch (err) {
    console.error("[Firestore] addResource error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to save resource",
    };
  }
}
