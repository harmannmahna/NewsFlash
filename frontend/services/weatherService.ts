export type Weather = { temperature: number; code: number; city: string };
const cities = {
  Mumbai: { latitude: 19.076, longitude: 72.8777 },
  Delhi: { latitude: 28.6139, longitude: 77.209 },
  Pune: { latitude: 18.5204, longitude: 73.8567 },
  London: { latitude: 51.5072, longitude: -0.1276 },
  "New York": { latitude: 40.7128, longitude: -74.006 },
};
export type WeatherCity = keyof typeof cities;

export async function fetchWeather(city: WeatherCity): Promise<Weather> {
  const point = cities[city];
  const query = new URLSearchParams({ latitude: String(point.latitude), longitude: String(point.longitude), current: "temperature_2m,weather_code", timezone: "auto" });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
  if (!response.ok) throw new Error("Weather is temporarily unavailable");
  const result = await response.json();
  return { city, temperature: Math.round(result.current.temperature_2m), code: result.current.weather_code };
}
