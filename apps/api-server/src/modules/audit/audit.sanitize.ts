const REDACTED = "[REDACTED]";
const CIRCULAR = "[Circular]";

const SENSITIVE_KEY_PARTS = [
  "password",
  "passwd",
  "pwd",
  "passphrase",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "privatekey",
  "credential",
  "sessionid",
  "signingkey",
  "jwt",
  "bearer",
  "csrf",
  "xsrf",
  "signature",
  "encryptionkey",
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  return (
    normalized === "auth" ||
    SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part))
  );
}

export function sanitizeAuditPayload(payload: unknown): unknown {
  const ancestors = new WeakSet<object>();

  function visit(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (value instanceof Date) return new Date(value.getTime());

    if (Array.isArray(value)) {
      if (ancestors.has(value)) return CIRCULAR;

      ancestors.add(value);
      try {
        return value.map(visit);
      } finally {
        ancestors.delete(value);
      }
    }

    if (typeof value !== "object") return value;
    if (ancestors.has(value)) return CIRCULAR;

    ancestors.add(value);
    try {
      const sanitized: Record<string, unknown> = Object.create(null);

      for (const [key, child] of Object.entries(value)) {
        Object.defineProperty(sanitized, key, {
          value: isSensitiveKey(key) ? REDACTED : visit(child),
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }

      return sanitized;
    } finally {
      ancestors.delete(value);
    }
  }

  return visit(payload);
}