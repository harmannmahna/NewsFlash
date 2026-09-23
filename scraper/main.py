import logging
from uuid import uuid4

from config import FEED_URLS
from db.writer import article_exists, load_articles_for_clustering, normalize_article_sources, replace_clusters, save_article, update_article_image, update_article_source
from extraction.article_body import extract_body
from feeds.fetch import fetch_feed
from nlp.cluster import cluster_articles

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def run() -> tuple[int, int]:
    new_articles = []
    seen_hashes = set()

    for url in FEED_URLS:
        try:
            fetched = fetch_feed(url)
            for article in fetched:
                if article["content_hash"] in seen_hashes:
                    continue
                if article_exists(article["content_hash"]):
                    update_article_image(article["content_hash"], article.get("image_url"))
                    update_article_source(article["content_hash"], article["source"])
                    seen_hashes.add(article["content_hash"])
                    continue
                article["body"] = extract_body(article["link"])
                article["cluster_id"] = None
                article_id = save_article(article)
                if article_id is not None:
                    article["_id"] = article_id
                    seen_hashes.add(article["content_hash"])
                    new_articles.append(article)
        except Exception:
            logger.exception("Failed to process feed: %s", url)

    # Re-cluster the complete recent window after each ingest. Grouping only
    # this run's new feed entries prevented stories from different refreshes
    # and sources from ever meeting in the same topic cluster.
    normalize_article_sources()
    grouped_articles = load_articles_for_clustering()
    cluster_documents = []
    for cluster_data in cluster_articles(grouped_articles):
        article_ids = [article["_id"] for article in cluster_data["articles"]]
        cluster_id = str(uuid4())
        cluster_documents.append({
            "cluster_id": cluster_id,
            "label": cluster_data["label"],
            "article_ids": article_ids,
            "earliest_published_at": cluster_data["earliest_published_at"],
            "latest_published_at": cluster_data["latest_published_at"],
            "size": cluster_data["size"],
        })
    replace_clusters(cluster_documents)

    logger.info("Inserted %s new articles, grouped %s recent articles into %s topics", len(new_articles), len(grouped_articles), len(cluster_documents))
    return len(new_articles), len(cluster_documents)


if __name__ == "__main__":
    run()
