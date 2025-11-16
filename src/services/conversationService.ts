import { PrismaClient, ConversationRole } from "@prisma/client";
export const prisma = new PrismaClient();


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

