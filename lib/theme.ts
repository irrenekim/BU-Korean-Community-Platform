// Color themes and light/dark mode.
// The colors themselves live in app/globals.css; this file lists the choices
// and saves the person's pick in this browser (localStorage).

export const THEMES = [
  { id: "minimal", name: "Minimal", swatch: ["#f5f5f5", "#111113", "#e8e8e8"] },
  { id: "bu", name: "BU Red", swatch: ["#f7f4f4", "#c8102e", "#f9e3e6"] },
  { id: "night", name: "Seoul Night", swatch: ["#f3f4fb", "#4f46e5", "#e6e7fd"] },
  { id: "celadon", name: "Celadon", swatch: ["#f1f6f4", "#0f8a73", "#d9eee7"] },
  { id: "blossom", name: "Cherry Blossom", swatch: ["#faf4f6", "#d6336c", "#fbe2eb"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type ModeChoice = "light" | "dark" | "system";

const THEME_KEY = "kc-theme";
const MODE_KEY = "kc-mode";

export function savedTheme(): ThemeId {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return THEMES.some((t) => t.id === value) ? (value as ThemeId) : "minimal";
  } catch {
    return "minimal";
  }
}

export function savedMode(): ModeChoice {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

// Puts the choice on <html data-theme="…" data-mode="light|dark"> so the CSS picks it up.
export function applyTheme(theme: ThemeId, mode: ModeChoice) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.mode = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
}

export function saveTheme(theme: ThemeId, mode: ModeChoice) {
  try {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Private browsing can block saving; the choice still applies until the page closes.
  }
  applyTheme(theme, mode);
}

// Runs in <head> before the page draws, so there's no flash of the wrong theme.
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"minimal";var m=localStorage.getItem("${MODE_KEY}")||"system";var d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var h=document.documentElement;h.dataset.theme=t;h.dataset.mode=d?"dark":"light";h.style.colorScheme=d?"dark":"light"}catch(e){}})()`;
