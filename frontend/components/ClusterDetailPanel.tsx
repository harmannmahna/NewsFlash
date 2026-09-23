"use client";

import { Cluster } from "../lib/types";

export function ClusterDetailPanel({ cluster, onClose }: { cluster: Cluster | null; onClose: () => void }) {
  if (!cluster) return <aside className="detail empty-detail"><span className="detail-mark">+</span><p>Select a story cluster to inspect its reporting trail.</p></aside>;
  return <aside className="detail"><button className="close" onClick={onClose} aria-label="Close details">×</button><p className="eyebrow">Cluster dossier</p><h2>{cluster.label}</h2><p className="range">{new Date(cluster.earliest).toLocaleString()} — {new Date(cluster.latest).toLocaleString()}</p><div className="article-list">{cluster.articles.map(article => <a className="article" key={article.id} href={article.link} target="_blank" rel="noreferrer"><span className="source">{article.source}</span><strong>{article.title}</strong><small>{new Date(article.published_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></a>)}</div></aside>;
}
