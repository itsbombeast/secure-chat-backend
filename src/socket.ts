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

    // Join conversation
    socket.on("join_conversation", ({ conversationId }) => {
      socket.join(conversationId);
    });

    // -----------------------------------------
    // 🔥 FIXED EVENTS TO MATCH FRONTEND 🔥
    // -----------------------------------------

    // Someone starts a call
    socket.on("webrtc_call_request", ({ conversationId, offer, withVideo }) => {
      socket.to(conversationId).emit("webrtc_call_request", {
        from: userId,
        offer,
        withVideo
      });
    });

    // Callee accepts call
    socket.on("webrtc_call_accept", ({ conversationId }) => {
      socket.to(conversationId).emit("webrtc_call_accept", {
        from: userId
      });
    });

    // Callee rejects call
    socket.on("webrtc_call_reject", ({ conversationId }) => {
      socket.to(conversationId).emit("webrtc_call_reject", {
        from: userId
      });
    });

    // Caller sends final offer ("offer_ready")
    socket.on("webrtc_offer_ready", ({ conversationId, offer }) => {
      socket.to(conversationId).emit("webrtc_offer_ready", {
        from: userId,
        offer
      });
    });

    // SDP OFFER (standard WebRTC)
    socket.on("webrtc_offer", ({ conversationId, offer }) => {
      socket.to(conversationId).emit("webrtc_offer", {
        from: userId,
        offer
      });
    });

    // SDP ANSWER
    socket.on("webrtc_answer", ({ conversationId, answer }) => {
      socket.to(conversationId).emit("webrtc_answer", {
        from: userId,
        answer
      });
    });

    // ICE Candidate
    socket.on("webrtc_ice_candidate", ({ conversationId, candidate }) => {
      socket.to(conversationId).emit("webrtc_ice_candidate", {
        from: userId,
        candidate
      });
    });

    // Hangup
    socket.on("webrtc_hangup", ({ conversationId }) => {
      socket.to(conversationId).emit("webrtc_hangup", {
        from: userId
      });
    });
  });

  return io;
}
