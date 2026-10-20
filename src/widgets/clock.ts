import { config } from "../core/config.js";

export function mountClock(host: HTMLElement): () => void {
  const time = document.createElement("div");
  time.className = "clock-time";
  const date = document.createElement("div");
  date.className = "clock-date";
  host.append(time, date);

  const tick = (): void => {
    const now = new Date();
    time.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !config.clock24h,
    });
    date.textContent = now.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  tick();
  const id = window.setInterval(tick, 1000 * 15);
  return () => window.clearInterval(id);
}
