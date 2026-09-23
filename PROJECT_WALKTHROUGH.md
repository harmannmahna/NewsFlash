# NewsFlash: Beginner Project Walkthrough

This guide explains the project from the first browser request through RSS ingestion, MongoDB storage, clustering, and display. It is written for someone seeing the codebase for the first time.

## 1. What the app does

NewsFlash is a news reader that collects public RSS items from BBC News, NPR, and The Guardian, stores article records in MongoDB, groups similar headlines into topic clusters, and presents those clusters as a timeline. Readers can filter by category, source, and date, then open the underlying source article.

It is not a streaming news service. The backend starts a scraper run at startup and schedules another every five minutes while awake. Pressing **Refresh data** still requests an immediate run. The page periodically re-reads MongoDB so it can display newly ingested stories.

## 2. The whole system at a glance

```text
Person in browser
  -> Next.js frontend (React + TypeScript)
  -> Express API (Node.js)
  -> MongoDB Atlas

Press Refresh data
  -> Express starts Python scraper as a child process
  -> RSS feeds -> article pages -> text processing -> topic grouping
  -> scraper writes articles and clusters to MongoDB
  -> frontend polls the job status, then reloads the timeline
```

The frontend, backend, scraper, and database are separate pieces. The frontend does not connect to MongoDB directly. The Python scraper does not serve webpages. The Express API is the bridge between the browser and the database, and it starts the scraper when an authenticated user requests an update.

## 3. Technology stack in plain language

| Technology | Where | What it does here |
|---|---|---|
| Next.js 15, React 19, TypeScript | `frontend/` | Builds the pages and interactive browser UI. Next.js uses React components; TypeScript checks the shape of data and function calls before runtime. |
| CSS | `frontend/app/globals.css` | Styles the newsroom layout, cards, timeline, responsive screens, and light/dark themes. |
| Node.js + Express | `backend/` | Runs the REST API: URL endpoints the frontend calls to read articles, sign in, and trigger ingestion. |
| MongoDB Atlas + MongoDB Node driver | Backend and scraper | Stores users, articles, and derived topic clusters in a cloud database. |
| Python | `scraper/` | Reads feeds, extracts story text, cleans text, groups related stories, and saves results. |
| RSS + `feedparser` | `scraper/feeds/` | Reads the publishers' public feeds. RSS supplies titles, summaries, timestamps, links, and sometimes images. |
| Requests + BeautifulSoup + Trafilatura | `scraper/` | Downloads feed/article pages and extracts readable article text. BeautifulSoup is also the fallback extractor. |
| NLTK | `scraper/nlp/preprocess.py` | Removes common English words and attempts to reduce words to their base form. |
| scikit-learn | `scraper/nlp/cluster.py` | Turns article text into TF-IDF vectors and groups similar stories with cosine similarity and DBSCAN. |
| JWT + bcrypt | `backend/src/services/`, auth routes | Hashes passwords and gives signed tokens to authenticated users. |
| Render + Vercel (as configured) | Deployment | Render hosts the backend and, depending on the service, a frontend; Vercel has also been used for a frontend deployment. Set frontend origins to the exact site URL. |

## 4. The refresh button, step by step

The main refresh flow is in `frontend/app/page.tsx`:

1. The browser gets the user's short-lived access token from `AuthContext`.
2. It sends `POST /ingest/trigger` to the backend with `Authorization: Bearer <token>`.
3. `backend/src/app.js` checks the token with `requireAuth`, then calls `startIngestJob()`.
4. `backend/src/services/ingestJob.service.js` starts `scraper/main.py` in a separate Python process. The Node API stays available while that process runs.
5. The scraper reads RSS feeds, downloads any new article pages, saves new articles, clusters the recent article window, and writes the new cluster assignments. The backend also launches scheduled runs at startup and every five minutes while it remains awake.
6. The frontend asks `GET /ingest/status/:jobId` about every two seconds.
7. When the response says `done`, the frontend calls `GET /articles` and `GET /timeline` again and redraws the page. If the response says `failed`, the error is shown in the notice area.

The manual-refresh polling code allows 90 checks separated by two seconds: about three minutes. In Chrome DevTools, an `OPTIONS 204` request is normally the browser's CORS preflight before a cross-site request; it is not the scraper doing another run. A long update is the job itself taking time, not necessarily the page redeploying. A backend single-job guard reuses the active job ID so a scheduled run and manual click do not start duplicate scraper processes.

Why a scraper run takes time:

