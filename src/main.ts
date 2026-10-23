import "./styles.css";
import { FocusManager } from "./core/focus.js";
import { mountClock } from "./widgets/clock.js";
import { mountGreeting } from "./widgets/greeting.js";
import { mountWeather } from "./widgets/weather.js";
import { mountLauncher } from "./launcher/apps.js";
import { mountHomeEscape } from "./core/home-escape.js";

function render(): void {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="backdrop" aria-hidden="true">
      <img class="landscape" src="./backgrounds/madison-capitol-sunset.jpg" alt="" />
      <div class="backdrop-shade"></div>
      <div class="focus-light"></div>
    </div>
    <header class="top">
      <div class="top-left">
        <h1 class="greeting"></h1>
        <div class="weather"></div>
      </div>
      <div class="top-right">
        <div class="clock"></div>
      </div>
    </header>
    <main class="stage" data-focus-scroll>
      <section class="launcher" aria-label="Your apps"></section>
    </main>
  `;

  mountGreeting(app.querySelector(".greeting")!);
  mountClock(app.querySelector(".clock")!);
  mountWeather(app.querySelector(".weather")!);
  mountLauncher(app.querySelector(".launcher")!);
  mountHomeEscape();

  const focus = new FocusManager(app);
  focus.focusFirst();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", render);
} else {
  render();
}
