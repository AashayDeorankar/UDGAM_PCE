import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/integrations/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

type ConnectUser = {
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
};

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function AlumniConnect() {
  const { user, role } = useAuth();
  const db = getFirestoreDb();
  const navigate = useNavigate();
  const [connectUsers, setConnectUsers] = useState<ConnectUser[]>([]);
  const [connections, setConnections] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");

  useLayoutEffect(() => {
    scrollToTop();
  }, []);

  useEffect(() => {
    const loadConnectUsers = async () => {
      if (!user) return;
      try {
        const currentSnap = await getDoc(doc(db, "users", user.uid));
        if (currentSnap.exists()) {
          const currentData = currentSnap.data() as { name?: string };
          setCurrentUserName((currentData.name || user.displayName || "").trim());
        }
        const usersQ = query(collection(db, "users"), where("role", "in", ["student", "alumni"]));
        const snap = await getDocs(usersQ);
        const list = snap.docs
          .map((d) => {
            const data = d.data() as Omit<ConnectUser, "id">;
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
            } as ConnectUser;
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
    if (!user) return;
    const connQ = query(collection(db, "connections"), where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(connQ, (snap) => {
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

  const buildConnectionId = (a: string, b: string) => [a, b].sort().join("_");

  const sendConnectionRequest = async (partnerId: string, partnerEmail: string, partnerName: string) => {
    if (!user) return;
    const connId = buildConnectionId(user.uid, partnerId);
    await setDoc(
      doc(db, "connections", connId),
      {
        participants: [user.uid, partnerId],
        requesterId: user.uid,
        recipientId: partnerId,
        requesterEmail: user.email || "",
        recipientEmail: partnerEmail,
        requesterName: currentUserName || user.displayName || "",
        recipientName: partnerName || "",
        status: "pending",
        requestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const openConnectedChat = async (partnerId: string, partnerEmail: string, partnerName: string) => {
    if (!user) return;
    const chatId = buildConnectionId(user.uid, partnerId);
    await setDoc(
      doc(db, "chats", chatId),
      {
        participants: [user.uid, partnerId],
        participantEmails: {
          [user.uid]: user.email || "",
          [partnerId]: partnerEmail,
        },
        participantNames: {
          [user.uid]: currentUserName || user.displayName || "",
          [partnerId]: partnerName || "",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    navigate(`/inbox?chatId=${encodeURIComponent(chatId)}`);
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const college = collegeFilter.trim().toLowerCase();
    return connectUsers.filter((u) => {
      const searchable = [
        u.name,
        u.email,
        u.domain,
        u.companyName,
        u.position,
        u.branch,
        u.year,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const userCollege = (u.collegeName || "").toLowerCase();
      const matchesTerm = !term || searchable.includes(term);
      const matchesCollege = !college || userCollege.includes(college);
      return matchesTerm && matchesCollege;
    });
  }, [connectUsers, search, collegeFilter]);

  const studentsList = useMemo(() => filteredUsers.filter((u) => u.role === "student"), [filteredUsers]);
  const alumniList = useMemo(() => filteredUsers.filter((u) => u.role === "alumni"), [filteredUsers]);

  const renderUserCard = (person: ConnectUser) => {
    const status = connections[person.id];
    return (
      <div key={person.id} className="paper-card card-hover rounded-2xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`badge ${person.role === "student" ? "badge-primary" : "badge-accent"}`}>
              {person.role}
            </span>
            <p className="text-sm font-semibold text-foreground">
              {person.name || person.email || "User"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {person.domain || "General"}
          </p>
          {person.role === "student" ? (
            <p className="text-xs text-muted-foreground">
              {person.collegeName || "College"} • {person.year || "Year"} • {person.branch || "Branch"}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {person.companyName || "Company"} • {person.position || "Role"} • {person.collegeName || "College"}
            </p>
          )}
        </div>
        {status === "connected" ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Connected</span>
            <Button
              size="sm"
              className="gap-1.5 btn-punch"
              onClick={() => openConnectedChat(person.id, person.email, person.name || "")}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="gap-1.5 btn-punch"
            onClick={() => sendConnectionRequest(person.id, person.email, person.name || "")}
            disabled={status === "pending"}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {status === "pending" ? "Requested" : "Connect"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-12">
            <div>
              <span className="sticker-green-soft mb-5 inline-flex">Connect</span>
              <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4">
                Connect with <span className="underline-sketch">students and alumni</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Search profiles, filter by college, and send connection requests in minutes.
              </p>
            </div>
            <div className="paper-card card-hover rounded-2xl bg-card">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl border-2 border-foreground bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Smart matching</p>
                  <p className="text-xs text-muted-foreground">Find peers by domain, college, and role.</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="badge badge-primary">Verified students</span>
                <span className="badge badge-accent">Industry alumni</span>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="paper-card rounded-2xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <h3 className="font-semibold text-foreground">Find your people</h3>
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
                  {studentsList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No student profiles available yet.</p>
                  ) : (
                    <div className="space-y-3">{studentsList.map(renderUserCard)}</div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Alumni</h4>
                  {alumniList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No alumni profiles available yet.</p>
                  ) : (
                    <div className="space-y-3">{alumniList.map(renderUserCard)}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
