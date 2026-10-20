"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string } = {}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Verificar preferencia guardada o clase actual
    const savedTheme = localStorage.getItem("contatask_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Modo Claro por defecto
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("contatask_theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("contatask_theme", "light");
      setTheme("light");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={`gap-2 text-xs font-medium border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white ${className || ""}`}
      title={theme === "light" ? "Cambiar a Modo Oscuro" : "Cambiar a Modo Claro"}
    >
      {theme === "light" ? (
        <>
          <Sun className="h-4 w-4 text-amber-500 fill-amber-500" />
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-blue-400 fill-blue-400" />
        </>
      )}
    </Button>
  );
}
