// backend/src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";

// Importy tvých existujících rout
import accessGateRoutes from "./routes/accessGateRoutes";
import authRoutes from "./routes/authRoutes";
import conversationRoutes from "./routes/conversationRoutes";
import messageRoutes from "./routes/messageRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import { errorHandler } from "./middleware/errorHandler";

export const createApp = () => {
  const app = express();
  
  // Důležité pro správné fungování na hostingu (Vercel/Railway)
  app.set("trust proxy", 1);

  // Testovací endpoint
  app.get("/access-gate/status", (req, res) => {
    res.json({ ok: true, status: "awake" });
  });

  // CORS - Povolení komunikace s frontendem
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://chatappxd.vercel.app"
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  );

  // Zabezpečení
  app.use(helmet({ crossOriginResourcePolicy: false })); // Upraveno, aby šly načítat obrázky
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Omezení počtu požadavků (Rate limiting)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  // 🔥 TOTO JE TO HLAVNÍ PRO PROFILOVKY 🔥
  // Říkáme serveru: "Když někdo chce soubor z /uploads, podívej se do složky uploads na disku."
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // Registrace API cest
  app.use("/api/access-gate", accessGateRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/upload", uploadRoutes);

  // Zpracování chyb
  app.use(errorHandler);

  return app;
};