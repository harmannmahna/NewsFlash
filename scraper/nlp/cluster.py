from sklearn.cluster import DBSCAN
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .preprocess import preprocess


def cluster_articles(articles: list[dict]) -> list[dict]:
    if not articles:
        return []
    documents = [preprocess(f"{article['title']} {article.get('summary', '')} {article.get('body', '')}") for article in articles]
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(documents)
    if len(articles) == 1:
        labels = [0]
    else:
        similarities = cosine_similarity(matrix)
        # 0.35 distance keeps articles together when their cosine similarity is >= 0.65.
        distances = (1 - similarities).clip(0, 1)
        labels = DBSCAN(eps=0.35, min_samples=2, metric="precomputed").fit_predict(distances)
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
