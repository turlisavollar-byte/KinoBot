export { AuthProvider, useAuth } from "./hooks/useAuth";
export { fetchProfile, updateProfile } from "./profile-api";
export { signInWithEmail, signUpWithEmail, sendPasswordResetEmail, updateNewPassword, signOut } from "./api";
export type { User, Profile, AuthSession } from "./types";
