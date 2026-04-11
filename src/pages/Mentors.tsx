import { useState, useLayoutEffect, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Calendar, Briefcase, Clock, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookSessionModal } from "@/components/BookSessionModal";
import { mentors } from "@/data/mentors";
import type { Mentor } from "@/data/mentors";
import { getMentorImageUrl } from "@/lib/mentor-image";
import { getApiBase } from "@/lib/api-base";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/integrations/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  addDoc,
} from "firebase/firestore";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function MentorCard({ mentor, index, isRecommended, reason }: { mentor: Mentor; index: number; isRecommended?: boolean; reason?: string }) {
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`paper-card h-full flex flex-col transition-all duration-300 ${index === 0 ? "tape" : ""}`}
      style={{ transform: `rotate(${index % 2 === 0 ? -0.5 : 0.5}deg)` }}
    >
      <div className="flex justify-between items-start mb-4">
        {mentor.available ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Available
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-full">
            <Clock className="w-3 h-3" />
            Busy
          </span>
        )}
        {isRecommended && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-700 text-xs font-semibold rounded-full">
            AI Match
          </span>
        )}
        <span className="text-lg font-bold text-primary">{mentor.price}</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        {imgError ? (
          <div
            className="w-20 h-20 rounded-full border-2 border-foreground shrink-0 bg-primary/20 flex items-center justify-center text-lg font-bold text-primary"
            aria-label={mentor.name}
          >
            {getInitials(mentor.name)}
          </div>
        ) : (
          <img
            src={getMentorImageUrl(mentor.image)}
            alt={mentor.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-foreground shrink-0"
            onError={() => setImgError(true)}
          />
        )}
        <div>
          <h3 className="font-bold text-base leading-tight">{mentor.name}</h3>
          <p className="text-xs text-muted-foreground">{mentor.role}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Briefcase className="w-4 h-4" />
          <span className="font-medium">{mentor.experience} exp.</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4 flex-grow min-h-[4.25rem]">
        {mentor.expertise.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center justify-center px-2 py-0.5 bg-muted text-xs font-medium rounded-full whitespace-nowrap"
          >
            {skill}
          </span>
        ))}
      </div>

      {isRecommended && reason && (
        <p className="text-xs text-muted-foreground mb-3">
          {reason}
        </p>
      )}

      <Button
        variant={mentor.available ? "default" : "outline"}
        className="w-full mt-auto"
        disabled={!mentor.available}
        onClick={() => mentor.available && setBookModalOpen(true)}
      >
        {mentor.available ? (
          <>
            <Calendar className="w-4 h-4" />
            Book Session
          </>
        ) : (
          "Join Waitlist"
        )}
      </Button>
      <BookSessionModal
        open={bookModalOpen}
        onOpenChange={setBookModalOpen}
        mentorName={mentor.name}
        mentorEmail={mentor.email}
        mentorWhatsapp={mentor.whatsapp}
      />
    </div>
  );
}

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function Mentors() {
  const { user, role } = useAuth();
  const db = getFirestoreDb();
  const [skills, setSkills] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [weakAreas, setWeakAreas] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [recommendedNames, setRecommendedNames] = useState<string[]>([]);
  const [recommendationReasons, setRecommendationReasons] = useState<Record<string, string>>({});
  const [connectUsers, setConnectUsers] = useState<{ id: string; email: string; role: "student" | "alumni" }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; from: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeChat, setActiveChat] = useState<{ chatId: string; partnerId: string; partnerEmail: string } | null>(null);
  const [chatList, setChatList] = useState<{ chatId: string; partnerId: string; partnerEmail: string }[]>([]);

  useLayoutEffect(() => {
    scrollToTop();
    const t1 = setTimeout(scrollToTop, 0);
    const t2 = setTimeout(scrollToTop, 50);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(scrollToTop, 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const loadConnectUsers = async () => {
      if (!user || !role) return;
      const targetRole = role === "student" ? "alumni" : "student";
      try {
        const q = query(collection(db, "users"), where("role", "==", targetRole));
        const snap = await getDocs(q);
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            email: String(d.data()?.email || ""),
            role: targetRole,
          }))
          .filter((d) => d.id !== user.uid);
        setConnectUsers(list);
      } catch {
        setConnectUsers([]);
      }
    };
    loadConnectUsers();
  }, [db, user, role]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const next = snap.docs.map((d) => {
        const data = d.data() as { participants?: string[]; participantEmails?: Record<string, string> };
        const participants = data.participants || [];
        const partnerId = participants.find((id) => id !== user.uid) || "";
        const partnerEmail = data.participantEmails?.[partnerId] || "Unknown";
        return { chatId: d.id, partnerId, partnerEmail };
      });
      setChatList(next);
    });
    return () => unsub();
  }, [db, user]);

  const { alumniMentors, industryMentors } = useMemo(() => {
    const alumniList = mentors.filter((m) => m.category === "alumni");
    const industryList = mentors.filter((m) => m.category !== "alumni");
    return { alumniMentors: alumniList, industryMentors: industryList };
  }, []);

  const rankedMentors = useMemo(() => {
    if (recommendedNames.length === 0) return industryMentors;
    const order = new Map(recommendedNames.map((name, index) => [name, index]));
    return [...industryMentors].sort((a, b) => {
      const aRank = order.has(a.name) ? order.get(a.name) : Number.MAX_SAFE_INTEGER;
      const bRank = order.has(b.name) ? order.get(b.name) : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return 0;
    });
  }, [recommendedNames, industryMentors]);

  const runMatchmaking = async () => {
    if (matchLoading) return;
    setMatchLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/matchmaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: skills.split(","),
          targetRole,
          weakAreas: weakAreas.split(","),
          mentors: mentors.map((m) => ({
            name: m.name,
            role: m.role,
            expertise: m.expertise,
            experience: m.experience,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const ranked = Array.isArray(data.ranked) ? data.ranked : [];
      const top = Array.isArray(data.top) ? data.top : ranked.map((r) => r.name).slice(0, 3);
      const reasons = ranked.reduce((acc, item) => {
        if (item?.name && item?.reason) acc[item.name] = item.reason;
        return acc;
      }, {} as Record<string, string>);
      setRecommendedNames(top);
      setRecommendationReasons(reasons);
    } catch {
      setRecommendedNames([]);
      setRecommendationReasons({});
    } finally {
      setMatchLoading(false);
    }
  };

  const buildChatId = (a: string, b: string) => [a, b].sort().join("_");

  const openChatWith = async (partnerId: string, partnerEmail: string) => {
    if (!user) return;
    const chatId = buildChatId(user.uid, partnerId);
    const ref = doc(db, "chats", chatId);
    await setDoc(
      ref,
      {
        participants: [user.uid, partnerId],
        participantEmails: {
          [user.uid]: user.email || "",
          [partnerId]: partnerEmail,
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setActiveChat({ chatId, partnerId, partnerEmail });
    setChatOpen(true);
  };

  const connectWithAlumni = async (partnerId: string, partnerEmail: string) => {
    if (!user) return;
    const connId = buildChatId(user.uid, partnerId);
    await setDoc(
      doc(db, "connections", connId),
      {
        studentId: role === "student" ? user.uid : partnerId,
        alumniId: role === "student" ? partnerId : user.uid,
        status: "connected",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await openChatWith(partnerId, partnerEmail);
  };

  useEffect(() => {
    if (!activeChat) return;
    setChatLoading(true);
    const q = query(
      collection(db, "chats", activeChat.chatId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => {
        const data = d.data() as { from?: string; text?: string };
        return { id: d.id, from: data.from || "", text: data.text || "" };
      });
      setChatMessages(msgs);
      setChatLoading(false);
    });
    return () => unsub();
  }, [db, activeChat]);

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !activeChat || !user) return;
    setChatInput("");
    await addDoc(collection(db, "chats", activeChat.chatId, "messages"), {
      from: user.uid,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "chats", activeChat.chatId), { updatedAt: serverTimestamp() }, { merge: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />

        <div className="container relative">
          <div className="text-center mb-12">
            <span className="sticker-green-soft mb-4 inline-block">Mentors from Top Product Companies</span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Expert mentors from leading <span className="underline-sketch">product companies.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Book 1:1 sessions with engineers from Google, Microsoft, Amazon and more.
              Career guidance, interview prep, and placement advice—direct and actionable.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-10 rounded-xl border-2 border-border bg-card p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Your skills (comma-separated)</label>
                <Input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="DSA, React, SQL"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Target role</label>
                <Input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Backend Developer"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Weak areas (comma-separated)</label>
                <Input
                  value={weakAreas}
                  onChange={(e) => setWeakAreas(e.target.value)}
                  placeholder="System design, Communication"
                />
              </div>
              <Button className="gap-2" onClick={runMatchmaking} disabled={matchLoading}>
                {matchLoading ? "Matching..." : "Find Best Mentor (AI)"}
              </Button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mb-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
            <div className="rounded-xl border-2 border-border bg-card p-4 md:p-5">
              <h3 className="font-semibold text-foreground mb-3">
                {role === "student" ? "Connect with Alumni" : "Connect with Students"}
              </h3>
              {!role && (
                <p className="text-sm text-muted-foreground">Login to connect with users.</p>
              )}
              {!!role && (
                <div className="space-y-3">
                  {connectUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground">No profiles available yet.</p>
                  )}
                  {connectUsers.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.email || "Alumni"}</p>
                        <p className="text-xs text-muted-foreground">{a.role === "alumni" ? "Alumni" : "Student"}</p>
                      </div>
                      <Button size="sm" className="gap-1.5" onClick={() => connectWithAlumni(a.id, a.email)}>
                        <MessageCircle className="h-3.5 w-3.5" />
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border-2 border-border bg-card p-4 md:p-5">
              <h3 className="font-semibold text-foreground mb-3">Your Chats</h3>
              {chatList.length === 0 && (
                <p className="text-sm text-muted-foreground">No chats yet.</p>
              )}
              <div className="space-y-2">
                {chatList.map((c) => (
                  <button
                    key={c.chatId}
                    type="button"
                    className="w-full text-left border border-border rounded-lg p-3 hover:border-primary/50 transition-colors"
                    onClick={() => openChatWith(c.partnerId, c.partnerEmail)}
                  >
                    <p className="text-sm font-medium text-foreground">{c.partnerEmail}</p>
                    <p className="text-xs text-muted-foreground">Open chat</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Alumni Mentors</h2>
              <p className="text-xs text-muted-foreground">Connect via the alumni panel above.</p>
            </div>
            {alumniMentors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alumni mentors available yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {alumniMentors.map((mentor, index) => (
                  <MentorCard
                    key={`alumni-${mentor.name}-${index}`}
                    mentor={mentor}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Industry Level Mentors</h2>
              <p className="text-xs text-muted-foreground">AI matching picks the best fit.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rankedMentors.map((mentor, index) => (
                <MentorCard
                  key={`${mentor.name}-${index}`}
                  mentor={mentor}
                  index={index}
                  isRecommended={recommendedNames.includes(mentor.name)}
                  reason={recommendationReasons[mentor.name]}
                />
              ))}
            </div>
          </div>

        </div>
      </main>

      <Footer />

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chat</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-[360px] overflow-y-auto space-y-3">
            {chatLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading chat…
              </div>
            )}
            {chatMessages.map((m) => (
              <div key={m.id} className={`flex ${m.from === user?.uid ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] text-sm rounded px-3 py-2 ${
                    m.from === user?.uid
                      ? "bg-foreground text-background"
                      : "bg-card border border-border"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[80px]"
            />
            <Button className="h-10" onClick={sendChatMessage} disabled={!activeChat}>
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
