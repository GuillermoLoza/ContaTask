"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileText,
  Users,
  Bell,
  LogOut,
  Building2,
  GitPullRequest,
  CheckCircle2,
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, getSavedUser, Usuario } from "@/lib/api";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<Usuario | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getSavedUser());
  }, [pathname]);

  if (pathname.startsWith("/contador") || pathname.startsWith("/portal-cliente")) {
    return null;
  }

  const handleLogout = () => {
    clearSession();
    setUser(null);
    router.push("/login");
  };

  const isContador = user?.rol === "CONTADOR";
  const isCliente = user?.rol === "CLIENTE";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="w-full flex h-16 items-center justify-between px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                ContaTask
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Gestión Contable & Tributaria
              </span>
            </div>
          </Link>

          {/* Navegación Desktop */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {isContador && (
                <>
                  <Link
                    href="/contador"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname === "/contador"
                      ? "bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/contador#clientes"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname.includes("clientes")
                      ? "bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      }`}
                  >
                    Clientes MYPE
                  </Link>
                  <Link
                    href="/contador#transacciones"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname.includes("transacciones")
                      ? "bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      }`}
                  >
                    Matriz de Documentos
                  </Link>
                  <Link
                    href="/contador#notificaciones"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname.includes("notificaciones")
                      ? "bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      }`}
                  >
                    Notificaciones
                  </Link>
                  <Link
                    href="/contador#proceso"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname.includes("proceso")
                      ? "bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      }`}
                  >
                    Flujo TO-BE (R1)
                  </Link>
                </>
              )}

              {isCliente && (
                <Link
                  href="/portal-cliente"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname.startsWith("/portal-cliente")
                    ? "bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    }`}
                >
                  Mi Portal MYPE
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Acciones Derecha */}
        <div className="flex items-center gap-2.5">

          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[170px]">
                  {user.nombre}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isContador ? "Contador Público" : `MYPE (${user.ruc || ""})`}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-xs gap-1.5 text-slate-600 dark:text-slate-300"
                title="Cerrar Sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          )}

          {/* Botón menú móvil */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>

      {/* Menú Móvil desplegable */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
          {isContador && (
            <>
              <Link
                href="/contador"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Dashboard Contador
              </Link>
              <Link
                href="/contador#clientes"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Clientes MYPE
              </Link>
              <Link
                href="/contador#transacciones"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Matriz de Transacciones
              </Link>
              <Link
                href="/contador#notificaciones"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Notificaciones y Contingencia
              </Link>
            </>
          )}
          {isCliente && (
            <Link
              href="/portal-cliente"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Mi Portal MYPE
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
