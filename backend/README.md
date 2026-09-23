# News Pulse API

Express and MongoDB API for the News Pulse timeline. Read endpoints are public; authentication is required for ingest triggers and job polling.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

The API expects the scraper and backend to share the same MongoDB database. Set `MONGODB_URI` and `MONGODB_DATABASE` in `.env`. Refresh tokens use an httpOnly cookie; access tokens are short-lived and returned to the frontend in the response body.
