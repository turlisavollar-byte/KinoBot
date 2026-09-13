import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };

    for (const key of ["code", "query", "params", "detail", "hint"]) {
      const property = (value as unknown as Record<string, unknown>)[key];
      if (property !== undefined) serialized[key] = property;
    }

    if (value.cause !== undefined) {
      serialized.cause = serializeError(value.cause);
    }

    return serialized;
  }

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const serialized: Record<string, unknown> = {};
    for (const [key, property] of Object.entries(object)) {
      serialized[key] =
        property instanceof Error ? serializeError(property) : property;
    }
    return serialized;
  }

  return value;
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  serializers: {
    err: serializeError,
    error: serializeError,
    cause: serializeError,
  },
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
