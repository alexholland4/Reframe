/** The initial HTML owns first paint; this only retires the nonblocking intro. */
export function mountStartup(): void {
  const intro = document.querySelector<HTMLElement>(".startup");
  if (!intro) return;

  function dismiss(): void {
    intro!.hidden = true;
    document.removeEventListener("keydown", dismiss, true);
    document.removeEventListener("pointerdown", dismiss, true);
    document.removeEventListener("visibilitychange", onVisibility);
    intro!.removeEventListener("animationend", onEnd);
  }
  function onEnd(event: AnimationEvent): void {
    if (event.target === intro && event.animationName === "startupRelease") dismiss();
  }
  function onVisibility(): void {
    // Returning from an app, Settings or casting must not replay a boot intro.
    if (document.hidden) dismiss();
  }

  intro.addEventListener("animationend", onEnd);
  document.addEventListener("keydown", dismiss, true);
  document.addEventListener("pointerdown", dismiss, true);
  document.addEventListener("visibilitychange", onVisibility);
  // CSS also fades out without JavaScript. This covers throttled animation events.
  window.setTimeout(dismiss, 3000);
}
