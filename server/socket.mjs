import { Server } from "socket.io";

/**
 * Attach Socket.IO to existing HTTP server.
 * Chat events are room-based by chatId.
 */
export function setupSocketServer(httpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_chat", ({ chatId } = {}) => {
      if (!chatId) return;
      socket.join(chatId);
    });

    socket.on("leave_chat", ({ chatId } = {}) => {
      if (!chatId) return;
      socket.leave(chatId);
    });

    socket.on("send_message", (payload = {}) => {
      const chatId = String(payload.chatId || "");
      const text = String(payload.text || "").trim();
      if (!chatId || !text) return;

      const event = {
        id: payload.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        chatId,
        from: String(payload.from || ""),
        text,
        createdAt: payload.createdAt || Date.now(),
      };

      io.to(chatId).emit("chat_message", event);
    });

    socket.on("typing", ({ chatId, from, isTyping } = {}) => {
      if (!chatId || !from) return;
      socket.to(chatId).emit("typing", {
        chatId,
        from,
        isTyping: Boolean(isTyping),
      });
    });
  });

  return io;
}
