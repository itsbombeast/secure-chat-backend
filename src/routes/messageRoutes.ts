// backend/src/routes/messageRoutes.ts
import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/authMiddleware";
import { requireAccessGate } from "../middleware/accessGateMiddleware";
import {
  getMessagesForConversation,
  createMessage,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone
} from "../services/messageService";
import { MessageType } from "@prisma/client";

const router = Router();

router.use(requireAccessGate);
router.use(requireAuth);

// GET messages
router.get("/:conversationId", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { conversationId } = req.params;
    const msgs = await getMessagesForConversation(conversationId, userId);
    res.json(msgs);
  } catch (e) {
    next(e);
  }
});

// POST message
router.post("/:conversationId", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { conversationId } = req.params;
    const { type, ciphertext, iv, meta } = req.body;

    if (!ciphertext || !iv) {
      return res.status(400).json({ error: "Missing ciphertext or iv" });
    }

    const msg = await createMessage(
      conversationId,
      userId,
      type === "IMAGE" ? MessageType.IMAGE : MessageType.TEXT,
      ciphertext,
      iv,
      meta
    );

    res.json(msg);
  } catch (e) {
    next(e);
  }
});

// PATCH edit
router.patch("/:messageId", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { messageId } = req.params;
    const { ciphertext } = req.body;

    const msg = await editMessage(messageId, userId, ciphertext);
    res.json(msg);
  } catch (e) {
    next(e);
  }
});

// DELETE – delete for me or everyone
router.delete("/:messageId", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { messageId } = req.params;
    const { scope } = req.query;

    if (scope === "everyone") {
      const msg = await deleteMessageForEveryone(messageId, userId);
      res.json(msg);
    } else {
      const deletion = await deleteMessageForMe(messageId, userId);
      res.json(deletion);
    }
  } catch (e) {
    next(e);
  }
});

export default router;

