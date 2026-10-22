import { config } from "../core/config.js";

/**
 * Weather via Open-Meteo. No API key, CORS-open, so it works both in the
 * browser during development and on the TV. A keyed provider can be swapped in
 * later behind this same mount function.
 */

const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear", icon: "☀" },
  1: { label: "Mostly clear", icon: "🌤" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁" },
  45: { label: "Fog", icon: "🌫" },
  48: { label: "Fog", icon: "🌫" },
  51: { label: "Drizzle", icon: "🌦" },
  61: { label: "Rain", icon: "🌧" },
  63: { label: "Rain", icon: "🌧" },
  65: { label: "Heavy rain", icon: "🌧" },
  71: { label: "Snow", icon: "🌨" },
  80: { label: "Showers", icon: "🌦" },
  95: { label: "Thunderstorm", icon: "⛈" },
};

export async function mountWeather(host: HTMLElement): Promise<void> {
  const location = config.location;
  if (!location) { host.hidden = true; return; }
  host.innerHTML = `<span class="wx-icon">…</span><span class="wx-temp"></span><span class="wx-label"></span>`;
  const icon = host.querySelector<HTMLElement>(".wx-icon")!;
  const temp = host.querySelector<HTMLElement>(".wx-temp")!;
  const label = host.querySelector<HTMLElement>(".wx-label")!;

  try {
    const { lat, lon } = location;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const data = (await res.json()) as {
      current: { temperature_2m: number; weather_code: number };
    };
    const code = WMO[data.current.weather_code] ?? { label: "—", icon: "·" };
    icon.textContent = code.icon;
    temp.textContent = `${Math.round(data.current.temperature_2m)}°`;
    label.textContent = `${code.label} · ${location.label}`;
  } catch {
    icon.textContent = "·";
    temp.textContent = "—";
    label.textContent = "Weather unavailable";
  }
}
