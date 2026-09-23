"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { ArticleDetail } from "../../components/ArticleDetail";
import { AuthGate } from "../../components/AuthGate";
import { JobMarketPanel } from "../../components/JobMarketPanel";
import { LiveBadge } from "../../components/LiveBadge";
import { LiveSportsPanel } from "../../components/LiveSportsPanel";
import { NewsCard } from "../../components/NewsCard";
import { getArticles } from "../../lib/api";
import { Article } from "../../lib/types";

type Tab = "news" | "sports" | "jobs";
export default function LivePage() {
  const [tab, setTab] = useState<Tab>("news");
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [sport, setSport] = useState("All sports");
  const load = useCallback(() => void getArticles().then(setArticles).catch(() => setArticles([])), []);
  useEffect(() => { load(); const timer = window.setInterval(load, 60000); return () => window.clearInterval(timer); }, [load]);
  const visibleArticles = articles.slice(0, 12);

  return <AuthGate><AppShell active="live"><div className="page-title-row"><div><p className="eyebrow">LIVE NEWS DESK</p><h1>Live hub <LiveBadge /></h1><p>Breaking coverage, live scores and market snapshots.</p></div></div>
    <div className="live-tabs" role="tablist"><button role="tab" aria-selected={tab === "news"} className={tab === "news" ? "active" : ""} onClick={() => setTab("news")}>Live news <LiveBadge /></button><button role="tab" aria-selected={tab === "sports"} className={tab === "sports" ? "active" : ""} onClick={() => setTab("sports")}>Live sports <LiveBadge /></button><button role="tab" aria-selected={tab === "jobs"} className={tab === "jobs" ? "active" : ""} onClick={() => setTab("jobs")}>Job market <LiveBadge /></button></div>
    {tab === "news" && <section className="live-news-view"><div className="panel-heading"><h2>Latest from the wires</h2><span className="update-note">Auto-refreshes every minute</span></div><div className="news-grid">{visibleArticles.map(article => <NewsCard key={article.id} article={article} onOpen={setSelected} />)}</div>{!visibleArticles.length && <p className="feed-state">No news is available yet. Try refreshing the main feed.</p>}</section>}
    {tab === "sports" && <section><label className="sport-select">Sport <select value={sport} onChange={event => setSport(event.target.value)}><option>All sports</option><option>Cricket</option><option>Football</option><option>Tennis</option></select></label><LiveSportsPanel sport={sport} /></section>}
    {tab === "jobs" && <JobMarketPanel />}
    <ArticleDetail article={selected} onClose={() => setSelected(null)} />
  </AppShell></AuthGate>;
}
