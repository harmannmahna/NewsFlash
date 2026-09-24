from sklearn.cluster import DBSCAN
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .preprocess import preprocess


def cluster_articles(articles: list[dict]) -> list[dict]:
    if not articles:
        return []
    # Headlines carry the strongest signal. Long article bodies often contain
    # navigation, unrelated links, and publisher boilerplate that dilute it.
    documents = [preprocess(f"{article.get('title', '')} {article.get('title', '')} {article.get('summary', '')}") for article in articles]
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(documents)
    if len(articles) == 1:
        labels = [0]
    else:
        similarities = cosine_similarity(matrix)
        # RSS summaries are long and source-specific, so require an article
        # similarity floor plus shared headline terms. A strong overall match
        # can use one shared headline term; weaker matches need at least two.
        title_terms = [set(preprocess(article.get("title", "")).split()) for article in articles]
        distances = (1 - similarities).clip(0, 1)
        for left in range(len(articles)):
            for right in range(left + 1, len(articles)):
                overlap = len(title_terms[left] & title_terms[right])
                similarity = similarities[left, right]
                if not ((similarity >= 0.38 and overlap >= 1) or (similarity >= 0.22 and overlap >= 2)):
                    distances[left, right] = distances[right, left] = 1.0
        labels = DBSCAN(eps=0.78, min_samples=2, metric="precomputed").fit_predict(distances)
        labels = [label if label >= 0 else index + max(labels, default=-1) + 1 for index, label in enumerate(labels)]

    terms = vectorizer.get_feature_names_out()
    clusters = []
    for cluster_id in sorted(set(labels)):
        member_indexes = [index for index, label in enumerate(labels) if label == cluster_id]
        scores = matrix[member_indexes].mean(axis=0).A1
        top_terms = [terms[index] for index in scores.argsort()[::-1][:3]]
        members = [articles[index] for index in member_indexes]
        clusters.append({
            "cluster_id": cluster_id,
            "label": " - ".join(top_terms) or "general news",
            "articles": members,
            "earliest_published_at": min(article["published_at"] for article in members),
            "latest_published_at": max(article["published_at"] for article in members),
            "size": len(members),
        })
    return clusters
# RSS summaries are long and source-specific, so require an article
# similarity floor plus shared headline terms. A strong overall match
# can use one shared headline term; weaker matches need at least two.