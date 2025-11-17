// backend/src/services/messageService.ts
import { PrismaClient, MessageType, DeletionScope } from "@prisma/client";

const prisma = new PrismaClient();

export const getMessagesForConversation = async (conversationId: string, userId: string) => {
  return prisma.message.findMany({
    where: {
      conversationId
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
  const msg = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      type,
      ciphertext,
      iv,
      meta
    }
  });

  return msg;
};

export const editMessage = async (messageId: string, userId: string, newCiphertext: string) => {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) throw new Error("Message not found");
  if (msg.senderId !== userId) throw new Error("Not authorized");

  return prisma.message.update({
    where: { id: messageId },
    data: {
      ciphertext: newCiphertext,
      editedAt: new Date()
    }
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
  if (!msg) throw new Error("Message not found");
  if (msg.senderId !== userId) throw new Error("Not authorized");

  return prisma.message.update({
    where: { id: messageId },
    data: {
      deletedForEveryoneAt: new Date()
    }
  });
};
