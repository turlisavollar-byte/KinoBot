import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

// Configure API client to use relative paths for Vite proxy
// Vite proxy will forward /api/* requests to the API server on port 8080
setBaseUrl("");

// In-memory token store — guaranteed to work even when localStorage is
// blocked (cross-origin iframe in some browsers).
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

// Attempt to restore from localStorage on module load (best-effort)
try {
  _accessToken = localStorage.getItem("access_token");
  _refreshToken = localStorage.getItem("refresh_token");
} catch {
  // localStorage blocked — that's fine, session will last until page reload
}

// Register a getter that reads from the in-memory variable
setAuthTokenGetter(() => _accessToken);

export function setTokens(accessToken: string, refreshToken: string): void {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
  try {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
  } catch {
    // ignore
  }
}

export function clearTokens(): void {
  _accessToken = null;
  _refreshToken = null;
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  } catch {
    // ignore
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function getRefreshToken(): string | null {
  return _refreshToken;
}

// Legacy compatibility - for gradual migration
export function setToken(token: string): void {
  // Assume it's an access token for backward compatibility
  setTokens(token, "");
}

export function getToken(): string | null {
  return getAccessToken();
}
