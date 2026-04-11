import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2 } from "lucide-react";
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

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function AlumniConnect() {
  const { user, role } = useAuth();
  const db = getFirestoreDb();
  const navigate = useNavigate();
  const [connectUsers, setConnectUsers] = useState<{ id: string; email: string }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; from: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeChat, setActiveChat] = useState<{ chatId: string; partnerId: string; partnerEmail: string } | null>(null);

  useLayoutEffect(() => {
    scrollToTop();
  }, []);

  useEffect(() => {
    const loadConnectUsers = async () => {
      if (!user || role !== "alumni") return;
      try {
        const q = query(collection(db, "users"), where("role", "==", "student"));
        const snap = await getDocs(q);
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            email: String(d.data()?.email || ""),
          }))
          .filter((d) => d.id !== user.uid);
        setConnectUsers(list);
      } catch {
        setConnectUsers([]);
      }
    };
    loadConnectUsers();
  }, [db, user, role]);

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

  const connectWithStudent = async (partnerId: string, partnerEmail: string) => {
    if (!user) return;
    const connId = buildChatId(user.uid, partnerId);
    await setDoc(
      doc(db, "connections", connId),
      {
        studentId: partnerId,
        alumniId: user.uid,
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
          <div className="text-center mb-10">
            <span className="sticker-green-soft mb-4 inline-block">Alumni Connect</span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Connect with <span className="underline-sketch">students</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Browse student profiles and start a conversation.
            </p>
          </div>

          {role !== "alumni" ? (
            <div className="max-w-2xl mx-auto rounded-xl border-2 border-border bg-card p-6 text-center">
              <p className="text-muted-foreground">This page is only for alumni accounts.</p>
              <Button className="mt-4" onClick={() => navigate("/")}>Go Home</Button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto rounded-xl border-2 border-border bg-card p-4 md:p-5">
              <h3 className="font-semibold text-foreground mb-3">Students</h3>
              {connectUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">No student profiles available yet.</p>
              )}
              <div className="space-y-3">
                {connectUsers.map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{student.email || "Student"}</p>
                      <p className="text-xs text-muted-foreground">Student</p>
                    </div>
                    <Button size="sm" className="gap-1.5" onClick={() => connectWithStudent(student.id, student.email)}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
