"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { useAuth } from "../../context/AuthContext";
import { sendChat } from "../../lib/api";

type Message = { role: "user" | "assistant"; content: string; sources?: { title: string; source: string; link: string }[] };
export default function ChatPage() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); const message = input.trim(); if (!message || busy) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages(current => [...current, { role: "user", content: message }]); setInput(""); setBusy(true); setError("");
    try { const result = await sendChat(message, history, token); setMessages(current => [...current, { role: "assistant", content: result.answer, sources: result.sources }]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "News chat is unavailable."); }
    finally { setBusy(false); }
  }

  return <AuthGate><AppShell active="chat"><div className="page-title-row"><div><p className="eyebrow">YOUR NEWS RESEARCH ASSISTANT</p><h1>Ask the news</h1><p>Answers are grounded in recent NewsFlash articles and link back to sources.</p></div></div>
    <section className="chat-panel"><div className="chat-messages">{!messages.length && <div className="chat-welcome"><span>✳</span><h2>What’s happening?</h2><p>Ask about a topic in today’s reporting. I’ll search the NewsFlash feed and cite relevant stories.</p><div className="prompt-chips"><button onClick={() => setInput("What are the top technology stories?")}>Top technology stories</button><button onClick={() => setInput("Summarize the latest climate news")}>Latest climate coverage</button></div></div>}
      {messages.map((message, index) => <article key={`${message.role}-${index}`} className={`chat-message ${message.role}`}><span className="chat-role">{message.role === "user" ? "YOU" : "NEWSFLASH AI"}</span><p>{message.content}</p>{message.sources?.length ? <div className="chat-sources"><strong>Sources</strong>{message.sources.map(source => <a href={source.link} key={source.link} target="_blank" rel="noreferrer">{source.source}: {source.title} ↗</a>)}</div> : null}</article>)}
      {busy && <p className="chat-thinking">Searching recent articles…</p>}{error && <div className="notice-bar" role="alert">{error}</div>}
    </div><form className="chat-compose" onSubmit={submit}><textarea value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about the latest news…" maxLength={1200} rows={2} /><button className="primary-button" disabled={busy || !input.trim()}>{busy ? "Thinking…" : "Send ↑"}</button></form><p className="mock-note">Answers use recent NewsFlash articles and include links to the reporting.</p></section>
  </AppShell></AuthGate>;
}
