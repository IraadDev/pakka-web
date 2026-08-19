"use client";

/**
 * Session state. One provider at the root so every screen reads the same user
 * without each one re-fetching /me.
 *
 * Auth is deliberately client-side: the API is a separate origin taking a
 * bearer token, so there is no cookie for the server to read during SSR.
 * Public pages render on the server; anything user-specific hydrates.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { api, onAuthLost, tokens } from "./api";
import type { Session, User } from "./types";

interface Ctx {
  user: User | null;
  loading: boolean;
  /** Onboarding step the server says comes next, e.g. /onboarding/kyc. */
  next: string | null;
  signIn: (s: Session) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const SessionCtx = React.createContext<Ctx>({
  user: null, loading: true, next: null,
  signIn: () => {}, signOut: () => {}, refresh: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [next, setNext] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  const load = React.useCallback(async () => {
    try {
      const { user, next } = await api.me();
      setUser(user);
      setNext(next ?? null);
    } catch {
      // A failure here means the token is dead and refresh already failed.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // With no token there is nobody to fetch, so settle immediately rather
    // than firing a request that is guaranteed to 401.
    if (!tokens.access()) {
      setLoading(false);
      return;
    }
    void load();
  }, [load]);

  // The client fires this when a refresh fails, so expiry lands the user on
  // /login once rather than every screen handling 401 itself.
  React.useEffect(() => onAuthLost(() => {
    setUser(null);
    router.push("/login");
  }), [router]);

  const signIn = React.useCallback((s: Session) => {
    tokens.set(s);
    setUser(s.user);
    setNext(s.next ?? null);
  }, []);

  const signOut = React.useCallback(() => {
    tokens.clear();
    setUser(null);
    setNext(null);
    router.push("/");
  }, [router]);

  const value = React.useMemo<Ctx>(
    () => ({ user, loading, next, signIn, signOut, refresh: load }),
    [user, loading, next, signIn, signOut, load],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export const useSession = () => React.useContext(SessionCtx);

/**
 * Redirects to /login when signed out. Returns the user once known.
 * Screens use this instead of each writing their own guard.
 */
export function useRequireAuth() {
  const { user, loading } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      const here = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    }
  }, [user, loading, router]);

  return { user, loading };
}

/** True when the user may transact — everything money-related needs this. */
export function useVerified() {
  const { user } = useSession();
  return user?.kyc_status === "verified";
}
