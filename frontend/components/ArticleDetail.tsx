"use client";

import { Article } from "../lib/types";
import { ReadAloudButton } from "./ReadAloudButton";

export function ArticleDetail({ article, onClose }: { article: Article | null; onClose: () => void }) {
  if (!article) return null;
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="article-detail" role="dialog" aria-modal="true" aria-labelledby="article-title">
      <button className="modal-close" onClick={onClose} aria-label="Close article">×</button>
      <div className="card-meta"><span className="source-mark">{article.source.slice(0, 1).toUpperCase()}</span>{article.source}<span className="meta-dot">·</span>{new Date(article.published_at).toLocaleString()}</div>
      <h1 id="article-title">{article.title}</h1>
      {article.image_url && <img className="article-hero" src={article.image_url} alt="" />}
      <p className="article-summary">{article.summary.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")}</p>
      <ReadAloudButton text={`${article.title}. ${article.summary}. ${article.body || ""}`} />
      <div className="article-full-text">{article.body || "The source did not provide extractable full text. Open the original story to read it."}</div>
      <a className="original-link" href={article.link} target="_blank" rel="noreferrer">Continue at {article.source} ↗</a>
    </article>
  </div>;
}
