
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

  // Required when using cookies + HTTPS (Fly.io, Vercel, Cloudflare, Nginx)
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: [
        // Local development
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        // Production Vercel URLs
        "https://chatappxd.vercel.app",
        "https://chatappxd-h2ot08m0x-pa37trik-7906s-projects.vercel.app",
      ],
      credentials: true, // allow cookies
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );


  // --- SECURITY HEADERS ---
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );

  // --- BODY PARSERS ---
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // --- COOKIE PARSER ---
  app.use(cookieParser());

  // --- RATE LIMITING ---
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit per IP
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  // --- STATIC UPLOADS ---
  app.use("/uploads", express.static(path.resolve(UPLOAD_DIR)));

  // --- ROUTES ---
  app.use("/api/access-gate", accessGateRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/upload", uploadRoutes);

  // --- GLOBAL ERROR HANDLER ---
  app.use(errorHandler);

  return app;
};
