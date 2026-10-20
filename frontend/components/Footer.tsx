"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  // En paneles con barra lateral (contador o portal cliente), no mostrar footer inferior que interrumpa el layout
  if (pathname.startsWith("/contador") || pathname.startsWith("/portal-cliente")) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">

      </div>
    </footer>
  );
}
