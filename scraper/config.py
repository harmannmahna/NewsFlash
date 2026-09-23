import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "newspulse")
FEED_URLS = [
    value.strip()
    for value in os.getenv(
        "FEED_URLS",
        "http://feeds.bbci.co.uk/news/rss.xml,https://feeds.npr.org/1001/rss.xml,https://www.theguardian.com/world/rss",
    ).split(",")
    if value.strip()
]
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "15"))
