"use client";

import { FormEvent, useEffect, useState } from "react";
import { ClusterDetailPanel } from "../components/ClusterDetailPanel";
import { Timeline } from "../components/Timeline";
import { authenticate, getCluster, getJobStatus, getTimeline, refreshAccessToken, triggerIngest } from "../lib/api";
import { Cluster, TimelineCluster } from "../lib/types";

export default function Home() {
  const [clusters, setClusters] = useState<TimelineCluster[]>([]);
  const [selected, setSelected] = useState<Cluster | null>(null);
  const [source, setSource] = useState("all");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState("Loading the latest signal...");
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  const load = async () => { try { setClusters(await getTimeline()); setNotice(""); } catch { setNotice("The API is offline. Start the backend to load live reporting."); } };
  useEffect(() => { load(); }, []);

  const sources = ["all", ...new Set(clusters.map(cluster => cluster.label.split(" - ")[0]))];
  const visible = source === "all" ? clusters : clusters.filter(cluster => cluster.label.includes(source));
  const login = async (event: FormEvent) => { event.preventDefault(); try { const result = await authenticate("/auth/login", credentials.email, credentials.password); setToken(result.accessToken); setNotice("Signed in. Refresh is ready."); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to sign in"); } };
  const refresh = async () => { if (!token) return setNotice("Sign in before triggering a fresh scrape."); try { let activeToken = token; let response; try { response = await triggerIngest(activeToken); } catch (error) { if (!(error instanceof Error) || !error.message.includes("Invalid or expired access token")) throw error; activeToken = (await refreshAccessToken()).accessToken; setToken(activeToken); response = await triggerIngest(activeToken); } const { jobId } = response; setNotice("Scrape running..."); const poll = setInterval(async () => { try { const result = await getJobStatus(jobId, activeToken); if (result.status === "done" || result.status === "failed") { clearInterval(poll); setNotice(result.status === "done" ? "Signal refreshed." : "Scrape failed."); if (result.status === "done") load(); } } catch { clearInterval(poll); setNotice("Unable to read scrape status."); } }, 2000); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to refresh signal"); } };

  return <main><header className="masthead"><div className="brand"><span className="brand-dot" />NEWS PULSE</div><div className="status"><span className="live-dot" />{notice || "Live signal"}</div><button className="refresh" onClick={refresh}>↻ <span>Refresh</span></button></header><section className="intro"><div><p className="eyebrow">Global news intelligence · 24 hour view</p><h1>Find the story<br /><em>beneath</em> the stories.</h1><p className="lede">A living map of what the world is talking about, grouped by the ideas moving through the news cycle.</p></div><form className="login" onSubmit={login}><label>Analyst access</label><input type="email" placeholder="admin@newsflash.local" value={credentials.email} onChange={event => setCredentials({ ...credentials, email: event.target.value })} /><input type="password" placeholder="NewsFlash123!" value={credentials.password} onChange={event => setCredentials({ ...credentials, password: event.target.value })} /><button type="submit">{token ? "Signed in" : "Sign in"}</button></form></section><section className="workspace"><div className="timeline-panel"><div className="section-head"><div><p className="eyebrow">Activity map</p><h2>Topics in motion</h2></div><div className="filters">{sources.slice(0, 4).map(item => <button className={source === item ? "active" : ""} key={item} onClick={() => setSource(item)}>{item}</button>)}</div></div>{visible.length ? <Timeline clusters={visible} onSelect={async cluster => { try { setSelected(await getCluster(cluster.id)); } catch { setNotice("Unable to open that cluster."); } }} /> : <div className="no-data"><strong>No articles yet.</strong><span>Run the scraper to populate the map.</span></div>}</div><ClusterDetailPanel cluster={selected} onClose={() => setSelected(null)} /></section><footer><span>NEWS PULSE / EDITION 01</span><span>Curated from BBC · NPR · The Guardian</span></footer></main>;
}
