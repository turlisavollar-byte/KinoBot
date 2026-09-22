import { auth as authApi } from "@streamx/api-client";

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  try {
    await authApi.signIn(email, password);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sign in failed" };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<{ error: string | null }> {
  try {
    await authApi.signUp(email, password, fullName);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sign up failed" };
  }
}

export async function sendPasswordResetEmail(
  email: string
): Promise<{ error: string | null }> {
  try {
    await authApi.resetPassword(email);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to send reset email" };
  }
}

export async function updateNewPassword(
  newPassword: string
): Promise<{ error: string | null }> {
  try {
    await authApi.updatePassword(newPassword);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update password" };
  }
}

export async function signOut(): Promise<void> {
  await authApi.signOut();
}
