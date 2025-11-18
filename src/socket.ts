import { Server } from "socket.io";
import { FRONTEND_URL } from "./config";

export function setupSocket(server: any) {
  const io = new Server(server, {
    cors: {
      origin: [FRONTEND_URL, "http://localhost:5173"],
      credentials: true,
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log("User connected:", userId);

    // JOIN ROOM
    socket.on("join_conversation", ({ conversationId }) => {
      socket.join(conversationId);
    });

    // ========== SIMPLE CALL SIGNALING ==========
    socket.on("call_request", ({ conversationId, withVideo }) => {
      socket.to(conversationId).emit("call_incoming", {
        from: userId,
        withVideo
      });
    });

    socket.on("call_accept", ({ conversationId }) => {
      socket.to(conversationId).emit("call_accepted", {
        from: userId
      });
    });

    socket.on("call_reject", ({ conversationId }) => {
      socket.to(conversationId).emit("call_rejected", {
        from: userId
      });
    });

    // ========== WEBRTC OFFER / ANSWER ==========
    socket.on("webrtc_offer", ({ conversationId, offer }) => {
      socket.to(conversationId).emit("webrtc_offer", {
        from: userId,
        offer,
      });
    });

    socket.on("webrtc_answer", ({ conversationId, answer }) => {
      socket.to(conversationId).emit("webrtc_answer", {
        from: userId,
        answer,
      });
    });

    socket.on("webrtc_ice_candidate", ({ conversationId, candidate }) => {
      socket.to(conversationId).emit("webrtc_ice_candidate", {
        from: userId,
        candidate,
      });
    });

    socket.on("webrtc_hangup", ({ conversationId }) => {
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

