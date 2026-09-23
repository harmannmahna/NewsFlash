import { LiveBadge } from "./LiveBadge";

// TODO: wire to a licensed sports data API; these illustrative fixtures are not live scores.
const fixtures = [
  { sport: "Cricket", league: "International", home: "India", away: "Australia", score: "182/4 · 16.2 ov", state: "2nd innings" },
  { sport: "Football", league: "Premier League", home: "Arsenal", away: "Chelsea", score: "1 — 1", state: "62′" },
  { sport: "Tennis", league: "ATP Tour", home: "Player A", away: "Player B", score: "6–4 · 3–2", state: "Set 2" },
];

export function LiveSportsPanel({ sport = "All sports" }: { sport?: string }) {
  const visibleFixtures = sport === "All sports" ? fixtures : fixtures.filter(item => item.sport === sport);
  return <section><div className="panel-heading"><div><p className="eyebrow">SCORES & FIXTURES</p><h2>Sports desk <LiveBadge /></h2></div><span className="mock-tag">DEMO</span></div><div className="sports-grid">{visibleFixtures.map(game => <article className="score-card" key={game.league}><span className="score-league">{game.sport} · {game.league}</span><div className="score-line"><strong>{game.home}</strong><b>{game.score}</b></div><div className="score-line"><strong>{game.away}</strong><span>{game.state}</span></div></article>)}</div><p className="mock-note">Demo fixtures only. Scores are not connected to a sports data provider.</p></section>;
}
