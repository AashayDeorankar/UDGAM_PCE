import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  limit,
  setDoc,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { BriefcaseBusiness, GraduationCap, LogOut, Search, ShieldCheck, Users } from "lucide-react";
import { auth, db } from "./firebase";
import type { PlatformUser, StudentMetrics, StudentRow, TpoProfile } from "./types";

type ReportDoc = {
  id?: string;
  userId?: string;
  overall?: number;
  confidence?: number;
  communication?: number;
  technical?: number;
  fluency?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  createdAt?: { toDate?: () => Date };
};

type AssessmentDoc = {
  id?: string;
  userId?: string;
  label?: string;
  score?: number;
  createdAt?: { toDate?: () => Date };
};

function normalizeCollegeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function mapUserDoc(docSnap: QueryDocumentSnapshot<DocumentData>): PlatformUser {
  const data = docSnap.data() as Partial<PlatformUser>;
  return {
    uid: docSnap.id,
    email: String(data.email || ""),
    name: String(data.name || "Unnamed"),
    role: String(data.role || "student"),
    collegeName: String(data.collegeName || ""),
    branch: typeof data.branch === "string" ? data.branch : "",
    year: typeof data.year === "string" ? data.year : "",
    domain: typeof data.domain === "string" ? data.domain : "",
    target: typeof data.target === "string" ? data.target : "",
    companyName: typeof data.companyName === "string" ? data.companyName : "",
    position: typeof data.position === "string" ? data.position : "",
  };
}

function chunkIds(ids: string[], size = 10): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

async function loadUsersForCollege(collegeName: string): Promise<PlatformUser[]> {
  const usersRef = collection(db, "users");
  const exactQuery = query(usersRef, where("collegeName", "==", collegeName));
  const exactSnap = await getDocs(exactQuery);

  let users = exactSnap.docs.map(mapUserDoc);
  if (users.length > 0) return users;

  // Fallback for case/whitespace differences in existing data.
  const allSnap = await getDocs(usersRef);
  const normalizedCollege = normalizeCollegeName(collegeName);
  users = allSnap.docs
    .map(mapUserDoc)
    .filter((user) => normalizeCollegeName(user.collegeName) === normalizedCollege);
  return users;
}

async function loadStudentMetrics(userIds: string[]): Promise<Map<string, StudentMetrics>> {
  const result = new Map<string, StudentMetrics>();
  userIds.forEach((id) => {
    result.set(id, {
      attempts: 0,
      assessmentScore: 0,
      progress: 0,
      lastActivity: "No activity",
    });
  });

  if (userIds.length === 0) return result;

  const reportsRef = collection(db, "mockInterviewReports");
  const batches = chunkIds(userIds, 10);

  for (const batch of batches) {
    const snap = await getDocs(query(reportsRef, where("userId", "in", batch)));
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as ReportDoc;
      const userId = String(data.userId || "");
      if (!result.has(userId)) return;

      const current = result.get(userId)!;
      const score = Number(data.overall) || 0;
      const attempts = current.attempts + 1;
      const runningTotal = current.assessmentScore * current.attempts + score;
      const nextAverage = Math.round(runningTotal / attempts);

      const createdAt = data.createdAt?.toDate?.();
      const nextLastActivity = createdAt
        ? createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : current.lastActivity;

      // Progress combines consistency (attempt count) and average interview quality.
      const consistencyWeight = Math.min(attempts, 5) / 5;
      const qualityWeight = nextAverage / 100;
      const progress = Math.min(100, Math.round(consistencyWeight * 40 + qualityWeight * 60));

      result.set(userId, {
        attempts,
        assessmentScore: nextAverage,
        progress,
        lastActivity: nextLastActivity,
      });
    });
  }

  return result;
}

function statusFromProgress(progress: number): string {
  if (progress >= 75) return "On Track";
  if (progress >= 50) return "Improving";
  return "Needs Attention";
}

