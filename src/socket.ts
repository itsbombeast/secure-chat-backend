// backend/src/socket.ts
import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function createSocketServer(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: [
        "https://chatappxd.vercel.app",
        "http://localhost:5173"
      ],
      credentials: true
    }
  });

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

    // JOIN ROOM
    socket.on("join_conversation", ({ conversationId }) => {
      socket.join(conversationId);
    });

    // ------------- CALL FLOW (SYNCED WITH FRONTEND) ----------------

    // CALL START
    socket.on("webrtc_call_request", ({ conversationId, offer, withVideo }) => {
      socket.to(conversationId).emit("webrtc_call_request", {
        from: userId,
        offer,
        withVideo
      });
    });

    // CALL ACCEPT
    socket.on("webrtc_call_accept", ({ conversationId }) => {
      socket.to(conversationId).emit("webrtc_call_accept", {
        from: userId
      });
    });

    // CALL REJECT
    socket.on("webrtc_call_reject", ({ conversationId }) => {
      socket.to(conversationId).emit("webrtc_call_reject", {
        from: userId
      });
    });

    // FINAL OFFER READY
    socket.on("webrtc_offer_ready", ({ conversationId, offer }) => {
      socket.to(conversationId).emit("webrtc_offer_ready", {
        from: userId,
        offer
      });
    });

    // ANSWER
    socket.on("webrtc_answer", ({ conversationId, answer }) => {
      socket.to(conversationId).emit("webrtc_answer", {
        from: userId,
        answer
      });
    });

    // ICE CANDIDATE
    socket.on("webrtc_ice_candidate", ({ conversationId, candidate }) => {
      socket.to(conversationId).emit("webrtc_ice_candidate", {
        from: userId,
        candidate
      });
    });

    // HANGUP
    socket.on("webrtc_hangup", ({ conversationId }) => {
      socket.to(conversationId).emit("webrtc_hangup", {
        from: userId
      });
    });
  });

  return io;
}

