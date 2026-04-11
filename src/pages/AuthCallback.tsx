import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Dedicated page for Google sign-in redirect.
 * 1. User clicks "Continue with Google" on /auth → we send them here (/auth/callback?mode=google)
 * 2. This page loads and calls signInWithRedirect → browser goes to Google
 * 3. User returns to /auth/callback#... → getRedirectResult (in AuthProvider) sets user → we redirect to /
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { user, loading, signInWithGoogle } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    const mode = searchParams.get("mode");
    const hasHash = typeof window !== "undefined" && window.location.hash.length > 1;

    if (mode === "google" && !hasHash && !started.current) {
      started.current = true;
      signInWithGoogle("student");
    }
  }, [searchParams, signInWithGoogle]);

  // As soon as we have user, redirect to home – and keep retrying until we actually leave
  useEffect(() => {
    if (loading || !user) return;
    let target = searchParams.get("redirect") || "/";
    if (!target || target === "/auth" || target.startsWith("/auth?")) target = "/";
    const url = target.startsWith("http") ? target : `${window.location.origin}${target.startsWith("/") ? target : `/${target}`}`;

    const doRedirect = () => {
      try {
        window.location.href = url;
      } catch {
        window.location.replace(url);
      }
    };

    doRedirect();
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && (window.location.pathname === "/auth" || window.location.pathname === "/auth/callback")) {
        doRedirect();
      } else {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [user, loading, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground font-medium">
        {loading ? "Completing sign-in…" : "Redirecting you…"}
      </p>
    </div>
  );
}
