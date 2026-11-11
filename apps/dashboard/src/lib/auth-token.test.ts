import { afterEach, describe, expect, it } from "vitest";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getToken,
  setTokens,
} from "./auth-token";

describe("auth token persistence", () => {
  afterEach(() => clearTokens());

  it("stores login access and refresh tokens in memory and localStorage", () => {
    setTokens("login-access-token", "login-refresh-token");

    expect(getAccessToken()).toBe("login-access-token");
    expect(getToken()).toBe("login-access-token");
    expect(getRefreshToken()).toBe("login-refresh-token");
    expect(localStorage.getItem("access_token")).toBe("login-access-token");
    expect(localStorage.getItem("refresh_token")).toBe("login-refresh-token");
  });
});
