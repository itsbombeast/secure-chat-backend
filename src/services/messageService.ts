import { PrismaClient, MessageType, DeletionScope } from "@prisma/client";

const prisma = new PrismaClient();

export const listMessages = (conversationId: string, userId: string) => {
  return prisma.message.findMany({
    where: {
      conversationId,
      deletions: {
        none: {
          userId
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
};

export const createMessage = async (
  conversationId: string,
  senderId: string,
  type: MessageType,
  ciphertext: string,
  iv: string,
  meta?: any
) => {
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      type,
      ciphertext,
      iv,
      meta
    }
  });
  return message;
};

export const editMessage = async (messageId: string, userId: string, newCiphertext: string, newIv: string) => {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.senderId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  return prisma.message.update({
    where: { id: messageId },
    data: { ciphertext: newCiphertext, iv: newIv, editedAt: new Date() }
  });
};

export const deleteMessageForMe = async (messageId: string, userId: string) => {
  return prisma.messageDeletion.create({
    data: {
      messageId,
      userId,
      scope: DeletionScope.ME_ONLY
    }
  });
};

export const deleteMessageForEveryone = async (messageId: string, userId: string) => {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.senderId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  await prisma.message.update({
    where: { id: messageId },
    data: { deletedForEveryoneAt: new Date() }
  });

  return prisma.messageDeletion.createMany({
    data: [
      {
        messageId,
        userId,
        scope: DeletionScope.EVERYONE
      }
    ]
  });
};

export const markMessageSeen = async (messageId: string, userId: string) => {
  return prisma.messageReceipt.upsert({
    where: { messageId_userId: { messageId, userId } },
    update: { seenAt: new Date() },
    create: { messageId, userId }
  });
};
