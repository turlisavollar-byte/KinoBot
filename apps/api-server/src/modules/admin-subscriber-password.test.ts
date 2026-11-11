import { describe, expect, it } from "vitest";
import { generateTemporarySubscriberPassword } from "./admin-subscriber-password";

describe("generateTemporarySubscriberPassword", () => {
  it("generates a high-entropy URL-safe temporary password", () => {
    const password = generateTemporarySubscriberPassword();
    expect(password).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(password).not.toBe(generateTemporarySubscriberPassword());
  });
});
