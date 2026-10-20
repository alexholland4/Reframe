/**
 * Spatial focus manager for TV remote navigation.
 *
 * The LG remote's D-pad sends standard arrow keydowns (37-40), OK sends Enter
 * (13), and Back sends 461. We keep a registry of focusable elements and, on a
 * direction press, pick the nearest candidate in that direction using a
 * geometry score (primary-axis distance dominates, cross-axis misalignment is
 * penalized). This mirrors how native TV UIs resolve focus and avoids hard-
 * coding a grid, so widgets and tiles can be laid out freely.
 */

const KEY = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  BACK: 461,
} as const;

type Dir = "left" | "up" | "right" | "down";

export class FocusManager {
  private current: HTMLElement | null = null;

  constructor(private root: HTMLElement = document.body) {
    window.addEventListener("keydown", this.onKeyDown);
  }

  private get items(): HTMLElement[] {
    return Array.from(
      this.root.querySelectorAll<HTMLElement>("[data-focusable]")
    ).filter((el) => el.offsetParent !== null); // visible only
  }

  focusFirst(): void {
    const items = this.items;
    if (items.length) this.setFocus(items[0]);
  }

  private setFocus(el: HTMLElement): void {
    if (this.current === el) return;
    this.current?.classList.remove("focused");
    this.current?.setAttribute("aria-selected", "false");
    this.current = el;
    el.classList.add("focused");
    el.setAttribute("aria-selected", "true");
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.keyCode;
    switch (code) {
      case KEY.LEFT:
        this.move("left");
        break;
      case KEY.UP:
        this.move("up");
        break;
      case KEY.RIGHT:
        this.move("right");
        break;
      case KEY.DOWN:
        this.move("down");
        break;
      case KEY.ENTER:
        this.activate();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  private activate(): void {
    this.current?.dispatchEvent(new CustomEvent("reframe:select", { bubbles: true }));
    this.current?.click();
  }

  private move(dir: Dir): void {
    if (!this.current) {
      this.focusFirst();
      return;
    }
    const from = this.current.getBoundingClientRect();
    let best: HTMLElement | null = null;
    let bestScore = Infinity;

    for (const el of this.items) {
      if (el === this.current) continue;
      const r = el.getBoundingClientRect();
      const score = this.score(dir, from, r);
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) this.setFocus(best);
  }

  /** Lower is better. Infinity means "not in this direction". */
  private score(dir: Dir, from: DOMRect, to: DOMRect): number {
    const fromCx = from.left + from.width / 2;
    const fromCy = from.top + from.height / 2;
    const toCx = to.left + to.width / 2;
    const toCy = to.top + to.height / 2;
    const dx = toCx - fromCx;
    const dy = toCy - fromCy;

    const inDir =
      (dir === "left" && dx < -1) ||
      (dir === "right" && dx > 1) ||
      (dir === "up" && dy < -1) ||
      (dir === "down" && dy > 1);
    if (!inDir) return Infinity;

    const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
    const cross = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    // Cross-axis misalignment is penalized heavily so focus tracks in a line.
    return primary + cross * 3;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
  }
}
