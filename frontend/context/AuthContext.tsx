"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authenticate, logoutRequest, refreshAccessToken } from "../lib/api";

type AuthContextValue = {
  token: string;
  email: string;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void refreshAccessToken().then(result => { setToken(result.accessToken); setEmail(result.user.email); }).catch(() => undefined).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => {
      void refreshAccessToken()
        .then(result => { setToken(result.accessToken); setEmail(result.user.email); })
        .catch(() => { setToken(""); setEmail(""); });
    }, 12 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [token]);

  const authenticateUser = useCallback(async (mode: "login" | "register", userEmail: string, password: string) => {
    const result = await authenticate(`/auth/${mode}`, userEmail, password);
    setToken(result.accessToken);
    setEmail(userEmail.trim().toLowerCase());
  }, []);

  const signOut = useCallback(async () => {
    try { await logoutRequest(); } finally { setToken(""); setEmail(""); }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    email,
    ready,
    signIn: (userEmail, password) => authenticateUser("login", userEmail, password),
    signUp: (userEmail, password) => authenticateUser("register", userEmail, password),
    signOut,
  }), [token, email, ready, authenticateUser, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
