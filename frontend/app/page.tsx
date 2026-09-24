"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../components/AppShell";
import { ArticleDetail } from "../components/ArticleDetail";
import { AuthGate } from "../components/AuthGate";
import { ClusterDetailPanel } from "../components/ClusterDetailPanel";
import { NewsCard } from "../components/NewsCard";
import { Timeline } from "../components/Timeline";
import { useAuth } from "../context/AuthContext";
import { copy, useSettings } from "../context/SettingsContext";
import { getArticles, getCluster, getJobStatus, getTimeline, refreshAccessToken, triggerIngest } from "../lib/api";
import { Article, Cluster, TimelineCluster } from "../lib/types";
import { categoryFor, topicCategories } from "../lib/topics";

export default function Home() {
  const { token } = useAuth();
  const { language } = useSettings();
  const t = copy[language];
  const [articles, setArticles] = useState<Article[]>([]);
  const [clusters, setClusters] = useState<TimelineCluster[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [category, setCategory] = useState("All topics");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [source, setSource] = useState("All sources");
  const [range, setRange] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const clusterPanelRef = useRef<HTMLElement | null>(null);
  const shouldScrollToCluster = useRef(false);
  const articlesRef = useRef(articles);
  articlesRef.current = articles;

  const load = useCallback(async (search = "", quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [nextArticles, nextClusters] = await Promise.all([getArticles(search), getTimeline()]);
      const known = new Set(articlesRef.current.map(article => article.id));
      const freshCount = nextArticles.filter(article => !known.has(article.id)).length;
      if (quiet && freshCount && window.scrollY > 180) setPendingCount(freshCount);
      else setArticles(nextArticles);
      setClusters(nextClusters);
      setUpdatedAt(new Date());
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load the news feed.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") || "");
    setCategory(params.get("category") || "All topics");
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(query), 280); return () => window.clearTimeout(timer); }, [load, query]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(query, true); }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [load, query]);
  useEffect(() => {
    if (!selectedCluster || !shouldScrollToCluster.current) return;
    shouldScrollToCluster.current = false;
    window.requestAnimationFrame(() => clusterPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [selectedCluster]);

  const sources = useMemo(() => [...new Set(articles.map(article => article.source))].sort(), [articles]);
  const visibleClusters = useMemo(() => {
    const since = range === "24h" ? Date.now() - 86400000 : range === "7d" ? Date.now() - 7 * 86400000 : range === "30d" ? Date.now() - 30 * 86400000 : 0;
    return clusters.filter(cluster =>
      (source === "All sources" || cluster.sources.includes(source)) &&
      new Date(cluster.end).getTime() >= since &&
      (category === "All topics" || categoryFor(cluster.label) === category) &&
      (!preferences.length || preferences.includes(categoryFor(cluster.label)))
    ).sort((left, right) => new Date(right.end).getTime() - new Date(left.end).getTime()).slice(0, 40);
  }, [clusters, source, range, preferences, category]);
  const filtered = useMemo(() => {
    const since = range === "24h" ? Date.now() - 86400000 : range === "7d" ? Date.now() - 7 * 86400000 : range === "30d" ? Date.now() - 30 * 86400000 : 0;
    return articles.filter(article =>
      (category === "All topics" || categoryFor(`${article.title} ${article.summary}`) === category) &&
      (!preferences.length || preferences.includes(categoryFor(`${article.title} ${article.summary}`))) &&
      (source === "All sources" || article.source === source) &&
      new Date(article.published_at).getTime() >= since
    );
  }, [articles, category, preferences, source, range]);

  async function refresh() {
    setRefreshing(true); setNotice("Checking live news feeds...");
    try {
      let activeToken = token;
      if (!activeToken) activeToken = (await refreshAccessToken()).accessToken;
      let trigger: { jobId: string };
      try { trigger = await triggerIngest(activeToken); }
      catch (error) {
        if (!(error instanceof Error) || !/expired|authentication required/i.test(error.message)) throw error;
        activeToken = (await refreshAccessToken()).accessToken;
        trigger = await triggerIngest(activeToken);
      }
      const { jobId } = trigger;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 2000));
        const status = await getJobStatus(jobId, activeToken);
        if (status.status === "done") { await load(query); setNotice("News updated."); return; }
        if (status.status === "failed") throw new Error(status.error || "The news update failed.");
      }
      throw new Error("News update is taking longer than expected.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not refresh the news feed."); }
    finally { setRefreshing(false); }
  }

  async function selectCluster(cluster: TimelineCluster) {
    shouldScrollToCluster.current = true;
    setSelectedCluster(null);
    setNotice("");
    try {
      setSelectedCluster(await getCluster(cluster.id));
      return;
    } catch (error) {
      const missingCluster = error instanceof Error && /cluster not found/i.test(error.message);
      if (!missingCluster) {
        shouldScrollToCluster.current = false;
        setNotice(error instanceof Error ? error.message : "Could not load this topic.");
        return;
      }
    }

    // A scheduled scraper run can replace topic IDs while this tab still has
    // an older timeline. Refresh it and transparently retry the matching row.
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 250));
        const latest = await getTimeline();
        setClusters(latest);
        const sameLabel = latest.find(item => item.label === cluster.label);
        const selectedStart = new Date(cluster.start).getTime();
        const selectedEnd = new Date(cluster.end).getTime();
        const closestRelated = latest
          .filter(item => {
            const terms = new Set(cluster.label.toLowerCase().split(/\W+/).filter(Boolean));
            const sharedTerms = item.label.toLowerCase().split(/\W+/).filter(term => terms.has(term));
            const starts = new Date(item.start).getTime();
            const ends = new Date(item.end).getTime();
            const overlaps = Math.max(0, Math.min(selectedEnd, ends) - Math.max(selectedStart, starts));
            const windowDistance = Math.max(0, Math.max(selectedStart - ends, starts - selectedEnd));
            return sharedTerms.length > 0 && (overlaps > 0 || windowDistance <= 30 * 60 * 1000);
          })
          .sort((left, right) => Math.abs(new Date(left.end).getTime() - selectedEnd) - Math.abs(new Date(right.end).getTime() - selectedEnd))[0];
        const replacement = sameLabel || closestRelated;
        if (!replacement) continue;
        try {
          setSelectedCluster(await getCluster(replacement.id));
          return;
        } catch (retryError) {
          if (!(retryError instanceof Error) || !/cluster not found/i.test(retryError.message)) throw retryError;
        }
      }
      shouldScrollToCluster.current = false;
      setNotice("The topic list changed during an update. It has been refreshed; please select the topic again.");
    } catch (retryError) {
      shouldScrollToCluster.current = false;
      setNotice(retryError instanceof Error ? retryError.message : "Could not reload the updated topics.");
    }
  }
  function submitSearch(event: FormEvent) { event.preventDefault(); void load(query); }

  const chooseCategory = (next: string) => { setCategory(next); setPreferences([]); };
  const togglePreference = (value: string) => { setCategory("All topics"); setPreferences(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]); };

  return <AuthGate><AppShell active="news" category={category} onCategoryChange={chooseCategory} preferences={preferences} onTogglePreference={togglePreference} search={query} onSearchChange={setQuery} onSearch={submitSearch}>
    <section className="feed-heading"><div><p className="eyebrow">Live reporting, grouped by topic</p><h1>News timeline</h1><p>See when a story gathered coverage across BBC News, NPR and The Guardian.</p></div><button className="primary-button refresh-feed" onClick={refresh} disabled={refreshing}>{refreshing ? "Updating..." : "Refresh data"}</button></section>
    {notice && <div className="notice-bar" role="status">{notice}</div>}
    <div className="feed-toolbar"><div className="topic-tabs" aria-label="Filter stories by topic"><button className={category === "All topics" && preferences.length === 0 ? "active" : ""} onClick={() => chooseCategory("All topics")}>All topics</button>{topicCategories.map(item => <button key={item} className={category === item ? "active" : ""} onClick={() => chooseCategory(item)}>{item}</button>)}</div>
      <div className="feed-selectors"><label>Source <select value={source} onChange={event => setSource(event.target.value)}><option>All sources</option>{sources.map(item => <option key={item}>{item}</option>)}</select></label><label>Date <select value={range} onChange={event => setRange(event.target.value)}><option value="all">Any time</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></label></div>
    </div>
    {pendingCount > 0 && <button className="new-articles-toast" onClick={() => { setPendingCount(0); void load(query); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{pendingCount} new {pendingCount === 1 ? "article" : "articles"} available - tap to refresh</button>}
    <div className="timeline-summary"><div><p className="eyebrow">Coverage across time</p><h2>Topics in motion</h2><p>Each marker spans the first and latest article in a cluster. Select one to follow its coverage.</p></div><div className="timeline-count"><strong>{visibleClusters.length}</strong><span>recent topics</span><small>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</small></div></div>
    <div className="timeline-layout">{loading ? <div className="feed-state"><span className="loader" />Loading the topic timeline...</div> : visibleClusters.length ? <Timeline clusters={visibleClusters} onSelect={selectCluster} /> : <div className="feed-state"><strong>{notice ? "News timeline unavailable" : "No topics match these filters"}</strong><span>{notice || "Choose another source or date range."}</span></div>}<ClusterDetailPanel cluster={selectedCluster} onClose={() => setSelectedCluster(null)} panelRef={clusterPanelRef} /></div>
    <section className="latest-section"><div className="timeline-summary"><div><p className="eyebrow">The latest reporting</p><h2>{t.latest}</h2></div><span>{filtered.length} stories</span></div>{filtered.length ? <div className="news-grid">{filtered.map(article => <NewsCard key={article.id} article={article} onOpen={setSelected} />)}</div> : !loading ? <p className="feed-state">No stories match the selected filters.</p> : null}</section>
    <ArticleDetail article={selected} onClose={() => setSelected(null)} />
  </AppShell></AuthGate>;
}
