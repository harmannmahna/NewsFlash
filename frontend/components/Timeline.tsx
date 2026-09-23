"use client";

import { TimelineCluster } from "../lib/types";

export function Timeline({ clusters, onSelect }: { clusters: TimelineCluster[]; onSelect: (cluster: TimelineCluster) => void }) {
  const starts = clusters.map(cluster => new Date(cluster.start).getTime());
  const ends = clusters.map(cluster => new Date(cluster.end).getTime());
  const earliest = Math.min(...starts);
  const latest = Math.max(...ends);
  const span = Math.max(latest - earliest, 60 * 60 * 1000);
  const ticks = Array.from({ length: 5 }, (_, index) => new Date(earliest + span * index / 4));
  const compactWindow = span < 24 * 60 * 60 * 1000;

  return <div className="timeline" aria-label="News timeline">
    <div className="timeline-axis" aria-hidden="true">{ticks.map((tick, index) => <span key={index} style={{ left: `${index * 25}%` }}>{compactWindow ? tick.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : tick.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>)}</div>
    {clusters.map(cluster => {
      const left = ((new Date(cluster.start).getTime() - earliest) / span) * 100;
      const width = Math.max(((new Date(cluster.end).getTime() - new Date(cluster.start).getTime()) / span) * 100, 1.4);
      return <button className="timeline-row" key={cluster.id} onClick={() => onSelect(cluster)}>
        <span className="timeline-label"><strong>{cluster.label}</strong><small>{cluster.count} {cluster.count === 1 ? "story" : "stories"} · {cluster.sources.join(", ")}</small></span>
        <span className="timeline-track"><span className="timeline-bar" style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, opacity: .48 + cluster.intensity * .52 }} /></span>
        <span className="timeline-range">{new Date(cluster.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – {new Date(cluster.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </button>;
    })}
  </div>;
}
