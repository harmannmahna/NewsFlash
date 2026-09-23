import express from "express";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { env } from "./config/env.js";
import { database } from "./db/mongo.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { issueTokens, verifyRefreshToken } from "./services/jwt.service.js";
import { getJobStatus, startIngestJob } from "./services/ingestJob.service.js";
import { answerFromNews } from "./services/chat.service.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
const localFrontendOrigins = new Set(["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]);
const deployedFrontendOrigins = new Set(env.frontendOrigin.split(",").map((origin) => origin.trim()).filter(Boolean));
app.use((request, response, next) => {
  const origin = request.headers.origin;
  if (origin && (deployedFrontendOrigins.has(origin) || (!env.isProduction && localFrontendOrigins.has(origin)))) {
    response.header("Access-Control-Allow-Origin", origin);
    response.header("Vary", "Origin");
  }
  response.header("Access-Control-Allow-Credentials", "true");
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") return response.sendStatus(204);
  next();
});

// Wraps an async route handler so any thrown error or rejected promise
// (e.g. credentials.parse() failing, a DB call rejecting) is forwarded
// to next(err) instead of crashing the process.
const asyncHandler = (fn) => (request, response, next) =>
  Promise.resolve(fn(request, response, next)).catch(next);

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });
const chatInput = z.object({
  message: z.string().trim().min(1).max(1200),
  conversationHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1200) })).max(12).optional(),
});

const normalizeEmail = (email) => email.trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const emailQuery = (email) => ({ email: { $regex: `^\\s*${escapeRegex(email)}\\s*$`, $options: "i" } });
const recentCutoff = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

app.get("/health", (request, response) => response.json({ status: "ok" }));

app.post(
  "/auth/register",
  asyncHandler(async (request, response) => {
    const { email, password } = credentials.parse(request.body);
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = { id: crypto.randomUUID(), email: normalizedEmail, password_hash: passwordHash, created_at: new Date() };
    try {
      await database.collection("users").insertOne(user);
    } catch (error) {
      if (error?.code === 11000) return response.status(409).json({ error: "An account with this email already exists. Sign in instead." });
      throw error;
    }
    const publicUser = { id: user.id, email: user.email };
    const tokens = issueTokens(publicUser);
    response.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      sameSite: env.isProduction ? "none" : "lax",
      secure: env.isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.status(201).json({ accessToken: tokens.accessToken, user: publicUser });
  })
);

app.post(
  "/auth/login",
  asyncHandler(async (request, response) => {
    const { email, password } = credentials.parse(request.body);
    const normalizedEmail = normalizeEmail(email);
    const user = await database.collection("users").findOne(emailQuery(normalizedEmail));
    const hashLooksBcrypt = typeof user?.password_hash === "string" && /^\$2[aby]?\$\d{2}\$/.test(user.password_hash);
    const passwordMatches = hashLooksBcrypt && await bcrypt.compare(password, user.password_hash);
    if (!user || !passwordMatches) {
      return response.status(401).json({ error: "Invalid credentials" });
    }
    const tokens = issueTokens({ id: user.id, email: user.email });
    response.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      sameSite: env.isProduction ? "none" : "lax",
      secure: env.isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.json({ accessToken: tokens.accessToken, user: { id: user.id, email: user.email } });
  })
);

app.post("/auth/refresh", (request, response) => {
  try {
    const user = verifyRefreshToken(request.cookies.refreshToken);
    const tokens = issueTokens(user);
    response.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      sameSite: env.isProduction ? "none" : "lax",
      secure: env.isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.json({ accessToken: tokens.accessToken, user: { id: user.id, email: user.email } });
  } catch {
    response.status(401).json({ error: "Refresh token missing or expired" });
  }
});

app.post("/auth/logout", (request, response) => {
  response.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: env.isProduction ? "none" : "lax",
    secure: env.isProduction,
  });
  response.json({ status: "signed out" });
});

