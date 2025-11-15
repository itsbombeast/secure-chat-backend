import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/authMiddleware";
import { requireAccessGate } from "../middleware/accessGateMiddleware";
import { listUserConversations, createDirectConversation, createGroupConversation, addMemberToGroup, removeMemberFromGroup } from "../services/conversationService";

const router = Router();

router.use(requireAccessGate);
router.use(requireAuth);

// List all conversations for the logged-in user
router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const convos = await listUserConversations(userId);
    res.json(convos);
  } catch (e) {
    next(e);
  }
});

// Create direct conversation
router.post("/direct", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ error: "Missing otherUserId" });

    const convo = await createDirectConversation(userId, otherUserId);
    res.json(convo);
  } catch (e) {
    next(e);
  }
});

// Create group conversation
router.post("/group", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { name, description, memberIds } = req.body;
    if (!name || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const convo = await createGroupConversation(userId, name, description, memberIds);
    res.json(convo);
  } catch (e) {
    next(e);
  }
});

// Add member to group
router.post("/:conversationId/members", async (req: AuthRequest, res, next) => {
  try {
    const adminId = req.userId!;
    const { conversationId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const member = await addMemberToGroup(conversationId, adminId, userId);
    res.json(member);
  } catch (e) {
    next(e);
  }
});

// Remove member from group
router.delete("/:conversationId/members/:userId", async (req: AuthRequest, res, next) => {
  try {
    const adminId = req.userId!;
    const { conversationId, userId } = req.params;
    const result = await removeMemberFromGroup(conversationId, adminId, userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
