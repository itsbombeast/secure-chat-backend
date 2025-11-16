import { PrismaClient, ConversationRole } from "@prisma/client";
export const prisma = new PrismaClient();

export const createDirectConversation = async (userId: string, otherUserIdentifier: string) => {
  console.log("DIRECT CHAT DEBUG:", { userId, otherUserId: otherUserIdentifier });

  // 1. Find current user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  console.log("USER EXISTS:", user);

  if (!user) throw new Error("Current user not found.");

  // 2. Resolve other user (by ID or username)
  const otherUser =
    (await prisma.user.findUnique({ where: { id: otherUserIdentifier } })) ||
    (await prisma.user.findUnique({ where: { username: otherUserIdentifier } }));

  console.log("OTHER USER EXISTS:", otherUser);

  if (!otherUser) throw new Error("User not found");

  // 3. Check if direct conversation exists
  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      members: {
        some: { userId }
      },
      AND: {
        members: {
          some: { userId: otherUser.id }
        }
      }
    },
    include: {
      members: { include: { user: true } }
    }
  });

  if (existing) return existing;

  // 4. Create new direct conversation
  const conversation = await prisma.conversation.create({
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

  return conversation;
};


