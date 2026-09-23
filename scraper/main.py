import logging
from uuid import uuid4

from config import FEED_URLS
from db.writer import get_latest_published_at, save_article, save_cluster, update_article_cluster
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
            latest_by_source = {}
            for article in fetched:
                latest = latest_by_source.setdefault(article["source"], get_latest_published_at(article["source"]))
                if article["content_hash"] in seen_hashes or (latest and article["published_at"] <= latest):
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

    formed = 0
    for cluster_data in cluster_articles(new_articles):
        article_ids = [article["_id"] for article in cluster_data["articles"]]
        cluster_id = str(uuid4())
        save_cluster({
            "cluster_id": cluster_id,
            "label": cluster_data["label"],
            "article_ids": article_ids,
            "earliest_published_at": cluster_data["earliest_published_at"],
            "latest_published_at": cluster_data["latest_published_at"],
            "size": cluster_data["size"],
        })
        for article_id in article_ids:
            update_article_cluster(article_id, cluster_id)
        formed += 1

    logger.info("Inserted %s new articles, formed %s clusters", len(new_articles), formed)
    return len(new_articles), formed


if __name__ == "__main__":
    run()
