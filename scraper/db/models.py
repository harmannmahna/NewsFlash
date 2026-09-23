from datetime import datetime
from typing import Optional, TypedDict

from bson import ObjectId


class Article(TypedDict):
    title: str
    summary: str
    body: str
    link: str
    source: str
    published_at: datetime
    content_hash: str
    cluster_id: Optional[ObjectId]


class Cluster(TypedDict):
    label: str
    article_ids: list[ObjectId]
    earliest_published_at: datetime
    latest_published_at: datetime
    size: int
