import { Article, Cluster, TimelineCluster } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  } catch {
    throw new Error(`Cannot reach the News Pulse API at ${baseUrl}. Make sure the backend is running.`);
  }
  if (!response.ok) throw new Error((await response.json()).error || "Request failed");
  return response.json();
}

export const getTimeline = () => request<TimelineCluster[]>("/timeline");
export const getArticles = (q = "") => request<Article[]>(`/articles${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const getCluster = (id: string) => request<Cluster>(`/clusters/${id}`);
export const triggerIngest = (token: string) => request<{ jobId: string }>("/ingest/trigger", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
export const getJobStatus = (id: string, token: string) => request<{ status: string; error?: string }>(`/ingest/status/${id}`, { headers: { Authorization: `Bearer ${token}` } });
export const refreshAccessToken = () => request<{ accessToken: string; user: { id: string; email: string } }>("/auth/refresh", { method: "POST" });
export const authenticate = (path: string, email: string, password: string) => request<{ accessToken: string }>(path, { method: "POST", body: JSON.stringify({ email, password }) });
export const logoutRequest = () => request<{ status: string }>("/auth/logout", { method: "POST" });
export const sendChat = (message: string, conversationHistory: { role: "user" | "assistant"; content: string }[], token: string) =>
  request<{ answer: string; sources: { title: string; source: string; link: string; publishedAt: string }[] }>("/chat", {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ message, conversationHistory }),
  });
