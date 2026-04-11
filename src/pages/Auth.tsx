import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false);
  const [role, setRole] = useState<"student" | "alumni">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [domain, setDomain] = useState("");
  const [target, setTarget] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
    domain?: string;
    target?: string;
    collegeName?: string;
    year?: string;
    branch?: string;
    companyName?: string;
    position?: string;
  }>({});

  const { signIn, signUp, signInWithGoogle, user, loading, redirectError, clearRedirectError } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const hasRedirected = useRef(false);

  // Show toast when returning from Google redirect with an error (e.g. user cancelled)
  useEffect(() => {
    if (redirectError) {
      const code = (redirectError as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" || code === "auth/user-cancelled") {
        toast({ title: "Sign-in cancelled", description: "Google sign-in was cancelled." });
      } else {
        toast({
          variant: "destructive",
          title: "Google sign-in failed",
          description: redirectError.message,
        });
      }
      clearRedirectError();
    }
  }, [redirectError, clearRedirectError, toast]);

  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const getRedirectUrl = (path?: string) => {
    let target = path ?? redirectTo ?? "/";
    if (!target || target === "/auth" || target.startsWith("/auth?")) target = "/";
    return target.startsWith("http")
      ? target
      : `${window.location.origin}${target.startsWith("/") ? target : `/${target}`}`;
  };

  const doRedirect = (path?: string) => {
    const url = getRedirectUrl(path);
    try {
      window.location.href = url;
    } catch {
      window.location.replace(url);
    }
  };

  // When user is logged in: redirect and retry every 300ms until we leave /auth or /auth/callback
  useEffect(() => {
    if (loading || !user) return;
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    const url = getRedirectUrl();
    toast({ title: "Login successful! 🎉", description: "Redirecting you…" });
    doRedirect();

    const interval = setInterval(() => {
      if (typeof window !== "undefined" && (window.location.pathname === "/auth" || window.location.pathname === "/auth/callback")) {
        window.location.href = url;
      } else {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [user, loading, redirectTo]);

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
      fullName?: string;
      domain?: string;
      target?: string;
      collegeName?: string;
      year?: string;
      branch?: string;
      companyName?: string;
      position?: string;
    } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (!isLogin) {
      if (!fullName.trim()) newErrors.fullName = "Full name is required";
      if (!domain.trim()) newErrors.domain = "Domain is required";
      if (!collegeName.trim()) newErrors.collegeName = "College name is required";

      if (role === "student") {
        if (!target.trim()) newErrors.target = "Target is required";
        if (!year.trim()) newErrors.year = "Year is required";
        if (!branch.trim()) newErrors.branch = "Branch is required";
      } else {
        if (!companyName.trim()) newErrors.companyName = "Company name is required";
        if (!position.trim()) newErrors.position = "Position is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignupProfileOnly = () => {
    const newErrors: {
      email?: string;
      password?: string;
      fullName?: string;
      domain?: string;
      target?: string;
      collegeName?: string;
      year?: string;
      branch?: string;
      companyName?: string;
      position?: string;
    } = {};

    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!domain.trim()) newErrors.domain = "Domain is required";
    if (!collegeName.trim()) newErrors.collegeName = "College name is required";

    if (role === "student") {
      if (!target.trim()) newErrors.target = "Target is required";
      if (!year.trim()) newErrors.year = "Year is required";
      if (!branch.trim()) newErrors.branch = "Branch is required";
    } else {
      if (!companyName.trim()) newErrors.companyName = "Company name is required";
      if (!position.trim()) newErrors.position = "Position is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildProfilePayload = () => {
    if (role === "student") {
      return {
        name: fullName.trim(),
        domain: domain.trim(),
        target: target.trim(),
        collegeName: collegeName.trim(),
        year: year.trim(),
        branch: branch.trim(),
      };
    }
    return {
      name: fullName.trim(),
      domain: domain.trim(),
      companyName: companyName.trim(),
      collegeName: collegeName.trim(),
      position: position.trim(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password, role);
        if (error) {
          const code = (error as { code?: string }).code;
          if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
            toast({
              variant: "destructive",
              title: "Login Failed",
              description: "Email ya password galat hai. Please check karein.",
            });
          } else if (code === "auth/email-not-verified" || code === "auth/requires-recent-login") {
            toast({
              variant: "destructive",
              title: "Email Not Verified",
              description: "Pehle apni email verify karein. Check your inbox.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Login Failed",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Welcome back! 🎉",
            description: "Successfully logged in.",
          });
          // Navigate immediately so user leaves login page; use microtask so route updates reliably
          const target = redirectTo || "/";
          setTimeout(() => navigate(target, { replace: true }), 0);
          requestAnimationFrame(() => scrollToTop());
        }
      } else {
        const { error } = await signUp(email, password, role, buildProfilePayload());
        if (error) {
          const code = (error as { code?: string }).code;
          if (code === "auth/email-already-in-use") {
            toast({
              variant: "destructive",
              title: "Account Exists",
              description: "Is email se account already hai. Login karein.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Signup Failed",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Account Created! 🎉",
            description: "Check your email to verify your account.",
          });
        }
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLogin && !validateSignupProfileOnly()) return;
    setGoogleLoading(true);
    try {
      const profilePayload = isLogin ? undefined : buildProfilePayload();
      const { error } = await signInWithGoogle(role, profilePayload);
      if (error) {
        toast({
          variant: "destructive",
          title: "Google sign-in failed",
          description: error.message,
        });
      } else {
        toast({ title: "Welcome! 🎉", description: "Signed in with Google." });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message || "Try again.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading…</p>
        </motion.div>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex pt-20 md:pt-24">
        {/* Left panel - branding (hidden on small screens) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:flex lg:w-[44%] xl:w-[48%] flex-col justify-center px-12 xl:px-20 py-16 bg-gradient-to-br from-primary/15 via-primary/5 to-background border-r border-border/50"
        >
          <h2 className="font-display text-3xl xl:text-4xl font-bold text-foreground tracking-tight mb-4 max-w-md">
            Notes, mentors, and interview prep — all in one place.
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-sm">
            Create a free account, access branch-wise materials, and connect with industry mentors.
          </p>
          <ul className="space-y-4">
            {["Branch-wise notes & PYQs", "1:1 mentor sessions", "Company-wise interview prep"].map((point, i) => (
              <motion.li
                key={point}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 text-foreground font-medium"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
                  {i + 1}
                </span>
                {point}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Right panel - form */}
        <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12 min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] relative">
          <div className="absolute inset-0 bg-dots opacity-20 lg:opacity-0 pointer-events-none" aria-hidden />
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full max-w-[420px] relative"
          >

          <motion.div
            variants={item}
            className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-8 shadow-xl shadow-foreground/5"
          >
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
                {isLogin ? "Welcome back" : "Join TechPrep"}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {isLogin ? "Login karein aur resources access karein" : "Free account banao aur start karo"}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-2 h-12 font-medium bg-background/50 hover:bg-muted/50 transition-colors"
              onClick={handleGoogleSignIn}
              disabled={isLoading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-2.5">
                  <GoogleIcon />
                  Continue with Google
                </span>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative flex justify-center">
                <span className="bg-card px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Continue as</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole("student");
                      try {
                        window.localStorage.setItem("techprep.selectedRole", "student");
                      } catch (_) {
                        // ignore
                      }
                    }}
                    className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                      role === "student"
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-foreground border-border"
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole("alumni");
                      try {
                        window.localStorage.setItem("techprep.selectedRole", "alumni");
                      } catch (_) {
                        // ignore
                      }
                    }}
                    className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                      role === "alumni"
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-foreground border-border"
                    }`}
                  >
                    Alumni
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Role applies to new accounts and Google sign-in.
                </p>
              </div>
              <motion.div variants={item} className="space-y-2">
                {!isLogin && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          setErrors((prev) => ({ ...prev, fullName: undefined }));
                        }}
                        placeholder="Your name"
                        className="rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                      {errors.fullName && (
                        <p className="text-sm text-destructive">{errors.fullName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="domain" className="text-sm font-medium">Domain</Label>
                      <Input
                        id="domain"
                        value={domain}
                        onChange={(e) => {
                          setDomain(e.target.value);
                          setErrors((prev) => ({ ...prev, domain: undefined }));
                        }}
                        placeholder="Backend, AI/ML, Product"
                        className="rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                      {errors.domain && (
                        <p className="text-sm text-destructive">{errors.domain}</p>
                      )}
                    </div>
                    {role === "student" ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="target" className="text-sm font-medium">Target</Label>
                          <Input
                            id="target"
                            value={target}
                            onChange={(e) => {
                              setTarget(e.target.value);
                              setErrors((prev) => ({ ...prev, target: undefined }));
                            }}
                            placeholder="SDE-1, Data Analyst"
                            className="rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                          {errors.target && (
                            <p className="text-sm text-destructive">{errors.target}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="collegeName" className="text-sm font-medium">College name</Label>
                          <Input
                            id="collegeName"
                            value={collegeName}
                            onChange={(e) => {
                              setCollegeName(e.target.value);
                              setErrors((prev) => ({ ...prev, collegeName: undefined }));
                            }}
                            placeholder="Your college"
                            className="rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                          {errors.collegeName && (
                            <p className="text-sm text-destructive">{errors.collegeName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="year" className="text-sm font-medium">Year</Label>
                          <Input
                            id="year"
                            value={year}
                            onChange={(e) => {
                              setYear(e.target.value);
                              setErrors((prev) => ({ ...prev, year: undefined }));
                            }}
                            placeholder="3rd year"
                            className="rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                          {errors.year && (
                            <p className="text-sm text-destructive">{errors.year}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="branch" className="text-sm font-medium">Branch</Label>
                          <Input
                            id="branch"
                            value={branch}
                            onChange={(e) => {
                              setBranch(e.target.value);
                              setErrors((prev) => ({ ...prev, branch: undefined }));
                            }}
                            placeholder="CSE, ECE"
                            className="rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                          {errors.branch && (
                            <p className="text-sm text-destructive">{errors.branch}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="companyName" className="text-sm font-medium">Company name</Label>
                          <Input
                            id="companyName"
                            value={companyName}
                            onChange={(e) => {
                              setCompanyName(e.target.value);
                              setErrors((prev) => ({ ...prev, companyName: undefined }));
                            }}
                            placeholder="Your company"
                            className="rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                          {errors.companyName && (
                            <p className="text-sm text-destructive">{errors.companyName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="position" className="text-sm font-medium">Position in company</Label>
                          <Input
                            id="position"
                            value={position}
                            onChange={(e) => {
                              setPosition(e.target.value);
                              setErrors((prev) => ({ ...prev, position: undefined }));
                            }}
                            placeholder="SDE-2, PM"
                            className="rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                          {errors.position && (
                            <p className="text-sm text-destructive">{errors.position}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="collegeName" className="text-sm font-medium">College name</Label>
                          <Input
                            id="collegeName"
                            value={collegeName}
                            onChange={(e) => {
                              setCollegeName(e.target.value);
                              setErrors((prev) => ({ ...prev, collegeName: undefined }));
                            }}
                            placeholder="Your college"
                            className="rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                          {errors.collegeName && (
                            <p className="text-sm text-destructive">{errors.collegeName}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className="pl-10 rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </motion.div>

              <motion.div variants={item} className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className="pl-10 pr-10 rounded-xl h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </motion.div>

              <motion.div variants={item}>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Login" : "Create account"}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            <motion.div variants={item} className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Account nahi hai?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-primary font-semibold hover:underline underline-offset-2"
                >
                  {isLogin ? "Sign up" : "Login"}
                </button>
              </p>
            </motion.div>
          </motion.div>

          <motion.div variants={item} className="mt-6 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <span aria-hidden>←</span> Back to Home
            </a>
          </motion.div>
        </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
