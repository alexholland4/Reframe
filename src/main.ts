import "./styles.css";
import { FocusManager } from "./core/focus.js";
import { mountClock } from "./widgets/clock.js";
import { mountGreeting } from "./widgets/greeting.js";
import { mountWeather } from "./widgets/weather.js";
import { mountLauncher } from "./launcher/apps.js";

function render(): void {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <header class="top">
      <div class="top-left">
        <div class="wordmark"><span class="brand-mark" aria-hidden="true"></span>reframe</div>
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
      <span class="navigation-hint"><span class="direction-key" aria-hidden="true">✣</span> Browse</span>
      <span class="navigation-hint"><span class="remote-key">OK</span> Open</span>
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
