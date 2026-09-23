import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { env } from "../config/env.js";

const jobs = new Map();
let activeJobId = null;

export function startIngestJob() {
  if (activeJobId && jobs.get(activeJobId)?.status === "running") return activeJobId;

  const jobId = randomUUID();
  activeJobId = jobId;
  jobs.set(jobId, { status: "pending" });
  const script = path.resolve(process.cwd(), env.scraperPath);
  const child = spawn(env.pythonBin, [script], { cwd: path.dirname(script), env: process.env });
  jobs.set(jobId, { status: "running" });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-8000);
  });
  child.on("close", (code) => {
    const detail = stderr
      .replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, "MongoDB connection URI [redacted]")
      .trim()
      .split(/\r?\n/)
      .slice(-4)
      .join(" ")
      .slice(-700);
    jobs.set(jobId, {
      status: code === 0 ? "done" : "failed",
      exitCode: code,
      ...(code === 0 ? {} : { error: detail || `Scraper exited with code ${code}. Check Python dependencies and backend configuration.` }),
    });
    if (activeJobId === jobId) activeJobId = null;
  });
  child.on("error", (error) => {
    jobs.set(jobId, { status: "failed", error: `Could not start Python scraper (${error.code || "process error"}). Check PYTHON_BIN and scraper dependencies.` });
    if (activeJobId === jobId) activeJobId = null;
  });
  return jobId;
}

export function startIngestScheduler() {
  const runScheduledIngest = () => {
    const jobId = startIngestJob();
    console.log(`[ingest] scheduled refresh job ${jobId}`);
  };

  runScheduledIngest();
  const timer = setInterval(runScheduledIngest, 5 * 60 * 1000);
  timer.unref();
  return timer;
}

export function getJobStatus(jobId) {
  return jobs.get(jobId) || null;
}
