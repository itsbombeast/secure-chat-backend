import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ACCESS_GATE_JWT_SECRET } from "../config";

export const requireAccessGate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies["access_gate_token"];
    if (!token) return res.status(403).json({ error: "Forbidden" });

    jwt.verify(token, ACCESS_GATE_JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: "Forbidden" });
  }
};
