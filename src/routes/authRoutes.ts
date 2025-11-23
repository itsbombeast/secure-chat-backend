import { Router } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
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
const prisma = new PrismaClient();

// Nastavení nahrávání souborů
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, "../../uploads")); // Ukládá do složky backend/uploads
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// --- UPDATE PROFILE ---
router.put("/update", requireAccessGate, upload.single("profilePicture"), async (req, res) => {
  try {
    const token = req.cookies["auth_token"];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const userId = decoded.userId;

    const { username, email, password } = req.body;
    const updateData: any = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    
    // Pokud uživatel poslal heslo a není prázdné
    if (password && password.trim() !== "") {
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: "Password too weak" });
        }
        updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Pokud byl nahrán soubor
    if (req.file) {
      updateData.profilePicture = req.file.filename;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        publicKeyPem: updatedUser.publicKeyPem,
        profilePicture: updatedUser.profilePicture // Vracíme i obrázek
      }
    });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

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
        publicKeyPem: user.publicKeyPem,
        profilePicture: null
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

    const result = await authenticateUser(identifier, password);
    if (!result) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.user;
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: rememberMe ? "30d" : "1d"
    });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: rememberMe ? 1000 * 60 * 60 * 24 * 30 : undefined
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        publicKeyPem: user.publicKeyPem,
        profilePicture: user.profilePicture
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
        publicKeyPem: user.publicKeyPem,
        profilePicture: user.profilePicture
      },
      token
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