# NewsFlash

NewsFlash is a topic-clustered news timeline built for the Xponentium India full-stack internship assessment. Python ingests public RSS feeds, extracts article text, groups recent stories, and writes them to MongoDB. An Express API serves the timeline, clusters, and articles. A Next.js interface displays the time-based clusters and lets readers inspect the articles behind each topic.

```text
BBC News / NPR / The Guardian RSS
              |
Python feed parsing, article extraction, and TF-IDF topic grouping
              |
MongoDB Atlas or local MongoDB
              |
Express REST API with JWT sessions
              |
Next.js timeline, cluster explorer, and latest stories
```

## Run locally

Requirements: Python 3.10+, Node.js 20+, and a reachable MongoDB instance.

1. Copy `scraper/.env.example` to `scraper/.env`. Set `MONGODB_URI` and `MONGO_DB_NAME`.
2. Copy `backend/.env.example` to `backend/.env`. Set the same MongoDB URI and database name, plus long random `JWT_SECRET` and `JWT_REFRESH_SECRET` values.
3. Optionally set `GEMINI_API_KEY` in `backend/.env` to enable grounded chat. Keep it private; `.env` is ignored by Git.
4. In `scraper`, install dependencies with `pip install -r requirements.txt`.
5. In `backend`, run `npm install` then `npm run dev`.
6. In `frontend`, run `npm install` then `npm run dev`.
7. Open the printed frontend URL, create an account at `/register`, then use **Refresh data** to run ingestion.

The frontend API defaults to `http://localhost:5000`; set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` if needed. Development CORS allows `localhost` ports 3000 and 3001. In production, set `FRONTEND_ORIGIN` to the exact deployed site origin.

Use the same database name in the scraper and backend. Both examples use `NEWSFLASH`; if the name is omitted, the code defaults to `newspulse`. Atlas project names are separate from MongoDB database names. The URI can omit a database path when the explicit database name is configured in both services. In your current setup, `MONGO_DB_NAME=NEWSFLASH` in both `.env` files selects the right database already, so adding `/NEWSFLASH` to the URI is not required.

## Authentication

`/register` and `/login` create or verify accounts. Passwords are hashed with bcrypt. The API issues a short-lived access JWT and stores a seven-day refresh JWT in an httpOnly cookie. The browser restores sessions from that cookie and redirects protected pages to `/login` when no valid session exists. Local bootstrap users are optional, created only when both bootstrap environment variables are explicitly set, and are never reset on restart. Production requires both JWT secrets.

## News ingestion and grouping

The scraper reads BBC News, NPR, and The Guardian public RSS feeds. It normalizes feed source names and dates, fetches article pages where possible, reads image metadata from RSS, and skips duplicate URLs. Failed article extraction falls back to the RSS title and summary so one malformed page does not stop the run.

Grouping uses TF-IDF word and two-word phrase vectors over a weighted headline plus summary. A pair can join a cluster when its cosine similarity is at least 0.38 with one meaningful shared headline word, or at least 0.22 with two shared headline words; DBSCAN uses `eps=0.78` and `min_samples=2`. Each refresh regroups up to 600 articles from the latest 30 days so that new items can join stories stored by earlier runs. Cluster labels use the highest-scoring terms. Articles not similar enough to another headline remain single-story topics.

Limitation: this is lexical matching, so articles about the same event with very different wording can stay in separate clusters. Shared headline words can also occasionally connect stories that are related by a person or place but describe different events. The method favors avoiding broad, misleading clusters.

## API

- `GET /health`
- `GET /articles?q=optional-search` - up to 120 stories from the latest 30 days, newest first
- `GET /clusters`, `GET /clusters/:id`, `GET /timeline`
- `POST /ingest/trigger`, `GET /ingest/status/:jobId` - require a bearer access token
- `POST /chat` - requires a bearer token and `GEMINI_API_KEY`; retrieves recent matching stories and returns source links
- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`

## Interface features

- Responsive newsroom layout with light/dark mode, English/Hindi/Marathi labels, live clock, and collapsible sidebar.
- The home page centers the required timeline visualization and cluster detail view. Source and date filters apply to the timeline and latest story grid.
- The backend starts the Python pipeline on startup and schedules another run every five minutes while the service is awake. Manual refresh requests an immediate run and polls its job status; the page reloads the timeline when it finishes. Render's free service may sleep when idle, pausing the in-process schedule until the next start.
- Article details include the source link and browser speech read-aloud.
- The Live hub includes RSS news, clearly marked demo sports fixtures, and illustrative job-market numbers. Replace mock data with a real source before presenting the figures as live.
- The Gemini chat UI was removed because the provider was unreliable. A legacy backend chat route remains in the API source but is not linked from the frontend.
- Weather uses Open-Meteo for a user-selected city; no precise location is collected.

## Assessment delivery

The assessment also requires a deployed frontend URL, backend URL, and a 2-3 minute walkthrough video. Those need hosting accounts and a video link; configure environment secrets on the hosting platforms rather than committing them to this repository.
