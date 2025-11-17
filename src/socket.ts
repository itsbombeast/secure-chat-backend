// backend/src/socket.ts
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

    // Join room
    socket.on("join_conversation", ({ conversationId }) => {
      socket.join(conversationId);
    });

    // ---------------- WEBRTC CALL FLOW ----------------

    // someone starts calling
    socket.on("call_request", ({ conversationId, withVideo }) => {
      socket.to(conversationId).emit("call_incoming", {
        from: userId,
        withVideo
      });
    });

    // callee accepts
    socket.on("call_accept", ({ conversationId }) => {
      socket.to(conversationId).emit("call_accepted", {
        from: userId
      });
    });

    // callee rejects
    socket.on("call_reject", ({ conversationId }) => {
      socket.to(conversationId).emit("call_rejected", {
        from: userId
      });
    });

    // caller sends offer
    socket.on("webrtc_offer", ({ conversationId, offer }) => {
      socket.to(conversationId).emit("webrtc_offer", {
        from: userId,
        offer
      });
    });

    // callee sends answer
    socket.on("webrtc_answer", ({ conversationId, answer }) => {
      socket.to(conversationId).emit("webrtc_answer", {
        from: userId,
        answer
      });
    });

    // ICE
    socket.on("webrtc_ice_candidate", ({ conversationId, candidate }) => {
      socket.to(conversationId).emit("webrtc_ice_candidate", {
        from: userId,
        candidate
      });
    });

    socket.on("webrtc_hangup", ({ conversationId }) => {
      socket.to(conversationId).emit("webrtc_hangup", {
        from: userId
      });
    });
  });

  return io;
}
