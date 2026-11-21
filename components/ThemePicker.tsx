"use client";

import { useEffect, useSyncExternalStore } from "react";
import { THEMES, applyTheme, saveTheme, savedMode, savedTheme, type ModeChoice, type ThemeId } from "@/lib/theme";

// My settings → Appearance: pick a color theme and light / dark mode.
// Saved in this browser, so it works even before logging in.
export default function ThemePicker() {
  // Read the saved choice in the browser only (the server can't see it)
  const theme = useSyncExternalStore(subscribe, savedTheme, () => "minimal" as ThemeId);
  const mode = useSyncExternalStore(subscribe, savedMode, () => "system" as ModeChoice);

  function choose(nextTheme: ThemeId, nextMode: ModeChoice) {
    saveTheme(nextTheme, nextMode);
    window.dispatchEvent(new Event(CHANGED));
  }

  return (
    <section className="card space-y-5 p-5" aria-labelledby="appearance-heading">
      <div>
        <h2 id="appearance-heading" className="section-title">Appearance</h2>
        <p className="muted mt-0.5">Saved on this device.</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Mode</legend>
        <div className="inline-flex rounded-full bg-gray-100 p-1">
          {([["light", "Light"], ["dark", "Dark"], ["system", "Match my device"]] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => choose(theme, id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                mode === id ? "bg-white text-ink shadow-sm" : "text-gray-500 hover:text-ink"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Color</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {THEMES.map((option) => {
            const [paper, accent, soft] = option.swatch;
            const active = theme === option.id;
            return (
              <button key={option.id} type="button" aria-pressed={active} onClick={() => choose(option.id, mode)}
                className={`self-start rounded-2xl p-2 text-left ring-2 transition ${active ? "ring-brand" : "ring-transparent hover:ring-gray-200"}`}>
                {/* Mini preview of the theme */}
                <span className="block overflow-hidden rounded-xl ring-1 ring-black/10" style={{ background: paper }}>
                  <span className="flex items-center gap-1.5 px-2.5 pt-2.5">
                    <span className="h-3 w-3 rounded-full" style={{ background: accent }} />
                    <span className="h-1.5 w-10 rounded-full bg-black/15" />
                  </span>
                  <span className="mx-2.5 my-2 block rounded-md px-2 py-1.5" style={{ background: "#ffffff" }}>
                    <span className="block h-1.5 w-12 rounded-full" style={{ background: soft }} />
                    <span className="mt-1.5 block h-1.5 w-16 rounded-full bg-black/15" />
                  </span>
                  <span className="mx-2.5 mb-2.5 block h-4 w-12 rounded-full" style={{ background: accent }} />
                </span>
                <span className="mt-1.5 block px-0.5 text-sm font-semibold">{option.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}

const CHANGED = "kc-theme-change";
function subscribe(callback: () => void) {
  window.addEventListener(CHANGED, callback);
  return () => window.removeEventListener(CHANGED, callback);
}

// Keeps "Match my device" in sync if the phone/laptop switches between light and dark.
export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => { if (savedMode() === "system") applyTheme(savedTheme(), "system"); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return null;
}
