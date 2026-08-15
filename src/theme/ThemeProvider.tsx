import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import {
  applyPaletteTokens,
  getStoredColorPalette,
  storeColorPalette,
} from "./applyTokens";
import type { ColorPaletteId, ThemeMode } from "./definitions";
import {
  applyTheme,
  type ThemeOrigin,
} from "./theme";

type ThemeTransitionOptions = {
  origin?: ThemeOrigin;
};

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode, options?: ThemeTransitionOptions) => void;
  toggleTheme: (options?: ThemeTransitionOptions) => void;
  colorPalette: ColorPaletteId;
  setColorPalette: (palette: ColorPaletteId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function ThemeBridge({ children }: { children: ReactNode }) {
  const { theme, setTheme: setNextTheme, resolvedTheme } = useNextTheme();
  const [colorPalette, setColorPaletteState] = useState<ColorPaletteId>(() =>
    getStoredColorPalette(),
  );

  const mode = (resolvedTheme ?? theme ?? "light") as ThemeMode;
  const initialPaletteApplied = useRef(false);

  /* Solo carga inicial; los cambios de modo van dentro de applyTheme (onApplied). */
  useEffect(() => {
    if (!resolvedTheme || initialPaletteApplied.current) return;
    applyPaletteTokens(colorPalette, resolvedTheme as ThemeMode);
    initialPaletteApplied.current = true;
  }, [resolvedTheme, colorPalette]);

  const setTheme = useCallback(
    (next: ThemeMode, options?: ThemeTransitionOptions) => {
      applyTheme(next, {
        origin: options?.origin,
        onApplied: () => {
          applyPaletteTokens(colorPalette, next);
        },
        onFinished: () => {
          setNextTheme(next);
        },
      });
    },
    [setNextTheme, colorPalette],
  );

  const toggleTheme = useCallback(
    (options?: ThemeTransitionOptions) => {
      setTheme(mode === "dark" ? "light" : "dark", options);
    },
    [mode, setTheme],
  );

  const setColorPalette = useCallback(
    (next: ColorPaletteId) => {
      setColorPaletteState(next);
      storeColorPalette(next);
      applyPaletteTokens(next, mode, { animate: true });
    },
    [mode],
  );

  const value = useMemo(
    () => ({
      theme: mode,
      setTheme,
      toggleTheme,
      colorPalette,
      setColorPalette,
    }),
    [mode, setTheme, toggleTheme, colorPalette, setColorPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      storageKey="bocasoft-theme"
      disableTransitionOnChange
    >
      <ThemeBridge>{children}</ThemeBridge>
    </NextThemesProvider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
