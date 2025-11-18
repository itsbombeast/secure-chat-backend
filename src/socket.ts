// backend/src/socket.ts
import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { JWT_SECRET, FRONTEND_URL } from "./config";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function createSocketServer(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: [FRONTEND_URL, "http://localhost:5173"],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No auth token"));

    try {
      const payload = jwt.verify(token, JWT_SECRET!) as { userId: string };
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log("User connected:", userId);

    // Join conversation room
    socket.on("join_conversation", (data) => {
      if (!data || !data.conversationId) return;
      const { conversationId } = data;
      socket.join(conversationId);
    });

    // ----- SIMPLE CALL SIGNALING -----

    // volající zahájí hovor
    socket.on("call_request", (data) => {
      if (!data || !data.conversationId) return;
      const { conversationId, withVideo } = data;

      socket.to(conversationId).emit("call_incoming", {
        from: userId,
        withVideo: !!withVideo
      });
    });

    // volaný přijme
    socket.on("call_accept", (data) => {
      if (!data || !data.conversationId) return;
      const { conversationId } = data;

      socket.to(conversationId).emit("call_accepted", {
        from: userId
      });
    });

    // volaný odmítne
    socket.on("call_reject", (data) => {
      if (!data || !data.conversationId) return;
      const { conversationId } = data;

      socket.to(conversationId).emit("call_rejected", {
        from: userId
      });
    });

    // ----- WEBRTC SIGNALING -----

    socket.on("webrtc_offer", (data) => {
      if (!data || !data.conversationId) return;
      const { conversationId, offer } = data;

      socket.to(conversationId).emit("webrtc_offer", {
        from: userId,
        offer
      });
    });

    socket.on("webrtc_answer", (data) => {
      if (!data || !data.conversationId) return;
      const { conversationId, answer } = data;

      socket.to(conversationId).emit("webrtc_answer", {
        from: userId,
        answer
      });
    });

    socket.on("webrtc_ice_candidate", (data) => {
      if (!data || !data.conversationId) return;
      const { conversationId, candidate } = data;

      socket.to(conversationId).emit("webrtc_ice_candidate", {
        from: userId,
        candidate
      });
    });

    socket.on("webrtc_hangup", (data) => {
      if (!data || !data.conversationId) return;
      const { conversationId } = data;

      socket.to(conversationId).emit("webrtc_hangup", {
        from: userId
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
    });
  });

  return io;
}

