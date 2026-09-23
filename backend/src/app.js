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

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", env.frontendOrigin);
  response.header("Access-Control-Allow-Credentials", "true");
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (request.method === "OPTIONS") return response.sendStatus(204);
  next();
});

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

app.get("/health", (request, response) => response.json({ status: "ok" }));

app.post("/auth/register", async (request, response) => {
  const { email, password } = credentials.parse(request.body);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = { id: crypto.randomUUID(), email, password_hash: passwordHash, created_at: new Date() };
  await database.collection("users").insertOne(user);
  const publicUser = { id: user.id, email: user.email };
  const tokens = issueTokens(publicUser);
  response.cookie("refreshToken", tokens.refreshToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });
  response.status(201).json({ accessToken: tokens.accessToken, user: publicUser });
});

app.post("/auth/login", async (request, response) => {
  const { email, password } = credentials.parse(request.body);
  const user = await database.collection("users").findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return response.status(401).json({ error: "Invalid credentials" });
  const tokens = issueTokens({ id: user.id, email: user.email });
  response.cookie("refreshToken", tokens.refreshToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });
  response.json({ accessToken: tokens.accessToken, user: { id: user.id, email: user.email } });
});

app.post("/auth/refresh", (request, response) => {
  try {
    const user = verifyRefreshToken(request.cookies.refreshToken);
    response.json({ accessToken: issueTokens(user).accessToken });
  } catch {
    response.status(401).json({ error: "Refresh token missing or expired" });
  }
});

app.get("/clusters", async (request, response) => {
  const result = await database.collection("clusters").aggregate([
    { $lookup: { from: "articles", localField: "cluster_id", foreignField: "cluster_id", as: "articles" } },
    { $sort: { latest_published_at: -1 } },
    { $project: { _id: 0, id: "$cluster_id", label: 1, earliest: "$earliest_published_at", latest: "$latest_published_at", article_count: { $size: "$articles" } } },
  ]).toArray();
  response.json(result);
});

app.get("/clusters/:id", async (request, response) => {
  const cluster = await database.collection("clusters").findOne({ cluster_id: request.params.id }, { projection: { _id: 0 } });
  if (!cluster) return response.status(404).json({ error: "Cluster not found" });
  const articles = await database.collection("articles").find({ cluster_id: request.params.id }, { projection: { _id: 0, id: 1, title: 1, summary: 1, link: 1, source: 1, published_at: 1 } }).sort({ published_at: 1 }).toArray();
  response.json({ id: cluster.cluster_id, label: cluster.label, earliest: cluster.earliest_published_at, latest: cluster.latest_published_at, articles });
});

app.get("/timeline", async (request, response) => {
  const result = await database.collection("clusters").aggregate([
    { $lookup: { from: "articles", localField: "cluster_id", foreignField: "cluster_id", as: "articles" } },
    { $sort: { earliest_published_at: 1 } },
    { $project: { _id: 0, id: "$cluster_id", label: 1, start: "$earliest_published_at", end: "$latest_published_at", count: { $size: "$articles" } } },
  ]).toArray();
  response.json(result.map((cluster) => ({ ...cluster, intensity: Math.min(1, cluster.count / 10) })));
});

app.post("/ingest/trigger", requireAuth, (request, response) => response.status(202).json({ jobId: startIngestJob() }));
app.get("/ingest/status/:jobId", requireAuth, (request, response) => {
  const status = getJobStatus(request.params.jobId);
  response.status(status ? 200 : 404).json(status || { error: "Job not found" });
});

app.use(errorHandler);
export default app;
