import logging

import requests
from bs4 import BeautifulSoup

from config import REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

try:
    import trafilatura
except (ImportError, RuntimeError) as error:
    # Trafilatura is optional: some lxml installations no longer bundle the
    # html.clean module it imports. BeautifulSoup remains a working fallback.
    trafilatura = None
    logger.warning("Trafilatura unavailable; using BeautifulSoup extraction: %s", error)


def extract_body(url: str) -> str:
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT, headers={"User-Agent": "NewsPulse/1.0"})
        response.raise_for_status()
        body = trafilatura.extract(response.text) if trafilatura else None
        if body:
            return body
        soup = BeautifulSoup(response.text, "html.parser")
        return " ".join(paragraph.get_text(" ", strip=True) for paragraph in soup.find_all("p"))
    except Exception:
        logger.exception("Failed to extract article: %s", url)
        return ""
