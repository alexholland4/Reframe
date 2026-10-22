import "./styles.css";
import { FocusManager } from "./core/focus.js";
import { mountClock } from "./widgets/clock.js";
import { mountGreeting } from "./widgets/greeting.js";
import { mountWeather } from "./widgets/weather.js";
import { mountLauncher } from "./launcher/apps.js";

function render(): void {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="backdrop" aria-hidden="true">
      <img class="landscape" src="./backgrounds/coast-blue-hour.png" alt="" />
      <div class="backdrop-shade"></div>
      <div class="focus-light"></div>
    </div>
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
    <section class="hero" aria-label="Selected app">
      <p class="hero-section" id="current-section">Your apps</p>
      <h2 class="hero-title" id="current-title">Netflix</h2>
      <p class="hero-detail" id="current-detail">Movies, series & live streaming</p>
    </section>
    <main class="stage" data-focus-scroll>
      <section class="launcher" aria-label="Your apps"></section>
    </main>
    <footer class="hint">
      <span class="library-size">Home</span>
      <div class="hint-controls">
        <span class="selection-position" id="selection-position"></span>
        <span class="navigation-hint"><span class="direction-key" aria-hidden="true">✣</span> Browse</span>
        <span class="navigation-hint"><span class="remote-key">OK</span> Open</span>
      </div>
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
