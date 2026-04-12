export type UserRole = "student" | "alumni" | "tpo";

export type PlatformUser = {
  uid: string;
  email: string;
  name: string;
  role: UserRole | string;
  collegeName: string;
  branch?: string;
  year?: string;
  domain?: string;
  target?: string;
  companyName?: string;
  position?: string;
};

export type StudentMetrics = {
  attempts: number;
  assessmentScore: number;
  progress: number;
  lastActivity: string;
};

export type StudentRow = PlatformUser & StudentMetrics;

export type TpoProfile = {
  uid: string;
  email: string;
  name: string;
  collegeName: string;
};
