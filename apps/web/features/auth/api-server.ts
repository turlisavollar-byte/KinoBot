import {
  auth as apiAuth,
  hasApiConfig as hasApiAuthConfig,
  type AuthSession,
  type User,
} from "@streamx/api-client";

export { apiAuth, hasApiAuthConfig, type AuthSession, type User };

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const normalizedPath = path.replace(/^\/identity\/auth/, "");
  const response = await fetch(`/api/web${normalizedPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.error?.message ??
        body?.message ??
        `API request failed (${response.status})`,
    );
  }
  return body as T;
}
