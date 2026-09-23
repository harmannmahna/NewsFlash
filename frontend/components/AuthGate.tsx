"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export function AuthGate({ children, guestOnly = false }: { children: React.ReactNode; guestOnly?: boolean }) {
  const { token, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = ready && (guestOnly ? !token : Boolean(token));

  useEffect(() => {
    if (!ready) return;
    if (guestOnly && token) router.replace("/");
    if (!guestOnly && !token) router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
  }, [ready, token, guestOnly, router, pathname]);

  if (!allowed) return <main className="auth-loading"><span className="loader" /><span>Checking your session…</span></main>;
  return children;
}
