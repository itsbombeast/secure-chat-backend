// backend/src/socket.ts
import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Track online users
const onlineUsers = new Set<string>();

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

  // Authentication middleware for socket.io
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No auth token"));

    try {
      const payload = jwt.verify(token, JWT_SECRET!) as { userId: string };
      socket.userId = payload.userId;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log("User connected:", userId);

    // Mark user online
    onlineUsers.add(userId);
    io.emit("user_online", { userId });

    // Cleanup
    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
      onlineUsers.delete(userId);
      io.emit("user_offline", { userId });
    });

    // Join conversation room
    socket.on(
      "join_conversation",
      ({ conversationId }: { conversationId: string }) => {
        socket.join(conversationId);
      }
    );

    // Typing indicator
    socket.on(
      "typing",
      ({ conversationId }: { conversationId: string }) => {
        socket.to(conversationId).emit("typing", {
          conversationId,
          userId
        });
      }
    );

    socket.on(
      "typing_stop",
      ({ conversationId }: { conversationId: string }) => {
        socket.to(conversationId).emit("typing_stop", {
          conversationId,
          userId
        });
      }
    );

    // WebRTC Offers
    socket.on(
      "webrtc_offer",
      ({
        conversationId,
        offer
      }: {
        conversationId: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        socket.to(conversationId).emit("webrtc_offer", {
          conversationId,
          offer,
          from: userId
        });
      }
    );

    // WebRTC Answers
    socket.on(
      "webrtc_answer",
      ({
        conversationId,
        answer
      }: {
        conversationId: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        socket.to(conversationId).emit("webrtc_answer", {
          conversationId,
          answer,
          from: userId
        });
      }
    );

    // WebRTC ICE Candidates
    socket.on(
      "webrtc_ice_candidate",
      ({
        conversationId,
        candidate
      }: {
        conversationId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        socket.to(conversationId).emit("webrtc_ice_candidate", {
          conversationId,
          candidate,
          from: userId
        });
      }
    );

    // WebRTC Hangup
    socket.on(
      "webrtc_hangup",
      ({ conversationId }: { conversationId: string }) => {
        socket.to(conversationId).emit("webrtc_hangup", {
          conversationId,
          from: userId
        });
      }
    );
  });

  return io;
}
