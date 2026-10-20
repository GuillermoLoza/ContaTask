"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Server,
  Send,
  RefreshCw,
  FileCheck2,
  Eye,
  Inbox,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Paperclip,
  Download,
  Trash2,
  Search,
  CheckCheck,
  Link2,
  Building2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useContador } from "@/context/ContadorContext";
import { AdjuntoCorreo, CorreoRecibido } from "@/lib/api";

export default function ContadorCorreosPage() {
  const {
    clientes,
    transacciones,
    loading,
    notificaciones,
    emailTemplates,
    selectedTemplateId,
    emailTo,
    setEmailTo,
    emailSubject,
    setEmailSubject,
    emailCustomMessage,
    setEmailCustomMessage,
    emailSelectedClienteId,
    emailSending,
    emailSuccessMsg,
    emailErrorMsg,
    emailPreviewHtml,
    actualizarPrevisualizacion,
    handleSeleccionarClienteEmail,
    handleSeleccionarPlantillaEmail,
    handleEnviarCorreo,
    smtpConfig,
    setSmtpModalOpen,
    setCorreoSeleccionado,
    setDetalleCorreoModalOpen,

    // IMAP / Buzón de Correos Recibidos
    correosRecibidos,
    correosStats,
    imapConfig,
    sincronizandoBandeja,
    filtroBandejaSoloNoLeidos,
    setFiltroBandejaSoloNoLeidos,
    filtroBandejaConAdjuntos,
    setFiltroBandejaConAdjuntos,
    busquedaBandeja,
    setBusquedaBandeja,
    correoRecibidoSeleccionado,
    setCorreoRecibidoSeleccionado,
    modalDetalleCorreoRecibidoOpen,
    setModalDetalleCorreoRecibidoOpen,
    cargarCorreosRecibidos,
    handleSincronizarBandeja,
    handleMarcarCorreoLeido,
    handleConvertirAdjuntoEnSustento,
    handleEliminarCorreoRecibido,
    handleSimularCorreoEntrante
  } = useContador();

  // Pestaña activa: "buzon" | "redactar" | "enviados"
  const [activeTab, setActiveTab] = useState<"buzon" | "redactar" | "enviados">("buzon");

  // Estado para el modal de vincular adjunto a transacción
  const [modalVincularOpen, setModalVincularOpen] = useState(false);
  const [adjuntoParaVincular, setAdjuntoParaVincular] = useState<AdjuntoCorreo | null>(null);
  const [transaccionSeleccionadaId, setTransaccionSeleccionadaId] = useState<number | null>(null);
  const [vinculando, setVinculando] = useState(false);
  const [mensajeVinculacion, setMensajeVinculacion] = useState<string | null>(null);

  // Previsualización inicial
  useEffect(() => {
    if (!emailPreviewHtml) {
      actualizarPrevisualizacion();
    }
  }, []);

  // Sincronizar automáticamente con IMAP cada vez que se entra a la opción/pestaña del buzón
  useEffect(() => {
    cargarCorreosRecibidos();
    if (activeTab === "buzon") {
      // Disparar sincronización automática silenciosa con Gmail/IMAP
      handleSincronizarBandeja().catch((err: any) => {
        console.warn("Sincronización automática IMAP no completada:", err?.message);
      });
    }
  }, [activeTab]);

  const abrirModalLectura = (correo: CorreoRecibido) => {
    setCorreoRecibidoSeleccionado(correo);
    setModalDetalleCorreoRecibidoOpen(true);
    if (!correo.leido) {
      handleMarcarCorreoLeido(correo.id, true);
    }
  };

  const iniciarVinculacion = (adjunto: AdjuntoCorreo) => {
    setAdjuntoParaVincular(adjunto);
    setMensajeVinculacion(null);
    // Sugerir la primera transacción pendiente si el correo ya coincide con un RUC
    if (correoRecibidoSeleccionado?.cliente_ruc) {
      const trxCliente = transacciones.find(
        (t) => t.cliente_ruc === correoRecibidoSeleccionado.cliente_ruc && t.estado_sustento !== "VALIDADO"
      );
      if (trxCliente) setTransaccionSeleccionadaId(trxCliente.id);
    } else {
      setTransaccionSeleccionadaId(transacciones[0]?.id || null);
    }
    setModalVincularOpen(true);
  };

  const confirmarVinculacion = async () => {
    if (!correoRecibidoSeleccionado || !adjuntoParaVincular || !transaccionSeleccionadaId) return;
    setVinculando(true);
    setMensajeVinculacion(null);
    try {
      await handleConvertirAdjuntoEnSustento(correoRecibidoSeleccionado.id, {
        transaccionId: transaccionSeleccionadaId,
        nombreArchivo: adjuntoParaVincular.nombre_archivo,
        nombreOriginal: adjuntoParaVincular.nombre_original,
        rutaArchivo: adjuntoParaVincular.ruta_archivo,
        mimeType: adjuntoParaVincular.mime_type,
        tamanoBytes: adjuntoParaVincular.tamano_bytes
      });
      setMensajeVinculacion("¡Comprobante vinculado exitosamente a la transacción y registrado en auditoría!");
      setTimeout(() => {
        setModalVincularOpen(false);
        setAdjuntoParaVincular(null);
      }, 1500);
    } catch (err: any) {
      alert(`Error al vincular comprobante: ${err.message}`);
    } finally {
      setVinculando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando centro de correos...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* 1. CABECERA Y ACCIONES PRINCIPALES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a8a] dark:text-blue-400 tracking-tight flex items-center gap-2">
            <Mail className="h-7 w-7 text-blue-600" />
            Configuración y Gestión de Correos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Captura de correos entrantes por IMAP, recepción de comprobantes y emisión de notificaciones SUNAT
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setSmtpModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <Server className="h-3.5 w-3.5" />
            Ajustes Servidor SMTP / IMAP
          </Button>
        </div>
      </div>

      {/* 2. PESTAÑAS DE NAVEGACIÓN (TABS) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("buzon")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "buzon"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Inbox className="h-4 w-4" />
          <span>Buzón de Entrada (IMAP)</span>
          {(correosStats?.noLeidos ?? 0) > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "buzon" ? "bg-white text-blue-700" : "bg-blue-600 text-white"
              }`}
            >
              {correosStats?.noLeidos}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("redactar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "redactar"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Redactar y Emitir</span>
        </button>

        <button
          onClick={() => setActiveTab("enviados")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "enviados"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          <span>Auditoría de Envíos</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {notificaciones.filter((n) => n.canal === "EMAIL").length}
          </span>
        </button>
      </div>

      {/* =====================================================================
          PESTAÑA 1: BUZÓN DE ENTRADA (IMAP - CORREOS RECIBIDOS)
         ===================================================================== */}
      {activeTab === "buzon" && (
        <div className="space-y-5 animate-fade-in">
          {/* Métricas del Buzón */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Total Recibidos</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {correosStats?.total || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-medium text-blue-600">No Leídos</span>
              <p className="text-xl font-bold text-blue-600 mt-1">
                {correosStats?.noLeidos || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-medium text-purple-600">Con Comprobantes / Adjuntos</span>
              <p className="text-xl font-bold text-purple-600 mt-1">
                {correosStats?.conAdjuntos || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-medium text-emerald-600">Sustentos Vinculados</span>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                {correosStats?.procesados || 0}
              </p>
            </div>
          </div>

          {/* Barra de Herramientas y Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar por remitente, asunto, empresa o RUC..."
                  value={busquedaBandeja}
                  onChange={(e) => setBusquedaBandeja(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFiltroBandejaSoloNoLeidos(!filtroBandejaSoloNoLeidos)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  filtroBandejaSoloNoLeidos
                    ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 font-semibold"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                No leídos
              </button>

              <button
                onClick={() => setFiltroBandejaConAdjuntos(!filtroBandejaConAdjuntos)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                  filtroBandejaConAdjuntos
                    ? "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 font-semibold"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Paperclip className="h-3 w-3" />
                Con adjuntos
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await handleSincronizarBandeja();
                    if (res?.message) {
                      alert(res.message);
                    }
                  } catch (err: any) {
                    alert(`Error al sincronizar con el buzón: ${err.message || 'Verifique sus credenciales en Ajustes Servidor SMTP / IMAP'}`);
                  }
                }}
                disabled={sincronizandoBandeja}
                className="h-8 text-xs gap-1.5 cursor-pointer bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                title="Conectar por IMAP y sincronizar bandeja de entrada"
              >
                <RefreshCw className={`h-3 w-3 ${sincronizandoBandeja ? "animate-spin text-blue-600" : ""}`} />
                <span>{sincronizandoBandeja ? "Sincronizando..." : "Sincronizar IMAP"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSimularCorreoEntrante()}
                className="h-8 text-xs gap-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Generar correo entrante de prueba con voucher adjunto"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                Simular Recepción
              </Button>
            </div>
          </div>

          {/* Banner de Estado de Configuración IMAP */}
          {imapConfig && !imapConfig.isConfigured && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 animate-fade-in">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Buzón IMAP pendiente de configuración</p>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                  Para capturar los correos enviados por sus clientes MYPE a su cuenta de Gmail, abra <strong>"Ajustes Servidor SMTP / IMAP"</strong> e ingrese su correo y su <em>Contraseña de Aplicación</em> de 16 caracteres de Google.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setSmtpModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0 cursor-pointer"
              >
                Configurar Ahora
              </Button>
            </div>
          )}

          {imapConfig?.ultimoError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Aviso de sincronización IMAP:</strong> {imapConfig.ultimoError}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSmtpModalOpen(true)}
                className="text-xs h-7 border-rose-300 hover:bg-rose-100 text-rose-800 dark:text-rose-200 cursor-pointer"
              >
                Revisar Credenciales
              </Button>
            </div>
          )}

          {imapConfig?.ultimaSincronizacion && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>
                Servidor: <strong className="font-mono text-slate-700 dark:text-slate-300">{imapConfig.host}</strong> ({imapConfig.user || "Sin usuario"})
              </span>
              <span>
                Última sincronización: {new Date(imapConfig.ultimaSincronizacion).toLocaleTimeString("es-PE")} ({new Date(imapConfig.ultimaSincronizacion).toLocaleDateString("es-PE")})
              </span>
            </div>
          )}

          {/* Tabla de Correos Recibidos */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-3 w-8 text-center"></th>
                      <th className="p-3">Remitente / Empresa MYPE</th>
                      <th className="p-3">Asunto y Mensaje</th>
                      <th className="p-3 text-center">Comprobantes</th>
                      <th className="p-3">Fecha y Hora</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {correosRecibidos.map((correo) => {
                      const isUnread = !correo.leido;
                      const hasAttachments = Boolean(correo.tiene_adjuntos && correo.adjuntos && correo.adjuntos.length > 0);

                      return (
                        <tr
                          key={correo.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isUnread ? "bg-blue-50/30 dark:bg-blue-950/20 font-medium" : ""
                          }`}
                        >
                          <td className="p-3 text-center">
                            {isUnread ? (
                              <span className="inline-block h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-400" title="Correo no leído" />
                            ) : (
                              <span className="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" title="Leído" />
                            )}
                          </td>

                          <td className="p-3">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                                {correo.remitente}
                              </p>
                              <p className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
                                {correo.remitente_email}
                              </p>
                              {correo.cliente_razon_social && (
                                <Badge variant="success" className="text-[10px] gap-1 mt-0.5">
                                  <Building2 className="h-2.5 w-2.5" />
                                  <span>{correo.cliente_razon_social}</span>
                                </Badge>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="space-y-0.5 max-w-md">
                              <p
                                onClick={() => abrirModalLectura(correo)}
                                className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
                              >
                                {correo.asunto}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {correo.cuerpo_texto || "(Sin contenido de texto)"}
                              </p>
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            {hasAttachments ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <Paperclip className="h-3 w-3" />
                                <span>{correo.adjuntos?.length} adjunto(s)</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">---</span>
                            )}
                          </td>

                          <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {typeof correo.fecha === "number" || !isNaN(Number(correo.fecha))
                              ? new Date(Number(correo.fecha)).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
                              : new Date(correo.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirModalLectura(correo)}
                                className="h-7 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 gap-1 cursor-pointer"
                                title="Abrir y leer correo"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Leer</span>
                              </Button>

                              <button
                                onClick={() => handleMarcarCorreoLeido(correo.id, !correo.leido)}
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"
                                title={correo.leido ? "Marcar como no leído" : "Marcar como leído"}
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm("¿Desea eliminar este correo de la bandeja?")) {
                                    handleEliminarCorreoRecibido(correo.id);
                                  }
                                }}
                                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Eliminar correo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {correosRecibidos.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p className="font-semibold text-slate-600 dark:text-slate-300">
                            Bandeja de entrada vacía
                          </p>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            Haga clic en <strong>"Sincronizar IMAP"</strong> para traer los correos de su servidor, o use <strong>"Simular Recepción"</strong> para generar un correo de demostración.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 2: REDACTAR Y EMITIR NOTIFICACIÓN (SMTP)
         ===================================================================== */}
      {activeTab === "redactar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* COLUMNA IZQUIERDA: FORMULARIO DE DESPACHO (5 COLS) */}
          <Card className="lg:col-span-5 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Redacción y Emisión de Notificación
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Despacho con certificación y constancia de envío a la MYPE
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 flex-1">
              <form onSubmit={handleEnviarCorreo} className="space-y-3.5 text-xs">
                {/* Selector de Plantilla */}
                <div className="space-y-1">
                  <Label htmlFor="tplSelect" className="text-xs font-semibold">
                    Plantilla Oficial SUNAT:
                  </Label>
                  <select
                    id="tplSelect"
                    value={selectedTemplateId}
                    onChange={(e) => handleSeleccionarPlantillaEmail(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    {emailTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                    {emailTemplates.length === 0 && (
                      <>
                        <option value="sunat_vencimiento">🚨 Vencimiento de Declaración Mensual SUNAT</option>
                        <option value="sustento_faltante">⚠️ Solicitud de Voucher / Sustento Bancario</option>
                        <option value="bancarizacion_urgente">🏦 Requerimiento Ley 30730 (Bancarización)</option>
                        <option value="sustento_aprobado">✅ Aprobación de Documento de Sustento</option>
                        <option value="sustento_rechazado">❌ Notificación de Documento Observado</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Selector de Cliente */}
                <div className="space-y-1">
                  <Label htmlFor="cliSelect" className="text-xs font-semibold">
                    Empresa MYPE Destinataria:
                  </Label>
                  <select
                    id="cliSelect"
                    value={emailSelectedClienteId}
                    onChange={(e) => handleSeleccionarClienteEmail(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">Seleccionar Cliente MYPE (Opcional)...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razon_social} ({c.ruc})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Correo Destino */}
                <div className="space-y-1">
                  <Label htmlFor="emailTo" className="text-xs font-semibold">
                    Correo Electrónico Destino:
                  </Label>
                  <Input
                    id="emailTo"
                    type="email"
                    placeholder="gerencia@empresa.pe"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="text-xs h-8 font-mono"
                    required
                  />
                </div>

                {/* Asunto */}
                <div className="space-y-1">
                  <Label htmlFor="emailSubject" className="text-xs font-semibold">
                    Asunto del Correo:
                  </Label>
                  <Input
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="text-xs h-8"
                    required
                  />
                </div>

                {/* Mensaje Personalizado */}
                <div className="space-y-1">
                  <Label htmlFor="customMsg" className="text-xs font-semibold">
                    Instrucciones Especiales o Anotaciones:
                  </Label>
                  <Textarea
                    id="customMsg"
                    rows={3}
                    placeholder="Escriba indicaciones adicionales para el contribuyente..."
                    value={emailCustomMessage}
                    onChange={(e) => setEmailCustomMessage(e.target.value)}
                    className="text-xs resize-none"
                  />
                </div>

                {emailSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="leading-tight">{emailSuccessMsg}</p>
                  </div>
                )}

                {emailErrorMsg && (
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-2">
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="leading-tight">{emailErrorMsg}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={emailSending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 cursor-pointer gap-2 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {emailSending ? "Despachando Correo..." : "Despachar Correo con Certificación"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* COLUMNA DERECHA: PREVISUALIZACIÓN DE PLANTILLA (7 COLS) */}
          <Card className="lg:col-span-7 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-600" />
                  Previsualización Exacta en Tiempo Real
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Formato HTML adaptativo que recibirá el cliente en su bandeja de correo
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {smtpConfig?.isConfigured ? "SMTP Activo" : "Modo Local"}
              </Badge>
            </CardHeader>

            <CardContent className="p-4 flex-1 flex flex-col bg-slate-100/50 dark:bg-slate-950/40">
              <div className="bg-white dark:bg-[#131b2e] rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 space-y-1">
                  <p><strong className="text-slate-700 dark:text-slate-300">De:</strong> {smtpConfig?.from || '"Estudio Contable Lozano & Asociados" <notificaciones@contatask.pe>'}</p>
                  <p><strong className="text-slate-700 dark:text-slate-300">Para:</strong> {emailTo || "cliente@empresa.com"}</p>
                  <p><strong className="text-slate-700 dark:text-slate-300">Asunto:</strong> {emailSubject || "(Sin Asunto)"}</p>
                </div>
                <div className="p-4 flex-1 overflow-y-auto max-h-[460px]">
                  {emailPreviewHtml ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
                      className="text-xs prose dark:prose-invert max-w-none"
                    />
                  ) : (
                    <div className="flex justify-center items-center h-48 text-slate-400">
                      Cargando previsualización...
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 3: AUDITORÍA Y HISTORIAL DE CORREOS ENVIADOS
         ===================================================================== */}
      {activeTab === "enviados" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden animate-fade-in">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-blue-600" />
                  Historial de Correos Emitidos y Auditoría Tributaria
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Registro fehaciente de notificaciones, constancias y requerimientos enviados a clientes
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {notificaciones.filter((n) => n.canal === "EMAIL").length} correos registrados
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Empresa MYPE</th>
                    <th className="p-3">Destinatario</th>
                    <th className="p-3">Asunto</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {notificaciones
                    .filter((n) => n.canal === "EMAIL")
                    .slice(0, 25)
                    .map((n) => (
                      <tr key={n.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-500">
                          {n.fecha_envio}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {n.cliente_razon_social || `Cliente #${n.cliente_id || "-"}`}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                          {n.destinatario}
                        </td>
                        <td className="p-3 max-w-sm truncate text-slate-700 dark:text-slate-300 font-medium">
                          {n.asunto || "Notificación de Correo"}
                        </td>
                        <td className="p-3 text-center">
                          {n.estado === "ENVIADO" ? (
                            <Badge variant="success" className="text-[10px]">Entregado</Badge>
                          ) : n.estado === "RESPALDO_ENVIADO" ? (
                            <Badge variant="info" className="text-[10px] bg-blue-600 text-white">Respaldo</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Fallido</Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCorreoSeleccionado(n);
                              setDetalleCorreoModalOpen(true);
                            }}
                            className="h-7 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 gap-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" /> Ver
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {notificaciones.filter((n) => n.canal === "EMAIL").length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No se han emitido correos electrónicos aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =====================================================================
          MODAL 1: LECTURA Y DETALLE DE CORREO RECIBIDO (IMAP)
         ===================================================================== */}
      <Dialog open={modalDetalleCorreoRecibidoOpen} onOpenChange={setModalDetalleCorreoRecibidoOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {correoRecibidoSeleccionado?.asunto || "(Sin Asunto)"}
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Correo recibido vía IMAP en la cuenta configurada
                </DialogDescription>
              </div>
              {correoRecibidoSeleccionado?.cliente_razon_social && (
                <Badge variant="success" className="text-[10px] shrink-0">
                  {correoRecibidoSeleccionado.cliente_razon_social}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {correoRecibidoSeleccionado && (
            <div className="space-y-4 text-xs">
              {/* Metadatos del Correo */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px]">
                <p>
                  <strong className="text-slate-700 dark:text-slate-300">De:</strong>{" "}
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {correoRecibidoSeleccionado.remitente}
                  </span>{" "}
                  &lt;{correoRecibidoSeleccionado.remitente_email}&gt;
                </p>
                <p>
                  <strong className="text-slate-700 dark:text-slate-300">Para:</strong>{" "}
                  {correoRecibidoSeleccionado.destinatario || imapConfig?.user || "contador@contatask.pe"}
                </p>
                <p>
                  <strong className="text-slate-700 dark:text-slate-300">Fecha:</strong>{" "}
                  {new Date(Number(correoRecibidoSeleccionado.fecha) || correoRecibidoSeleccionado.fecha).toLocaleString("es-PE")}
                </p>
                {correoRecibidoSeleccionado.cliente_ruc && (
                  <p>
                    <strong className="text-slate-700 dark:text-slate-300">RUC Identificado:</strong>{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {correoRecibidoSeleccionado.cliente_ruc}
                    </span>
                  </p>
                )}
              </div>

              {/* Cuerpo del Mensaje */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {correoRecibidoSeleccionado.cuerpo_texto || "(Mensaje sin contenido de texto)"}
              </div>

              {/* Sección de Comprobantes y Archivos Adjuntos */}
              {correoRecibidoSeleccionado.adjuntos && correoRecibidoSeleccionado.adjuntos.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <Paperclip className="h-3.5 w-3.5 text-purple-600" />
                    Archivos Adjuntos ({correoRecibidoSeleccionado.adjuntos.length}):
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {correoRecibidoSeleccionado.adjuntos.map((adj, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 dark:text-white truncate" title={adj.nombre_original}>
                              {adj.nombre_original}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {(adj.tamano_bytes / 1024).toFixed(1)} KB • {adj.mime_type.split("/")[1]?.toUpperCase() || "ARCHIVO"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-purple-200/60 dark:border-purple-900/40">
                          <a
                            href={adj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={adj.nombre_original}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            <span>Descargar</span>
                          </a>

                          <Button
                            size="sm"
                            onClick={() => iniciarVinculacion(adj)}
                            className="ml-auto h-6 px-2 text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer gap-1"
                          >
                            <Link2 className="h-3 w-3" />
                            <span>Vincular como Sustento</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalDetalleCorreoRecibidoOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 2: VINCULAR ADJUNTO DE CORREO A TRANSACCIÓN CONTABLE
         ===================================================================== */}
      <Dialog open={modalVincularOpen} onOpenChange={setModalVincularOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Link2 className="h-4 w-4 text-purple-600" />
              Vincular Comprobante de Correo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Asocie este comprobante recibido por correo a una transacción para validación tributaria y trazabilidad legal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            {/* Archivo Seleccionado */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-purple-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 dark:text-white truncate">
                  {adjuntoParaVincular?.nombre_original}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {adjuntoParaVincular ? (adjuntoParaVincular.tamano_bytes / 1024).toFixed(1) : "0"} KB
                </p>
              </div>
            </div>

            {/* Selector de Transacción */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Seleccionar Transacción Contable:</Label>
              <select
                value={transaccionSeleccionadaId || ""}
                onChange={(e) => setTransaccionSeleccionadaId(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                {transacciones.map((t) => (
                  <option key={t.id} value={t.id}>
                    OP #{t.id} - {t.cliente_razon_social} ({t.comprobante_tipo} {t.numero_comprobante || "S/N"}) - S/ {t.monto_total}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                El estado de la transacción pasará inmediatamente a <strong>"Sustento Recibido"</strong> y se generará una entrada en el Historial de Auditoría.
              </p>
            </div>

            {mensajeVinculacion && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="leading-tight">{mensajeVinculacion}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalVincularOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmarVinculacion}
              disabled={vinculando || !transaccionSeleccionadaId}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{vinculando ? "Vinculando..." : "Confirmar Vinculación"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
