"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "../../components/AuthGate";
import { useAuth } from "../../context/AuthContext";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    setBusy(true);
    try { await signUp(email, password); router.replace("/"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create your account."); }
    finally { setBusy(false); }
  }

  return <AuthGate guestOnly><main className="auth-page"><Link className="news-logo" href="/">NEWS<span>FLASH</span></Link><section className="auth-card"><p className="eyebrow">Independent news desk</p><h1>Create your account</h1><p className="auth-copy">One account gives you access to live updates and personalized topic filters.</p><form onSubmit={submit}>
    <label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
    <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} required />
    <label htmlFor="confirmation">Confirm password</label><input id="confirmation" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} required />
    {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
  </form><p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></section></main></AuthGate>;
}