- It contacts three external publishers' feeds.
- For each previously unseen item, it also tries to download the article page. The HTTP timeout is 15 seconds (`scraper/config.py`). A publisher can be slow or block a request.
- It re-groups up to 600 articles from the last 30 days, not just the newly fetched articles.
- It then rewrites the derived clusters and article-to-cluster links in MongoDB.
- The first full run can do more work than later runs; later runs skip duplicates.

Avoid pressing **Refresh data** repeatedly while one run is active. The current status map is held in the Node process's memory (`ingestJob.service.js`), so it is for this running service instance rather than durable job history.

## 5. How articles are fetched and saved

### Feed list and settings

- `scraper/config.py` reads environment settings: MongoDB URI/database, feed URLs, and the per-request timeout. If no feed list is set, it uses BBC, NPR, and The Guardian RSS URLs.
- `.env` files contain local secrets and settings. They must stay out of Git. On Render, configure these values in the service's Environment page.
- The backend and scraper must point to the same MongoDB database name so one writes the data the other reads.

### RSS parsing

`scraper/feeds/fetch.py` downloads an RSS URL with `requests`, parses the XML with `feedparser`, and converts each usable RSS entry to a common article shape:

```text
title, summary, link, image_url, source, published_at, content_hash
```

The source is normalized to BBC News, NPR, or The Guardian from the publisher's hostname. `published_at` is parsed into a date/time. The SHA-256 `content_hash` is based on the article URL, so the same URL can be recognized on a later run.

### Article page extraction

For a new RSS item, `scraper/extraction/article_body.py` downloads the linked page and uses Trafilatura to remove page clutter and extract text. If Trafilatura is unavailable or gets no text, BeautifulSoup collects paragraph text. If the article page cannot be fetched, the RSS title and summary can still be kept; one broken article should not stop the whole feed.

### MongoDB writes

`scraper/db/writer.py` creates MongoDB collections/indexes, checks whether the `content_hash` already exists, writes articles, loads the recent article window for clustering, and saves fresh cluster records. A unique index on `content_hash` is a second layer of duplicate protection.

The primary collections are:

- `users`: email, bcrypt password hash, internal user ID, creation date.
- `articles`: title, summary/body, original URL, source, date, image URL, deduplication hash, and cluster ID.
- `clusters`: cluster ID, label, article IDs, first publication date, last publication date, and size.

## 6. How scikit-learn groups stories

The clustering code is `scraper/nlp/cluster.py`. `scikit-learn` is the Python package name; code imports it under the shorter module name `sklearn`.

The steps are:

1. `scraper/nlp/preprocess.py` lowercases text, keeps alphabetic words, removes common words such as “the” and “and”, drops very short words, and tries NLTK lemmatization (for example, reducing word variants to a shared base form). If NLTK's language data is missing, a built-in stopword fallback is used and lemmatization is skipped.
2. `cluster.py` prepares one text document per article: headline + headline + summary. Repeating the headline gives it extra influence because feed summaries are often long and include publisher-specific filler.
3. `TfidfVectorizer(max_features=5000, ngram_range=(1, 2))` converts the documents into numbers. TF-IDF means words frequent in one article but less common across the whole set get more weight. `ngram_range=(1, 2)` includes single words and adjacent two-word phrases.
4. `cosine_similarity` compares each pair of article vectors. A value near 1 means their weighted word patterns point in a similar direction; near 0 means little overlap.
5. The code additionally requires enough shared meaningful headline words. Pairs must reach one of two similarity/overlap thresholds before DBSCAN can connect them.
6. `DBSCAN` groups dense neighborhoods (`eps=0.78`, `min_samples=2`). Articles DBSCAN calls noise are given their own one-article topic, so a valid story does not disappear just because no second headline matched it.
7. The average TF-IDF scores in each group determine the top three terms used as the visible cluster label.

This is lexical clustering, not an AI model or semantic search. It works well when stories reuse important words, but may miss two articles about the same event if they use very different wording. It can also group stories that share a person or place even when they cover different events.

`scikit-learn` is pinned in `scraper/requirements.txt` at 1.7.2 so Render's Python 3.14 environment can download a prebuilt wheel instead of trying to compile the older 1.5.2 release from source. If Render's build log still says 1.5.2, it is building a commit/branch from before this requirements change.

## 7. Backend/API, in plain language

The backend starts at `backend/src/server.js`, reads settings in `backend/src/config/env.js`, connects to MongoDB through `backend/src/db/mongo.js`, then starts the Express app in `backend/src/app.js`.

