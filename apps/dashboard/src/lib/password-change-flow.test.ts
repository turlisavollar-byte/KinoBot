import { beforeEach, describe, expect, it } from "vitest";
import {
  handlePasswordChangeRequiredError,
  isMustChangePasswordRequired,
} from "./password-change-flow";

describe("forced password change error handling", () => {
  beforeEach(() => sessionStorage.clear());

  it("marks password-change-required 403 errors for route redirection", () => {
    const handled = handlePasswordChangeRequiredError({
      status: 403,
      data: { error: { code: "PASSWORD_CHANGE_REQUIRED" } },
    });

    expect(handled).toBe(true);
    expect(isMustChangePasswordRequired()).toBe(true);
  });

  it("leaves ordinary permission 403 errors unchanged", () => {
    const handled = handlePasswordChangeRequiredError({
      status: 403,
      data: { error: { code: "FORBIDDEN" } },
    });

    expect(handled).toBe(false);
    expect(isMustChangePasswordRequired()).toBe(false);
  });
});
