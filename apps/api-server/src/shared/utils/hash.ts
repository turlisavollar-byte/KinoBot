import crypto from "node:crypto";

const SALT = "stream_platform_salt_2024";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + SALT).digest("hex");
}

export function comparePassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("hex");
}
