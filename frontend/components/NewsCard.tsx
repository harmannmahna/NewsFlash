import { Article } from "../lib/types";
import { categoryFor } from "../lib/topics";

export function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
}

export function NewsCard({ article, onOpen }: { article: Article; onOpen: (article: Article) => void }) {
  const recent = Date.now() - new Date(article.published_at).getTime() <= 15 * 60 * 1000;
  return <article className="news-card">
    <div className="news-card-art" aria-hidden="true">{article.image_url ? <img src={article.image_url} alt="" loading="lazy" /> : <span>{categoryFor(`${article.title} ${article.summary}`).slice(0, 1)}</span>}{recent && <span className="live-badge"><i />LIVE</span>}</div>
    <div className="news-card-body">
      <div className="card-meta"><span className="source-mark">{article.source.slice(0, 1).toUpperCase()}</span><span>{article.source}</span><span className="meta-dot">·</span><span>{relativeTime(article.published_at)}</span></div>
      <span className="category-tag">{categoryFor(`${article.title} ${article.summary}`)}</span>
      <h2>{article.title}</h2>
      <p>{article.summary.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 190)}{article.summary.length > 190 ? "…" : ""}</p>
      <button className="read-more" onClick={() => onOpen(article)}>Read more <span>→</span></button>
    </div>
  </article>;
}
