import hashlib
import logging
from datetime import datetime, timezone

import feedparser
import requests
from bs4 import BeautifulSoup
from dateutil import parser as date_parser
from urllib.parse import urlparse

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
        response = requests.get(
            url,
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": "NewsPulse/1.0"},
        )
        response.raise_for_status()
        parsed = feedparser.parse(response.content)
        if parsed.bozo and not parsed.entries:
            raise ValueError(f"Invalid or empty RSS feed: {url}")
        host = urlparse(url).hostname or ""
        if host.endswith("bbc.co.uk") or host.endswith("bbc.com"):
            source = "BBC News"
        elif host.endswith("npr.org"):
            source = "NPR"
        elif host.endswith("theguardian.com"):
            source = "The Guardian"
        else:
            source = parsed.feed.get("title", host).strip()
        articles = []
        for entry in parsed.entries:
            link = entry.get("link")
            if not link:
                continue
            images = entry.get("media_content") or entry.get("media_thumbnail") or []
            image_url = images[0].get("url") if images else None
            if not image_url:
                image_url = next((item.get("href") for item in entry.get("links", []) if item.get("type", "").startswith("image/")), None)
            if not image_url:
                html_summary = entry.get("summary", "")
                image_url = (BeautifulSoup(html_summary, "html.parser").find("img") or {}).get("src")
            articles.append({
                "title": entry.get("title", "Untitled").strip(),
                "summary": entry.get("summary", "").strip(),
                "link": link,
                "image_url": image_url,
                "source": source,
                "published_at": _published(entry),
                "content_hash": hashlib.sha256(link.encode("utf-8")).hexdigest(),
            })
        return articles
    except Exception as error:
        logger.exception("Failed to fetch feed %s: %s", url, error)
        return []
