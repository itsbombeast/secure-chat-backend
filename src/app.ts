import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";

import { BASE_CLIENT_URL, UPLOAD_DIR } from "./config";
import accessGateRoutes from "./routes/accessGateRoutes";
import authRoutes from "./routes/authRoutes";
import conversationRoutes from "./routes/conversationRoutes";
import messageRoutes from "./routes/messageRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import { errorHandler } from "./middleware/errorHandler";

export const createApp = () => {
  const app = express();
  // Render.com / Vercel / Railway fix
  app.set("trust proxy", 1);
  // 🔥 MUST BE FIRST — before rate limit, cors, cookieParser, helmet, anything
  app.get("/access-gate/status", (req, res) => {
    res.json({ ok: true, status: "awake" });
  });

  // 🔥 CORS
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://chatappxd.vercel.app",
        "https://chatappxd-h2ot08m0x-pa37trik-7906s-projects.vercel.app"
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  );

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: false
    })
  );

  // Parsers
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  // Uploads
  app.use("/uploads", express.static(path.resolve(UPLOAD_DIR)));

  // Routes
  app.use("/api/access-gate", accessGateRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/upload", uploadRoutes);

  app.use(errorHandler);

  return app;
};
