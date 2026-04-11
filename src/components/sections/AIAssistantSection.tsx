import { motion } from "framer-motion";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginRequiredModal } from "@/components/LoginRequiredModal";
import { getApiBase } from "@/lib/api-base";

const QUICK_QUESTIONS = [
  "Binary search samjhao",
  "Linked list kya hai?",
  "OSI model",
  "SQL joins",
  "Pointers in C",
];

type Message = { role: "user" | "assistant"; content: string };

const GREETING: Message = {
  role: "assistant",
  content:
    "Hey! 👋 I’m TechPrep Study Buddy. Drop any topic—DSA, DBMS, OS, whatever—I’ll explain in simple language. Hinglish or English, your call.",
};

const EXPLAIN_MORE_PROMPT =
  "I still didn't get it. Please explain the same thing again in simpler English with more real-world examples.";

export function AIAssistantSection() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setInput("");
    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const chatHistory = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch(`${getApiBase()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          system: "Always answer in English only. If the user says they didn't get it, explain again in simpler English with real-world examples—still in English only.",
          max_tokens: 800,
          temperature: 0.7,
        }),
      });

      const data = await res.json().catch(() => ({}));

      const errMsg = data.error || (!res.ok ? "Something went wrong." : null);
      const content = data.content ?? (errMsg ? null : "No response.");

      if (errMsg) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Sorry — ${errMsg}` }]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: content || "No response." }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="ai-assistant" className="section-padding pt-12 md:pt-16 lg:pt-20 pb-12 md:pb-16 lg:pb-20 relative overflow-hidden bg-muted/30">
      <div className="absolute top-10 left-10 text-4xl opacity-20">🤖</div>
      <div className="absolute bottom-20 right-20 text-3xl opacity-20">💬</div>

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, rotate: 3 }}
              whileInView={{ opacity: 1, rotate: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-1.5 mb-6 px-3 py-1.5 border-2 border-foreground text-xs font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              ASK ANYTHING
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
            >
              Kuch samajh nahi aa raha?
              <br />
              <span className="underline decoration-4 underline-offset-2">Puch le.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground mb-8 max-w-md"
            >
              Skip the long Google digs. Ask here in simple language—Hinglish or English—and get answers that actually stick.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-x-2 gap-y-2"
            >
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm bg-card border-2 border-border hover:border-foreground transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="border-2 border-foreground bg-card overflow-hidden shadow-[6px_6px_0_0_hsl(var(--foreground))]">
              <div className="flex items-center gap-3 p-4 border-b-2 border-foreground bg-primary/5">
                <div className="w-10 h-10 bg-primary flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">TechPrep Study Buddy</p>
                </div>
                <span className="text-xs font-medium text-primary">
                  {loading ? "Typing..." : "Online"}
                </span>
              </div>

              <div ref={messagesContainerRef} className="p-4 space-y-4 min-h-[320px] max-h-[420px] overflow-y-auto bg-muted/20">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-3 text-sm rounded ${
                        msg.role === "user"
                          ? "bg-foreground text-background"
                          : "bg-card border-2 border-border"
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
                {!loading && messages.length > 1 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].content !== GREETING.content && !messages[messages.length - 1].content.startsWith("Sorry") && !messages[messages.length - 1].content.startsWith("Network error") && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 shrink-0" />
                    <button
                      type="button"
                      onClick={() => send(EXPLAIN_MORE_PROMPT)}
                      className="max-w-[85%] p-3 text-left text-sm rounded bg-primary/10 border-2 border-primary/30 hover:border-primary hover:bg-primary/15 transition-colors"
                    >
                      <p className="text-foreground font-medium">
                        Still didn&apos;t get it? Explain in simpler English with real examples →
                      </p>
                    </button>
                  </div>
                )}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="p-3 bg-card border-2 border-border rounded">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="p-4 border-t-2 border-foreground bg-card"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Kuch bhi puch lo..."
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-muted text-sm border-2 border-border focus:outline-none focus:border-foreground rounded transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="p-3 bg-foreground text-background rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      <LoginRequiredModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        redirect="/#ai-assistant"
      />
    </section>
  );
}
