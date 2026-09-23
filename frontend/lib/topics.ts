const keywords: Record<string, string[]> = {
  Technology: ["ai", "artificial", "tech", "technology", "digital", "software", "chip", "google", "openai", "cyber", "robot", "data"],
  Politics: ["election", "president", "minister", "government", "parliament", "vote", "politic", "senate", "congress", "trump", "court", "law", "policy"],
  Business: ["business", "market", "economy", "economic", "stock", "company", "trade", "jobs", "bank", "inflation", "finance"],
  Climate: ["climate", "weather", "flood", "storm", "heat", "wildfire", "earthquake", "environment", "energy"],
  Health: ["health", "hospital", "disease", "medical", "cancer", "doctor", "vaccine", "patient"],
  Sports: ["sport", "football", "soccer", "cricket", "tennis", "match", "league", "olympic", "goal"],
  Entertainment: ["film", "movie", "music", "actor", "artist", "celebrity", "television", "show", "book"],
};

export const topicCategories = ["Technology", "Politics", "Business", "Climate", "Health", "Sports", "Entertainment", "World"];
export function categoryFor(text: string) {
  const words = text.toLowerCase().split(/[^a-z]+/);
  return Object.entries(keywords).find(([, terms]) => terms.some(term => words.some(word => word === term || word.startsWith(term))))?.[0] || "World";
}
