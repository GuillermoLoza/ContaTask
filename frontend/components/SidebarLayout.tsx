"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Bell,
  LogOut,
  LayoutGrid,
  Building2,
  FileCheck2,
  BellRing,
  User,
  ChevronRight,
  MessageSquare,
  Mail,
  RefreshCw,
  Eye,
  Download,
  Send,
  XCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Server,
  AtSign,
  KeyRound,
  Sparkles,
  EyeOff,
  Copy,
  Lock,
  Inbox,
  AlertTriangle,
  FileText,
  Calculator
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { clearSession, api } from "@/lib/api";
import { useContador } from "@/context/ContadorContext";

function limpiarTextoUI(str?: string | null): string {
  if (!str) return "";
  try {
    str = decodeURIComponent(str);
  } catch { }
  return str
    .replace(/^ASUNTO:\s*/gi, "")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&oacute;/gi, "ó")
    .replace(/&iacute;/gi, "í")
    .replace(/&eacute;/gi, "é")
    .replace(/&aacute;/gi, "á")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/&deg;/gi, "°")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function limpiarHtmlSunat(html?: string | null): string {
  if (!html) return "";
  try {
    html = decodeURIComponent(html);
  } catch { }
  return html
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&oacute;/gi, "ó")
    .replace(/&iacute;/gi, "í")
    .replace(/&eacute;/gi, "é")
    .replace(/&aacute;/gi, "á")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/&deg;/gi, "°");
}

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifModalOpen, setNotifModalOpen] = useState(false);

  const {
    user,
    whatsappStatus,
    smtpConfig,
    loadAllData,
    notificaciones,

    // Modal Solicitar
    solicitarModalOpen,
    setSolicitarModalOpen,
    trxParaSolicitar,
    clienteParaNotificar,
    canalEnvio,
    setCanalEnvio,
    forzarFallo,
    setForzarFallo,
    mensajePersonalizado,
    setMensajePersonalizado,
    solicitudEnviando,
    resultadoEnvio,
    handleEnviarSolicitud,

    // Modal Evaluar
    evaluarModalOpen,
    setEvaluarModalOpen,
    trxParaEvaluar,
    accionEvaluacion,
    setAccionEvaluacion,
    motivoRechazo,
    setMotivoRechazo,
    evaluando,
    evalError,
    handleConfirmarEvaluacion,

    // Modal Visor
    visorModalOpen,
    setVisorModalOpen,
    docVisorUrl,
    docVisorNombre,
    docVisorId,

    // Modal Cliente MYPE Unificado
    clienteModalOpen,
    setClienteModalOpen,
    clienteEnEdicion,
    activeClienteTab,
    setActiveClienteTab,
    nuevoRuc,
    setNuevoRuc,
    nuevaRazonSocial,
    setNuevaRazonSocial,
    nuevoNombreComercial,
    setNuevoNombreComercial,
    nuevoContactoNombre,
    setNuevoContactoNombre,
    nuevoEmail,
    setNuevoEmail,
    nuevoCelular,
    setNuevoCelular,
    nuevoRegimen,
    setNuevoRegimen,
    nuevaDireccion,
    setNuevaDireccion,
    nuevoUsuarioSol,
    setNuevoUsuarioSol,
    nuevaClaveSol,
    setNuevaClaveSol,
    nuevoSunatClientId,
    setNuevoSunatClientId,
    nuevoSunatClientSecret,
    setNuevoSunatClientSecret,
    creandoCliente,
    clienteError,
    clienteSuccess,
    handleGuardarCliente,
    handleCrearCliente,
    handleValidarSunatEnModalCliente,
    handleAutologinEnModalCliente,

    // Modal SMTP
    smtpModalOpen,
    setSmtpModalOpen,
    smtpHost,
    setSmtpHost,
    smtpPort,
    setSmtpPort,
    smtpUser,
    setSmtpUser,
    smtpPass,
    setSmtpPass,
    smtpFrom,
    setSmtpFrom,
    smtpSecure,
    setSmtpSecure,
    smtpTesting,
    smtpTestEmail,
    setSmtpTestEmail,
    smtpTestResult,
    smtpSaving,
    handleTestSmtp,
    handleGuardarSmtp,

    // Modal Detalle Correo
    detalleCorreoModalOpen,
    setDetalleCorreoModalOpen,
    correoSeleccionado,

    // Modal Configuración Clave SOL & Token
    sunatModalOpen,
    setSunatModalOpen,
    clienteParaSunat,
    usuarioSol,
    setUsuarioSol,
    claveSol,
    setClaveSol,
    sunatClientId,
    setSunatClientId,
    sunatClientSecret,
    setSunatClientSecret,
    sunatValidando,
    sunatGuardando,
    sunatResult,
    sunatError,
    handleGuardarSunatCredenciales,
    handleValidarSunatConexion,
    handleAutologinSunat,

    // Modal Detalle Buzón SOL
    modalDetalleBuzonOpen,
    setModalDetalleBuzonOpen,
    buzonMensajeSeleccionado,
    handleMarcarBuzonLeido,
    cargandoDetalleBuzon
  } = useContador();

  const [showClaveSol, setShowClaveSol] = useState(false);
  const [copiadoToken, setCopiadoToken] = useState(false);

  const [descargandoAdjuntoId, setDescargandoAdjuntoId] = useState<number | null>(null);

  const handleCopiarToken = (tokenText: string) => {
    navigator.clipboard.writeText(tokenText);
    setCopiadoToken(true);
    setTimeout(() => setCopiadoToken(false), 2000);
  };

  const handleDescargarAdjunto = async (codArchivo: number, nombreArchivo?: string) => {
    if (!buzonMensajeSeleccionado) return;
    setDescargandoAdjuntoId(codArchivo);
    try {
      await api.descargarBuzonSolAdjunto(buzonMensajeSeleccionado.id, codArchivo, nombreArchivo);
    } catch (err: any) {
      alert("Error al descargar archivo oficial: " + (err?.message || "Intente nuevamente."));
    } finally {
      setDescargandoAdjuntoId(null);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  const navItems = [
    {
      id: "inicio",
      label: "Inicio",
      icon: LayoutGrid,
      href: "/contador",
      active: pathname === "/contador",
    },
    {
      id: "clientes",
      label: "Directorio de Clientes",
      icon: Building2,
      href: "/contador/clientes",
      active: pathname.startsWith("/contador/clientes"),
    },
    {
      id: "transacciones",
      label: "Transacciones / Documentos",
      icon: FileCheck2,
      href: "/contador/transacciones",
      active: pathname.startsWith("/contador/transacciones"),
    },
    {
      id: "notificaciones",
      label: "Notificaciones SUNAT",
      icon: BellRing,
      href: "/contador/notificaciones",
      active: pathname.startsWith("/contador/notificaciones"),
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageSquare,
      href: "/contador/whatsapp",
      active: pathname.startsWith("/contador/whatsapp"),
    },
    {
      id: "correos",
      label: "Correos",
      icon: Mail,
      href: "/contador/correos",
      active: pathname.startsWith("/contador/correos"),
    },
    {
      id: "sunat",
      label: "Buzón SOL & SUNAT",
      icon: ShieldCheck,
      href: "/contador/sunat",
      active: pathname.startsWith("/contador/sunat"),
    },
    {
      id: "tributacion",
      label: "SIRE & PLAME",
      icon: Calculator,
      href: "/contador/tributacion",
      active: pathname.startsWith("/contador/tributacion"),
    },
    {
      id: "portal-cliente",
      label: "Portal del Cliente",
      icon: ExternalLink,
      href: "/portal-cliente?ruc=20512345671",
      external: true,
    },
  ];

  return (
    <div className="h-screen h-[100dvh] max-h-screen flex flex-col bg-slate-100/70 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      <header className="h-16 shrink-0 bg-[#131b2e] text-white border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shadow-md z-30 transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
            aria-label="Alternar barra lateral"
            title="Alternar barra lateral"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link href="/contador" className="flex flex-col">
            <span className="font-bold text-lg sm:text-xl tracking-tight leading-tight text-white flex items-center gap-1.5">
              ContaTask
            </span>
            <span className="text-[11px] text-slate-400 font-medium -mt-0.5">
              Gestión de Clientes
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">

          { /* <ThemeToggle /> */}

          {/* Campana con Badge Rojo "3" */}
          <div className="relative">
            <button
              onClick={() => setNotifModalOpen(!notifModalOpen)}
              className="p-2 rounded-md hover:bg-slate-800 text-slate-200 hover:text-white transition-colors relative cursor-pointer"
              title="Notificaciones tributarias pendientes"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            {/* Popup desplegable de notificaciones */}
            {notifModalOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#131b2e] border border-slate-800 rounded-lg shadow-2xl p-3 z-50 text-xs text-slate-200 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="font-bold text-white">Alertas Tributarias</span>
                  <Badge variant="destructive" className="text-[10px] h-4">3 pendientes</Badge>
                </div>
                <div className="space-y-2">
                  <div className="p-2 rounded bg-amber-950/40 border border-amber-900 text-amber-200">
                    <p className="font-semibold">Textiles Lima S.A.C.</p>
                    <p className="text-[11px] text-amber-300">Falta voucher bancario por S/ 4,850.00</p>
                  </div>
                  <div className="p-2 rounded bg-red-950/40 border border-red-900 text-red-200">
                    <p className="font-semibold">Ferretería El Norte</p>
                    <p className="text-[11px] text-red-300">Comprobante observado / rechazado</p>
                  </div>
                  <div className="p-2 rounded bg-blue-950/40 border border-blue-900 text-blue-200">
                    <p className="font-semibold">Col. María Auxiliadora</p>
                    <p className="text-[11px] text-blue-300">Vencimiento SUNAT: 18 de Septiembre</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botón Salir / Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Backdrop para dispositivos móviles */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-20 md:hidden"
            aria-hidden="true"
          />
        )}

        <aside
          className={`${sidebarOpen ? "w-64" : "w-0 -translate-x-full md:w-0"
            } transition-all duration-200 ease-in-out bg-[#131b2e] text-slate-200 flex flex-col shrink-0 h-full max-h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar border-r border-slate-800 z-30 md:z-20 md:static fixed inset-y-16 left-0 shadow-2xl md:shadow-none select-none`}
        >
          {sidebarOpen && (
            <div className="flex flex-col min-h-full w-64">
              {/* Perfil del Contador con escala vertical responsiva */}
              <div className="p-4 sm:p-5 flex flex-col items-center text-center shrink-0 border-b border-slate-800 bg-slate-900/50">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md mb-2 sm:mb-3 ring-4 ring-blue-500/20 shrink-0">
                  <User className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h3 className="font-bold text-white text-xs sm:text-sm leading-snug">
                  {user?.nombre || "Lic. Guillermo Lozano"}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                  {user?.email || "contador@contasync.pe"}
                </p>
              </div>

              {/* Menú de Navegación Lateral con Enlaces Dedicados */}
              <nav className="p-3 space-y-1 sm:space-y-1.5 flex-1 min-h-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.active;

                  if (item.external) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        target="_blank"
                        className="flex items-center gap-3 px-3.5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                      >
                        <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-40 shrink-0" />
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`w-full flex items-center gap-3 px-3.5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${isActive
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </aside>

        {/* 3. MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-slate-100/70 dark:bg-[#0b0f19] transition-colors">
          {children}
        </main>
      </div>

      {/* MODAL 1: SOLICITAR SUSTENTO / NOTIFICAR VENCIMIENTO */}
      <Dialog open={solicitarModalOpen} onOpenChange={setSolicitarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {clienteParaNotificar ? "Notificar Vencimiento SUNAT" : "Solicitar Documento"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Envío multicanal mediante WhatsApp API oficial y correo electrónico con contingencia automática.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            {clienteParaNotificar && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-1">
                <p><strong>MYPE:</strong> {clienteParaNotificar.nombre}</p>
                <p><strong>RUC:</strong> {clienteParaNotificar.ruc}</p>
                <p><strong>Vencimiento SUNAT:</strong> {clienteParaNotificar.vencimiento}</p>
                <p><strong>Pendientes:</strong> {clienteParaNotificar.pendientes} requerimiento(s)</p>
              </div>
            )}

            {trxParaSolicitar && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-1">
                <p><strong>MYPE:</strong> {trxParaSolicitar.cliente_razon_social}</p>
                <p><strong>Comprobante:</strong> {trxParaSolicitar.comprobante_tipo} {trxParaSolicitar.numero_comprobante}</p>
                <p><strong>Monto:</strong> S/ {trxParaSolicitar.monto_total.toFixed(2)}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Canal de Notificación:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={canalEnvio === "WHATSAPP" ? "default" : "outline"}
                  onClick={() => setCanalEnvio("WHATSAPP")}
                  className={`text-xs gap-1.5 cursor-pointer ${canalEnvio === "WHATSAPP" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                    }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={canalEnvio === "EMAIL" ? "default" : "outline"}
                  onClick={() => setCanalEnvio("EMAIL")}
                  className={`text-xs gap-1.5 cursor-pointer ${canalEnvio === "EMAIL" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
                    }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Correo Electrónico
                </Button>
              </div>
            </div>

            {canalEnvio === "WHATSAPP" && (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200">
                <input
                  type="checkbox"
                  id="forzarFallo"
                  checked={forzarFallo}
                  onChange={(e) => setForzarFallo(e.target.checked)}
                  className="rounded text-amber-600 cursor-pointer"
                />
                <label htmlFor="forzarFallo" className="cursor-pointer text-[11px]">
                  Simular falla de WhatsApp (Prueba de contingencia automática a correo)
                </label>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="customMensaje" className="text-xs">Mensaje Adicional (Opcional):</Label>
              <Textarea
                id="customMensaje"
                rows={3}
                placeholder="Indique alguna indicación especial para el cliente..."
                value={mensajePersonalizado}
                onChange={(e) => setMensajePersonalizado(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            {resultadoEnvio && (
              <div className="p-3 rounded-lg border text-xs space-y-1 bg-slate-50 dark:bg-slate-800/80">
                <div className="flex items-center gap-1.5 font-bold">
                  {resultadoEnvio.estado === "ENVIADO" ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Despacho Exitoso
                    </span>
                  ) : resultadoEnvio.estado === "RESPALDO_ENVIADO" ? (
                    <span className="text-blue-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Contingencia Activada (Enviado por Correo)
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> Fallo en el envío
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-300">{resultadoEnvio.mensaje}</p>
                {resultadoEnvio.destinatario && (
                  <p className="text-[11px] text-slate-500 font-mono">Destino: {resultadoEnvio.destinatario}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setSolicitarModalOpen(false)}>
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={handleEnviarSolicitud}
              disabled={solicitudEnviando}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              {solicitudEnviando ? "Despachando..." : "Despachar Notificación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EVALUAR DOCUMENTO (APROBAR / RECHAZAR) */}
      <Dialog open={evaluarModalOpen} onOpenChange={setEvaluarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Evaluación de Comprobante / Documento</DialogTitle>
            <DialogDescription className="text-xs">
              Valide la conformidad contable y tributaria del documento adjunto (RF-C04).
            </DialogDescription>
          </DialogHeader>

          {trxParaEvaluar && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <p><strong>Comprobante:</strong> {trxParaEvaluar.comprobante_tipo} {trxParaEvaluar.numero_comprobante}</p>
                <p><strong>MYPE Cliente:</strong> {trxParaEvaluar.cliente_razon_social}</p>
                <p><strong>Proveedor:</strong> {trxParaEvaluar.emisor_razon_social} (RUC: {trxParaEvaluar.emisor_ruc})</p>
                <p><strong>Monto:</strong> S/ {trxParaEvaluar.monto_total.toFixed(2)}</p>
              </div>

              {evalError && (
                <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <p>{evalError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Resolución Contable:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={accionEvaluacion === "APROBAR" ? "default" : "outline"}
                    onClick={() => setAccionEvaluacion("APROBAR")}
                    className={`text-xs gap-1.5 cursor-pointer ${accionEvaluacion === "APROBAR" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                      }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aprobar Conforme
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={accionEvaluacion === "RECHAZAR" ? "destructive" : "outline"}
                    onClick={() => setAccionEvaluacion("RECHAZAR")}
                    className="text-xs gap-1.5 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Observar / Rechazar
                  </Button>
                </div>
              </div>

              {accionEvaluacion === "RECHAZAR" && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label htmlFor="motivoRechazo" className="text-xs font-semibold text-red-600">
                    Motivo de la Observación (Obligatorio):
                  </Label>
                  <Textarea
                    id="motivoRechazo"
                    rows={3}
                    placeholder="Especifique el motivo: Voucher borroso, monto no coincide, falta número de operación, etc."
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    className="text-xs border-red-300 dark:border-red-900 resize-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Esta observación se mostrará de inmediato en el portal del cliente.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEvaluarModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarEvaluacion}
              disabled={evaluando}
              className={`text-white text-xs gap-1.5 cursor-pointer ${accionEvaluacion === "APROBAR"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
                }`}
            >
              {evaluando ? "Guardando..." : "Confirmar Resolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VISOR DE DOCUMENTO (RF-C05) */}
      <Dialog open={visorModalOpen} onOpenChange={setVisorModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-base font-bold truncate max-w-md">
                  {docVisorNombre}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Visor de documento contable en formato original (RF-C05)
                </DialogDescription>
              </div>
              {docVisorId && (
                <a
                  href={api.getDocumentoFileUrl(docVisorId, true)}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
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

      {/* MODAL 4: GESTIÓN UNIFICADA DE CLIENTE MYPE & CREDENCIALES SOL */}
      <Dialog open={clienteModalOpen} onOpenChange={setClienteModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
          <form onSubmit={handleGuardarCliente} className="flex flex-col flex-1 overflow-hidden">
            <DialogHeader className="shrink-0 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1e3a8a] dark:text-blue-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {clienteEnEdicion ? (
                      <>
                        <span>Editar Cliente MYPE</span>
                        <Badge variant="outline" className="text-[10px] font-mono border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/50">
                          {clienteEnEdicion.ruc}
                        </Badge>
                      </>
                    ) : (
                      "Registrar Nuevo Cliente MYPE"
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Administre la información comercial, datos de contacto y credenciales oficiales de SUNAT SOL en un solo formulario.
                  </DialogDescription>
                </div>
              </div>

              {/* Selector de Pestañas Unificadas */}
              <div className="flex items-center gap-2 pt-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveClienteTab("DATOS")}
                  className={`flex items-center gap-1.5 pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${activeClienteTab === "DATOS"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>1. Datos de la Empresa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveClienteTab("SUNAT")}
                  className={`flex items-center gap-1.5 pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${activeClienteTab === "SUNAT"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>2. Clave SOL & Conexión SUNAT</span>
                  {clienteEnEdicion?.sunat_estado_conexion === "CONECTADO" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                  )}
                </button>
              </div>
            </DialogHeader>

            <div className="space-y-3 text-xs py-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {clienteError && (
                <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <p>{clienteError}</p>
                </div>
              )}

              {clienteSuccess && (
                <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p>{clienteSuccess}</p>
                </div>
              )}

              {/* PESTAÑA 1: DATOS DE LA EMPRESA */}
              {activeClienteTab === "DATOS" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-5 space-y-1">
                      <Label htmlFor="regRuc" className="text-xs font-semibold">
                        RUC (11 dígitos): <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="regRuc"
                        maxLength={11}
                        placeholder="20601234567"
                        value={nuevoRuc}
                        onChange={(e) => setNuevoRuc(e.target.value.replace(/\D/g, ""))}
                        className="text-xs h-8 font-mono"
                        required
                      />
                    </div>
                    <div className="sm:col-span-7 space-y-1">
                      <Label htmlFor="regRazon" className="text-xs font-semibold">
                        Razón Social: <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="regRazon"
                        placeholder="Ej: Comercial Andina S.A.C."
                        value={nuevaRazonSocial}
                        onChange={(e) => setNuevaRazonSocial(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="regNombreComercial" className="text-xs">Nombre Comercial (opcional):</Label>
                      <Input
                        id="regNombreComercial"
                        placeholder="Ej: Andina Market"
                        value={nuevoNombreComercial}
                        onChange={(e) => setNuevoNombreComercial(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="regRegimen" className="text-xs font-semibold">
                        Régimen Tributario: <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="regRegimen"
                        value={nuevoRegimen}
                        onChange={(e) => setNuevoRegimen(e.target.value)}
                        className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 font-medium"
                      >
                        <option value="MYPE Tributario">MYPE Tributario (RMT)</option>
                        <option value="Régimen Especial (RER)">Régimen Especial (RER)</option>
                        <option value="Régimen General">Régimen General</option>
                        <option value="Nuevo RUS">Nuevo RUS</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="regContacto" className="text-xs">Contacto / Representante:</Label>
                      <Input
                        id="regContacto"
                        placeholder="Ej: Juan Pérez Morales"
                        value={nuevoContactoNombre}
                        onChange={(e) => setNuevoContactoNombre(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="regCelular" className="text-xs font-semibold">
                        Celular WhatsApp: <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="h-8 px-2 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 text-xs flex items-center font-mono">
                          +51
                        </span>
                        <Input
                          id="regCelular"
                          placeholder="920843098"
                          value={nuevoCelular}
                          onChange={(e) => setNuevoCelular(e.target.value.replace(/\D/g, ""))}
                          className="text-xs h-8 font-mono flex-1"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regEmail" className="text-xs font-semibold">
                      Correo Electrónico de Notificaciones: <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="regEmail"
                      type="email"
                      placeholder="contacto@mype.pe"
                      value={nuevoEmail}
                      onChange={(e) => setNuevoEmail(e.target.value)}
                      className="text-xs h-8"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regDireccion" className="text-xs">Dirección Fiscal:</Label>
                    <Input
                      id="regDireccion"
                      placeholder="Ej: Av. Las Begonias 450 Int. 201, San Isidro, Lima"
                      value={nuevaDireccion}
                      onChange={(e) => setNuevaDireccion(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: CREDENCIALES SOL & CONEXIÓN SUNAT */}
              {activeClienteTab === "SUNAT" && (
                <div className="space-y-3.5 animate-fade-in">
                  {/* Tarjeta de Estado de Conexión actual */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Estado de Conexión SOL:</span>
                      <div className="flex items-center gap-2">
                        {clienteEnEdicion?.sunat_estado_conexion === "CONECTADO" ? (
                          <Badge variant="success" className="text-[10px] gap-1 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            CONECTADO Y AUTENTICADO
                          </Badge>
                        ) : nuevoUsuarioSol ? (
                          <Badge variant="warning" className="text-[10px] font-bold">
                            PENDIENTE DE VALIDAR TOKEN
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] text-slate-400">
                            NO CONFIGURADO
                          </Badge>
                        )}
                      </div>
                      {clienteEnEdicion?.sunat_ultimo_acceso && (
                        <p className="text-[10px] text-slate-500">
                          Último acceso: {new Date(clienteEnEdicion.sunat_ultimo_acceso).toLocaleString("es-PE")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleValidarSunatEnModalCliente}
                        disabled={sunatValidando || !nuevoUsuarioSol}
                        className="h-7 text-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 cursor-pointer shadow-xs"
                      >
                        <RefreshCw className={`h-3 w-3 ${sunatValidando ? "animate-spin" : ""}`} />
                        <span>{sunatValidando ? "Validando..." : "Validar Conexión"}</span>
                      </Button>

                      {clienteEnEdicion && nuevoUsuarioSol && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAutologinEnModalCliente}
                          className="h-7 text-xs border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 cursor-pointer"
                          title="Abrir sesión en SUNAT SOL"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Autologin</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Campos de Usuario y Clave SOL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="regUsuarioSol" className="text-xs font-semibold">
                        Usuario SOL:
                      </Label>
                      <Input
                        id="regUsuarioSol"
                        placeholder="Ej: MODDATOS"
                        value={nuevoUsuarioSol}
                        onChange={(e) => setNuevoUsuarioSol(e.target.value.toUpperCase())}
                        className="text-xs h-8 font-mono uppercase"
                      />
                      <p className="text-[10px] text-slate-400">Usuario principal o secundario SOL</p>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="regClaveSol" className="text-xs font-semibold">
                        Clave SOL:
                      </Label>
                      <div className="relative">
                        <Input
                          id="regClaveSol"
                          type={showClaveSol ? "text" : "password"}
                          placeholder={clienteEnEdicion?.tiene_clave_sol ? "•••••••• (Sin cambios)" : "••••••••"}
                          value={nuevaClaveSol}
                          onChange={(e) => setNuevaClaveSol(e.target.value)}
                          className="text-xs h-8 pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowClaveSol(!showClaveSol)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showClaveSol ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {clienteEnEdicion ? "Deje en blanco para conservar la clave actual" : "Contraseña de acceso a SUNAT"}
                      </p>
                    </div>
                  </div>

                  {/* Campos Opcionales de API SUNAT */}
                  <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Credenciales API SUNAT / SIRE (Opcionales):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="regSunatClientId" className="text-[10px] text-slate-500">Client ID:</Label>
                        <Input
                          id="regSunatClientId"
                          placeholder="client-id-sunat"
                          value={nuevoSunatClientId}
                          onChange={(e) => setNuevoSunatClientId(e.target.value)}
                          className="text-xs h-7 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="regSunatClientSecret" className="text-[10px] text-slate-500">Client Secret:</Label>
                        <Input
                          id="regSunatClientSecret"
                          type="password"
                          placeholder="client-secret-sunat"
                          value={nuevoSunatClientSecret}
                          onChange={(e) => setNuevoSunatClientSecret(e.target.value)}
                          className="text-xs h-7 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setClienteModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creandoCliente}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer shadow-xs"
              >
                {creandoCliente ? "Guardando..." : clienteEnEdicion ? "Actualizar Cliente" : "Registrar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: CONFIGURACIÓN SERVIDOR SMTP */}
      <Dialog open={smtpModalOpen} onOpenChange={setSmtpModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleGuardarSmtp}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                Configuración del Servidor de Correo SMTP
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure sus credenciales de Gmail, Outlook, Amazon SES o su hosting corporativo para el despacho fehaciente de correos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs py-3">
              <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Recomendación de seguridad
                </p>
                <p className="text-[11px] leading-relaxed">
                  Para cuentas <strong>Gmail</strong>, active la verificación en 2 pasos y genere una <em>"Contraseña de Aplicación"</em> de 16 letras desde su cuenta de Google.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="smtpHost" className="text-xs">Servidor Host SMTP:</Label>
                  <Input
                    id="smtpHost"
                    placeholder="smtp.gmail.com / smtp.office365.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="text-xs h-8"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="smtpPort" className="text-xs">Puerto:</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    placeholder="587 o 465"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="text-xs h-8 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="smtpUser" className="text-xs">Usuario / Correo Remitente:</Label>
                  <Input
                    id="smtpUser"
                    type="text"
                    placeholder="usuario@estudiolozano.pe"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="text-xs h-8"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="smtpPass" className="text-xs">Contraseña o App Password:</Label>
                  <Input
                    id="smtpPass"
                    type="password"
                    placeholder="••••••••••••"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="smtpFrom" className="text-xs">Nombre y Cabecera 'De' (From):</Label>
                <Input
                  id="smtpFrom"
                  placeholder='"Estudio Contable Lozano" <notificaciones@contatask.pe>'
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  className="text-xs h-8 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="smtpSecure" className="cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  Usar SSL/TLS directo (Marcar solo para puerto 465, desmarcar para STARTTLS 587)
                </label>
              </div>

              {/* Prueba rápida de conexión */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <Label className="text-xs font-semibold">Probar Conexión SMTP:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="correo.prueba@ejemplo.com (Opcional)"
                    value={smtpTestEmail}
                    onChange={(e) => setSmtpTestEmail(e.target.value)}
                    className="text-xs h-8 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestSmtp}
                    disabled={smtpTesting}
                    className="text-xs h-8 shrink-0 cursor-pointer"
                  >
                    {smtpTesting ? "Verificando..." : "Verificar Conexión"}
                  </Button>
                </div>
                {smtpTestResult && (
                  <p className={`text-[11px] font-semibold ${smtpTestResult.startsWith("✓") ? "text-emerald-600" : "text-red-600"}`}>
                    {smtpTestResult}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setSmtpModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={smtpSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer"
              >
                {smtpSaving ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: DETALLE DE CORREO DEL HISTORIAL */}
      <Dialog open={detalleCorreoModalOpen} onOpenChange={setDetalleCorreoModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Detalle de Notificación por Correo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registro del despacho para efectos de auditoría y prueba ante SUNAT
            </DialogDescription>
          </DialogHeader>

          {correoSeleccionado && (
            <div className="space-y-3 text-xs py-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">FECHA Y HORA:</span>
                  <span className="font-mono font-semibold">{correoSeleccionado.fecha_envio}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ESTADO:</span>
                  <Badge variant={correoSeleccionado.estado === "ENVIADO" ? "success" : "destructive"} className="text-[10px]">
                    {correoSeleccionado.estado}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">DESTINATARIO:</span>
                  <span className="font-mono text-blue-600 font-semibold">{correoSeleccionado.destinatario}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">EMPRESA MYPE:</span>
                  <span className="font-semibold">{correoSeleccionado.cliente_razon_social || "-"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">ASUNTO:</span>
                <p className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold">
                  {correoSeleccionado.asunto || "Sin asunto"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">MENSAJE REGISTRADO:</span>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {correoSeleccionado.mensaje}
                </div>
              </div>

              {((correoSeleccionado as any).resultado_api || correoSeleccionado.error_log) && (
                <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-blue-800 dark:text-blue-300">Respuesta de Servidor: </span>
                  <span className="font-mono">{(correoSeleccionado as any).resultado_api || correoSeleccionado.error_log}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setDetalleCorreoModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: GESTIÓN DE CLAVE SOL, TOKEN Y AUTOLOGIN SUNAT */}
      <Dialog open={sunatModalOpen} onOpenChange={setSunatModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
          <form onSubmit={handleGuardarSunatCredenciales} className="flex flex-col flex-1 overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Credenciales Clave SOL & Autenticación SUNAT
              </DialogTitle>
              <DialogDescription className="text-xs">
                Registre las credenciales oficiales de SUNAT Operaciones en Línea (SOL) para generar tokens de consulta, autologuearse y sincronizar el Buzón Electrónico.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs py-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {clienteParaSunat && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">CONTRIBUYENTE MYPE:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{clienteParaSunat.razon_social}</p>
                    <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400">RUC: {clienteParaSunat.ruc}</p>
                  </div>
                  <div>
                    {clienteParaSunat.sunat_estado_conexion === "CONECTADO" ? (
                      <Badge variant="success" className="text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Conectado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        {clienteParaSunat.sunat_estado_conexion || "Sin validar"}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {sunatError && (
                <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <p>{sunatError}</p>
                </div>
              )}

              {/* Formulario de Usuario SOL y Clave SOL */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="usuarioSol" className="text-xs font-semibold">
                    Usuario SOL:
                  </Label>
                  <Input
                    id="usuarioSol"
                    placeholder="Ej: MODDATOS"
                    value={usuarioSol}
                    onChange={(e) => setUsuarioSol(e.target.value.toUpperCase())}
                    className="text-xs h-8 font-mono uppercase"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Usuario principal o secundario SOL</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="claveSol" className="text-xs font-semibold">
                    Clave SOL:
                  </Label>
                  <div className="relative">
                    <Input
                      id="claveSol"
                      type={showClaveSol ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={claveSol}
                      onChange={(e) => setClaveSol(e.target.value)}
                      className="text-xs h-8 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClaveSol(!showClaveSol)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showClaveSol ? "Ocultar" : "Mostrar"}
                    >
                      {showClaveSol ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">Clave secreta de acceso al portal</p>
                </div>
              </div>

              {/* Botón de Autologin Rápido en SUNAT SOL */}
              <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 text-xs">
                    <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                    Autologin Directo en SUNAT SOL
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Abre una sesión oficial en SUNAT Operaciones en Línea con 1-clic sin volver a tipear credenciales.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => clienteParaSunat && handleAutologinSunat(clienteParaSunat)}
                  disabled={!usuarioSol}
                  className="shrink-0 h-8 text-xs border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Autologuearme
                </Button>
              </div>

              {/* Validación de Conexión & Generador de Token */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Validación y Token del Sistema:
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleValidarSunatConexion()}
                    disabled={sunatValidando || !usuarioSol}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`h-3 w-3 ${sunatValidando ? "animate-spin" : ""}`} />
                    {sunatValidando ? "Validando con SUNAT..." : "Validar y Generar Token"}
                  </Button>
                </div>

                {sunatResult && (
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 animate-fade-in text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {sunatResult.mensaje}
                      </span>
                      <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-700">
                        {sunatResult.modo}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 dark:text-slate-300">
                      <div>
                        <strong>Condición:</strong> {sunatResult.contribuyente?.condicion || "HABIDO"}
                      </div>
                      <div>
                        <strong>Estado:</strong> {sunatResult.contribuyente?.estado || "ACTIVO"}
                      </div>
                      <div className="col-span-2">
                        <strong>Vigencia Token:</strong> Expira en {sunatResult.expires_in}s ({new Date(sunatResult.expires_at).toLocaleTimeString()})
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/60">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Token Bearer de Seguridad:</span>
                        <button
                          type="button"
                          onClick={() => handleCopiarToken(sunatResult.access_token)}
                          className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          {copiadoToken ? "¡Copiado!" : "Copiar Token"}
                        </button>
                      </div>
                      <p className="font-mono text-[10px] bg-white dark:bg-slate-900 p-1.5 rounded border border-emerald-200 dark:border-emerald-800 truncate select-all">
                        {sunatResult.access_token}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Opciones Avanzadas (Client ID y Client Secret de SUNAT API) */}
              <details className="group border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-900/40">
                <summary className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer list-none flex items-center justify-between">
                  <span>Credenciales Avanzadas API REST SUNAT (Opcional)</span>
                  <span className="text-[10px] text-blue-600 group-open:rotate-90 transition-transform">▸</span>
                </summary>
                <div className="pt-2 space-y-2">
                  <p className="text-[10px] text-slate-500">
                    Solo requerido si la empresa ha creado una aplicación en el menú SUNAT Operaciones en Línea &gt; "Gestión de Aplicaciones".
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="sunatClientId" className="text-[10px]">Client ID:</Label>
                      <Input
                        id="sunatClientId"
                        placeholder="Ej: 5b6c8d7e-..."
                        value={sunatClientId}
                        onChange={(e) => setSunatClientId(e.target.value)}
                        className="text-xs h-7 font-mono"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="sunatClientSecret" className="text-[10px]">Client Secret:</Label>
                      <Input
                        id="sunatClientSecret"
                        type="password"
                        placeholder="••••••••"
                        value={sunatClientSecret}
                        onChange={(e) => setSunatClientSecret(e.target.value)}
                        className="text-xs h-7 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setSunatModalOpen(false)}>
                Cerrar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={sunatGuardando}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer shadow-xs"
              >
                {sunatGuardando ? "Guardando..." : "Guardar Credenciales"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 8: DETALLE NOTIFICACIÓN O MENSAJE BUZÓN ELECTRÓNICO SOL */}
      <Dialog open={modalDetalleBuzonOpen} onOpenChange={setModalDetalleBuzonOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Inbox className="h-5 w-5 text-blue-600" />
              {buzonMensajeSeleccionado?.categoria_buzon === "MENSAJE"
                ? "Mensaje Informativo de Buzón SOL (SUNAT)"
                : "Notificación Oficial de Buzón SOL (SUNAT)"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {buzonMensajeSeleccionado?.categoria_buzon === "MENSAJE"
                ? "Comunicación o reporte oficial generado por la administración tributaria."
                : "Acto administrativo formal depositado en el Buzón Electrónico del contribuyente."}
            </DialogDescription>
          </DialogHeader>

          {buzonMensajeSeleccionado && (
            <div className="space-y-3.5 text-xs py-2 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">CÓDIGO / N° MENSAJE:</span>
                  <span className="font-mono font-bold text-blue-600">{buzonMensajeSeleccionado.numero_notificacion}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">CATEGORÍA BUZÓN:</span>
                  <Badge variant={buzonMensajeSeleccionado.categoria_buzon === "MENSAJE" ? "secondary" : "default"} className="text-[10px] font-semibold">
                    {buzonMensajeSeleccionado.categoria_buzon === "MENSAJE" ? "Buzón Mensajes" : "Buzón Notificaciones"}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TIPO DE ACTO / REPORTE:</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {(buzonMensajeSeleccionado.tipo_documento || "OFICIAL").replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">EMPRESA MYPE:</span>
                  <span className="font-semibold">{buzonMensajeSeleccionado.cliente_razon_social || "Empresa"}</span>
                  <span className="block text-[10px] text-slate-400 font-mono">RUC: {buzonMensajeSeleccionado.cliente_ruc}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">FECHA DE DEPÓSITO / PUBLICACIÓN:</span>
                  <span className="font-mono">{new Date(buzonMensajeSeleccionado.fecha_deposito).toLocaleString()}</span>
                </div>
              </div>

              {buzonMensajeSeleccionado.plazo_dias && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Plazo Perentorio para Responder o Subsanar
                  </div>
                  <p className="text-[11px]">
                    SUNAT ha otorgado un plazo de <strong>{buzonMensajeSeleccionado.plazo_dias} días hábiles</strong>.
                    {buzonMensajeSeleccionado.fecha_vencimiento_plazo && (
                      <span> Vencimiento límite: <strong>{buzonMensajeSeleccionado.fecha_vencimiento_plazo}</strong>.</span>
                    )}
                  </p>
                </div>
              )}

              {cargandoDetalleBuzon && (
                <div className="flex items-center gap-2.5 p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-blue-700 dark:text-blue-300 text-xs animate-pulse">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                  <span>Consultando contenido oficial y constancias firmadas directamente desde SUNAT SOL...</span>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">ASUNTO OFICIAL:</span>
                <p className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100">
                  {limpiarTextoUI(buzonMensajeSeleccionado.asunto)}
                </p>
              </div>

              {/* Contenido Oficial Estructurado de SUNAT (Solo si contiene campos administrativos específicos) */}
              {(() => {
                const datosDoc = buzonMensajeSeleccionado.detalle?.datos_documento;
                if (!datosDoc) return null;
                const tieneCampos = Boolean(
                  datosDoc.num_doc ||
                  datosDoc.numDoc ||
                  datosDoc.numero ||
                  datosDoc.des_tip_doc ||
                  datosDoc.dependencia ||
                  datosDoc.fecha ||
                  datosDoc.pro_fa_conf !== undefined
                );
                if (!tieneCampos) return null;

                return (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        Detalle del Acto Administrativo / Registro SUNAT
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        SUNAT SOL Oficial
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {(datosDoc.num_doc || datosDoc.numDoc || datosDoc.numero) && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">DOCUMENTO OFICIAL N°:</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {limpiarTextoUI(datosDoc.num_doc || datosDoc.numDoc || datosDoc.numero)}
                          </span>
                        </div>
                      )}
                      {datosDoc.des_tip_doc && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">TIPO DE ACTO:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {limpiarTextoUI(datosDoc.des_tip_doc)}
                          </span>
                        </div>
                      )}
                      {datosDoc.dependencia && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">DEPENDENCIA EMISORA:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            Sede / Dep. {limpiarTextoUI(datosDoc.dependencia)}
                          </span>
                        </div>
                      )}
                      {datosDoc.fecha && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">FECHA DEL REPORTE:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-200">
                            {datosDoc.fecha}
                          </span>
                        </div>
                      )}
                      {datosDoc.pro_fa_conf !== undefined && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">COMPROBANTES CONFIRMADOS:</span>
                          <span className="font-bold text-emerald-600">
                            {datosDoc.pro_fa_conf} comprobante(s)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Contenido / Cuerpo del Mensaje con soporte para HTML oficial de SUNAT y tablas */}
              {buzonMensajeSeleccionado.detalle?.texto_html || buzonMensajeSeleccionado.detalle?.datos_documento?.texto ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold block text-[11px]">CONTENIDO OFICIAL SUNAT:</span>
                    <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
                      Formato Oficial SOL
                    </Badge>
                  </div>
                  <div
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 max-h-72 overflow-y-auto font-sans text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-inner
                      [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_table]:text-xs
                      [&_td]:p-2 [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-800 [&_td]:align-top
                      [&_th]:p-2 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:font-bold [&_th]:text-slate-700 dark:[&_th]:text-slate-300
                      [&_strong]:text-blue-700 dark:[&_strong]:text-blue-400 [&_b]:text-blue-700 dark:[&_b]:text-blue-400"
                    dangerouslySetInnerHTML={{
                      __html: limpiarHtmlSunat(
                        buzonMensajeSeleccionado.detalle?.texto_html ||
                        buzonMensajeSeleccionado.detalle?.datos_documento?.texto
                      )
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px]">CUERPO DEL REQUERIMIENTO / MENSAJE:</span>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {limpiarTextoUI(buzonMensajeSeleccionado.detalle?.cuerpo_legible || buzonMensajeSeleccionado.mensaje)}
                  </div>
                </div>
              )}

              {/* Lista de Archivos y Constancias Oficiales con descarga */}
              {buzonMensajeSeleccionado.detalle?.adjuntos && buzonMensajeSeleccionado.detalle.adjuntos.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-slate-400 font-semibold block text-[11px]">ARCHIVOS Y CONSTANCIAS OFICIALES ADJUNTAS:</span>
                  <div className="space-y-1.5">
                    {buzonMensajeSeleccionado.detalle.adjuntos.map((adj, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{limpiarTextoUI(adj.nombre)}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{adj.tamano || 'PDF Oficial'} • {adj.tipo}</span>
                          </div>
                        </div>
                        {adj.codArchivo ? (
                          <Button
                            size="sm"
                            onClick={() => handleDescargarAdjunto(Number(adj.codArchivo), adj.nombre)}
                            disabled={descargandoAdjuntoId === Number(adj.codArchivo)}
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shrink-0 shadow-xs cursor-pointer"
                          >
                            <Download className={`h-3 w-3 ${descargandoAdjuntoId === Number(adj.codArchivo) ? "animate-bounce" : ""}`} />
                            {descargandoAdjuntoId === Number(adj.codArchivo) ? "Descargando..." : "Descargar PDF"}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-[10px] shrink-0 border-blue-300 text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900">
                            Firmado Digitalmente
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : buzonMensajeSeleccionado.adjunto_nombre ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="font-semibold text-blue-900 dark:text-blue-300">
                      Documento Adjunto Oficial: {limpiarTextoUI(buzonMensajeSeleccionado.adjunto_nombre)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Oficial SUNAT</Badge>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {buzonMensajeSeleccionado && buzonMensajeSeleccionado.estado !== "LEIDO" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleMarcarBuzonLeido(buzonMensajeSeleccionado.id);
                  setModalDetalleBuzonOpen(false);
                }}
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como Leído
              </Button>
            )}
            <Button size="sm" onClick={() => setModalDetalleBuzonOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
