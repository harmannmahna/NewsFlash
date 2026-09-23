import re

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

try:
    STOP_WORDS = set(stopwords.words("english"))
except LookupError:
    STOP_WORDS = set("a an and are as at be by for from has he in is it its of on or that the to was were will with".split())

try:
    LEMMATIZER = WordNetLemmatizer()
except Exception:
    LEMMATIZER = None


def preprocess(text: str) -> str:
    tokens = re.findall(r"[a-z]+", text.lower())
    cleaned = [token for token in tokens if token not in STOP_WORDS and len(token) > 2]
    if LEMMATIZER:
        try:
            return " ".join(LEMMATIZER.lemmatize(token) for token in cleaned)
        except LookupError:
            pass
    return " ".join(cleaned)
