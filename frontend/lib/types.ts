export type TimelineCluster = { id: string; label: string; start: string; end: string; count: number; intensity: number; sources: string[] };
export type Article = { id: string; title: string; summary: string; body?: string; link: string; image_url?: string; source: string; published_at: string; cluster_id?: string | null };
export type Cluster = { id: string; label: string; earliest: string; latest: string; articles: Article[] };
