import type { Ref } from "vue";

export type ThemeMode = "light" | "dark" | "auto";
export type ThemePalette = "fresh" | "ocean" | "sakura";

const PALETTES: ThemePalette[] = ["fresh", "ocean", "sakura"];

const THEME_COLOR: Record<ThemePalette, Record<"light" | "dark", string>> = {
  fresh: { light: "#eaf5ff", dark: "#030b18" },
  ocean: { light: "#e8f1fb", dark: "#04101d" },
  sakura: { light: "#fff3f7", dark: "#1b0c13" },
};

interface ThemeContext {
  theme: Ref<string>;
  palette: Ref<ThemePalette>;
  resolvedTheme: Ref<"light" | "dark">;
  setTheme: (mode: string) => void;
  setPalette: (palette: string) => void;
  init: () => void;
}

let instance: ThemeContext | null = null;
let initialized = false;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

function normalizePalette(value: unknown): ThemePalette {
  return PALETTES.includes(value as ThemePalette)
    ? (value as ThemePalette)
    : "fresh";
}

export function useTheme(): ThemeContext {
  if (instance) return instance;

  const clientState = useClientState();
  const initialTheme =
    typeof window === "undefined"
      ? "auto"
      : String(clientState.get("site", "theme", "auto"));
  const initialPalette =
    typeof window === "undefined"
      ? "fresh"
      : normalizePalette(clientState.get("site", "palette", "fresh"));
  const initialResolved =
    typeof document !== "undefined" &&
    document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light";
  const theme: Ref<string> = useSharedState("theme", () => initialTheme);
  const palette: Ref<ThemePalette> = useSharedState<ThemePalette>(
    "palette",
    () => initialPalette,
  );
  const resolvedTheme = useSharedState<"light" | "dark">(
    "resolved-theme",
    () => initialResolved,
  );

  function syncThemeColor() {
    const hex = THEME_COLOR[palette.value][resolvedTheme.value];
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", hex);
  }

  function applyTheme() {
    const mode = theme.value;
    const resolved: "light" | "dark" =
      mode === "auto"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : mode === "dark"
          ? "dark"
          : "light";

    resolvedTheme.value = resolved;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    syncThemeColor();
  }

  function applyPalette() {
    document.documentElement.dataset.palette = palette.value;
  }

  // 主题切换优先走 View Transition 整页交叉淡化，渐变表面也能平滑过渡；
  // 不支持的浏览器退回 theme-switching 的 CSS 过渡。
  function withSmoothTransition(apply: () => void) {
    document.documentElement.classList.add("theme-switching");
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (!reduced && typeof doc.startViewTransition === "function") {
      doc.startViewTransition(() => apply());
    } else {
      apply();
    }
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      document.documentElement.classList.remove("theme-switching");
    }, 560);
  }

  function setTheme(mode: string) {
    const next = (["light", "dark", "auto"] as ThemeMode[]).includes(
      mode as ThemeMode,
    )
      ? mode
      : "auto";
    if (theme.value === next) return;
    withSmoothTransition(() => {
      theme.value = next;
      clientState.set("site", "theme", next);
      applyTheme();
    });
  }

  function setPalette(value: string) {
    const next = normalizePalette(value);
    if (palette.value === next) return;
    withSmoothTransition(() => {
      palette.value = next;
      clientState.set("site", "palette", next);
      applyPalette();
      syncThemeColor();
    });
  }

  function init() {
    const saved = String(clientState.get("site", "theme", "auto"));
    theme.value = saved;
    palette.value = normalizePalette(
      clientState.get("site", "palette", "fresh"),
    );
    applyPalette();
    applyTheme();

    if (initialized) return;
    initialized = true;

    // Remove no-transition class after first paint (re-enable smooth transitions)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("no-transition");
      });
    });

    // Listen for system theme changes in auto mode
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (theme.value === "auto") applyTheme();
      });
  }

  instance = { theme, palette, resolvedTheme, setTheme, setPalette, init };
  return instance;
}
