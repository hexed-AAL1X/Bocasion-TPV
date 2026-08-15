export type Theme = "light" | "dark";

export type ThemeOrigin = {
  x: number;
  y: number;
};

export type ThemeApplyOptions = {
  animate?: boolean;
  origin?: ThemeOrigin;
  /** Se invoca junto con el cambio de data-theme (dentro de la transición). */
  onApplied?: () => void;
  /** Se invoca al terminar la animación (o de inmediato si no hay animación). */
  onFinished?: () => void;
};

const STORAGE_KEY = "bocasoft-theme";
export const THEME_TRANSITION_MS = 420;

let transitionTimer: number | null = null;

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.classList.contains("efficient-mode")) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setThemeOrigin(root: HTMLElement, origin?: ThemeOrigin): void {
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const radius = Math.hypot(window.innerWidth, window.innerHeight);

  root.style.setProperty("--theme-origin-x", `${x}px`);
  root.style.setProperty("--theme-origin-y", `${y}px`);
  root.style.setProperty("--theme-origin-radius", `${radius}px`);
}

function clearThemeOrigin(root: HTMLElement): void {
  root.style.removeProperty("--theme-origin-x");
  root.style.removeProperty("--theme-origin-y");
  root.style.removeProperty("--theme-origin-radius");
  root.style.removeProperty("--theme-from-bg");
}

function finishTransition(root: HTMLElement): void {
  root.classList.remove("theme-transitioning", "theme-circle-reveal");
  clearThemeOrigin(root);
}

function applyWithoutAnimation(
  root: HTMLElement,
  theme: Theme,
  onApplied?: () => void,
  onFinished?: () => void,
): void {
  root.classList.add("theme-no-transition");
  root.setAttribute("data-theme", theme);
  onApplied?.();
  void root.offsetHeight;
  root.classList.remove("theme-no-transition");
  finishTransition(root);
  onFinished?.();
}

function applyWithCircleFallback(
  root: HTMLElement,
  theme: Theme,
  origin?: ThemeOrigin,
  onApplied?: () => void,
  onFinished?: () => void,
): void {
  if (transitionTimer) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }

  const oldBg = getComputedStyle(root).getPropertyValue("--color-bg").trim() || "#f4fbf9";
  setThemeOrigin(root, origin);
  root.style.setProperty("--theme-from-bg", oldBg);
  root.classList.add("theme-circle-reveal");

  requestAnimationFrame(() => {
    root.setAttribute("data-theme", theme);
    onApplied?.();
  });

  transitionTimer = window.setTimeout(() => {
    finishTransition(root);
    transitionTimer = null;
    onFinished?.();
  }, THEME_TRANSITION_MS);
}

export function applyTheme(theme: Theme, options?: ThemeApplyOptions): void {
  const root = document.documentElement;
  const animate = options?.animate ?? true;
  const origin = options?.origin;
  const onApplied = options?.onApplied;
  const onFinished = options?.onFinished;

  if (!animate || prefersReducedMotion()) {
    applyWithoutAnimation(root, theme, onApplied, onFinished);
    return;
  }

  // Una sola capa ::after (clip-path), sin snapshot del DOM completo
  applyWithCircleFallback(root, theme, origin, onApplied, onFinished);
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

/** Evita flash al cargar; llamar antes de montar React. */
export function initTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme, { animate: false });
  return theme;
}
