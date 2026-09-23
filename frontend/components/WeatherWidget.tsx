"use client";

import { useEffect, useState } from "react";
import { fetchWeather, Weather, WeatherCity } from "../services/weatherService";

const cities: WeatherCity[] = ["Mumbai", "Delhi", "Pune", "London", "New York"];

export function WeatherWidget() {
  const [city, setCity] = useState<WeatherCity>("Mumbai");
  const [weather, setWeather] = useState<Weather | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => void fetchWeather(city).then(value => { if (active) setWeather(value); }).catch(() => { if (active) setWeather(null); });
    load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [city]);
  const icon = !weather ? "—" : weather.code === 0 ? "☀" : weather.code < 4 ? "☁" : weather.code >= 50 && weather.code < 70 ? "☂" : "⛅";
  return <section className="weather-widget" aria-label="Weather">
    <div className="weather-top"><span>WEATHER</span><select value={city} onChange={event => setCity(event.target.value as WeatherCity)} aria-label="Choose weather city">{cities.map(item => <option key={item}>{item}</option>)}</select></div>
    <div className="weather-current"><span className="weather-icon">{icon}</span><strong>{weather ? `${weather.temperature}°` : "--°"}</strong></div>
    <small>{weather ? weather.city : "Weather unavailable"}</small>
  </section>;
}
