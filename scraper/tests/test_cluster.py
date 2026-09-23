from datetime import datetime, timezone
import unittest

from nlp.cluster import cluster_articles


class ClusterTests(unittest.TestCase):
    def test_related_articles_cluster_together(self):
        articles = [
            {"title": "Senate passes climate bill vote", "summary": "Senate advances climate policy vote", "body": "", "published_at": datetime.now(timezone.utc), "content_hash": "1", "link": "1", "source": "test"},
            {"title": "Senate approves climate bill vote", "summary": "Senate advances climate policy bill", "body": "", "published_at": datetime.now(timezone.utc), "content_hash": "2", "link": "2", "source": "test"},
        ]
        clusters = cluster_articles(articles)
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["size"], 2)
