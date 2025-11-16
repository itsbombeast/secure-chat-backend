import { PrismaClient, ConversationRole } from "@prisma/client";

export const prisma = new PrismaClient();

/* ============================================================
   GET USER CONVERSATIONS
============================================================ */
export const listUserConversations = async (userId: string) => {
  return prisma.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: {
            include: { user: true }
          }
        }
      }
    },
    orderBy: {
      conversation: { updatedAt: "desc" }
    }
  });
};

/* ============================================================
   CREATE DIRECT CONVERSATION
============================================================ */
export const createDirectConversation = async (
  userId: string,
  otherUserIdentifier: string
) => {
  console.log("DIRECT CHAT DEBUG:", { userId, otherUserId: otherUserIdentifier });

  // 1. Load current user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  console.log("USER EXISTS:", user);
  if (!user) throw new Error("Current user not found.");

  // 2. Resolve other user by ID or username
  const otherUser =
    (await prisma.user.findUnique({ where: { id: otherUserIdentifier } })) ||
    (await prisma.user.findUnique({ where: { username: otherUserIdentifier } }));

  console.log("OTHER USER EXISTS:", otherUser);
  if (!otherUser) throw new Error("User not found.");

  // 3. Check for existing direct chat
  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      members: { some: { userId } },
      AND: {
        members: { some: { userId: otherUser.id } }
      }
    },
    include: {
      members: { include: { user: true } }
    }
  });

  if (existing) return existing;

  // 4. Create new direct chat
  const convo = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: {
        create: [
          { role: "MEMBER", user: { connect: { id: user.id } } },
          { role: "MEMBER", user: { connect: { id: otherUser.id } } }
        ]
      }
    },
    include: {
      members: { include: { user: true } }
    }
  });

  return convo;
};

/* ============================================================
   CREATE GROUP CONVERSATION
============================================================ */
export const createGroupConversation = async (
  creatorId: string,
  name: string,
  description: string | undefined,
  memberIdentifiers: string[]
) => {
  // Resolve users by username or ID
  const memberUsers = await Promise.all(
    memberIdentifiers.map(async (idOrName) => {
      return (
        (await prisma.user.findUnique({ where: { id: idOrName } })) ||
        (await prisma.user.findUnique({ where: { username: idOrName } }))
      );
    })
  );

  // TS-safe filter that removes nulls
  const validMembers = memberUsers.filter(
    (u): u is NonNullable<typeof u> => Boolean(u)
  );

  if (validMembers.length === 0) throw new Error("No valid members found");

  // Prepare members create array
  const membersData = validMembers.map((u) => ({
    role: u.id === creatorId ? ConversationRole.ADMIN : ConversationRole.MEMBER,
    user: { connect: { id: u.id } }
  }));

  // Create group conversation
  const convo = await prisma.conversation.create({
    data: {
      isGroup: true,
      name,
      description,
      createdById: creatorId,
      members: { create: membersData }
    },
    include: {
      members: { include: { user: true } }
    }
  });

  return convo;
};


/* ============================================================
   ADD MEMBER TO GROUP
============================================================ */
export const addMemberToGroup = async (
  conversationId: string,
  adminId: string,
  userIdentifier: string
) => {
  // Ensure conversation exists
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { members: true }
  });

  if (!conversation || !conversation.isGroup)
    throw new Error("Conversation not found");

  // Ensure admin is admin
  const isAdmin = conversation.members.some(
    (m) => m.userId === adminId && m.role === "ADMIN"
  );

  if (!isAdmin) throw new Error("Not authorized");

  // Resolve target user
  const user =
    (await prisma.user.findUnique({ where: { id: userIdentifier } })) ||
    (await prisma.user.findUnique({ where: { username: userIdentifier } }));

  if (!user) throw new Error("User not found");

  // Add member
  return prisma.conversationMember.create({
    data: {
      role: "MEMBER",
      user: { connect: { id: user.id } },
      conversation: { connect: { id: conversationId } }
    }
  });
};

/* ============================================================
   REMOVE MEMBER FROM GROUP
============================================================ */
export const removeMemberFromGroup = async (
  conversationId: string,
  adminId: string,
  targetUserId: string
) => {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { members: true }
  });

  if (!convo || !convo.isGroup)
    throw new Error("Conversation not found");

  // Ensure admin
  const isAdmin = convo.members.some(
    (m) => m.userId === adminId && m.role === "ADMIN"
  );

  if (!isAdmin) throw new Error("Not authorized");

  // Remove member
  return prisma.conversationMember.deleteMany({
    where: {
      conversationId,
      userId: targetUserId
    }
  });
};