An API endpoint is just a URL plus an HTTP method. For example, `GET /articles` means “send me articles”; `POST /auth/login` means “check these login details.”

| Method and route | Purpose | Login required? |
|---|---|---|
| `GET /health` | Simple check that the API process is responding. | No |
| `GET /articles?q=...` | Returns up to 120 recent articles, newest first; optional text search checks title and summary. | No |
| `GET /timeline` | Returns recent topic clusters with time span, count, source list, and intensity for the visual timeline. | No |
| `GET /clusters` | Returns cluster summaries. | No |
| `GET /clusters/:id` | Returns one cluster and its articles. | No |
| `POST /auth/register` | Validates credentials, hashes the password with bcrypt, creates a user, and issues tokens. | No |
| `POST /auth/login` | Checks the email/password and issues tokens. | No |
| `POST /auth/refresh` | Uses the secure refresh cookie to issue a new short-lived access token. | Refresh cookie |
| `POST /auth/logout` | Clears the refresh cookie. | No |
| `POST /ingest/trigger` | Starts the Python ingestion job and returns a job ID. | Yes, bearer access token |
| `GET /ingest/status/:jobId` | Returns pending/running/done/failed status for that process. | Yes, bearer access token |

The Gemini chat page was removed from the frontend and `/chat` redirects to the news home. The backend chat endpoint/service still exists in the source; it is not linked from the current UI.

`backend/src/middleware/auth.js` checks bearer access tokens. `backend/src/services/jwt.service.js` creates access tokens (15 minutes) and refresh tokens (7 days). Refresh tokens are sent in an `httpOnly` cookie so browser JavaScript cannot read them. `backend/src/middleware/errorHandler.js` turns thrown errors into HTTP responses. Zod in `app.js` checks login/register and chat request fields.

The CORS block in `backend/src/app.js` tells browsers which frontend origins may call the API and send cookies. `FRONTEND_ORIGIN` must exactly match the deployed site origin (scheme + hostname, no path), or be a comma-separated list of allowed origins. The API URL for the frontend is `NEXT_PUBLIC_API_BASE_URL`, read in `frontend/lib/api.ts`.

## 8. Frontend: which files do what

- `frontend/app/layout.tsx`: outer HTML layout, global CSS import, and shared providers.
- `frontend/components/Providers.tsx`: puts authentication and settings contexts around the pages.
- `frontend/app/page.tsx`: main newsroom page. Loads articles/timeline, handles refresh polling, filters, opens articles/clusters, and scrolls to the selected cluster details.
- `frontend/components/AppShell.tsx`: shared masthead, categories, utility bar, theme/language controls, sidebar, weather, preferences, and account menu.
- `frontend/components/Timeline.tsx`: draws one clickable row per time-based cluster.
- `frontend/components/ClusterDetailPanel.tsx`: shows the selected cluster and links to its source articles.
- `frontend/components/NewsCard.tsx`: renders one article preview and a relative publication time.
- `frontend/components/ArticleDetail.tsx`: modal with article details, read-aloud button, and original-source link.
- `frontend/components/ReadAloudButton.tsx`: uses the browser's built-in speech synthesis; it does not call an external TTS service.
- `frontend/lib/api.ts`: central place that constructs backend fetch requests and their URL paths.
- `frontend/lib/types.ts`: TypeScript shapes for Article, Cluster, and TimelineCluster responses.
- `frontend/lib/topics.ts`: keyword rules that put stories into display categories such as Technology or Sports. These are hand-written rules, separate from ML clustering.
- `frontend/context/AuthContext.tsx`: holds the current access token/email in React and restores/refreshes the session.
- `frontend/components/AuthGate.tsx`: sends signed-out visitors to login and prevents signed-in visitors from staying on login/register.
- `frontend/context/SettingsContext.tsx`: saves theme and language choices in localStorage.
- `frontend/app/globals.css`: all site styling and responsive breakpoints.

`frontend/app/live/page.tsx` presents three tabs. Live news reads the stored article endpoint every minute. Sports fixtures in `LiveSportsPanel.tsx` are clearly marked demo data. Job-market figures in `services/jobMarketService.ts` are invented illustrative values refreshed in the browser, not verified labor statistics. `WeatherWidget.tsx` uses the Open-Meteo public API for a city selected from a fixed list.

## 9. Login and account security

The password is not stored in plain text. The backend hashes it with bcrypt before storing it. At login, it compares the entered password with that hash. On success, the API returns a short-lived access JWT and sets a longer-lived refresh JWT cookie. The frontend sends the access token in the Authorization header for protected actions and asks `/auth/refresh` for a new one when needed.

