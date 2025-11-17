import dotenv from "dotenv";

dotenv.config();

export const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://chatappxd.vercel.app";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
export const ACCESS_GATE_PASSWORD =
  process.env.ACCESS_GATE_PASSWORD || "default-access-password";
export const ACCESS_GATE_JWT_SECRET =
  process.env.ACCESS_GATE_JWT_SECRET || "dev-access-gate-secret";

