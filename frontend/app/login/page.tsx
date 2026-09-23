"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "../../components/AuthGate";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await signIn(email, password);
      const requested = new URLSearchParams(window.location.search).get("next") || "/";
      router.replace(requested.startsWith("/") && !requested.startsWith("//") ? requested : "/");
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  return <AuthGate guestOnly><main className="auth-page"><Link className="news-logo" href="/">NEWS<span>FLASH</span></Link><section className="auth-card"><p className="eyebrow">Your daily briefing</p><h1>Welcome back</h1><p className="auth-copy">Sign in to explore the latest reporting and topic briefings.</p><form onSubmit={submit}>
    <label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
    <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
    {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
  </form><p className="auth-switch">New here? <Link href="/register">Create an account</Link></p></section></main></AuthGate>;
}
