import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";
import accessGateRoutes from "./routes/accessGateRoutes";
import conversationRoutes from "./routes/conversationRoutes";
import messageRoutes from "./routes/messageRoutes";
import { createSocketServer } from "./socket";
import { FRONTEND_URL } from "./config";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true
  })
);

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/access-gate", accessGateRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

// HTTP + SOCKET.IO SERVER
const server = http.createServer(app);
createSocketServer(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

