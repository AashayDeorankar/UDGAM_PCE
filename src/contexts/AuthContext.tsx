import { createContext, useCallback, useContext, useEffect, useState, ReactNode, useRef } from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirebaseAuth, getFirestoreDb } from "@/integrations/firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/** Comma-separated list of admin emails (env: VITE_ADMIN_EMAILS). First entry is default admin. */
const DEFAULT_ADMIN_EMAILS = ["amanvverma109@gmail.com"];

function getAdminEmails(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAILS;
  const fromEnv = raw && typeof raw === "string"
    ? raw.split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean)
    : [];
  return fromEnv.length > 0 ? fromEnv : DEFAULT_ADMIN_EMAILS;
}

interface AuthContextType {
  user: User | null;
  session: null;
  loading: boolean;
  isAdmin: boolean;
  role: "student" | "alumni" | null;
  /** Set when Google sign-in fails (e.g. user cancelled popup). Clear after reading. */
  redirectError: Error | null;
  signUp: (
    email: string,
    password: string,
    role: "student" | "alumni",
    profile?: Record<string, string>
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, role?: "student" | "alumni") => Promise<{ error: Error | null }>;
  signInWithGoogle: (
    role: "student" | "alumni",
    profile?: Record<string, string>
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  clearRedirectError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<Error | null>(null);
  const [role, setRole] = useState<"student" | "alumni" | null>(null);
  const roleRef = useRef<"student" | "alumni" | null>(null);
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const pendingRoleKey = "techprep.pendingRole";
  const storedRoleKey = "techprep.selectedRole";

  const ensureProfile = async (
    firebaseUser: User,
    preferredRole?: "student" | "alumni",
    profile?: Record<string, string>
  ) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const alumniRef = doc(db, "alumni", firebaseUser.uid);
    const studentRef = doc(db, "students", firebaseUser.uid);
    const snap = await getDoc(userRef);
    let resolvedRole = preferredRole || "student";
    if (!preferredRole) {
      const alumniSnap = await getDoc(alumniRef);
      if (alumniSnap.exists()) {
        resolvedRole = "alumni";
      } else {
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          resolvedRole = "student";
        }
      }
    }

    if (!snap.exists()) {
      await setDoc(userRef, {
        email: firebaseUser.email || "",
        role: resolvedRole,
        ...(profile || {}),
        createdAt: serverTimestamp(),
      });
      await setDoc(
        resolvedRole === "alumni" ? alumniRef : studentRef,
        {
          email: firebaseUser.email || "",
          role: resolvedRole,
          ...(profile || {}),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
      setRole(resolvedRole);
      return;
    }

    const data = snap.data() as { role?: "student" | "alumni" };
    const currentRole = data?.role || "student";
    const roleToSet = preferredRole || resolvedRole || currentRole;
    if (roleToSet !== currentRole || profile) {
      await setDoc(
        userRef,
        {
          role: roleToSet,
          ...(profile || {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await setDoc(
        roleToSet === "alumni" ? alumniRef : studentRef,
        {
          email: firebaseUser.email || "",
          role: roleToSet,
          ...(profile || {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    setRole(roleToSet);
  };

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    let nullTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser !== null) {
        if (nullTimeoutId) clearTimeout(nullTimeoutId);
        nullTimeoutId = null;
        setUser(firebaseUser);
        let preferredRole: "student" | "alumni" | undefined;
        try {
          const raw = window.sessionStorage.getItem(pendingRoleKey);
          if (raw === "student" || raw === "alumni") preferredRole = raw;
          if (preferredRole) window.sessionStorage.removeItem(pendingRoleKey);
        } catch (_) {
          // ignore
        }
        if (!preferredRole) {
          try {
            const stored = window.localStorage.getItem(storedRoleKey);
            if (stored === "student" || stored === "alumni") preferredRole = stored;
          } catch (_) {
            // ignore
          }
        }
        if (preferredRole) {
          setRole(preferredRole);
        }
        const roleHint = preferredRole || roleRef.current || undefined;
        ensureProfile(firebaseUser, roleHint).catch(() => setRole(null));
        setLoading(false);
        return;
      }
      // Firebase often fires once with null before restoring persisted session.
      // Delay treating null as "logged out" so we don't flash the login page.
      if (nullTimeoutId) clearTimeout(nullTimeoutId);
      nullTimeoutId = setTimeout(() => {
        nullTimeoutId = null;
        setUser(null);
        setRole(null);
        setLoading(false);
      }, 200);
    });
    return () => {
      if (nullTimeoutId) clearTimeout(nullTimeoutId);
      unsubscribe();
    };
  }, [auth]);

  const signUp = async (
    email: string,
    password: string,
    preferredRole: "student" | "alumni",
    profile?: Record<string, string>
  ) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await ensureProfile(cred.user, preferredRole, profile);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string, preferredRole?: "student" | "alumni") => {
    try {
      if (preferredRole) {
        try {
          window.sessionStorage.setItem(pendingRoleKey, preferredRole);
        } catch (_) {
          // ignore
        }
        try {
          window.localStorage.setItem(storedRoleKey, preferredRole);
        } catch (_) {
          // ignore
        }
        setRole(preferredRole);
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (preferredRole) {
        await ensureProfile(cred.user, preferredRole);
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithGoogle = async (
    preferredRole: "student" | "alumni",
    profile?: Record<string, string>
  ) => {
    try {
      try {
        window.sessionStorage.setItem(pendingRoleKey, preferredRole);
      } catch (_) {
        // ignore
      }
      try {
        window.localStorage.setItem(storedRoleKey, preferredRole);
      } catch (_) {
        // ignore
      }
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await ensureProfile(cred.user, preferredRole, profile);
      return { error: null };
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setRedirectError(err as Error);
      }
      return { error: err as Error };
    }
  };

  const clearRedirectError = useCallback(() => setRedirectError(null), []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const adminEmails = getAdminEmails();
  const isAdmin = !!user?.email && adminEmails.includes(user.email.toLowerCase());

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        loading,
        isAdmin,
        role,
        redirectError,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        clearRedirectError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
