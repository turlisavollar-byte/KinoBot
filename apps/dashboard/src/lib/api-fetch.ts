import { getToken } from "@/lib/auth-token";
import { handlePasswordChangeRequiredError } from "@/lib/password-change-flow";

// Use relative paths for Vite proxy to work correctly
// Vite proxy will forward /api/* requests to the API server on port 8080
export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
    const headers = new Headers(opts?.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(path, {
      ...opts,
      headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorBody = body as {
      error?: { code?: string; message?: string };
    };
    const error = Object.assign(
      new Error(errorBody.error?.message ?? res.statusText),
      { status: res.status, data: body },
    );
    handlePasswordChangeRequiredError(error);
    throw error;
  }
  return res.json() as Promise<T>;
}
