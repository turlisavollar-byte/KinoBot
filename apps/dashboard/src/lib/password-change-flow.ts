export const PASSWORD_CHANGE_REQUIRED_EVENT = "auth:password-change-required";
const PASSWORD_CHANGE_REQUIRED_KEY = "must_change_password";

type ApiErrorLike = {
  status?: number;
  data?: { error?: { code?: string } } | null;
};

export function setMustChangePasswordRequired(required: boolean): void {
  try {
    if (required) {
      sessionStorage.setItem(PASSWORD_CHANGE_REQUIRED_KEY, "true");
    } else {
      sessionStorage.removeItem(PASSWORD_CHANGE_REQUIRED_KEY);
    }
  } catch {
    // The in-memory route still works for the current page session.
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PASSWORD_CHANGE_REQUIRED_EVENT));
  }
}

export function isMustChangePasswordRequired(): boolean {
  try {
    return sessionStorage.getItem(PASSWORD_CHANGE_REQUIRED_KEY) === "true";
  } catch {
    return false;
  }
}

export function isPasswordChangeRequiredError(error: unknown): boolean {
  const apiError = error as ApiErrorLike | null;
  return apiError?.status === 403 &&
    apiError.data?.error?.code === "PASSWORD_CHANGE_REQUIRED";
}

export function handlePasswordChangeRequiredError(error: unknown): boolean {
  if (!isPasswordChangeRequiredError(error)) return false;
  setMustChangePasswordRequired(true);
  return true;
}