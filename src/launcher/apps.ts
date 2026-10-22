import { config, type AppTile, type Shelf } from "../core/config.js";
import { launchApp } from "../core/tv.js";
import { isOnTV } from "../core/luna.js";

export function mountLauncher(host: HTMLElement): void {
  for (const shelf of ["home"] as const) {
    const tiles = config.tiles.filter(tile => tile.section === shelf);
    const section = document.createElement("section");
    section.className = "launcher-section " + shelf + "-section";
    section.setAttribute("aria-label", shelfLabels[shelf]);
    const grid = document.createElement("div");
    grid.className = "tile-row";
    grid.dataset.focusGroup = shelf;
    grid.setAttribute("aria-label", shelfLabels[shelf]);
    for (const tile of tiles) grid.appendChild(createTile(tile));
    section.appendChild(grid);
    host.appendChild(section);
  }
  host.addEventListener("reframe:focus", event => {
    const button = (event as CustomEvent<HTMLElement>).detail;
    const tile = config.tiles.find(tile => tile.appId === button.dataset.appId);
    if (!tile) return;
    document.documentElement.style.setProperty("--focus-color", tile.focusColor ?? "#7d9bc7");
  });
}

const shelfLabels: Record<Shelf,string> = {home:"Your apps"};

const utilityIcons: Record<string, string> = {
  settings: '<path d="m15 3 1 3 3 1 3-1 2 3-2 3v3l2 3-2 3-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-3 2-3v-3L2 9l2-3 3 1 3-1 1-3Z"/><circle cx="13" cy="13.5" r="4"/>',
  hdmi: '<rect x="3" y="4" width="22" height="16" rx="3"/><path d="M10 24h8M14 20v4M10 10h8v4h-8z"/>',
  soundbar: '<rect x="2" y="10" width="24" height="8" rx="4"/><circle cx="7" cy="14" r="1"/><circle cx="21" cy="14" r="1"/><path d="M12 14h4"/>',
  tv: '<rect x="3" y="6" width="22" height="16" rx="3"/><path d="m10 2 4 4 4-4M10 26h8"/>',
};

function createTile(tile: AppTile): HTMLElement {
  const el = document.createElement("button");
  el.className = "tile " + (tile.kind === "app" ? "app-tile" : "utility-tile");
  el.type = "button";
  el.setAttribute("aria-label", tile.label);
  el.dataset.focusable = "";
  el.dataset.appId = tile.appId;
  el.style.setProperty("--tile-color", tile.accent ?? "#252b30");
  const surface = document.createElement("span");
  surface.className = "tile-surface";
  if (tile.kind === "app") {
    const img = document.createElement("img");
    img.className = "app-icon " + (tile.iconStyle === "wordmark" ? "wordmark-icon" : "native-icon");
    img.src = "./icons/" + tile.icon;
    img.alt = "";
    img.draggable = false;
    surface.appendChild(img);
  } else {
    surface.innerHTML = `<svg class="utility-icon" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${utilityIcons[tile.icon] ?? utilityIcons.tv}</svg>`;
  }
  const caption = document.createElement("span");
  caption.className = "tile-caption";
  const label = document.createElement("span");
  label.className = "tile-label";
  label.textContent = tile.label;
  caption.appendChild(label);
  if (tile.detail) {
    const detail = document.createElement("span");
    detail.className = "tile-detail";
    detail.textContent = tile.detail;
    caption.appendChild(detail);
  }
  if (tile.kind === "app") el.append(surface, caption);
  else { surface.appendChild(caption); el.appendChild(surface); }

  el.addEventListener("click", () => {
    void activate(tile, el);
  });
  return el;
}

async function activate(tile: AppTile, el: HTMLElement): Promise<void> {
  if (el.classList.contains("launching")) return;
  el.classList.add("launching");
  try {
    await launchApp(tile.appId);
  } catch (err) {
    // In the browser this path isn't hit (mock resolves); on TV, surface it.
    console.error(`launch failed: ${tile.appId}`, err);
    el.classList.add("launch-error");
    flashToast(`Could not open ${tile.label}: ${err instanceof Error ? err.message : "TV request failed"}`);
    setTimeout(() => el.classList.remove("launch-error"), 1200);
  } finally {
    setTimeout(() => el.classList.remove("launching"), 600);
    if (!isOnTV()) {
      // Dev affordance: show what *would* launch.
      flashToast(`launch → ${tile.appId}`);
    }
  }
}

function flashToast(msg: string): void {
  let toast = document.querySelector<HTMLElement>(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  window.clearTimeout((toast as any)._t);
  (toast as any)._t = window.setTimeout(() => toast!.classList.remove("show"), 1400);
}
