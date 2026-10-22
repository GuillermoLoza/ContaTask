"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { CODIGOS_PAIS, CodigoPais } from "@/lib/constants";

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CountryCodeSelect({
  value,
  onChange,
  className = "",
  disabled = false,
}: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = CODIGOS_PAIS.find((p) => p.code === value) || CODIGOS_PAIS[0];

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    // Buscar el contenedor del modal si existe para renderizar dentro de su contexto de eventos
    const dialogEl = triggerRef.current.closest('[role="dialog"]') as HTMLElement | null;
    const target = dialogEl || document.body;
    setPortalTarget(target);

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 225; // Altura aproximada del menú desplegable

    if (dialogEl) {
      const dialogRect = dialogEl.getBoundingClientRect();
      const spaceBelow = dialogRect.bottom - triggerRect.bottom;
      const spaceAbove = triggerRect.top - dialogRect.top;

      // Si abajo no hay suficiente espacio pero arriba sí, abrir hacia arriba
      const placeAbove = spaceBelow < dropdownHeight && spaceAbove >= spaceBelow;

      // Asegurar que no se desborde horizontalmente de la ventana del diálogo
      const targetLeft = triggerRect.left - dialogRect.left;
      const clampedLeft = Math.max(12, Math.min(targetLeft, dialogRect.width - 275));

      setCoords({
        left: clampedLeft,
        top: placeAbove ? undefined : triggerRect.bottom - dialogRect.top + 4,
        bottom: placeAbove ? dialogRect.bottom - triggerRect.top + 4 : undefined,
        width: 265,
      });
    } else {
      // Fallback para fuera de un modal
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const placeAbove = spaceBelow < dropdownHeight && triggerRect.top > dropdownHeight;

      setCoords({
        left: Math.max(12, Math.min(triggerRect.left, window.innerWidth - 275)),
        top: placeAbove ? undefined : triggerRect.bottom + 4,
        bottom: placeAbove ? window.innerHeight - triggerRect.top + 4 : undefined,
        width: 265,
      });
    }
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setSearch("");
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Auto focus en el buscador al abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Manejo de clic fuera, Escape y scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScroll = (e: Event) => {
      // Si el scroll ocurre dentro del propio menú de países, no cerrar
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updatePosition]);

  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filteredCountries = CODIGOS_PAIS.filter((p) => {
    if (!search.trim()) return true;
    const query = normalizeText(search.trim());
    const countryName = normalizeText(p.country);
    const codeClean = p.code.replace("+", "");
    return countryName.includes(query) || p.code.includes(query) || codeClean.includes(query);
  });

  const handleSelectCountry = (country: CodigoPais) => {
    onChange(country.code);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group inline-flex items-center justify-between gap-1.5 h-8 px-2.5 rounded-l-md border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all cursor-pointer select-none shrink-0 focus:outline-none ${
          isOpen ? "bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" : ""
        } ${className}`}
        title={`Código de país seleccionado: ${selectedCountry.country} (${selectedCountry.code})`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm leading-none drop-shadow-xs">{selectedCountry.flag}</span>
          <span className="font-mono font-semibold text-xs text-slate-700 dark:text-slate-200">
            {selectedCountry.code}
          </span>
        </div>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
          }`}
        />
      </button>

      {isOpen &&
        coords &&
        portalTarget &&
        createPortal(
          <div
            ref={dropdownRef}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: portalTarget === document.body ? "fixed" : "absolute",
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 100,
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-1.5 flex flex-col animate-in fade-in-0 zoom-in-95 duration-100"
          >
            {/* Buscador de país / prefijo */}
            <div className="relative mb-1 px-1 pt-0.5">
              <div className="flex items-center h-7 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30">
                <Search className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar país o prefijo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista scrollable de países */}
            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5 overscroll-contain">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((item) => {
                  const isSelected = item.code === value;
                  return (
                    <button
                      key={`${item.code}-${item.country}`}
                      type="button"
                      onClick={() => handleSelectCountry(item)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? "bg-blue-600 text-white font-medium shadow-xs"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-sm leading-none shrink-0">{item.flag}</span>
                        <span className="truncate">{item.country}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                            isSelected
                              ? "bg-blue-700 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60"
                          }`}
                        >
                          {item.code}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white shrink-0 ml-0.5" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  <p>No se encontraron países</p>
                </div>
              )}
            </div>
          </div>,
          portalTarget
        )}
    </div>
  );
}
