import { launchApp } from "./tv.js";
import { flashToast } from "../launcher/apps.js";

/** A direct stock-Home escape even when the native Home category is Reframe. */
export function mountHomeEscape(): void {
  let held = false, lastEvent = 0, pending = false;
  const release = (): void => { held = false; };
  window.addEventListener("keyup", event => { if (event.keyCode === 406) release(); });
  window.addEventListener("blur", release);
  document.addEventListener("visibilitychange", release);
  window.addEventListener("keydown", event => {
    if (event.keyCode !== 406) return;
    event.preventDefault();
    const now = performance.now();
    const duplicate = held && now - lastEvent < 650;
    held = true;
    lastEvent = now;
    if (duplicate || event.repeat || pending) return;
    pending = true;
    // Explicit app id bypasses the configurable native Home category.
    void launchApp("com.webos.app.home", { launchType: "reframeEscape" })
      .catch(error => {
        console.error("LG Home escape failed", error);
        flashToast("Could not open LG Home. Try the remote's Input or Settings button.");
      })
      .finally(() => { pending = false; });
  });
}
