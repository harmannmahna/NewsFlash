"use client";

import { TimelineCluster } from "../lib/types";

export function Timeline({ clusters, onSelect }: { clusters: TimelineCluster[]; onSelect: (cluster: TimelineCluster) => void }) {
  return <div className="timeline" aria-label="News timeline">
    {clusters.map((cluster, index) => <button className="timeline-row" key={cluster.id} onClick={() => onSelect(cluster)}>
      <span className="timeline-date">{new Date(cluster.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      <span className="timeline-track"><span className="timeline-bar" style={{ width: `${Math.max(18, Math.min(100, cluster.intensity * 100))}%`, animationDelay: `${index * 70}ms` }} /></span>
      <span className="timeline-label"><strong>{cluster.label}</strong><small>{cluster.count} stories · through {new Date(cluster.end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span>
    </button>)}
  </div>;
}
