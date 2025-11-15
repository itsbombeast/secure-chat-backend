import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import {
  ACCESS_GATE_PASSWORD,
  ACCESS_GATE_JWT_SECRET
} from "../config";

const router = Router();

const gateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts, please try again later." }
});

// POST /api/access-gate/enter
router.post("/enter", gateLimiter, (req, res) => {
  const { password } = req.body;

  if (!password || password !== ACCESS_GATE_PASSWORD) {
    return res.json({ allowed: false });
  }

  // Create signed token
  const token = jwt.sign({ allowed: true }, ACCESS_GATE_JWT_SECRET, {
    expiresIn: "12h",
  });

  // FIXED COOKIE — NO DOMAIN!!!
  res.cookie("access_gate_token", token, {
    httpOnly: true,
    secure: true,        // required for HTTPS / Vercel -> Fly.io
    sameSite: "none"     // required for cross-site requests
  });

  res.json({ allowed: true });
});

// GET /api/access-gate/status
router.get("/status", (req, res) => {
  const token = req.cookies["access_gate_token"];
  if (!token) return res.json({ allowed: false });

  try {
    jwt.verify(token, ACCESS_GATE_JWT_SECRET);
    res.json({ allowed: true });
  } catch {
    res.json({ allowed: false });
  }
});

export default router;