const MAIN_APP_BASE = import.meta.env.VITE_MAIN_APP_URL || "http://localhost:5173";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [tpoProfile, setTpoProfile] = useState<TpoProfile | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [alumni, setAlumni] = useState<PlatformUser[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [selectedAlumni, setSelectedAlumni] = useState<PlatformUser | null>(null);
  const [selectedStudentReports, setSelectedStudentReports] = useState<ReportDoc[]>([]);
  const [selectedAssessmentResults, setSelectedAssessmentResults] = useState<AssessmentDoc[]>([]);
  const [studentDashboardLoading, setStudentDashboardLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [search, setSearch] = useState("");
  const [alumniSearch, setAlumniSearch] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tpoName, setTpoName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setError("");

      if (!user) {
        setTpoProfile(null);
        setStudents([]);
        setAlumni([]);
        setBooting(false);
        return;
      }

      try {
        setLoadingDashboard(true);
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        if (!profileSnap.exists()) {
          setError("No profile found for this account.");
          await signOut(auth);
          return;
        }

        const profile = profileSnap.data() as Partial<PlatformUser> & { managedCollegeName?: string };
        const role = String(profile.role || "").toLowerCase();
        if (role !== "tpo") {
          setError("Access denied. This portal is only for TPO accounts.");
          await signOut(auth);
          return;
        }

        const collegeName = String(profile.managedCollegeName || profile.collegeName || "").trim();
        if (!collegeName) {
          setError("TPO account is missing college mapping. Add collegeName in users/{uid}.");
          await signOut(auth);
          return;
        }

        setTpoProfile({
          uid: user.uid,
          email: user.email || "",
          name: String(profile.name || "TPO"),
          collegeName,
        });

        const collegeUsers = await loadUsersForCollege(collegeName);
        const studentsOnly = collegeUsers.filter((u) => String(u.role).toLowerCase() === "student");
        const alumniOnly = collegeUsers.filter((u) => String(u.role).toLowerCase() === "alumni");
        const metricsMap = await loadStudentMetrics(studentsOnly.map((u) => u.uid));

        const studentRows: StudentRow[] = studentsOnly.map((student) => {
          const metrics = metricsMap.get(student.uid) ?? {
            attempts: 0,
            assessmentScore: 0,
            progress: 0,
            lastActivity: "No activity",
          };
          return {
            ...student,
            ...metrics,
          };
        });

        studentRows.sort((a, b) => b.progress - a.progress);
        setStudents(studentRows);
        setAlumni(alumniOnly);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load TPO dashboard.";
        setError(message);
      } finally {
        setLoadingDashboard(false);
        setBooting(false);
      }
    });

    return () => unsub();
  }, []);

  const filteredStudents = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return students;
    return students.filter((s) => {
      return (
        s.name.toLowerCase().includes(key) ||
        s.email.toLowerCase().includes(key) ||
        (s.branch || "").toLowerCase().includes(key) ||
        (s.year || "").toLowerCase().includes(key)
      );
    });
  }, [search, students]);

  const filteredAlumni = useMemo(() => {
    const key = alumniSearch.trim().toLowerCase();
    if (!key) return alumni;
    return alumni.filter((a) => {
      return (
        a.name.toLowerCase().includes(key) ||
        a.email.toLowerCase().includes(key) ||
        (a.companyName || "").toLowerCase().includes(key) ||
        (a.position || "").toLowerCase().includes(key)
      );
    });
  }, [alumniSearch, alumni]);

  const avgProgress = useMemo(() => {
    if (students.length === 0) return 0;
    const total = students.reduce((acc, s) => acc + s.progress, 0);
    return Math.round(total / students.length);
  }, [students]);

  const avgAssessment = useMemo(() => {
    if (students.length === 0) return 0;
    const total = students.reduce((acc, s) => acc + s.assessmentScore, 0);
    return Math.round(total / students.length);
  }, [students]);

  const alumniSummary = useMemo(() => {
    const total = alumni.length;
    const companyCounts = new Map<string, number>();
    const roleCounts = new Map<string, number>();

    alumni.forEach((a) => {
      const company = (a.companyName || "Unknown").trim() || "Unknown";
      const role = (a.position || "Alumni").trim() || "Alumni";
      companyCounts.set(company, (companyCounts.get(company) || 0) + 1);
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    });

    const topCompanies = Array.from(companyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const topRoles = Array.from(roleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, topCompanies, topRoles };
  }, [alumni]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginLoading(true);
    setError("");
    try {
      if (isSignup) {
        if (!tpoName.trim()) {
          setError("Please enter the TPO name.");
          return;
        }
        if (!collegeName.trim()) {
          setError("Please enter the college name.");
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(
          doc(db, "users", result.user.uid),
          {
            email: email.trim(),
            name: tpoName.trim(),
            role: "tpo",
            collegeName: collegeName.trim(),
            managedCollegeName: collegeName.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { merge: true },
        );
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      setPassword("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const toMillis = (value?: { toDate?: () => Date }) => (value?.toDate ? value.toDate().getTime() : 0);

  const loadStudentDashboardData = async (userId: string) => {
    setStudentDashboardLoading(true);
    try {
      const reportsRef = collection(db, "mockInterviewReports");
      const resultsRef = collection(db, "assessmentResults");

      const reportsSnap = await getDocs(query(reportsRef, where("userId", "==", userId), limit(25)));
      const reports = reportsSnap.docs.map((docSnap) => {
        const data = docSnap.data() as ReportDoc;
        return { ...data, id: docSnap.id };
      });
      reports.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setSelectedStudentReports(reports);

      const resultsSnap = await getDocs(query(resultsRef, where("userId", "==", userId), limit(25)));
      const results = resultsSnap.docs.map((docSnap) => {
        const data = docSnap.data() as AssessmentDoc;
        return { ...data, id: docSnap.id };
      });
      results.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setSelectedAssessmentResults(results);
    } finally {
      setStudentDashboardLoading(false);
    }
  };

  const openStudentDashboard = (student: StudentRow) => {
    setSelectedStudent(student);
    setSelectedStudentReports([]);
    setSelectedAssessmentResults([]);
    void loadStudentDashboardData(student.uid);
  };

  if (booting) {
    return (
      <div className="screen center">
        <div className="loader-card">Launching TPO panel...</div>
      </div>
    );
  }

  if (!firebaseUser || !tpoProfile) {
    return (
      <div className="screen center">
        <div className="login-shell">
          <div className="brand-pill">College TPO Console</div>
          <h1>{isSignup ? "Create TPO Account" : "TPO Sign In"}</h1>
          <p>
            {isSignup
              ? "Create a TPO login to access your college dashboard."
              : "Use your assigned TPO account to access student and alumni dashboards for your college only."}
          </p>

          <form onSubmit={handleLogin} className="login-form">
            {isSignup && (
              <>
                <label>
                  TPO Name
                  <input
                    type="text"
                    value={tpoName}
                    onChange={(e) => setTpoName(e.target.value)}
                    placeholder="Training & Placement Officer"
                    required
                  />
                </label>
                <label>
                  College Name
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="College name"
                    required
                  />
                </label>
              </>
            )}
            <label>
              Work Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tpo@college.edu"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </label>
            <button type="submit" disabled={loginLoading}>
              {loginLoading
                ? isSignup
                  ? "Creating account..."
                  : "Signing in..."
                : isSignup
                  ? "Create TPO Account"
                  : "Access TPO Dashboard"}
            </button>
          </form>

          <button
            type="button"
            className="toggle-auth"
            onClick={() => {
              setIsSignup((prev) => !prev);
              setError("");
            }}
          >
            {isSignup ? "Already have an account? Sign in" : "Need a TPO account? Sign up"}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="brand-pill">TPO Console</div>
          <h1>{tpoProfile.collegeName}</h1>
          <p>Signed in as {tpoProfile.name}</p>
        </div>
        <button onClick={handleSignOut} className="logout-btn">
          <LogOut size={16} />
          Sign out
        </button>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="kpi-grid">
        <article className="kpi-card">
          <Users size={18} />
          <h3>Total Students</h3>
          <p>{students.length}</p>
        </article>
        <article className="kpi-card">
          <GraduationCap size={18} />
          <h3>Total Alumni</h3>
          <p>{alumni.length}</p>
        </article>
        <article className="kpi-card">
          <ShieldCheck size={18} />
          <h3>Avg Progress</h3>
          <p>{avgProgress}%</p>
        </article>
        <article className="kpi-card">
          <BriefcaseBusiness size={18} />
          <h3>Avg Assessment</h3>
          <p>{avgAssessment}/100</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Student Dashboard</h2>
            <p>Only students from {tpoProfile.collegeName} are shown.</p>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, branch, year"
            />
          </label>
        </div>

        {loadingDashboard ? (
          <div className="loader-card">Loading student dashboard...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-card">No students found for this college.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Year</th>
                  <th>Branch</th>
                  <th>Progress</th>
                  <th>Assessment</th>
                  <th>Attempts</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.uid}>
                    <td>
                      <div className="student-cell">
                        <button
                          type="button"
                          className="student-link"
                          onClick={() => openStudentDashboard(student)}
                        >
                          {student.name}
                        </button>
                        <span>{student.email}</span>
                      </div>
                    </td>
                    <td>{student.year || "-"}</td>
                    <td>{student.branch || "-"}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${student.progress}%` }} />
                        </div>
                        <span>{student.progress}%</span>
                      </div>
                    </td>
                    <td>{student.assessmentScore}/100</td>
                    <td>{student.attempts}</td>
                    <td>
                      <span className={`status-chip status-${statusFromProgress(student.progress).replace(/\s+/g, "-").toLowerCase()}`}>
                        {statusFromProgress(student.progress)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel alumni-panel">
        <div className="panel-head">
          <div>
            <h2>Alumni Dashboard ({alumni.length})</h2>
            <p>Only alumni mapped to {tpoProfile.collegeName} are visible here.</p>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              type="text"
              value={alumniSearch}
              onChange={(e) => setAlumniSearch(e.target.value)}
              placeholder="Search name, email, company"
            />
          </label>
        </div>

        <div className="kpi-grid mini">
          <article className="kpi-card">
            <h3>Total Alumni</h3>
            <p>{alumniSummary.total}</p>
          </article>
          <article className="kpi-card">
            <h3>Top Companies</h3>
            <ul>
              {alumniSummary.topCompanies.length === 0 ? (
                <li>--</li>
              ) : (
                alumniSummary.topCompanies.map(([name, count]) => (
                  <li key={name}>{name} · {count}</li>
                ))
              )}
            </ul>
          </article>
          <article className="kpi-card">
            <h3>Top Roles</h3>
            <ul>
              {alumniSummary.topRoles.length === 0 ? (
                <li>--</li>
              ) : (
                alumniSummary.topRoles.map(([name, count]) => (
                  <li key={name}>{name} · {count}</li>
                ))
              )}
            </ul>
          </article>
        </div>

        {loadingDashboard ? (
          <div className="loader-card">Loading alumni dashboard...</div>
        ) : filteredAlumni.length === 0 ? (
          <div className="empty-card">No alumni found for this college.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Alumni</th>
                  <th>Position</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumni.map((alum) => (
                  <tr key={alum.uid}>
                    <td>
                      <div className="student-cell">
                        <button
                          type="button"
                          className="student-link"
                          onClick={() => setSelectedAlumni(alum)}
                        >
                          {alum.name}
                        </button>
                        <span>{alum.email}</span>
                      </div>
                    </td>
                    <td>{alum.position || "-"}</td>
                    <td>{alum.companyName || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedStudent && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <p className="modal-eyebrow">Student Dashboard</p>
                <h3>{selectedStudent.name}</h3>
                <span>{selectedStudent.email}</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedStudent(null)}>
                Close
              </button>
            </div>

            {studentDashboardLoading ? (
              <div className="loader-card">Loading student dashboard...</div>
            ) : (
              <>
                <div className="modal-grid">
                  <div>
                    <p className="label">Branch / Year</p>
                    <p>{selectedStudent.branch || "-"} {selectedStudent.year ? `• ${selectedStudent.year}` : ""}</p>
                  </div>
                  <div>
                    <p className="label">Domain</p>
                    <p>{selectedStudent.domain || "-"}</p>
                  </div>
                  <div>
                    <p className="label">Target Role</p>
                    <p>{selectedStudent.target || "-"}</p>
                  </div>
                  <div>
                    <p className="label">Last Activity</p>
                    <p>{selectedStudent.lastActivity}</p>
                  </div>
                </div>

                <div className="modal-kpis">
                  <article>
                    <p>Progress</p>
                    <strong>{selectedStudent.progress}%</strong>
                  </article>
                  <article>
                    <p>Assessment</p>
                    <strong>{selectedStudent.assessmentScore}/100</strong>
                  </article>
                  <article>
                    <p>Attempts</p>
                    <strong>{selectedStudent.attempts}</strong>
                  </article>
                  <article>
                    <p>Status</p>
                    <strong>{statusFromProgress(selectedStudent.progress)}</strong>
                  </article>
                </div>

                <div className="modal-grid">
                  <div>
                    <p className="label">Interview Reports</p>
                    <p>{selectedStudentReports.length} total</p>
                  </div>
                  <div>
                    <p className="label">Assessments</p>
                    <p>{selectedAssessmentResults.length} total</p>
                  </div>
                </div>

                <div className="modal-grid">
                  <div>
                    <p className="label">Latest Interview Summary</p>
                    <p>{selectedStudentReports[0]?.summary || "No interview summary yet."}</p>
                  </div>
                  <div>
                    <p className="label">Latest Suggestions</p>
                    <p>{selectedStudentReports[0]?.suggestions?.join(", ") || "No suggestions yet."}</p>
                  </div>
                </div>

                <div className="modal-grid">
                  <div>
                    <p className="label">Recent Interviews</p>
                    <ul>
                      {selectedStudentReports.slice(0, 5).map((report) => (
                        <li key={report.id || report.summary}>
                          {(report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString("en-IN") : "--")}
                          {" · "}
                          {report.overall ?? 0}/100
                        </li>
                      ))}
                      {selectedStudentReports.length === 0 && <li>--</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="label">Recent Assessments</p>
                    <ul>
                      {selectedAssessmentResults.slice(0, 5).map((result) => (
                        <li key={result.id || result.label}>
                          {result.label || "Assessment"} · {result.score ?? 0}/100
                        </li>
                      ))}
                      {selectedAssessmentResults.length === 0 && <li>--</li>}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedAlumni && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <p className="modal-eyebrow">Alumni Snapshot</p>
                <h3>{selectedAlumni.name}</h3>
                <span>{selectedAlumni.email}</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedAlumni(null)}>
                Close
              </button>
            </div>

            <div className="modal-grid">
              <div>
                <p className="label">Company</p>
                <p>{selectedAlumni.companyName || "-"}</p>
              </div>
              <div>
                <p className="label">Position</p>
                <p>{selectedAlumni.position || "-"}</p>
              </div>
              <div>
                <p className="label">College</p>
                <p>{selectedAlumni.collegeName || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
