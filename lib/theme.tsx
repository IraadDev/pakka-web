"use client";

/**
 * Theme, matching the design system's behaviour in pinlink.js: the choice is
 * stored under the same key and written to `data-theme` on <html>, so a page
 * from the DS and a page from the app agree on what theme is active.
 */
import * as React from "react";

const KEY = "fh-theme";
export type Theme = "dark" | "light";

export function useTheme() {
  // Server-rendered markup must not depend on localStorage, so the state
  // starts at the same default the inline script uses and is corrected on
  // mount. The script has already painted the right theme by then.
  const [theme, setTheme] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const stored = document.documentElement.getAttribute("data-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  const toggle = React.useCallback(() => {
    setTheme((cur) => {
      const next: Theme = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* private mode — the theme just will not persist */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}

/**
 * Applies the stored theme before first paint. Without this the page renders
 * dark and then flips, which is worse than either theme.
 */
export const THEME_SCRIPT = `(function(){try{
var p=new URLSearchParams(location.search).get("theme");
var t=(p==="light"||p==="dark")?p:(localStorage.getItem("${KEY}")||"dark");
document.documentElement.setAttribute("data-theme",t);
}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`;
