"use client";

import { useEffect, useState } from "react";
import { Country, getMarketSnapshot, MarketSnapshot } from "../services/jobMarketService";
import { LiveBadge } from "./LiveBadge";

const countries: Country[] = ["India", "United States", "United Kingdom", "Canada"];
export function JobMarketPanel() {
  const [country, setCountry] = useState<Country>("India");
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<MarketSnapshot>(() => getMarketSnapshot("India"));
  useEffect(() => { setData(getMarketSnapshot(country, tick)); }, [country, tick]);
  useEffect(() => { const timer = window.setInterval(() => setTick(value => value + 1), 30000); return () => window.clearInterval(timer); }, []);
  const points = data.history.map((value, index) => `${(index / 29) * 100},${100 - (value - 3) * 22}`).join(" ");
  return <section className="market-panel">
    <div className="panel-heading"><div><p className="eyebrow">LABOR MARKET SNAPSHOT</p><h2>Hiring pulse <LiveBadge /></h2></div><select value={country} onChange={event => setCountry(event.target.value as Country)} aria-label="Select country">{countries.map(item => <option key={item}>{item}</option>)}</select></div>
    <p className="mock-note">Illustrative demo data · refreshed every 30 seconds · connect a labor statistics API for verified figures.</p>
    <div className="market-metrics"><article><span>Unemployment</span><strong>{data.unemployment}%</strong><small>{data.change >= 0 ? "↑" : "↓"} {Math.abs(data.change)}% month over month</small></article><article><span>Open positions (proxy)</span><strong>{new Intl.NumberFormat("en", { notation: "compact" }).format(data.openings)}</strong><small>Estimated active postings</small></article></div>
    <div className="chart-heading"><span>30-day unemployment trend</span><span>30 days ago → now</span></div><svg className="market-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Illustrative unemployment trend for the past 30 days"><polyline points={points} fill="none" stroke="var(--color-accent-red)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
    <div className="sector-list"><strong>Top hiring sectors</strong>{data.sectors.map((sector, index) => <span key={sector}><i>0{index + 1}</i>{sector}</span>)}</div>
  </section>;
}
