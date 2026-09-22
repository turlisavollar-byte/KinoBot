"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { auth as authApi, hasSupabaseConfig } from "@streamx/api-client";
import type { User, Profile, AuthSession } from "@streamx/api-client";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function userToProfile(user: User): Profile {
  return {
    id: user.id,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    plan: user.plan,
    createdAt: user.createdAt,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!hasSupabaseConfig()) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    authApi.getSession().then((session: AuthSession | null) => {
      if (!mounted) return;
      if (session) {
        setUser(session.user);
        setProfile(userToProfile(session.user));
      }
      setLoading(false);
    });

    const { data: listener } = authApi.onAuthStateChange((session) => {
      if (!mounted) return;
      if (session) {
        setUser(session.user);
        setProfile(userToProfile(session.user));
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const session = await authApi.getSession();
    if (session) {
      setUser(session.user);
      setProfile(userToProfile(session.user));
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const session = await authApi.signIn(email, password);
      setUser(session.user);
      setProfile(userToProfile(session.user));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Sign in failed" };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const session = await authApi.signUp(email, password, fullName);
        setUser(session.user);
        setProfile(userToProfile(session.user));
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Sign up failed" };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
