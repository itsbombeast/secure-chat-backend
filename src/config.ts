import dotenv from "dotenv";
dotenv.config();

export const PORT = parseInt(process.env.PORT || "4000", 10);
export const NODE_ENV = process.env.NODE_ENV || "development";

export const ACCESS_GATE_PASSWORD = process.env.ACCESS_GATE_PASSWORD || "";
export const ACCESS_GATE_JWT_SECRET = process.env.ACCESS_GATE_JWT_SECRET || "change_me";

export const JWT_SECRET = process.env.JWT_SECRET || "change_me";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || "localhost";
export const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
export const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax";

export const DATABASE_URL = process.env.DATABASE_URL || "";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
export const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || "http://localhost:5173";
