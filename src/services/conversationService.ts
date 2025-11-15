import { PrismaClient, ConversationRole } from "@prisma/client";

const prisma = new PrismaClient();

export const listUserConversations = async (userId: string) => {
  return prisma.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: {
            include: { user: { select: { id: true, username: true, publicKeyPem: true } } }
          }
        }
      }
    }
  });
};

export const createDirectConversation = async (userId: string, otherUserId: string) => {
  // Check if one already exists
  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      members: {
        every: {
          userId: {
            in: [userId, otherUserId]
          }
        }
      }
    },
    include: {
      members: true
    }
  });
  if (existing) return existing;

  const convo = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: {
        create: [
          { userId, role: ConversationRole.MEMBER },
          { userId: otherUserId, role: ConversationRole.MEMBER }
        ]
      }
    }
  });
  return convo;
};

export const createGroupConversation = async (
  creatorId: string,
  name: string,
  description: string | undefined,
  memberIds: string[]
) => {
  const convo = await prisma.conversation.create({
    data: {
      isGroup: true,
      name,
      description,
      createdById: creatorId,
      members: {
        create: [
          { userId: creatorId, role: ConversationRole.ADMIN },
          ...memberIds
            .filter((id) => id !== creatorId)
            .map((id) => ({
              userId: id,
              role: ConversationRole.MEMBER as ConversationRole
            }))
        ]
      }
    }
  });
  return convo;
};

export const addMemberToGroup = async (conversationId: string, adminId: string, newMemberId: string) => {
  const adminMember = await prisma.conversationMember.findFirst({
    where: { conversationId, userId: adminId, role: ConversationRole.ADMIN }
  });
  if (!adminMember) throw Object.assign(new Error("Forbidden"), { status: 403 });

  return prisma.conversationMember.create({
    data: {
      conversationId,
      userId: newMemberId,
      role: ConversationRole.MEMBER
    }
  });
};

export const removeMemberFromGroup = async (conversationId: string, adminId: string, memberId: string) => {
  const adminMember = await prisma.conversationMember.findFirst({
    where: { conversationId, userId: adminId, role: ConversationRole.ADMIN }
  });
  if (!adminMember) throw Object.assign(new Error("Forbidden"), { status: 403 });

  return prisma.conversationMember.deleteMany({
    where: {
      conversationId,
      userId: memberId
    }
  });
};
