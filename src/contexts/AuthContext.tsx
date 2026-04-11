import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
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
  signUp: (email: string, password: string, role: "student" | "alumni") => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (role: "student" | "alumni") => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  clearRedirectError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<Error | null>(null);
  const [role, setRole] = useState<"student" | "alumni" | null>(null);
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();

  const ensureProfile = async (firebaseUser: User, preferredRole?: "student" | "alumni") => {
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const roleToSet = preferredRole || "student";
      await setDoc(ref, {
        email: firebaseUser.email || "",
        role: roleToSet,
        createdAt: serverTimestamp(),
      });
      setRole(roleToSet);
      return;
    }
    const data = snap.data() as { role?: "student" | "alumni" };
    setRole(data?.role || "student");
  };

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    let nullTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser !== null) {
        if (nullTimeoutId) clearTimeout(nullTimeoutId);
        nullTimeoutId = null;
        setUser(firebaseUser);
        ensureProfile(firebaseUser).catch(() => setRole(null));
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

  const signUp = async (email: string, password: string, preferredRole: "student" | "alumni") => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await ensureProfile(cred.user, preferredRole);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithGoogle = async (preferredRole: "student" | "alumni") => {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await ensureProfile(cred.user, preferredRole);
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
