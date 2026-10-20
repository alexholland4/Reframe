import "./styles.css";
import { FocusManager } from "./core/focus.js";
import { isOnTV } from "./core/luna.js";
import { mountClock } from "./widgets/clock.js";
import { mountGreeting } from "./widgets/greeting.js";
import { mountWeather } from "./widgets/weather.js";
import { mountLauncher } from "./launcher/apps.js";

function render(): void {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <header class="top">
      <div class="top-left">
        <h1 class="greeting"></h1>
        <div class="weather"></div>
      </div>
      <div class="top-right">
        <div class="clock"></div>
      </div>
    </header>
    <main class="stage">
      <section class="launcher" aria-label="Apps and inputs"></section>
    </main>
    <footer class="hint">
      <span>${isOnTV() ? "webOS" : "Browser preview"}</span>
      <span>D-pad to move · OK to launch</span>
    </footer>
  `;

  mountGreeting(app.querySelector(".greeting")!);
  mountClock(app.querySelector(".clock")!);
  void mountWeather(app.querySelector(".weather")!);
  mountLauncher(app.querySelector(".launcher")!);

  const focus = new FocusManager(app);
  focus.focusFirst();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", render);
} else {
  render();
}
