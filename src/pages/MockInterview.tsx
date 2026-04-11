import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Bot, Briefcase, ChevronDown, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { INTERVIEW_COMPANIES, type CompanyId } from "@/data/companies";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";
import { useAuth } from "@/contexts/AuthContext";

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

const VALID_IDS = new Set(INTERVIEW_COMPANIES.map((c) => c.id));

export default function MockInterview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyId | "">("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [roleInput, setRoleInput] = useState("");
  const [topicsInput, setTopicsInput] = useState("");
  const [mockOpen, setMockOpen] = useState(false);
  const [mockMessages, setMockMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [mockInput, setMockInput] = useState("");
  const [mockLoading, setMockLoading] = useState(false);
  const [mockSessionId, setMockSessionId] = useState<string | null>(null);
  const [mockConfidence, setMockConfidence] = useState<string | null>(null);
  const lastQuestionAtRef = useRef<number | null>(null);
  const [analytics, setAnalytics] = useState<{ averageScore: number; recentScores: number[]; readiness: string; totalAttempts: number } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useLayoutEffect(() => {
    scrollToTop();
  }, []);

  useEffect(() => {
    if (!company && INTERVIEW_COMPANIES.length > 0) {
      const first = INTERVIEW_COMPANIES[0]?.id;
      if (first && VALID_IDS.has(first)) {
        setCompany(first as CompanyId);
      }
    }
  }, [company]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.uid) return;
      setAnalyticsLoading(true);
      try {
        const res = await fetch(`${getApiBase()}/api/analytics?userId=${encodeURIComponent(user.uid)}`);
        const data = await res.json().catch(() => null);
        if (data && typeof data.averageScore === "number") {
          setAnalytics(data);
        }
      } catch {
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, [user?.uid]);

  const startMockInterview = async () => {
    if (mockLoading) return;
    setMockLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "anonymous",
          role: roleInput,
          company,
          topics: topicsInput,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const question = data.question || "Tell me about yourself.";
      setMockSessionId(data.sessionId || null);
      setMockMessages([{ role: "assistant", content: question }]);
      lastQuestionAtRef.current = Date.now();
      setMockConfidence(null);
    } catch {
      setMockMessages([{ role: "assistant", content: "Could not start mock interview. Try again." }]);
    } finally {
      setMockLoading(false);
    }
  };

  const sendMockMessage = async () => {
    const trimmed = mockInput.trim();
    if (!trimmed || mockLoading || !mockSessionId) return;
    setMockInput("");
    setMockMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setMockLoading(true);
    const responseTimeMs = lastQuestionAtRef.current ? Date.now() - lastQuestionAtRef.current : 0;
    try {
      const res = await fetch(`${getApiBase()}/api/interview/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: mockSessionId,
          message: trimmed,
          responseTimeMs,
          userId: user?.uid || "anonymous",
        }),
      });
      const data = await res.json().catch(() => ({}));
      const question = data.question || "Can you expand on that?";
      setMockConfidence(data.confidence || null);
      setMockMessages((prev) => [...prev, { role: "assistant", content: question }]);
      lastQuestionAtRef.current = Date.now();
    } catch {
      setMockMessages((prev) => [...prev, { role: "assistant", content: "Network error. Try again." }]);
    } finally {
      setMockLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            Back
          </Button>

          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.span
              className="sticker-green-soft mb-4 inline-block"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              AI Mock Interview
            </motion.span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Practice with a realistic <span className="underline-sketch">AI interviewer</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Select a company, set your role and focus topics, then start a guided mock interview.
            </p>
          </motion.div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_0.9fr] gap-6">
            <div className="rounded-xl border-2 border-border bg-card p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Interview Setup</h3>
                {mockConfidence && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                    Confidence: {mockConfidence}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Select company</label>
                <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={companyOpen}
                      className={cn(
                        "w-full h-12 justify-between border-2 border-foreground rounded-xl bg-background hover:border-primary/50 font-normal",
                        !company && "text-muted-foreground"
                      )}
                    >
                      {company
                        ? INTERVIEW_COMPANIES.find((c) => c.id === company)?.name
                        : "Search or choose company..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search company..." className="h-11" />
                      <CommandList>
                        <CommandEmpty>No company found.</CommandEmpty>
                        <CommandGroup>
                          {INTERVIEW_COMPANIES.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                setCompany(c.id as CompanyId);
                                setCompanyOpen(false);
                              }}
                            >
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Target role</label>
                  <Input
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    placeholder="SDE / Data Analyst"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Topics (comma-separated)</label>
                  <Input
                    value={topicsInput}
                    onChange={(e) => setTopicsInput(e.target.value)}
                    placeholder="DSA, SQL, System Design"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-2"
                  onClick={() => {
                    setMockOpen(true);
                    if (!mockSessionId) startMockInterview();
                  }}
                >
                  Start Mock Interview
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm text-muted-foreground">
                  Keep answers concise. The AI adapts difficulty based on your responses.
                </div>
              </div>
            </div>

            <div className="rounded-xl border-2 border-border bg-card p-4 md:p-5">
              <h3 className="font-semibold text-foreground mb-2">Your Interview Readiness</h3>
              {analyticsLoading && (
                <p className="text-sm text-muted-foreground">Loading analytics…</p>
              )}
              {!analyticsLoading && analytics && (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-foreground">Average score:</span> {analytics.averageScore}/100
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Readiness:</span> {analytics.readiness}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Recent scores:</span> {analytics.recentScores.length ? analytics.recentScores.join(", ") : "No attempts yet"}
                  </p>
                </div>
              )}
              {!analyticsLoading && !analytics && (
                <p className="text-sm text-muted-foreground">No interview data yet. Start practicing to see insights.</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={mockOpen} onOpenChange={setMockOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mock Interview</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-[420px] overflow-y-auto space-y-3">
            {mockMessages.length === 0 && (
              <p className="text-sm text-muted-foreground">Starting interview…</p>
            )}
            {mockMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-3 text-sm rounded ${
                    msg.role === "user"
                      ? "bg-foreground text-background"
                      : "bg-card border border-border"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0 border border-border">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {mockLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="p-3 bg-card border border-border rounded">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={mockInput}
              onChange={(e) => setMockInput(e.target.value)}
              placeholder="Type your answer..."
              className="min-h-[80px]"
            />
            <Button className="h-10 self-end" onClick={sendMockMessage} disabled={mockLoading || !mockSessionId}>
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
