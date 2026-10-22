import { config } from "../core/config.js";

// Open-Meteo current conditions; coordinates are the configured city, not GPS.
const REFRESH_MS = 15 * 60 * 1000;
const CLOUD = '<path d="M7 19h11a4 4 0 0 0 .5-8A6.5 6.5 0 0 0 6 10a4.5 4.5 0 0 0 1 9Z"/>';
const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
const MOON = '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>';

function condition(code: number, day: boolean): {label: string; paths: string} {
  if (code === 0 || code === 1) return {label: code === 0 ? "Clear" : "Mostly clear", paths: day ? SUN : MOON};
  if (code === 2) return {label: "Partly cloudy", paths: CLOUD};
  if (code === 3) return {label: "Overcast", paths: CLOUD};
  if (code === 45 || code === 48) return {label: "Fog", paths: '<path d="M4 7h16M2 12h20M4 17h16"/>'};
  if ([51,53,55,56,57].includes(code)) return {label: "Drizzle", paths: CLOUD + '<path d="m9 22-.5 1m6-1-.5 1"/>'};
  if ([61,63,65,66,67,80,81,82].includes(code)) return {label: code === 65 || code === 82 ? "Heavy rain" : "Rain", paths: CLOUD + '<path d="m8 21-1 2m6-2-1 2m6-2-1 2"/>'};
  if ([71,73,75,77,85,86].includes(code)) return {label: "Snow", paths: CLOUD + '<path d="M8 22h.01M13 22h.01M18 22h.01"/>'};
  if ([95,96,99].includes(code)) return {label: "Thunderstorm", paths: CLOUD + '<path d="m13 17-3 4h4l-2 3"/>'};
  return {label: "Current weather", paths: CLOUD};
}

export function mountWeather(host: HTMLElement): () => void {
  const location = config.location;
  if (!location) { host.hidden = true; return () => {}; }
  host.hidden = false;
  host.innerHTML = '<span class="wx-icon" aria-hidden="true"></span><span class="wx-temp"></span><span class="wx-label"></span>';
  const icon = host.querySelector<HTMLElement>(".wx-icon")!;
  const temp = host.querySelector<HTMLElement>(".wx-temp")!;
  const label = host.querySelector<HTMLElement>(".wx-label")!;
  label.textContent = `Loading weather \u00b7 ${location.label}`;
  host.dataset.state = "loading";
  let active: AbortController | null = null;
  let disposed = false;
  let lastAttempt = 0;

  const refresh = async (): Promise<void> => {
    if (disposed || active || document.hidden) return;
    lastAttempt = Date.now();
    const request = new AbortController();
    active = request;
    const timeout = window.setTimeout(() => request.abort(), 10000);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
        "&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=1";
      const response = await fetch(url, {signal: request.signal});
      if (!response.ok) throw new Error(`weather ${response.status}`);
      const data = await response.json();
      const current = data.current;
      if (!current || typeof current.temperature_2m !== "number" || !Number.isFinite(current.temperature_2m) || typeof current.weather_code !== "number") {
        throw new Error("Invalid weather response");
      }
      if (disposed) return;
      const weather = condition(current.weather_code, current.is_day !== 0);
      icon.innerHTML = `<svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${weather.paths}</svg>`;
      temp.textContent = `${Math.round(current.temperature_2m)}\u00b0F`;
      label.textContent = `${weather.label} \u00b7 ${location.label}`;
      host.dataset.state = "ready";
    } catch {
      if (disposed) return;
      icon.textContent = "";
      temp.textContent = "";
      label.textContent = `Weather unavailable \u00b7 ${location.label}`;
      host.dataset.state = "unavailable";
    } finally {
      window.clearTimeout(timeout);
      active = null;
    }
  };
  const resume = (): void => {
    if (!document.hidden && (host.dataset.state !== "ready" || Date.now() - lastAttempt >= REFRESH_MS)) void refresh();
  };
  void refresh();
  const interval = window.setInterval(() => { void refresh(); }, REFRESH_MS);
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  return () => {
    disposed = true;
    active?.abort();
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("online", resume);
  };
}
