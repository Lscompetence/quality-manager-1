"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Bascule de thème des maquettes : le bouton affiche le thème ACTUEL
 * (soleil orangé en clair, lune en sombre), les deux icônes glissant
 * l'une après l'autre. Voir `.theme-toggle` dans globals.css.
 */
export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    const stored = (localStorage.getItem("qm-theme") as "dark" | "light" | null) ?? "dark";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("qm-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      className="theme-toggle qm-icon-btn relative overflow-hidden"
    >
      <span className="ic-sun absolute inset-0 grid place-items-center">
        <Sun className="h-4 w-4" />
      </span>
      <span className="ic-moon absolute inset-0 grid place-items-center">
        <Moon className="h-4 w-4" />
      </span>
    </button>
  );
}
