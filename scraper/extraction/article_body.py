import logging

import requests
import trafilatura
from bs4 import BeautifulSoup

from config import REQUEST_TIMEOUT

logger = logging.getLogger(__name__)


def extract_body(url: str) -> str:
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT, headers={"User-Agent": "NewsPulse/1.0"})
        response.raise_for_status()
        body = trafilatura.extract(response.text)
        if body:
            return body
        soup = BeautifulSoup(response.text, "html.parser")
        return " ".join(paragraph.get_text(" ", strip=True) for paragraph in soup.find_all("p"))
    except Exception:
        logger.exception("Failed to extract article: %s", url)
        return ""
