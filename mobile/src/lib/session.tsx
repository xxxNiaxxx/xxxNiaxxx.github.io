import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, configureApi, defaultServerUrl } from "./api";
import { storage } from "./storage";
import type { SessionInfo } from "./types";

const TOKEN_KEY = "brachychronia.token";
const SERVER_KEY = "brachychronia.server";

interface SessionContextValue {
  ready: boolean;
  session: SessionInfo | null;
  serverUrl: string;
  signIn: (args: { email: string; password: string; serverUrl: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [serverUrl, setServerUrl] = useState(defaultServerUrl());

  const signOut = useCallback(async () => {
    await storage.remove(TOKEN_KEY);
    configureApi({ token: null });
    setSession(null);
  }, []);

  const refresh = useCallback(async () => {
    setSession(await api<SessionInfo>("/api/mobile/session"));
  }, []);

  useEffect(() => {
    configureApi({ onUnauthorized: () => void signOut() });
    (async () => {
      try {
        const [token, savedUrl] = await Promise.all([storage.get(TOKEN_KEY), storage.get(SERVER_KEY)]);
        const url = savedUrl ?? defaultServerUrl();
        setServerUrl(url);
        configureApi({ baseUrl: url, token });
        if (token) await refresh();
      } catch {
        // Unreadable storage, expired token or unreachable server: show the sign-in screen.
      } finally {
        setReady(true);
      }
    })();
  }, [refresh, signOut]);

  const signIn = useCallback(async ({ email, password, serverUrl: url }: { email: string; password: string; serverUrl: string }) => {
    const baseUrl = url.trim().replace(/\/$/, "");
    configureApi({ baseUrl, token: null });
    const res = await api<SessionInfo & { token: string }>("/api/mobile/session", { body: { email, password } });
    await Promise.all([storage.set(TOKEN_KEY, res.token), storage.set(SERVER_KEY, baseUrl)]);
    configureApi({ token: res.token });
    setServerUrl(baseUrl);
    setSession({ user: res.user, organization: res.organization, role: res.role });
  }, []);

  const value = useMemo(() => ({ ready, session, serverUrl, signIn, signOut, refresh }), [ready, session, serverUrl, signIn, signOut, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
