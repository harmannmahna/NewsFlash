# News Pulse

News Pulse is a three-part news intelligence app: a Python RSS and NLP ingestion pipeline, an Express/MongoDB API, and a Next.js timeline interface.

```text
RSS feeds -> normalized articles -> full-text extraction -> TF-IDF + DBSCAN
                                                        |
                                     MongoDB <- clusters <- Express API <- Next.js
```

## Run locally

1. Install MongoDB locally, or create a MongoDB Atlas deployment and copy its connection string.
2. Install scraper dependencies: `cd scraper; pip install -r requirements.txt`.
3. Set `MONGODB_URI` and `MONGODB_DATABASE` in the scraper environment and run `python main.py`.
4. Install API dependencies: `cd ../backend; npm install`, copy `.env.example` to `.env`, then run `npm run dev`.
5. Install frontend dependencies: `cd ../frontend; npm install`, copy `.env.local.example` to `.env.local`, then run `npm run dev`.

Open `http://localhost:3000`. Public timeline and cluster reads remain available without auth. Register or sign in to enable the authenticated refresh action. Refresh tokens live in an httpOnly cookie while access tokens stay in memory in the browser.

## Clustering

The scraper preprocesses titles, summaries, and extracted bodies, then uses TF-IDF with unigram and bigram features. DBSCAN clusters a precomputed cosine-distance matrix at `eps=0.35`, meaning articles with cosine similarity around 0.65 or higher can join the same topic. The threshold is intentionally conservative; a known limitation is that short or unusually worded coverage can be left as a single-item cluster.

## Deployment

The frontend can run on Vercel, the API on Render or Railway, and the scraper on GitHub Actions using the included 30-minute workflow. Set `MONGODB_URI`, `MONGODB_DATABASE`, JWT secrets, and the frontend API URL in the target platform. MongoDB Atlas is recommended for a hosted database; no Docker or local database container is required.
