import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET, BASE_CLIENT_URL } from "./config";

interface JwtPayload {
  userId: string;
}

export let io: Server;

export const initSocket = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: BASE_CLIENT_URL,
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("unauthorized"));

      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      (socket as any).userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId: string = (socket as any).userId;
    socket.join(`user:${userId}`);

    socket.on("joinConversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leaveConversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing", (payload: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("typing", {
        userId,
        isTyping: payload.isTyping
      });
    });

    socket.on("messageSent", (payload: { conversationId: string; messageId: string }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("message:new", payload);
    });

    socket.on("messageEdited", (payload: { conversationId: string; messageId: string }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("message:edited", payload);
    });

    socket.on("messageDeleted", (payload: { conversationId: string; messageId: string; scope: string }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("message:deleted", payload);
    });

    socket.on("messageSeen", (payload: { conversationId: string; messageId: string }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("message:seen", {
        userId,
        ...payload
      });
    });

    socket.on("call:offer", (payload: any) => {
      const { toUserId, conversationId, sdp } = payload;
      if (toUserId) {
        io.to(`user:${toUserId}`).emit("call:offer", { fromUserId: userId, sdp, conversationId });
      } else if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("call:offer", { fromUserId: userId, sdp, conversationId });
      }
    });

    socket.on("call:answer", (payload: any) => {
      const { toUserId, conversationId, sdp } = payload;
      if (toUserId) {
        io.to(`user:${toUserId}`).emit("call:answer", { fromUserId: userId, sdp, conversationId });
      } else if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("call:answer", { fromUserId: userId, sdp, conversationId });
      }
    });

    socket.on("call:ice-candidate", (payload: any) => {
      const { toUserId, conversationId, candidate } = payload;
      if (toUserId) {
        io.to(`user:${toUserId}`).emit("call:ice-candidate", { fromUserId: userId, candidate, conversationId });
      } else if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("call:ice-candidate", {
          fromUserId: userId,
          candidate,
          conversationId
        });
      }
    });

    socket.on("call:end", (payload: any) => {
      const { toUserId, conversationId } = payload;
      if (toUserId) {
        io.to(`user:${toUserId}`).emit("call:end", { fromUserId: userId, conversationId });
      } else if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("call:end", { fromUserId: userId, conversationId });
      }
    });
  });
};
