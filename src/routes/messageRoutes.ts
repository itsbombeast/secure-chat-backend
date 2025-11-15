import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/authMiddleware";
import { requireAccessGate } from "../middleware/accessGateMiddleware";
import { createMessage, listMessages, editMessage, deleteMessageForMe, deleteMessageForEveryone, markMessageSeen } from "../services/messageService";
import { MessageType } from "@prisma/client";
import { io } from "../socket";

const router = Router();

router.use(requireAccessGate);
router.use(requireAuth);

// List messages
router.get("/:conversationId", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { conversationId } = req.params;
    const messages = await listMessages(conversationId, userId);
    res.json(messages);
  } catch (e) {
    next(e);
  }
});

// Create message
router.post("/:conversationId", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { conversationId } = req.params;
    const { type = "TEXT", ciphertext, iv, meta } = req.body;
    if (!ciphertext || !iv) return res.status(400).json({ error: "Missing ciphertext/iv" });

    const message = await createMessage(
      conversationId,
      userId,
      type === "IMAGE" ? MessageType.IMAGE : MessageType.TEXT,
      ciphertext,
      iv,
      meta
    );

    io.to(`conversation:${conversationId}`).emit("message:new", {
      conversationId,
      messageId: message.id
    });

    res.json(message);
  } catch (e) {
    next(e);
  }
});

// Edit message
router.put("/:conversationId/:messageId", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { conversationId, messageId } = req.params;
    const { ciphertext, iv } = req.body;
    if (!ciphertext || !iv) return res.status(400).json({ error: "Missing ciphertext/iv" });

    const msg = await editMessage(messageId, userId, ciphertext, iv);

    io.to(`conversation:${conversationId}`).emit("message:edited", {
      conversationId,
      messageId
    });

    res.json(msg);
  } catch (e) {
    next(e);
  }
});

// Delete for me
router.delete("/:conversationId/:messageId/me", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { conversationId, messageId } = req.params;

    await deleteMessageForMe(messageId, userId);

    io.to(`conversation:${conversationId}`).emit("message:deleted", {
      conversationId,
      messageId,
      scope: "ME_ONLY"
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Delete for everyone
router.delete("/:conversationId/:messageId/everyone", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { conversationId, messageId } = req.params;

    await deleteMessageForEveryone(messageId, userId);

    io.to(`conversation:${conversationId}`).emit("message:deleted", {
      conversationId,
      messageId,
      scope: "EVERYONE"
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Mark seen
router.post("/:conversationId/:messageId/seen", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { conversationId, messageId } = req.params;

    const receipt = await markMessageSeen(messageId, userId);

    io.to(`conversation:${conversationId}`).emit("message:seen", {
      conversationId,
      messageId,
      userId
    });

    res.json(receipt);
  } catch (e) {
    next(e);
  }
});

export default router;
