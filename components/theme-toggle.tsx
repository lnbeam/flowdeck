"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "flowdeck-theme";

/** Light/dark theme switch. The initial class is set pre-paint in layout.tsx;
 *  this just flips it on click and persists the choice. */
export function ThemeToggle() {
  // Server + first client render assume the default (dark) to avoid a hydration
  // mismatch; the effect syncs to whatever the pre-paint script applied.
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore unavailable storage */
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="h-8 w-8 shrink-0"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
