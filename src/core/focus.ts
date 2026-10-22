/** Roving button focus with independent shelf/vertical scrolling. Back stays native. */
type Dir = "left" | "up" | "right" | "down";
export class FocusManager {
  private current: HTMLElement | null = null;
  private remembered = new Map<HTMLElement, HTMLElement>();
  private lastMove = 0;
  private scrollFrames = new Map<HTMLElement, {frame:number; target:number}>();
  private lastPointer: {x:number; y:number} | null = null;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(private root: HTMLElement = document.body) {
    for (const item of this.items) item.tabIndex = -1;
    window.addEventListener("keydown", this.onKeyDown);
    this.root.addEventListener("pointermove", this.onPointerMove);
    this.root.addEventListener("focusin", this.onFocusIn);
    document.addEventListener("visibilitychange", this.saveFocus);
    window.addEventListener("pagehide", this.saveFocus);
  }
  private get items(): HTMLElement[] {
    return Array.from(this.root.querySelectorAll<HTMLElement>("[data-focusable]")).filter(el => el.offsetParent !== null);
  }
  focusFirst(): void {
    let saved: string | null = null;
    try { saved = sessionStorage.getItem("reframe.focus"); } catch { /* Storage can be unavailable. */ }
    const items = this.items;
    const target = items.find(el => el.dataset.appId === saved) ?? items[0];
    if (target) this.setFocus(target);
  }
  private setFocus(el: HTMLElement, scroll = true): void {
    if (this.current === el) return;
    if (this.current) { this.current.classList.remove("focused"); this.current.tabIndex = -1; }
    this.current = el;
    el.tabIndex = 0;
    el.classList.add("focused");
    const group = el.closest<HTMLElement>("[data-focus-group]");
    if (group) this.remembered.set(group, el);
    el.focus({preventScroll:true});
    if (scroll) this.reveal(el);
    el.dispatchEvent(new CustomEvent("reframe:focus", {bubbles:true, detail:el}));
  }
  private reveal(el: HTMLElement): void {
    const row = el.closest<HTMLElement>("[data-focus-group]");
    const pad = window.innerWidth / 120;
    if (row) {
      const gutter = Number.parseFloat(getComputedStyle(row).paddingLeft) || pad;
      const left = el.offsetLeft, right = left + el.offsetWidth;
      const destination = this.scrollFrames.get(row)?.target ?? row.scrollLeft;
      if (left - gutter < destination) this.animateScroll(row, "scrollLeft", left-gutter);
      else if (right + gutter > destination + row.clientWidth) this.animateScroll(row, "scrollLeft", right+gutter-row.clientWidth);
    }
    const scroller = el.closest<HTMLElement>("[data-focus-scroll]");
    const section = el.closest<HTMLElement>(".launcher-section");
    if (scroller && section) {
      const viewport = scroller.getBoundingClientRect(), bounds = section.getBoundingClientRect();
      const destination = this.scrollFrames.get(scroller)?.target ?? scroller.scrollTop;
      const top = scroller.scrollTop+bounds.top-viewport.top, bottom = scroller.scrollTop+bounds.bottom-viewport.top;
      if (top < destination+pad) this.animateScroll(scroller, "scrollTop", top-pad);
      else if (bottom > destination+scroller.clientHeight-pad) this.animateScroll(scroller, "scrollTop", bottom-scroller.clientHeight+pad);
    }
  }
  private animateScroll(element: HTMLElement, axis: "scrollLeft" | "scrollTop", target: number): void {
    const maximum = axis === "scrollLeft" ? element.scrollWidth-element.clientWidth : element.scrollHeight-element.clientHeight;
    target = Math.max(0,Math.min(maximum,target));
    const previous = this.scrollFrames.get(element);
    if (previous && Math.abs(previous.target-target)<1) return;
    if (previous) cancelAnimationFrame(previous.frame);
    const from = element[axis];
    if (this.reducedMotion || Math.abs(from-target)<1) {
      element[axis] = target;
      this.scrollFrames.delete(element);
      return;
    }
    const started = performance.now(), animation = {frame:0,target};
    const step = (now: number): void => {
      const progress = Math.min(1,(now-started)/220);
      element[axis] = from+(target-from)*(1-Math.pow(1-progress,3));
      if (progress<1) animation.frame = requestAnimationFrame(step);
      else this.scrollFrames.delete(element);
    };
    this.scrollFrames.set(element,animation);
    animation.frame = requestAnimationFrame(step);
  }
  private onPointerMove = (event: PointerEvent): void => {
    if (this.lastPointer?.x === event.clientX && this.lastPointer.y === event.clientY) return;
    this.lastPointer = {x:event.clientX, y:event.clientY};
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-focusable]") : null;
    if (target && this.root.contains(target)) this.setFocus(target, false);
  };
  private onFocusIn = (event: FocusEvent): void => {
    if (event.target instanceof HTMLElement && event.target.matches("[data-focusable]")) this.setFocus(event.target, false);
  };
  private saveFocus = (): void => {
    if (this.current?.dataset.appId) {
      try { sessionStorage.setItem("reframe.focus", this.current.dataset.appId); } catch { /* Optional restoration. */ }
    }
  };
  private onKeyDown = (event: KeyboardEvent): void => {
    const directions: Record<number,Dir> = {37:"left",38:"up",39:"right",40:"down"};
    const direction = directions[event.keyCode];
    if (direction) {
      event.preventDefault();
      const now = performance.now();
      if (event.repeat && now-this.lastMove < 90) return;
      this.lastMove = now;
      this.move(direction);
    } else if (event.keyCode === 13) {
      event.preventDefault();
      if (event.repeat || !this.current) return;
      this.saveFocus();
      this.current.dispatchEvent(new CustomEvent("reframe:select", {bubbles:true}));
      this.current.click();
    }
  };
  private move(direction: Dir): void {
    if (!this.current) { this.focusFirst(); return; }
    const group = this.current.closest<HTMLElement>("[data-focus-group]");
    if (!group) return;
    if (direction === "left" || direction === "right") {
      const items = Array.from(group.querySelectorAll<HTMLElement>("[data-focusable]"));
      const next = items[items.indexOf(this.current) + (direction === "left" ? -1 : 1)];
      if (next) this.setFocus(next);
      return;
    }
    const groups = Array.from(this.root.querySelectorAll<HTMLElement>("[data-focus-group]")).filter(el=>el.offsetParent!==null);
    const nextGroup = groups[groups.indexOf(group) + (direction === "up" ? -1 : 1)];
    if (!nextGroup) return;
    const previous = this.remembered.get(nextGroup);
    if (previous?.isConnected) { this.setFocus(previous); return; }
    const current = this.current.getBoundingClientRect(), x = current.left + current.width/2;
    const viewport = nextGroup.getBoundingClientRect();
    const candidates = Array.from(nextGroup.querySelectorAll<HTMLElement>("[data-focusable]"));
    let closest: HTMLElement | undefined, distance = Infinity;
    for (const candidate of candidates) {
      const bounds = candidate.getBoundingClientRect(), center = bounds.left+bounds.width/2;
      if (center < viewport.left || center > viewport.right) continue;
      if (Math.abs(center-x) < distance) { closest=candidate; distance=Math.abs(center-x); }
    }
    if (closest ?? candidates[0]) this.setFocus((closest ?? candidates[0])!);
  }
  destroy(): void {
    for (const animation of this.scrollFrames.values()) cancelAnimationFrame(animation.frame);
    this.scrollFrames.clear();
    window.removeEventListener("keydown", this.onKeyDown);
    this.root.removeEventListener("pointermove", this.onPointerMove);
    this.root.removeEventListener("focusin", this.onFocusIn);
    document.removeEventListener("visibilitychange", this.saveFocus);
    window.removeEventListener("pagehide", this.saveFocus);
  }
}
