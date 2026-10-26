import { config } from "../core/config.js";

export function mountGreeting(host: HTMLElement): void {
  const h = new Date().getHours();
  const part =
    h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  host.textContent = config.name ? `${part}, ${config.name}` : part;
}
