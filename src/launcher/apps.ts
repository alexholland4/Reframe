import { config, type AppTile } from "../core/config.js";
import { launchApp } from "../core/tv.js";
import { isOnTV } from "../core/luna.js";

export function mountLauncher(host: HTMLElement): void {
  const grid = document.createElement("div");
  grid.className = "tile-grid";

  for (const tile of config.tiles) {
    grid.appendChild(createTile(tile));
  }
  host.appendChild(grid);
}

function createTile(tile: AppTile): HTMLElement {
  const el = document.createElement("button");
  el.className = "tile";
  el.dataset.focusable = "";
  el.style.setProperty("--accent", tile.accent ?? "#6ea8fe");
  el.innerHTML = `<span class="tile-dot"></span><span class="tile-label"></span>`;
  el.querySelector(".tile-label")!.textContent = tile.label;

  el.addEventListener("click", () => {
    void activate(tile, el);
  });
  return el;
}

async function activate(tile: AppTile, el: HTMLElement): Promise<void> {
  el.classList.add("launching");
  try {
    await launchApp(tile.appId);
  } catch (err) {
    // In the browser this path isn't hit (mock resolves); on TV, surface it.
    console.error(`launch failed: ${tile.appId}`, err);
    el.classList.add("launch-error");
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
  let toast = document.querySelector<HTMLElement>(".dev-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "dev-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  window.clearTimeout((toast as any)._t);
  (toast as any)._t = window.setTimeout(() => toast!.classList.remove("show"), 1400);
}
