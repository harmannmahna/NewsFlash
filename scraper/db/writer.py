import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

from config import MONGO_DB_NAME, MONGO_URI

logger = logging.getLogger(__name__)

client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]
articles_col = db["articles"]
clusters_col = db["clusters"]

try:
    articles_col.create_index("content_hash", unique=True)
    clusters_col.create_index("cluster_id", unique=True)
except Exception:
    logger.exception("Unable to create the unique article content hash index")


def save_article(article: dict) -> Optional[ObjectId]:
    try:
        return articles_col.insert_one(article).inserted_id
    except DuplicateKeyError:
        logger.info("skipped duplicate: %s", article.get("link", ""))
        return None


def article_exists(content_hash: str) -> bool:
    return articles_col.find_one({"content_hash": content_hash}, {"_id": 1}) is not None


def update_article_image(content_hash: str, image_url: Optional[str]) -> None:
    if image_url:
        articles_col.update_one(
            {"content_hash": content_hash, "image_url": {"$exists": False}},
            {"$set": {"image_url": image_url}},
        )


def update_article_source(content_hash: str, source: str) -> None:
    if source:
        articles_col.update_one({"content_hash": content_hash}, {"$set": {"source": source}})


def normalize_article_sources() -> None:
    for host, source in (("theguardian.com", "The Guardian"), ("bbc.co.uk", "BBC News"), ("bbc.com", "BBC News"), ("npr.org", "NPR")):
        articles_col.update_many(
            {"link": {"$regex": rf"^https?://(?:www\.)?{host}/", "$options": "i"}},
            {"$set": {"source": source}},
        )


def save_cluster(cluster: dict) -> ObjectId:
    return clusters_col.insert_one(cluster).inserted_id


def update_article_cluster(article_id: ObjectId, cluster_id: str) -> None:
    articles_col.update_one({"_id": article_id}, {"$set": {"cluster_id": cluster_id}})


def load_articles_for_clustering(days: int = 30, limit: int = 600) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return list(
        articles_col.find(
            {"published_at": {"$gte": cutoff, "$lte": datetime.now(timezone.utc)}},
            {"title": 1, "summary": 1, "published_at": 1, "source": 1},
        )
        .sort("published_at", -1)
        .limit(limit)
    )


def replace_clusters(clusters: list[dict]) -> None:
    """Replace derived cluster records and assignments for the current news window."""
    articles_col.update_many({}, {"$unset": {"cluster_id": ""}})
    clusters_col.delete_many({})
    if clusters:
        clusters_col.insert_many(clusters)
        for cluster in clusters:
            articles_col.update_many(
                {"_id": {"$in": cluster["article_ids"]}},
                {"$set": {"cluster_id": cluster["cluster_id"]}},
            )


def get_latest_published_at(source: str) -> Optional[datetime]:
    article = articles_col.find_one(
        {"source": source},
        sort=[("published_at", -1)],
        projection={"published_at": 1},
    )
    return article.get("published_at") if article else None
