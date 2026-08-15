const KEY = "bocasoft-efficient-mode";

/** Opt-in: solo ON si el usuario lo activó en Opciones (`"true"`). Por defecto animaciones normales. */
export function getEfficientMode(): boolean {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function setEfficientMode(value: boolean): void {
  try {
    localStorage.setItem(KEY, value ? "true" : "false");
  } catch {
    // localStorage no disponible
  }
}

/** Sync <html> class with efficient-mode flag. Call once at startup. */
export function applyEfficientModeClass(): void {
  if (getEfficientMode()) {
    document.documentElement.classList.add("efficient-mode");
  } else {
    document.documentElement.classList.remove("efficient-mode");
  }
}
