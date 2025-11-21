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
      credentials: true,
    },
  });

  // Mapa: conversationId -> sada socket.id
  const roomMembers = new Map<string, Set<string>>();

  // Autentizace přes JWT
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
    console.log("User connected:", userId, socket.id);

    // --- JOIN CONVERSATION ---
    socket.on("join_conversation", ({ conversationId }) => {
      socket.join(conversationId);

      if (!roomMembers.has(conversationId)) {
        roomMembers.set(conversationId, new Set());
      }

      roomMembers.get(conversationId)!.add(socket.id);
    });

    // --- LEAVE CONVERSATION ---
    socket.on("leave_conversation", ({ conversationId }) => {
      socket.leave(conversationId);

      const members = roomMembers.get(conversationId);
      if (members) {
        members.delete(socket.id);
        if (members.size === 0) {
          roomMembers.delete(conversationId);
        }
      }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
      for (const [room, members] of roomMembers.entries()) {
        members.delete(socket.id);
        if (members.size === 0) {
          roomMembers.delete(room);
        }
      }
    });

    // --- CALL SIGNALING (skupinové / přes conversationId) ---

    socket.on("call_request", ({ conversationId, withVideo }) => {
      const peers = roomMembers.get(conversationId);
      if (!peers) return;

      for (const peer of peers) {
        if (peer !== socket.id) {
          io.to(peer).emit("call_incoming", {
            from: socket.id,
            withVideo,
          });
        }
      }
    });

    socket.on("call_accept", ({ conversationId }) => {
      const peers = roomMembers.get(conversationId);
      if (!peers) return;

      for (const peer of peers) {
        if (peer !== socket.id) {
          io.to(peer).emit("call_accepted", {
            from: socket.id,
          });
        }
      }
    });

    socket.on("call_reject", ({ conversationId }) => {
      const peers = roomMembers.get(conversationId);
      if (!peers) return;

      for (const peer of peers) {
        if (peer !== socket.id) {
          io.to(peer).emit("call_rejected", {
            from: socket.id,
          });
        }
      }
    });

    // --- WebRTC SIGNÁLY (používají conversationId, NE "to") ---

    socket.on("webrtc_offer", ({ conversationId, offer }) => {
      const peers = roomMembers.get(conversationId);
      if (!peers) return;

      for (const peer of peers) {
        if (peer !== socket.id) {
          io.to(peer).emit("webrtc_offer", {
            from: socket.id,
            offer,
          });
        }
      }
    });

    socket.on("webrtc_answer", ({ conversationId, answer }) => {
      const peers = roomMembers.get(conversationId);
      if (!peers) return;

      for (const peer of peers) {
        if (peer !== socket.id) {
          io.to(peer).emit("webrtc_answer", {
            from: socket.id,
            answer,
          });
        }
      }
    });

    socket.on("webrtc_ice_candidate", ({ conversationId, candidate }) => {
      const peers = roomMembers.get(conversationId);
      if (!peers) return;

      for (const peer of peers) {
        if (peer !== socket.id) {
          io.to(peer).emit("webrtc_ice_candidate", {
            from: socket.id,
            candidate,
          });
        }
      }
    });

    socket.on("webrtc_hangup", ({ conversationId }) => {
      const peers = roomMembers.get(conversationId);
      if (!peers) return;

      for (const peer of peers) {
        if (peer !== socket.id) {
          io.to(peer).emit("webrtc_hangup", {
            from: socket.id,
          });
        }
      }
    });
  });

  return io;
}
