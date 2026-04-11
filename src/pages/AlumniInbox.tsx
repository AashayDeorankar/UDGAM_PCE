import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/integrations/firebase/config";
import { getApiBase } from "@/lib/api-base";
import { io, type Socket } from "socket.io-client";
import {
  Timestamp,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

type ChatThread = { chatId: string; partnerId: string; partnerEmail: string };
type ChatMessage = { id: string; from: string; text: string; createdAt: number };
type SocketMessage = { id: string; chatId: string; from: string; text: string; createdAt: number };

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function AlumniInbox() {
  const { user } = useAuth();
  const db = getFirestoreDb();
  const [searchParams] = useSearchParams();
  const [chatList, setChatList] = useState<ChatThread[]>([]);
  const [activeChat, setActiveChat] = useState<ChatThread | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const activeChatRef = useRef<ChatThread | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const socketBase = getApiBase();
  const socketUrl = useMemo(() => {
    if (socketBase) return socketBase;
    if (typeof window !== "undefined" && window.location.hostname.includes("localhost")) {
      return "http://localhost:3001";
    }
    return "/";
  }, [socketBase]);

  useLayoutEffect(() => {
    scrollToTop();
  }, []);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

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

  useEffect(() => {
    if (!user) return;

    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const onMessage = (msg: SocketMessage) => {
      if (!activeChatRef.current || msg.chatId !== activeChatRef.current.chatId) return;
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { id: msg.id, from: msg.from, text: msg.text, createdAt: msg.createdAt }];
      });
    };

    const onTyping = (payload: { chatId?: string; from?: string; isTyping?: boolean }) => {
      if (!activeChatRef.current) return;
      if (payload.chatId !== activeChatRef.current.chatId) return;
      if (!payload.from || payload.from === user.uid) return;
      setPartnerTyping(Boolean(payload.isTyping));
    };

    socket.on("chat_message", onMessage);
    socket.on("typing", onTyping);

    return () => {
      socket.off("chat_message", onMessage);
      socket.off("typing", onTyping);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, socketUrl]);

  useEffect(() => {
    const preselectedChatId = searchParams.get("chatId");
    if (!preselectedChatId || activeChat) return;
    const match = chatList.find((c) => c.chatId === preselectedChatId);
    if (!match) return;
    setActiveChat(match);
    setChatOpen(true);
  }, [searchParams, chatList, activeChat]);

  useEffect(() => {
    if (!activeChat) return;
    setPartnerTyping(false);
    setChatLoading(true);

    socketRef.current?.emit("join_chat", { chatId: activeChat.chatId });

    const q = query(
      collection(db, "chats", activeChat.chatId, "messages"),
      orderBy("createdAt", "asc"),
    );

    getDocs(q)
      .then((snap) => {
        const msgs = snap.docs.map((d) => {
          const data = d.data() as { from?: string; text?: string; createdAt?: Timestamp | number };
          const createdAt =
            typeof data.createdAt === "number"
              ? data.createdAt
              : data.createdAt instanceof Timestamp
                ? data.createdAt.toMillis()
                : Date.now();
          return { id: d.id, from: data.from || "", text: data.text || "", createdAt };
        });
        setChatMessages(msgs);
      })
      .finally(() => setChatLoading(false));

    return () => {
      socketRef.current?.emit("leave_chat", { chatId: activeChat.chatId });
    };
  }, [db, activeChat]);

  useEffect(() => {
    if (!chatOpen) return;
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatOpen, partnerTyping]);

  const openChatWith = (partnerId: string, partnerEmail: string, chatId: string) => {
    setActiveChat({ chatId, partnerId, partnerEmail });
    setChatOpen(true);
  };

  const formatTime = (ms: number) =>
    new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !activeChat || !user) return;

    const messageId = `${user.uid}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const now = Date.now();

    setChatInput("");
    setPartnerTyping(false);
    setChatMessages((prev) => [...prev, { id: messageId, from: user.uid, text: trimmed, createdAt: now }]);

    socketRef.current?.emit("send_message", {
      id: messageId,
      chatId: activeChat.chatId,
      from: user.uid,
      text: trimmed,
      createdAt: now,
    });

    await addDoc(collection(db, "chats", activeChat.chatId, "messages"), {
      from: user.uid,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "chats", activeChat.chatId), { updatedAt: serverTimestamp() }, { merge: true });
  };

  const onInputChange = (nextValue: string) => {
    setChatInput(nextValue);
    if (!activeChat || !user || !socketRef.current) return;
    socketRef.current.emit("typing", {
      chatId: activeChat.chatId,
      from: user.uid,
      isTyping: nextValue.trim().length > 0,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16 md:pt-24 md:pb-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="container relative">
          <div className="text-center mb-10">
            <span className="sticker-green-soft mb-4 inline-block">Inbox</span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Your <span className="underline-sketch">conversations</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Continue chats with your connected users.
            </p>
          </div>

          <div className="max-w-4xl mx-auto rounded-xl border-2 border-border bg-card p-4 md:p-5">
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
                  onClick={() => openChatWith(c.partnerId, c.partnerEmail, c.chatId)}
                >
                  <p className="text-sm font-medium text-foreground">{c.partnerEmail}</p>
                  <p className="text-xs text-muted-foreground">Open chat</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-muted/40 to-background">
            <DialogTitle className="text-lg font-semibold">{activeChat?.partnerEmail || "Conversation"}</DialogTitle>
          </DialogHeader>
          <div
            ref={messagesContainerRef}
            className="h-[420px] overflow-y-auto bg-gradient-to-b from-muted/20 to-background px-4 py-4 space-y-3"
          >
            {chatLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading chat…
              </div>
            )}
            {!chatLoading && chatMessages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Start your conversation.</p>
              </div>
            )}
            {chatMessages.map((m) => (
              <div key={m.id} className={`flex ${m.from === user?.uid ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] text-sm rounded-2xl px-3 py-2.5 shadow-sm ${
                    m.from === user?.uid
                      ? "bg-foreground text-background rounded-br-md"
                      : "bg-card border border-border rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`mt-1 text-[10px] ${m.from === user?.uid ? "text-background/70" : "text-muted-foreground"}`}>
                    {formatTime(m.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border text-xs text-muted-foreground rounded-2xl rounded-bl-md px-3 py-2">
                  Typing...
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-border bg-background/95 px-4 py-3 flex gap-2 items-end">
            <Textarea
              value={chatInput}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendChatMessage();
                }
              }}
              placeholder="Type a message..."
              className="min-h-[56px] max-h-[130px]"
            />
            <Button className="h-10 px-4 gap-2" onClick={sendChatMessage} disabled={!activeChat || !chatInput.trim()}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
