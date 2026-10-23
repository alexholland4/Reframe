import { isOnTV } from "./luna.js";

type Phase = "idle" | "waiting" | "drawing" | "holding" | "fading" | "done";

/** Observe LG's cover; never spend the drawing timeline behind that native window. */
export function mountStartup(): () => void {
  const element = document.querySelector<HTMLElement>(".startup");
  if (!element) return () => {};
  const intro = element;
  const finalStroke = intro.querySelector(".mono__s:last-child");
  const artworkReady = Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  let phase: Phase = "idle", coverOpen = false, generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let observer: InstanceType<NonNullable<Window["PalmServiceBridge"]>> | undefined;

  function setPhase(next: Phase): void { phase = next; intro.dataset.phase = next; }
  function dismiss(): void {
    generation++;
    clearTimeout(timer);
    intro.hidden = true;
    intro.classList.remove("is-playing", "is-fading");
    setPhase("done");
  }
  function fade(): void {
    if (phase !== "holding") return;
    setPhase("fading");
    intro.classList.add("is-fading");
    clearTimeout(timer);
    timer = setTimeout(dismiss, 600); // A missed transition event cannot strand Home.
  }
  function completed(): void {
    if (phase !== "drawing") return;
    setPhase("holding");
    clearTimeout(timer);
    timer = setTimeout(fade, 280); // Keep the fully drawn final frame on screen.
  }
  async function startWhenReady(): Promise<void> {
    const current = generation;
    await artworkReady;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (current !== generation || phase !== "waiting" || coverOpen || document.hidden) return;
    setPhase("drawing");
    intro.classList.add("is-playing");
    clearTimeout(timer);
    timer = setTimeout(dismiss, 8000); // Failure guard, not the animation clock.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) completed();
  }
  function arm(): void {
    generation++;
    clearTimeout(timer);
    intro.classList.remove("is-playing", "is-fading");
    intro.hidden = false;
    setPhase("waiting");
    timer = setTimeout(dismiss, 8000);
  }
  function visibility(): void {
    if (document.hidden && phase !== "waiting") dismiss();
    else if (!document.hidden && phase === "waiting" && !coverOpen) void startWhenReady();
  }
  function input(): void { if (!intro.hidden) dismiss(); }
  function onEnd(event: AnimationEvent): void {
    if (event.target === finalStroke && event.animationName === "monoDraw") completed();
  }
  function onFade(event: TransitionEvent): void {
    if (event.target === intro && event.propertyName === "opacity" && phase === "fading") dismiss();
  }

  intro.hidden = true;
  setPhase("idle");
  intro.addEventListener("animationend", onEnd);
  intro.addEventListener("transitionend", onFade);
  document.addEventListener("keydown", input, true);
  document.addEventListener("pointerdown", input, true);
  document.addEventListener("visibilitychange", visibility);
  document.addEventListener("webkitvisibilitychange", visibility);

  const Constructor = window.PalmServiceBridge || window.webOSServiceBridge;
  if (isOnTV() && Constructor) {
    try {
      observer = new Constructor();
      observer.onservicecallback = raw => {
        try {
          const status = JSON.parse(raw) as { returnValue?: boolean; windows?: { appId?: string }[] };
          if (status.returnValue !== true || !Array.isArray(status.windows)) throw Error("No window status");
          const covered = status.windows.some(window => window.appId === "com.webos.app.cpcover");
          if (covered && !coverOpen) arm();
          coverOpen = covered;
          if (!covered && phase === "waiting") void startWhenReady();
        } catch {
          dismiss(); // No status: keep Home usable rather than guessing a delay.
          observer?.cancel();
        }
      };
      observer.call("luna://com.webos.surfacemanager/getForegroundWindowInfo", JSON.stringify({ subscribe: true }));
    } catch { dismiss(); }
  } else if (!isOnTV()) {
    arm();
    void startWhenReady(); // Desktop preview has no native cover.
  }

  return () => {
    dismiss();
    observer?.cancel();
    intro.removeEventListener("animationend", onEnd);
    intro.removeEventListener("transitionend", onFade);
    document.removeEventListener("keydown", input, true);
    document.removeEventListener("pointerdown", input, true);
    document.removeEventListener("visibilitychange", visibility);
    document.removeEventListener("webkitvisibilitychange", visibility);
  };
}
