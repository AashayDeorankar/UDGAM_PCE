import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [connectUsers, setConnectUsers] = useState<
    {
      id: string;
      email: string;
      role: "student" | "alumni";
      name?: string;
      domain?: string;
      collegeName?: string;
      year?: string;
      branch?: string;
      companyName?: string;
      position?: string;
    }[]
  >([]);
  const [connections, setConnections] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
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
        const q = query(collection(db, "users"), where("role", "in", ["student", "alumni"]));
        const snap = await getDocs(q);
        const list = snap.docs
          .map((d) => {
            const data = d.data() as {
              email?: string;
              role?: "student" | "alumni";
              name?: string;
              domain?: string;
              collegeName?: string;
              year?: string;
              branch?: string;
              companyName?: string;
              position?: string;
            };
            return {
              id: d.id,
              email: String(data.email || ""),
              role: data.role || "student",
              name: data.name || "",
              domain: data.domain || "",
              collegeName: data.collegeName || "",
              year: data.year || "",
              branch: data.branch || "",
              companyName: data.companyName || "",
              position: data.position || "",
            };
          })
          .filter((d) => d.id !== user.uid);
        setConnectUsers(list);
      } catch {
        setConnectUsers([]);
      }
    };
    loadConnectUsers();
  }, [db, user, role]);

  useEffect(() => {
    if (!user || role !== "alumni") return;
    const q = query(collection(db, "connections"), where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const next: Record<string, string> = {};
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as { participants?: string[]; status?: string };
        const partnerId = (data.participants || []).find((id) => id !== user.uid);
        if (partnerId) next[partnerId] = data.status || "pending";
      });
      setConnections(next);
    });
    return () => unsub();
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

  const sendConnectionRequest = async (partnerId: string, partnerEmail: string) => {
    if (!user) return;
    const connId = buildChatId(user.uid, partnerId);
    await setDoc(
      doc(db, "connections", connId),
      {
        participants: [user.uid, partnerId],
        requesterId: user.uid,
        recipientId: partnerId,
        requesterEmail: user.email || "",
        recipientEmail: partnerEmail,
        status: "pending",
        updatedAt: serverTimestamp(),
        requestedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const college = collegeFilter.trim().toLowerCase();
    return connectUsers.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const domain = (u.domain || "").toLowerCase();
      const company = (u.companyName || "").toLowerCase();
      const position = (u.position || "").toLowerCase();
      const branch = (u.branch || "").toLowerCase();
      const year = (u.year || "").toLowerCase();
      const collegeName = (u.collegeName || "").toLowerCase();
      const matchesTerm = !term || [name, email, domain, company, position, branch, year].some((v) => v.includes(term));
      const matchesCollege = !college || collegeName.includes(college);
      return matchesTerm && matchesCollege;
    });
  }, [connectUsers, search, collegeFilter]);

  const studentsList = useMemo(
    () => filteredUsers.filter((u) => u.role === "student"),
    [filteredUsers],
  );

  const alumniList = useMemo(
    () => filteredUsers.filter((u) => u.role === "alumni"),
    [filteredUsers],
  );

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
          } else (
            <div className="max-w-4xl mx-auto rounded-xl border-2 border-border bg-card p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <h3 className="font-semibold text-foreground">Connect</h3>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, domain, role..."
                    className="md:w-64"
                  />
                  <Input
                    value={collegeFilter}
                    onChange={(e) => setCollegeFilter(e.target.value)}
                    placeholder="Filter by college"
                    className="md:w-56"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Students</h4>
                  {studentsList.length === 0 && (
                    <p className="text-sm text-muted-foreground">No student profiles available yet.</p>
                  )}
                  <div className="space-y-3">
                    {studentsList.map((student) => {
                      const status = connections[student.id];
                      return (
                        <div key={student.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{student.name || student.email || "Student"}</p>
                            <p className="text-xs text-muted-foreground">Student • {student.domain || "General"}</p>
                            <p className="text-xs text-muted-foreground">{student.collegeName || "College"} • {student.year || "Year"} • {student.branch || "Branch"}</p>
                          </div>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            variant={status === "connected" ? "outline" : "default"}
                            onClick={() => sendConnectionRequest(student.id, student.email)}
                            disabled={status === "pending" || status === "connected"}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {status === "pending" ? "Requested" : status === "connected" ? "Connected" : "Connect"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Alumni</h4>
                  {alumniList.length === 0 && (
                    <p className="text-sm text-muted-foreground">No alumni profiles available yet.</p>
                  )}
                  <div className="space-y-3">
                    {alumniList.map((alumni) => {
                      const status = connections[alumni.id];
                      return (
                        <div key={alumni.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{alumni.name || alumni.email || "Alumni"}</p>
                            <p className="text-xs text-muted-foreground">Alumni • {alumni.domain || "General"}</p>
                            <p className="text-xs text-muted-foreground">{alumni.companyName || "Company"} • {alumni.position || "Role"}</p>
                            <p className="text-xs text-muted-foreground">{alumni.collegeName || "College"}</p>
                          </div>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            variant={status === "connected" ? "outline" : "default"}
                            onClick={() => sendConnectionRequest(alumni.id, alumni.email)}
                            disabled={status === "pending" || status === "connected"}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {status === "pending" ? "Requested" : status === "connected" ? "Connected" : "Connect"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

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
