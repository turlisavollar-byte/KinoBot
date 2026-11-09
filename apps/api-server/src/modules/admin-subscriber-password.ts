import { randomBytes } from "node:crypto";

export function generateTemporarySubscriberPassword(): string {
  return randomBytes(32).toString("base64url");
}
