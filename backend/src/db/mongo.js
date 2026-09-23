import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

export const mongoClient = new MongoClient(env.mongodbUri);
export const database = mongoClient.db(env.mongodbDatabase);

async function ensureLocalUser() {
  if (env.isProduction || !env.bootstrapEmail || !env.bootstrapPassword) return;
  const existing = await database.collection("users").findOne({ email: env.bootstrapEmail });
  if (existing) return;
  await database.collection("users").insertOne({
    id: crypto.randomUUID(),
    email: env.bootstrapEmail.trim().toLowerCase(),
    password_hash: await bcrypt.hash(env.bootstrapPassword, 12),
    created_at: new Date(),
  });
}

export async function connectDatabase() {
  await mongoClient.connect();
  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("articles").createIndex({ content_hash: 1 }, { unique: true }),
    database.collection("clusters").createIndex({ cluster_id: 1 }, { unique: true }),
  ]);
  await ensureLocalUser();
}
