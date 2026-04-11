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

  useLayoutEffect(() => {
    scrollToTop();
  }, []);

  useEffect(() => {
    const loadConnectUsers = async () => {
      if (!user) return;
      try {
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

  const sendConnectionRequest = async (partnerId: string, partnerEmail: string) => {
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
        status: "pending",
        requestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const openConnectedChat = async (partnerId: string, partnerEmail: string) => {
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
      <div key={person.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
        <div>
          <p className="text-sm font-medium text-foreground">{person.name || person.email || "User"}</p>
          <p className="text-xs text-muted-foreground">
            {person.role === "student" ? "Student" : "Alumni"} • {person.domain || "General"}
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
              className="gap-1.5"
              onClick={() => openConnectedChat(person.id, person.email)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => sendConnectionRequest(person.id, person.email)}
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

      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative">
          <div className="text-center mb-10">
            <span className="sticker-green-soft mb-4 inline-block">Connect</span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Connect with <span className="underline-sketch">students and alumni</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Search profiles, filter by college, and send connection requests.
            </p>
          </div>

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
      </main>

      <Footer />
    </div>
  );
}
