import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  registerUser,
  authenticateUser,
  getUserById,
  createPasswordResetToken,
  resetPasswordWithToken
} from "../services/authService";
import { isStrongPassword } from "../utils/validators";
import { requireAccessGate } from "../middleware/accessGateMiddleware";
import { JWT_SECRET } from "../config";

const router = Router();

/**
 * REGISTER
 */
router.post("/register", requireAccessGate, async (req, res, next) => {
  try {
    const { email, username, password, publicKeyPem } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: "Password too weak" });
    }

    const user = await registerUser(email, username, password, publicKeyPem);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        publicKeyPem: user.publicKeyPem
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * LOGIN
 */
router.post("/login", requireAccessGate, async (req, res, next) => {
  try {
    const { identifier, password, rememberMe } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // authenticateUser returns { user, token } or null
    const result = await authenticateUser(identifier, password);
    if (!result) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.user;

    // Create our own JWT (you could also reuse result.token if you prefer)
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: rememberMe ? "30d" : "1d"
    });

    // IMPORTANT: cookie name must be "auth_token"
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,       // HTTPS only
      sameSite: "none",   // required for Vercel -> Fly.io cross-site
      maxAge: rememberMe ? 1000 * 60 * 60 * 24 * 30 : undefined
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        publicKeyPem: user.publicKeyPem
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * LOGOUT
 */
router.post("/logout", requireAccessGate, (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });

  res.json({ ok: true });
});

/**
 * CURRENT USER (/auth/me)
 */
router.get("/me", requireAccessGate, async (req, res) => {
  try {
    const token = req.cookies["auth_token"];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        publicKeyPem: user.publicKeyPem
      }
    });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * PASSWORD RESET REQUEST
 */
router.post("/password-reset/request", requireAccessGate, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const result = await createPasswordResetToken(email);
  if (!result) {
    return res.json({ ok: true });
  }

  // Normally you'd email result.token; for security we don't return it here
  res.json({ ok: true });
});

/**
 * PASSWORD RESET CONFIRM
 */
router.post("/password-reset/confirm", requireAccessGate, async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword)
    return res.status(400).json({ error: "Missing fields" });

  if (!isStrongPassword(newPassword))
    return res.status(400).json({ error: "Password too weak" });

  const ok = await resetPasswordWithToken(token, newPassword);
  if (!ok) return res.status(400).json({ error: "Invalid or expired token" });

  res.json({ ok: true });
});

export default router;

