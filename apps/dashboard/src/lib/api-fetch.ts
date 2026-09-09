import { getToken } from "@/lib/auth-token";

// Use relative paths for Vite proxy to work correctly
// Vite proxy will forward /api/* requests to the API server on port 8080
export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: { message?: string } }).error?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}
