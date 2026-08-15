import { flushSync } from "react-dom";

const DURATION_MS = 420;
const EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
export const WINDOW_SIZE_TOGGLE_ATTR = "data-window-size-toggle";

function prefersReducedMotion(): boolean {
  if (document.documentElement.classList.contains("efficient-mode")) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clearSizeToggleState(element: HTMLElement): void {
  element.removeAttribute(WINDOW_SIZE_TOGGLE_ATTR);
  element.style.removeProperty("animation");
  element.style.removeProperty("transform-origin");
}

function flipAnimate(element: HTMLElement, toggle: () => void): void {
  element.getAnimations().forEach((animation) => animation.cancel());

  element.setAttribute(WINDOW_SIZE_TOGGLE_ATTR, "true");
  element.style.animation = "none";

  const first = element.getBoundingClientRect();

  flushSync(toggle);

  const last = element.getBoundingClientRect();

  if (
    first.width <= 0 ||
    first.height <= 0 ||
    last.width <= 0 ||
    last.height <= 0
  ) {
    clearSizeToggleState(element);
    return;
  }

  const dx = first.left + first.width / 2 - (last.left + last.width / 2);
  const dy = first.top + first.height / 2 - (last.top + last.height / 2);
  const sx = first.width / last.width;
  const sy = first.height / last.height;

  if (
    Math.abs(dx) < 0.5 &&
    Math.abs(dy) < 0.5 &&
    Math.abs(sx - 1) < 0.001 &&
    Math.abs(sy - 1) < 0.001
  ) {
    clearSizeToggleState(element);
    return;
  }

  element.style.transformOrigin = "center center";

  const animation = element.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transform: "none" },
    ],
    { duration: DURATION_MS, easing: EASING },
  );

  animation.finished.then(() => clearSizeToggleState(element)).catch(() => clearSizeToggleState(element));
}

/** Anima el cambio de tamaño de una ventana modal (maximizar / restaurar). */
export function toggleWithWindowAnimation(
  element: HTMLElement | null,
  toggle: () => void,
): void {
  if (prefersReducedMotion()) {
    toggle();
    return;
  }

  if (!element) {
    toggle();
    return;
  }

  flipAnimate(element, toggle);
}
