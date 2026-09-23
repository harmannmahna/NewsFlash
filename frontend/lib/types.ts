export type TimelineCluster = { id: string; label: string; start: string; end: string; count: number; intensity: number };
export type Article = { id: string; title: string; summary: string; link: string; source: string; published_at: string };
export type Cluster = { id: string; label: string; earliest: string; latest: string; articles: Article[] };
