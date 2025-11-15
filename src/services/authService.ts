import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import jwt, { SignOptions } from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config";
import { randomToken } from "../utils/crypto";

const prisma = new PrismaClient();

// Make TS happy: explicitly type the expiresIn value
const JWT_EXPIRES_IN_TYPED: SignOptions["expiresIn"] =
  (JWT_EXPIRES_IN as unknown as SignOptions["expiresIn"]) ?? "7d";

export const registerUser = async (
  email: string,
  username: string,
  password: string,
  publicKeyPem?: string
) => {
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      publicKeyPem
    }
  });
  return user;
};

export const authenticateUser = async (identifier: string, password: string) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }]
    }
  });
  if (!user) return null;

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return null;

  const token = jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN_TYPED } // 👈 fixed here
  );

  return { user, token };
};

export const getUserById = (id: string) =>
  prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, username: true, publicKeyPem: true, createdAt: true }
  });

export const savePublicKey = async (userId: string, publicKeyPem: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { publicKeyPem }
  });
};

export const createPasswordResetToken = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt
    }
  });

  // In a real system you would send an email with this token.
  return { user, token };
};

export const resetPasswordWithToken = async (token: string, newPassword: string) => {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return false;
  }

  const passwordHash = await argon2.hash(newPassword);
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash }
  });

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() }
  });

  return true;
};