app.get("/articles", asyncHandler(async (request, response) => {
  const search = typeof request.query.q === "string" ? request.query.q.trim().slice(0, 120) : "";
  const query = search ? { $or: [{ title: { $regex: escapeRegex(search), $options: "i" } }, { summary: { $regex: escapeRegex(search), $options: "i" } }] } : {};
  const articles = await database.collection("articles")
    .find({ $and: [query, { published_at: { $gte: recentCutoff(), $lte: new Date(Date.now() + 6 * 60 * 60 * 1000) } }] }, { projection: { title: 1, summary: 1, body: 1, link: 1, image_url: 1, source: 1, published_at: 1, cluster_id: 1 } })
    .sort({ published_at: -1 })
    .limit(120)
    .toArray();
  response.json(articles.map(article => ({ ...article, id: article._id.toString(), _id: undefined })));
}));

app.post("/chat", requireAuth, asyncHandler(async (request, response) => {
  const { message, conversationHistory = [] } = chatInput.parse(request.body);
  response.json(await answerFromNews(message, conversationHistory));
}));

app.get(
  "/clusters",
  asyncHandler(async (request, response) => {
    const result = await database
      .collection("clusters")
      .aggregate([
        { $match: { latest_published_at: { $gte: recentCutoff(), $lte: new Date(Date.now() + 6 * 60 * 60 * 1000) } } },
        { $lookup: { from: "articles", localField: "cluster_id", foreignField: "cluster_id", as: "articles" } },
        { $sort: { latest_published_at: -1 } },
        {
          $project: {
            _id: 0,
            id: "$cluster_id",
            label: 1,
            earliest: "$earliest_published_at",
            latest: "$latest_published_at",
            article_count: { $size: "$articles" },
          },
        },
      ])
      .toArray();
    response.json(result);
  })
);

app.get(
  "/clusters/:id",
  asyncHandler(async (request, response) => {
    const cluster = await database.collection("clusters").findOne({ cluster_id: request.params.id }, { projection: { _id: 0 } });
    if (!cluster) return response.status(404).json({ error: "Cluster not found" });
    const articles = await database
      .collection("articles")
      .find(
        { cluster_id: request.params.id },
        { projection: { title: 1, summary: 1, link: 1, image_url: 1, source: 1, published_at: 1 } }
      )
      .sort({ published_at: 1 })
      .toArray();
    response.json({
      id: cluster.cluster_id,
      label: cluster.label,
      earliest: cluster.earliest_published_at,
      latest: cluster.latest_published_at,
      articles: articles.map((article) => ({ ...article, id: article._id.toString(), _id: undefined })),
    });
  })
);

app.get(
  "/timeline",
  asyncHandler(async (request, response) => {
    const result = await database
      .collection("clusters")
      .aggregate([
        { $match: { latest_published_at: { $gte: recentCutoff(), $lte: new Date(Date.now() + 6 * 60 * 60 * 1000) } } },
        { $lookup: { from: "articles", localField: "cluster_id", foreignField: "cluster_id", as: "articles" } },
        { $sort: { earliest_published_at: 1 } },
        {
          $project: {
            _id: 0,
            id: "$cluster_id",
            label: 1,
            start: "$earliest_published_at",
            end: "$latest_published_at",
            count: { $size: "$articles" },
            sources: {
              $setUnion: [
                { $map: { input: "$articles", as: "article", in: "$$article.source" } },
                [],
              ],
            },
          },
        },
      ])
      .toArray();
    response.json(result.map((cluster) => ({ ...cluster, sources: cluster.sources.filter(Boolean), intensity: Math.min(1, cluster.count / 10) })));
  })
);

app.post("/ingest/trigger", requireAuth, (request, response) => response.status(202).json({ jobId: startIngestJob() }));
app.get("/ingest/status/:jobId", requireAuth, (request, response) => {
  const status = getJobStatus(request.params.jobId);
  response.status(status ? 200 : 404).json(status || { error: "Job not found" });
});

app.use(errorHandler);
export default app;
