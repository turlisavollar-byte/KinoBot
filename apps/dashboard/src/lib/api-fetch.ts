import {
  clearTokens,
  getRefreshToken,
  getToken,
  setTokens,
} from "@/lib/auth-token";
import { handlePasswordChangeRequiredError } from "@/lib/password-change-flow";

// Use relative paths for Vite proxy to work correctly
// Vite proxy will forward /api/* requests to the API server on port 8080
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch("/api/identity/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return false;

        const data = (await response.json()) as {
          accessToken?: string;
          refreshToken?: string;
        };
        if (!data.accessToken || !data.refreshToken) return false;

        setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  opts?: RequestInit,
): Promise<T> {
  const createHeaders = (token: string | null) => {
    const headers = new Headers(opts?.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  };

  let res = await fetch(path, {
    ...opts,
    headers: createHeaders(getToken()),
  });

  if (res.status === 401) {
    if (await refreshTokens()) {
      res = await fetch(path, {
        ...opts,
        headers: createHeaders(getToken()),
      });
    }
    if (res.status === 401) clearTokens();
  }

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
