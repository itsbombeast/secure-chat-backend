import { PrismaClient, ConversationRole } from "@prisma/client";
export const prisma = new PrismaClient();
// ALIAS FOR BACKWARD COMPATIBILITY
export const listUserConversations = async (userId: string) => {
  return getUserConversations(userId);
};


// ADD MEMBER TO GROUP
export const addMemberToGroup = async (
  conversationId: string,
  adminId: string,
  userId: string
) => {
  // Only admins can add members
  const admin = await prisma.conversationMember.findFirst({
    where: {
      conversationId,
      userId: adminId,
      role: ConversationRole.ADMIN
    }
  });

  if (!admin) {
    throw new Error("Not authorized to add members");
  }

  // Add user
  return prisma.conversationMember.create({
    data: {
      role: ConversationRole.MEMBER,
      conversation: { connect: { id: conversationId } },
      user: { connect: { id: userId } }
    },
    include: { user: true }
  });
};


export const removeMemberFromGroup = async (
  conversationId: string,
  adminId: string,
  userId: string
) => {
  // Only admins can remove members
  const admin = await prisma.conversationMember.findFirst({
    where: {
      conversationId,
      userId: adminId,
      role: ConversationRole.ADMIN
    }
  });

  if (!admin) {
    throw new Error("Not authorized to remove members");
  }

  // Remove user
  return prisma.conversationMember.deleteMany({
    where: {
      conversationId,
      userId
    }
  });
};



// DIRECT CONVERSATION
export const createDirectConversation = async (userId: string, otherUserId: string) => {

  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: otherUserId } } }
      ]
    }
  });

  if (existing) return existing;

  const conversation = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: {
        create: [
          {
            role: ConversationRole.MEMBER,
            user: { connect: { id: userId } }
          },
          {
            role: ConversationRole.MEMBER,
            user: { connect: { id: otherUserId } }
          }
        ]
      }
    },
    include: {
      members: { include: { user: true } }
    }
  });

  return conversation;
};



// GROUP CONVERSATION
export const createGroupConversation = async (
  creatorId: string,
  name: string,
  description: string | undefined,
  memberIds: string[]
) => {

  const members = [
    {
      role: ConversationRole.ADMIN,
      user: { connect: { id: creatorId } }
    },
    ...memberIds
      .filter((id) => id !== creatorId)
      .map((id) => ({
        role: ConversationRole.MEMBER,
        user: { connect: { id } }
      }))
  ];

  const conversation = await prisma.conversation.create({
    data: {
      isGroup: true,
      name,
      description,
      createdById: creatorId,
      members: {
        create: members
      }
    },
    include: {
      members: { include: { user: true } }
    }
  });

  return conversation;
};



// GET USER CONVERSATIONS
export const getUserConversations = async (userId: string) => {
  return prisma.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: { include: { user: true } }
        }
      }
    },
    orderBy: {
      conversation: { updatedAt: "desc" }
    }
  });
};

