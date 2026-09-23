import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

export const mongoClient = new MongoClient(env.mongodbUri);
export const database = mongoClient.db(env.mongodbDatabase);

export async function connectDatabase() {
  await mongoClient.connect();
  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("articles").createIndex({ content_hash: 1 }, { unique: true }),
    database.collection("clusters").createIndex({ cluster_id: 1 }, { unique: true }),
  ]);
}