import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/integrations/firebase/config";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

type ConnectionItem = {
  id: string;
  requesterId?: string;
  recipientId?: string;
  requesterEmail?: string;
  recipientEmail?: string;
  requesterName?: string;
  recipientName?: string;
  status?: string;
};

export default function RequestsPage() {
  const { user } = useAuth();
  const db = getFirestoreDb();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ConnectionItem[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "connections"), where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const next = snap.docs.map((d) => {
        const data = d.data() as Omit<ConnectionItem, "id">;
        return { id: d.id, ...data };
      });
      setRequests(next);
    });
    return () => unsub();
  }, [db, user]);

  useEffect(() => {
    const loadNames = async () => {
      const ids = new Set<string>();
      requests.forEach((req) => {
        if (req.requesterId) ids.add(req.requesterId);
        if (req.recipientId) ids.add(req.recipientId);
      });
      if (ids.size === 0) {
        setNameById({});
        return;
      }
      const entries = await Promise.all(
        Array.from(ids).map(async (id) => {
          try {
            const snap = await getDoc(doc(db, "users", id));
            if (!snap.exists()) return [id, ""] as const;
            const data = snap.data() as { name?: string };
            return [id, (data.name || "").trim()] as const;
          } catch {
            return [id, ""] as const;
          }
        }),
      );
      const map: Record<string, string> = {};
      entries.forEach(([id, name]) => {
        if (name) map[id] = name;
      });
      setNameById(map);
    };
    void loadNames();
  }, [db, requests]);

  const incomingPending = requests.filter((r) => r.recipientId === user?.uid && r.status === "pending");
  const outgoingPending = requests.filter((r) => r.requesterId === user?.uid && r.status === "pending");
  const connected = requests.filter((r) => r.status === "connected");

  const respondToRequest = async (requestId: string, status: "connected" | "declined") => {
    await setDoc(
      doc(db, "connections", requestId),
      {
        status,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const buildChatId = (a: string, b: string) => [a, b].sort().join("_");

  const openConnectedChat = async (partnerId: string, partnerEmail: string) => {
    if (!user) return;
    const chatId = buildChatId(user.uid, partnerId);
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

  const getUserLabel = (id?: string, name?: string, fallbackEmail?: string) => {
    if (name && name.trim()) return name.trim();
    if (id && nameById[id]) return nameById[id];
    return fallbackEmail?.trim() ? "User" : "User";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="container relative max-w-3xl">
          <div className="paper-card card-hover rounded-2xl mb-6">
            <span className="sticker-green-soft mb-3 inline-flex">Requests</span>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Manage <span className="underline-sketch">connections</span>
            </h1>
            <p className="text-muted-foreground">Manage your incoming and outgoing connection requests.</p>
          </div>

          <div className="paper-card rounded-2xl space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Incoming Requests</h3>
              {incomingPending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No incoming requests.</p>
              ) : (
                <div className="space-y-2">
                  {incomingPending.map((req) => (
                    <div key={req.id} className="paper-card card-hover rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {getUserLabel(req.requesterId, req.requesterName, req.requesterEmail)}
                        </p>
                        <p className="text-xs text-muted-foreground">Wants to connect</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="btn-punch" onClick={() => respondToRequest(req.id, "declined")}>Decline</Button>
                        <Button size="sm" className="btn-punch" onClick={() => respondToRequest(req.id, "connected")}>Accept</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Outgoing Requests</h3>
              {outgoingPending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No outgoing requests.</p>
              ) : (
                <div className="space-y-2">
                  {outgoingPending.map((req) => (
                    <div key={req.id} className="paper-card card-hover rounded-2xl">
                      <p className="text-sm font-medium text-foreground">
                        {getUserLabel(req.recipientId, req.recipientName, req.recipientEmail)}
                      </p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Connected</h3>
              {connected.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active connections.</p>
              ) : (
                <div className="space-y-2">
                  {connected.map((req) => {
                    const partnerId = req.requesterId === user?.uid ? req.recipientId : req.requesterId;
                    const otherEmail = req.requesterId === user?.uid ? req.recipientEmail : req.requesterEmail;
                    const otherName = req.requesterId === user?.uid
                      ? getUserLabel(req.recipientId, req.recipientName, req.recipientEmail)
                      : getUserLabel(req.requesterId, req.requesterName, req.requesterEmail);
                    return (
                      <div key={req.id} className="paper-card card-hover rounded-2xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{otherName}</p>
                          <p className="text-xs text-muted-foreground">Connected</p>
                        </div>
                        <Button
                          size="sm"
                          className="btn-punch"
                          onClick={() => {
                            if (!partnerId) return;
                            void openConnectedChat(partnerId, otherEmail || "");
                          }}
                        >
                          Chat
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
