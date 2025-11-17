import dotenv from "dotenv";
import path from "path";

dotenv.config();

// 🔥 FRONTEND URL
export const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://chatappxd.vercel.app";

// 🔥 BASE CLIENT URL (některý tvůj router to chce)
export const BASE_CLIENT_URL =
  process.env.BASE_CLIENT_URL || FRONTEND_URL;

// 🔥 JWT
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// 🔥 ACCESS GATE
export const ACCESS_GATE_PASSWORD =
  process.env.ACCESS_GATE_PASSWORD || "default-access-password";

export const ACCESS_GATE_JWT_SECRET =
  process.env.ACCESS_GATE_JWT_SECRET || "dev-access-gate-secret";

// 🔥 UPLOAD DIRECTORY (používá uploadRoutes)
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");

// 🔥 SERVER PORT
export const PORT = process.env.PORT || 4000;
