/** One file/link for notes, PPT, or prev year papers */
export interface MaterialItem {
  name: string;
  url: string;
  /** Optional: e.g. "Unit 1", "2024" */
  label?: string;
  /** Subject/category (e.g. "Software Engineering", "DAA") */
  subject?: string;
  /** Credit/source (e.g. "Myself", "Ram", "Online") */
  credit?: string;
  /** Formatted date for display */
  date?: string;
}

/** Materials for a single branch (S3 or any URL source) */
export interface BranchMaterialsData {
  handwrittenNotes: MaterialItem[];
  ppt: MaterialItem[];
  prevYearPapers: MaterialItem[];
}

/** Map branch code (e.g. CSE, ECE) to materials. Load from /branch-materials.json or API. */
export type BranchMaterialsMap = Record<string, BranchMaterialsData>;
