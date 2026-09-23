import { Cluster, TimelineCluster } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  if (!response.ok) throw new Error((await response.json()).error || "Request failed");
  return response.json();
}

export const getTimeline = () => request<TimelineCluster[]>("/timeline");
export const getCluster = (id: string) => request<Cluster>(`/clusters/${id}`);
export const triggerIngest = (token: string) => request<{ jobId: string }>("/ingest/trigger", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
export const getJobStatus = (id: string, token: string) => request<{ status: string }>(`/ingest/status/${id}`, { headers: { Authorization: `Bearer ${token}` } });
export const authenticate = (path: string, email: string, password: string) => request<{ accessToken: string }>(path, { method: "POST", body: JSON.stringify({ email, password }) });
