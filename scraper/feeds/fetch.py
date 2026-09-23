import hashlib
import logging
from datetime import datetime, timezone

import feedparser
from dateutil import parser as date_parser

from config import REQUEST_TIMEOUT

logger = logging.getLogger(__name__)


def _published(entry) -> datetime:
    value = entry.get("published") or entry.get("updated")
    if not value:
        return datetime.now(timezone.utc)
    parsed = date_parser.parse(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def fetch_feed(url: str) -> list[dict]:
    try:
        parsed = feedparser.parse(url, request_headers={"User-Agent": "NewsPulse/1.0"})
        source = parsed.feed.get("title", url).split()[0].lower()
        articles = []
        for entry in parsed.entries:
            link = entry.get("link")
            if not link:
                continue
            articles.append({
                "title": entry.get("title", "Untitled").strip(),
                "summary": entry.get("summary", "").strip(),
                "link": link,
                "source": source,
                "published_at": _published(entry),
                "content_hash": hashlib.sha256(link.encode("utf-8")).hexdigest(),
            })
        return articles
    except Exception:
        logger.exception("Failed to fetch feed: %s", url)
        return []
