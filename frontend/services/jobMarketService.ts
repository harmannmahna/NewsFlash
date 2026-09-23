export type Country = "India" | "United States" | "United Kingdom" | "Canada";
export type MarketSnapshot = { unemployment: number; openings: number; change: number; sectors: string[]; history: number[] };
const base: Record<Country, Omit<MarketSnapshot, "history">> = {
  India: { unemployment: 7.8, openings: 1240000, change: 1.4, sectors: ["Technology", "Healthcare", "Renewable energy"] },
  "United States": { unemployment: 4.2, openings: 8100000, change: .6, sectors: ["Healthcare", "Technology", "Construction"] },
  "United Kingdom": { unemployment: 4.8, openings: 950000, change: -.3, sectors: ["Healthcare", "Education", "Finance"] },
  Canada: { unemployment: 6.9, openings: 580000, change: .9, sectors: ["Healthcare", "Construction", "Technology"] },
};

export function getMarketSnapshot(country: Country, tick = 0): MarketSnapshot {
  const value = base[country];
  const drift = Math.sin(tick / 2.6) * .16;
  const history = Array.from({ length: 30 }, (_, index) => value.unemployment + Math.sin(index / 3.2 + tick / 5) * .22 + (index - 15) * -.008);
  return { ...value, unemployment: Number((value.unemployment + drift).toFixed(1)), change: Number((value.change + drift / 3).toFixed(1)), history };
}
