import logging
from datetime import datetime
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


def save_cluster(cluster: dict) -> ObjectId:
    return clusters_col.insert_one(cluster).inserted_id


def update_article_cluster(article_id: ObjectId, cluster_id: str) -> None:
    articles_col.update_one({"_id": article_id}, {"$set": {"cluster_id": cluster_id}})


def get_latest_published_at(source: str) -> Optional[datetime]:
    article = articles_col.find_one(
        {"source": source},
        sort=[("published_at", -1)],
        projection={"published_at": 1},
    )
    return article.get("published_at") if article else None