JWT means JSON Web Token: a signed, time-limited proof of identity. `JWT_SECRET` and `JWT_REFRESH_SECRET` must be long, random, private values and must differ. Database, Gemini, and JWT secrets belong in hosting environment settings or ignored `.env` files, never in Git or screenshots.

## 10. Deployment and why things can be slow

The project is a monorepo (several apps in one Git repository): `frontend/`, `backend/`, and `scraper/`.

### Backend on Render

Because the Node backend starts a Python scraper, its Render service needs both sets of dependencies. With the repository root as the service root, the build command is:

```text
npm --prefix backend ci && python -m pip install -r scraper/requirements.txt
```

The start command is:

```text
cd backend && npm start
```

The backend's Render environment needs `MONGODB_URI`, the matching database name (`MONGODB_DATABASE` or `MONGO_DB_NAME`), `JWT_SECRET`, `JWT_REFRESH_SECRET`, and the exact `FRONTEND_ORIGIN`. `PORT` is supplied by Render. `GEMINI_API_KEY` is no longer needed for the visible UI.

### Frontend deployment

Deploy `frontend/` as a Next.js Node web service (for Render, Root Directory `frontend`, build `npm ci && npm run build`, start `npm start`) or deploy it on Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the backend's public base URL, e.g. `https://newsflash-orxd.onrender.com`, then redeploy the frontend because Next.js includes `NEXT_PUBLIC_` values in its browser build.

Choose the frontend URL you actually use and put that exact origin in the backend's `FRONTEND_ORIGIN`. If serving both a Vercel and Render frontend, use the comma-separated format supported by the current backend code.

### Two different kinds of waiting

1. **Deploy/build wait:** Render installs Node and Python packages and builds the service. The old log downloading `scikit-learn-1.5.2.tar.gz` then sitting at “Preparing metadata” indicates a source build. The requirements update to 1.7.2 is intended to use a prebuilt wheel; it must be pushed before Render can use it.
2. **Refresh wait:** the website is polling an ingestion job. `frontend/app/page.tsx` waits up to about three minutes for a manually requested job. `scraper/main.py` sequentially fetches feeds and new article pages, then reclusters the database window. `OPTIONS 204` rows in DevTools are normal CORS preflights; check the following GET status requests and Render backend logs for the actual job result. The backend scheduler also starts a run every five minutes while the service is awake.

Render free instances can also sleep when idle and need a cold start. The in-process scheduler pauses while the backend is asleep and runs again after it starts. A separate Render cron job can run independently of web traffic but has an additional minimum monthly charge. The `/health` route checks the API process, not the scraper's Python dependencies or MongoDB article contents.

## 11. A simple presentation/demo outline

1. “NewsFlash is a news timeline that groups related stories from BBC News, NPR, and The Guardian.”
2. Show the timeline, select a cluster, and explain that each row represents a topic's coverage over time. Open the details and show the original article links.
3. Explain filters: categories are keyword-based frontend rules; date/source filters narrow what the API data displays.
4. Explain that the backend runs ingestion at startup and every five minutes while awake. **Refresh data** can request an immediate run, and the frontend polls its job ID until it finishes.
5. Explain deduplication and clustering: URL hashes avoid duplicates; TF-IDF plus cosine similarity and DBSCAN groups headlines/summaries that share meaningful words.
6. Be clear that RSS stories are real source links, but sports fixtures and job-market figures are demo data. Weather is provided by Open-Meteo. The AI chat is removed from the visible interface because Gemini was unreliable.
7. Finish with limitations: source publishers may block or delay downloads, clustering is word-based rather than semantic, and article grouping can be imperfect.

## 12. Short glossary

- **API:** agreed URLs and request/response shapes that let two programs communicate.
- **RSS:** a publisher-maintained feed of recent article metadata.
- **MongoDB:** document database; each article is stored as a JSON-like document.
- **Deduplication:** recognizing an item already seen so it is not saved twice.
- **TF-IDF:** text-to-number weighting that emphasizes words useful for distinguishing one document from others.
- **Cosine similarity:** a score comparing the direction of two text vectors; larger usually means more similar.
- **DBSCAN:** density-based clustering algorithm; it groups nearby points and identifies ungrouped points as noise.
- **CORS:** browser security rules controlling which website origins can call an API on another domain.
- **JWT:** signed token used to prove a user has authenticated.
- **Environment variable:** configuration value supplied outside source code; secrets go here, not into Git.
- **Deploy:** build and run a version of the code on a hosting provider so it has a public URL.
