"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Menu,
  Building2,
  FileCheck2,
  FileUp,
  LayoutGrid,
  CalendarDays,
  PhoneCall,
  LogOut,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  XCircle,
  CheckCircle2,
  Download,
  ShieldAlert,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { clearSession, api } from "@/lib/api";
import { useClientePortal } from "@/context/ClientePortalContext";

interface ClientSidebarLayoutProps {
  children: React.ReactNode;
}

export function ClientSidebarLayout({ children }: ClientSidebarLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedRuc, setCopiedRuc] = useState(false);

  const {
    user,
    clienteInfo,
    clienteInactivo,
    loading,
    pendientesCount,
    uploadModalOpen,
    setUploadModalOpen,
    selectedTrx,
    fileToUpload,
    uploading,
    uploadError,
    uploadSuccess,
    handleFileSelection,
    handleDrop,
    handleSubirSustento,
    fileInputRef,
    visorModalOpen,
    setVisorModalOpen,
    docVisorUrl,
    docVisorNombre,
    docVisorId
  } = useClientePortal();

  const isEmpresaInactiva = !loading && (clienteInactivo || (clienteInfo && (clienteInfo.activo === false || (clienteInfo.activo as any) === 0)));

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  const handleCopyRuc = (ruc: string) => {
    navigator.clipboard.writeText(ruc);
    setCopiedRuc(true);
    setTimeout(() => setCopiedRuc(false), 2000);
  };

  const rucParam = searchParams.get("ruc");
  const querySuffix = rucParam ? `?ruc=${encodeURIComponent(rucParam)}` : "";

  const navItems = [
    {
      id: "resumen",
      label: "Resumen y Estado",
      icon: LayoutGrid,
      href: `/portal-cliente${querySuffix}`,
      active: pathname === "/portal-cliente",
    },
    {
      id: "sustentos",
      label: "Mis Documentos",
      icon: FileCheck2,
      href: `/portal-cliente/sustentos${querySuffix}`,
      active: pathname.startsWith("/portal-cliente/sustentos"),
    },
    {
      id: "pendientes",
      label: "Requerimientos Pendientes",
      icon: FileUp,
      href: `/portal-cliente/pendientes${querySuffix}`,
      active: pathname.startsWith("/portal-cliente/pendientes"),
      badge: pendientesCount > 0 ? `${pendientesCount}` : undefined,
      badgeColor: "bg-red-500 text-white",
    },
    {
      id: "cronograma",
      label: "Vencimiento SUNAT",
      icon: CalendarDays,
      href: `/portal-cliente/cronograma${querySuffix}`,
      active: pathname.startsWith("/portal-cliente/cronograma"),
    },
    {
      id: "contacto",
      label: "Mi Contador Asignado",
      icon: PhoneCall,
      href: `/portal-cliente/contacto${querySuffix}`,
      active: pathname.startsWith("/portal-cliente/contacto"),
    },
  ];

  return (
    <div className="h-screen h-[100dvh] max-h-screen flex flex-col bg-slate-100/70 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      {/* 1. TOPBAR DEL PORTAL CLIENTE */}
      <header className="h-16 shrink-0 bg-[#131b2e] text-white border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shadow-md z-30 transition-colors">

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
            aria-label="Alternar menú lateral"
            title="Alternar menú lateral"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link href={`/portal-cliente${querySuffix}`} className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg tracking-tight leading-tight text-white flex items-center gap-1.5">
                ContaTask
                {isEmpresaInactiva ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-950/60 text-red-300 border border-red-800">
                    Inactivo
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                    Portal del Cliente
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate max-w-[240px]">
                {clienteInfo?.razon_social || "Autogestión de Comprobantes"}
              </span>
            </div>
          </Link>
        </div>

        {/* Lado Derecho: RUC + Alerta + Switch Tema + Volver al Panel */}
        <div className="flex items-center gap-2 sm:gap-3">
          {clienteInfo?.ruc && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300">
              <span className="text-slate-400">RUC:</span>
              <span className="font-bold text-emerald-400">{clienteInfo.ruc}</span>
              <button
                onClick={() => handleCopyRuc(clienteInfo.ruc)}
                className="ml-1 hover:text-emerald-400 cursor-pointer"
                title="Copiar RUC"
              >
                {copiedRuc ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          {!isEmpresaInactiva && pendientesCount > 0 && (
            <Link
              href={`/portal-cliente/pendientes${querySuffix}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/50 border border-amber-800 text-amber-300 text-xs font-semibold hover:bg-amber-900/60 cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>{pendientesCount} por entregar</span>
            </Link>
          )}

          {/* Si el usuario autenticado es contador, botón para volver */}
          {user?.rol === "CONTADOR" && (
            <Link
              href="/contador"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-950/60 text-blue-300 border border-blue-800 hover:bg-blue-900/50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Panel Contador</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando datos del portal...</p>
          </div>
        </div>
      ) : isEmpresaInactiva ? (
        <div className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="max-w-xl w-full bg-white dark:bg-[#131b2e] rounded-2xl shadow-xl border border-red-200 dark:border-red-900/50 p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400 shadow-inner">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800 tracking-wide uppercase">
                Acceso al Portal Restringido
              </span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
                Empresa Desactivada
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                El acceso al portal para <strong className="text-slate-900 dark:text-white">{clienteInfo?.razon_social || "esta empresa"}</strong> (RUC: <span className="font-mono font-semibold">{clienteInfo?.ruc || rucParam}</span>) se encuentra temporalmente inactivo en el sistema.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2 text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Restricciones de cuenta:
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>No se permite la consulta de transacciones ni el envío de documentos de pago.</li>
                <li>Los recordatorios y cronogramas tributarios están suspendidos para este RUC.</li>
                <li>Para reactivar sus servicios o consultar el estado de su cuenta, comuníquese con su asesor contable en <strong>Estudio Lozano & Asociados</strong>.</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {user?.rol === "CONTADOR" ? (
                <Button
                  onClick={() => router.push("/contador/clientes")}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a Gestión de Clientes
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full sm:w-auto border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              )}
              <a
                href="https://wa.me/51920843098?text=Hola,%20solicito%20información%20sobre%20el%20estado%20de%20mi%20empresa%20en%20ContaTask"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Contactar al Asesor
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden relative">
          {/* Backdrop para dispositivos móviles */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-20 md:hidden"
              aria-hidden="true"
            />
          )}

          {/* 2. SIDEBAR DEL CLIENTE CON SCROLL PROPIO Y RESPONSIVE VERTICALMENTE */}
          <aside
            className={`${sidebarOpen ? "w-64" : "w-0 -translate-x-full md:w-0"
              } transition-all duration-200 ease-in-out bg-[#131b2e] text-slate-200 flex flex-col shrink-0 h-full max-h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar border-r border-slate-800 z-30 md:z-20 md:static fixed inset-y-16 left-0 shadow-2xl md:shadow-none select-none`}
          >
            {sidebarOpen && (
              <div className="flex flex-col min-h-full w-64">
                {/* Tarjeta de Identificación de la Empresa MYPE */}
                <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/50 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md ring-4 ring-emerald-500/20 shrink-0">
                      <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-xs sm:text-sm leading-snug truncate" title={clienteInfo?.razon_social}>
                        {clienteInfo?.razon_social || "Empresa MYPE"}
                      </h3>
                      <p className="text-[11px] font-mono text-emerald-400 font-semibold mt-0.5">
                        RUC: {clienteInfo?.ruc || "---"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-center text-[14px]">
                    {clienteInfo?.contacto_nombre || "Titular"}
                  </div>
                </div>

                {/* Menú de Navegación con Rutas Dedicadas */}
                <nav className="p-3 space-y-1 sm:space-y-1.5 flex-1 min-h-0">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.active;

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`w-full flex items-center gap-3 px-3.5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${isActive
                          ? "bg-emerald-600 text-white shadow-xs font-semibold"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                          }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {/* Tarjeta Informativa del Estudio Contable */}
                { /*<div className="p-3.5 m-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-white">
                      Estudio Lozano & Asoc.
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
                    Su asesor contable revisa y valida sus documentos para SUNAT.
                  </p>
                  <a
                    href="https://wa.me/51920843098?text=Hola,%20tengo%20una%20consulta%20sobre%20mis%20documentos%20contables"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:underline pt-0.5"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Consultar por WhatsApp →
                  </a>
                </div>*/ }
              </div>
            )}
          </aside>

          {/* 3. CONTENIDO PRINCIPAL */}
          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      )}

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Subida de Documento</DialogTitle>
            <DialogDescription className="text-xs">
              Adjunte voucher de pago, constancia de transferencia o factura digital para su validación contable.
            </DialogDescription>
          </DialogHeader>

          {selectedTrx && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <p><strong>Comprobante:</strong> {selectedTrx.comprobante_tipo} {selectedTrx.numero_comprobante}</p>
                <p><strong>Proveedor:</strong> {selectedTrx.emisor_razon_social}</p>
                <p><strong>Monto Total:</strong> S/ {selectedTrx.monto_total.toFixed(2)}</p>
                {selectedTrx.requiere_bancarizacion === 1 && (
                  <p className="text-red-600 font-semibold">
                    * Operación sujeta a bancarización (Ley 30730: &ge; S/ 2,000)
                  </p>
                )}
              </div>

              {/* Mensajes de Alerta */}
              {uploadError && (
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-start gap-2 animate-fade-in">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Error en la carga</p>
                    <p>{uploadError}</p>
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <p>{uploadSuccess}</p>
                </div>
              )}

              {/* Zona Drag & Drop */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileSelection(e.target.files[0])}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                />
                <div className="mx-auto h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {fileToUpload ? fileToUpload.name : "Haga clic o arrastre el archivo aquí"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Formatos admitidos: <strong>PDF, JPG, PNG o WebP</strong> (Máx. 10 MB)
                  </p>
                </div>
                {fileToUpload && (
                  <p className="text-[11px] text-emerald-600 font-semibold">
                    Tamaño: {(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setUploadModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubirSustento}
              disabled={uploading || !fileToUpload}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
            >
              {uploading ? "Cargando archivo..." : "Confirmar y Subir Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={visorModalOpen} onOpenChange={setVisorModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-base font-bold truncate max-w-md">
                  {docVisorNombre}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Visor integrado de documento en formato original
                </DialogDescription>
              </div>
              {docVisorId && (
                <a
                  href={api.getDocumentoFileUrl(docVisorId, true)}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Descargar
                </a>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-[450px] bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center p-2 border border-slate-200 dark:border-slate-800">
            {docVisorUrl ? (
              docVisorNombre.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={docVisorUrl}
                  className="w-full h-[500px] rounded border-0"
                  title="Visor PDF"
                />
              ) : (
                <img
                  src={docVisorUrl}
                  alt={docVisorNombre}
                  className="max-h-[500px] max-w-full object-contain rounded shadow-xs"
                />
              )
            ) : (
              <p className="text-xs text-slate-400">Error: Documento no disponible.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
