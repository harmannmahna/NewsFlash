from datetime import datetime
from typing import Optional, TypedDict

class Article(TypedDict):
    title: str
    summary: str
    body: str
    link: str
    source: str
    published_at: datetime
    content_hash: str
    cluster_id: Optional[str]


class Cluster(TypedDict):
    label: str
    cluster_id: str
    article_ids: list[object]
    earliest_published_at: datetime
    latest_published_at: datetime
    size: int
