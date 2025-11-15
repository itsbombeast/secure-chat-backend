import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAccessGate } from "../middleware/accessGateMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { UPLOAD_DIR } from "../config";

const router = Router();

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// We assume files are ALREADY encrypted on client.
// Server just stores opaque blobs.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.use(requireAccessGate);
router.use(requireAuth);

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  res.json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.originalname,
    size: req.file.size
  });
});

export default router;
