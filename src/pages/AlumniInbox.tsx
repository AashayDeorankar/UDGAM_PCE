import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Search, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/integrations/firebase/config";
import { getApiBase } from "@/lib/api-base";
import { io, type Socket } from "socket.io-client";
import {
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
  const [chatSearch, setChatSearch] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
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

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

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
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("chat_message", onMessage);
      socket.off("typing", onTyping);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
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

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => {
        const data = d.data() as {
          from?: string;
          text?: string;
          createdAt?: { toMillis?: () => number } | number;
        };
        const createdAt =
          typeof data.createdAt === "number"
            ? data.createdAt
            : typeof data.createdAt?.toMillis === "function"
              ? data.createdAt.toMillis()
              : Date.now();
        return { id: d.id, from: data.from || "", text: data.text || "", createdAt };
      });
      setChatMessages(msgs);
      setChatLoading(false);
    });

    return () => {
      socketRef.current?.emit("leave_chat", { chatId: activeChat.chatId });
      unsub();
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

  const filteredChatList = useMemo(() => {
    const term = chatSearch.trim().toLowerCase();
    if (!term) return chatList;
    return chatList.filter((c) => c.partnerEmail.toLowerCase().includes(term));
  }, [chatList, chatSearch]);

  const getInitials = (email: string) => {
    const value = (email || "U").split("@")[0];
    return value.slice(0, 2).toUpperCase();
  };

  const formatTime = (ms: number) =>
    new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDateLabel = (ms: number) => {
    const d = new Date(ms);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dateOnly = d.toDateString();
    if (dateOnly === today.toDateString()) return "Today";
    if (dateOnly === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  };

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !activeChat || !user) return;

    const messageId = `${user.uid}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const now = Date.now();

    setChatInput("");
    setPartnerTyping(false);

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

      <main className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-12">
            <div>
              <span className="sticker-green-soft mb-5 inline-flex">Inbox</span>
              <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4">
                Your <span className="underline-sketch">conversations</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Continue chats with your connected users and keep everything in one place.
              </p>
            </div>
            <div className="paper-card card-hover rounded-2xl bg-card">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl border-2 border-foreground bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Fast replies</p>
                  <p className="text-xs text-muted-foreground">Stay synced with alumni and peers.</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="badge badge-primary">Live chat</span>
                <span className="badge badge-accent">Verified network</span>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="paper-card rounded-2xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <h3 className="font-semibold text-foreground">Your chats</h3>
                <div className="relative md:w-80">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Search conversations"
                    className="pl-9"
                  />
                </div>
              </div>
              {filteredChatList.length === 0 && (
                <p className="text-sm text-muted-foreground">No chats yet.</p>
              )}
              <div className="space-y-3">
                {filteredChatList.map((c) => (
                  <button
                    key={c.chatId}
                    type="button"
                    className="paper-card card-hover rounded-2xl w-full text-left"
                    onClick={() => openChatWith(c.partnerId, c.partnerEmail, c.chatId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary border border-primary/20 grid place-items-center text-xs font-semibold">
                        {getInitials(c.partnerEmail)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.partnerEmail}</p>
                        <p className="text-xs text-muted-foreground">Tap to open conversation</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden h-[88vh] sm:h-[82vh]">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border bg-gradient-to-r from-muted/50 via-background to-muted/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary border border-primary/20 grid place-items-center text-sm font-semibold shrink-0">
                  {getInitials(activeChat?.partnerEmail || "U")}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-semibold truncate">{activeChat?.partnerEmail || "Conversation"}</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {socketConnected ? "Live" : "Reconnecting"}
                  </p>
                </div>
              </div>
              <div className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
            </div>
            {!socketConnected && (
              <p className="text-xs text-amber-600 mt-1">Socket reconnecting... messages still sync via database.</p>
            )}
          </DialogHeader>
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/20 via-background to-muted/10 px-3 sm:px-5 py-4 space-y-3"
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
            {chatMessages.map((m, index) => {
              const showDate =
                index === 0 || new Date(chatMessages[index - 1].createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              return (
                <Fragment key={m.id}>
                  {showDate && (
                    <div className="flex justify-center py-1">
                      <span className="text-[11px] px-3 py-1 rounded-full border border-border bg-card/80 text-muted-foreground">
                        {formatDateLabel(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${m.from === user?.uid ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] text-sm rounded-2xl px-3 py-2.5 shadow-sm ${
                        m.from === user?.uid
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>
                      <p className={`mt-1 text-[10px] ${m.from === user?.uid ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                </Fragment>
              );
            })}
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border text-xs text-muted-foreground rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:240ms]" />
                  <span className="ml-1">typing</span>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-border bg-background/95 px-3 sm:px-4 py-3 flex gap-2 items-end">
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
              className="min-h-[52px] max-h-[130px] rounded-xl"
            />
            <Button className="h-11 px-4 gap-2 rounded-xl" onClick={sendChatMessage} disabled={!activeChat || !chatInput.trim()}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
