// NOTE: End-to-end encryption is handled on the client.
// The server NEVER sees plaintext messages or private keys.
// This file is left for possible server-side helpers like random IDs, etc.
import crypto from "crypto";

export const randomToken = (size = 32): string => {
  return crypto.randomBytes(size).toString("hex");
};
