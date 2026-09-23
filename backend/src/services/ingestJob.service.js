import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { env } from "../config/env.js";

const jobs = new Map();

export function startIngestJob() {
  const jobId = randomUUID();
  jobs.set(jobId, { status: "pending" });
  const script = path.resolve(process.cwd(), env.scraperPath);
  const child = spawn(env.pythonBin, [script], { cwd: path.dirname(script), env: process.env });
  jobs.set(jobId, { status: "running" });
  child.on("close", (code) => jobs.set(jobId, { status: code === 0 ? "done" : "failed", exitCode: code }));
  child.on("error", (error) => jobs.set(jobId, { status: "failed", error: error.message }));
  return jobId;
}

export function getJobStatus(jobId) {
  return jobs.get(jobId) || null;
}
