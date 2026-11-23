"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type Theme = "system" | "light" | "dark";
const KEY = "dentora.theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  let dark = theme === "dark";
  try {
    dark = dark || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  } catch {}
  root.dataset.theme = theme;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

/** Light / dark / auto, stored under the same key as the clinic portal. Dark mode is `.dark` on <html>. */
export function ThemeToggle({ lang }: { lang: Lang }) {
  const s = t(lang);
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {}
    // Reading the stored choice after hydration is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    apply(next);
  }

  const options: { value: Theme; label: string }[] = [
    { value: "light", label: s.themeLight },
    { value: "system", label: s.themeSystem },
    { value: "dark", label: s.themeDark },
  ];
  return (
    <div className="dt-segmented" role="group" aria-label={s.theme}>
      {options.map((option) => (
        <button key={option.value} type="button" className="dt-segment" aria-pressed={theme === option.value} onClick={() => choose(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
