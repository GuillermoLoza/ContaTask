"use client";

import { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  Inbox,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Lock,
  Copy,
  Check,
  Search,
  Sparkles,
  Eye,
  Send,
  FileText,
  Mail
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContador } from "@/context/ContadorContext";
import { api, BuzonSolMensaje, SunatValidacionResult } from "@/lib/api";

function limpiarTextoUI(str?: string | null): string {
  if (!str) return "";
  try {
    str = decodeURIComponent(str);
  } catch {}
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

export default function ContadorSunatPage() {
  const {
    clientes,
    buzonMensajes,
    buzonStats,
    buzonLoading,
    sincronizandoBuzon,
    filtroBuzonEstado,
    setFiltroBuzonEstado,
    filtroBuzonClienteId,
    setFiltroBuzonClienteId,
    abrirModalSunat,
    handleValidarSunatConexion,
    handleAutologinSunat,
    handleSincronizarBuzon,
    handleSincronizarBuzonTodos,
    handleMarcarBuzonLeido,
    setBuzonMensajeSeleccionado,
    setModalDetalleBuzonOpen,
    abrirDetalleBuzon
  } = useContador();

  const [activeTab, setActiveTab] = useState<"BUZON" | "EMPRESAS" | "TOKEN_TEST">("BUZON");
  const [searchTermBuzon, setSearchTermBuzon] = useState("");
  const [filtroCategoriaBuzon, setFiltroCategoriaBuzon] = useState<"TODOS" | "NOTIFICACION" | "MENSAJE">("TODOS");

  // Estado del generador libre de Token
  const [testRuc, setTestRuc] = useState("20512345671");
  const [testUsuario, setTestUsuario] = useState("MODDATOS");
  const [testClave, setTestClave] = useState("moddatos");
  const [generandoTokenLibre, setGenerandoTokenLibre] = useState(false);
  const [tokenLibreResult, setTokenLibreResult] = useState<SunatValidacionResult | null>(null);
  const [tokenLibreError, setTokenLibreError] = useState<string | null>(null);
  const [tokenCopiado, setTokenCopiado] = useState(false);

  // Estadísticas calculadas
  const totalEmpresas = clientes.length;
  const empresasConectadas = clientes.filter(c => c.sunat_estado_conexion === "CONECTADO").length;
  const empresasSinConfigurar = clientes.filter(c => !c.usuario_sol || c.sunat_estado_conexion === "NO_CONFIGURADO").length;
  const totalBuzon = buzonStats?.total || buzonMensajes.length;
  const totalNotificaciones = buzonStats?.total_notificaciones ?? buzonMensajes.filter(m => m.categoria_buzon !== "MENSAJE").length;
  const totalMensajes = buzonStats?.total_mensajes ?? buzonMensajes.filter(m => m.categoria_buzon === "MENSAJE").length;
  const buzonUrgentes = buzonStats?.urgentes || buzonMensajes.filter(m => m.estado === "URGENTE").length;
  const buzonNoLeidos = buzonStats?.no_leidos || buzonMensajes.filter(m => m.estado === "NO_LEIDO").length;

  // Filtrado de mensajes del buzón
  const mensajesFiltrados = buzonMensajes.filter(msg => {
    if (filtroBuzonClienteId !== "TODOS" && msg.cliente_id !== Number(filtroBuzonClienteId)) {
      return false;
    }
    if (filtroBuzonEstado !== "TODOS" && msg.estado !== filtroBuzonEstado) {
      return false;
    }
    if (filtroCategoriaBuzon !== "TODOS") {
      const cat = msg.categoria_buzon || "NOTIFICACION";
      if (cat !== filtroCategoriaBuzon) return false;
    }
    if (searchTermBuzon.trim()) {
      const term = searchTermBuzon.toLowerCase();
      const matchAsunto = msg.asunto?.toLowerCase().includes(term);
      const matchNum = msg.numero_notificacion?.toLowerCase().includes(term);
      const matchRuc = msg.cliente_ruc?.includes(term);
      const matchRazon = msg.cliente_razon_social?.toLowerCase().includes(term);
      if (!matchAsunto && !matchNum && !matchRuc && !matchRazon) return false;
    }
    return true;
  });

  const handleProbarTokenLibre = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerandoTokenLibre(true);
    setTokenLibreError(null);
    setTokenLibreResult(null);

    try {
      const res = await api.generarTokenSunatDirecto({
        ruc: testRuc.trim(),
        usuario_sol: testUsuario.trim().toUpperCase(),
        clave_sol: testClave.trim()
      });
      setTokenLibreResult(res);
    } catch (err: any) {
      setTokenLibreError(err.message || "Error al validar credenciales y generar Token con SUNAT.");
    } finally {
      setGenerandoTokenLibre(false);
    }
  };

  const getTipoDocumentoBadge = (tipo: string) => {
    switch (tipo) {
      case "CARTA_INDUCTIVA":
        return <Badge variant="destructive" className="text-[10px]">Carta Inductiva</Badge>;
      case "ESQUELA_CITACION":
        return <Badge variant="warning" className="text-[10px]">Esquela Citación</Badge>;
      case "ORDEN_PAGO":
        return <Badge variant="destructive" className="text-[10px] bg-purple-600">Orden de Pago</Badge>;
      case "RESOLUCION_COACTIVA":
        return <Badge variant="destructive" className="text-[10px] bg-red-700">Resolución Coactiva</Badge>;
      case "AVISO_VENCIMIENTO":
        return <Badge variant="info" className="text-[10px] bg-blue-600 text-white">Aviso Cronograma</Badge>;
      case "REPORTE_SIRE":
        return <Badge variant="info" className="text-[10px] bg-emerald-600 text-white">Reporte SIRE</Badge>;
      case "REPORTE_COMPROBANTES":
        return <Badge variant="info" className="text-[10px] bg-cyan-600 text-white">Reporte CPE / RHE</Badge>;
      case "COMUNICACION_INFORMATIVA":
        return <Badge variant="secondary" className="text-[10px]">Mensaje Informativo</Badge>;
      case "NOTIFICACION_OFICIAL":
        return <Badge variant="default" className="text-[10px] bg-indigo-600 text-white">Notificación SOL</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{tipo.replace(/_/g, " ")}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* 1. CABECERA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            SUNAT Operaciones en Línea (SOL) & Buzón Electrónico
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión fehaciente de Usuario SOL y Clave SOL, generación de tokens de sesión, autologin 1-clic y auditoría de requerimientos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Masivo: Obtiene notificaciones de todos los clientes */}
          <Button
            size="sm"
            onClick={() => handleSincronizarBuzonTodos()}
            disabled={sincronizandoBuzon}
            className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer shadow-xs font-semibold"
            title="Sincroniza y descarga las notificaciones del Buzón SOL de todas las empresas MYPE a la vez"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${sincronizandoBuzon ? "animate-spin" : ""}`} />
            {sincronizandoBuzon ? "Sincronizando..." : "Sincronizar Todos los Clientes"}
          </Button>

          {/* Botón Cliente Específico si hay uno seleccionado en el filtro */}
          {filtroBuzonClienteId !== "TODOS" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSincronizarBuzon(Number(filtroBuzonClienteId))}
              disabled={sincronizandoBuzon}
              className="text-xs h-9 gap-1.5 cursor-pointer shadow-xs border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              title="Sincronizar únicamente el buzón de la empresa seleccionada"
            >
              <Inbox className="h-3.5 w-3.5" />
              Sincronizar Cliente Filtrado
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (clientes.length > 0) abrirModalSunat(clientes[0]);
            }}
            className="text-xs h-9 gap-1.5 cursor-pointer shadow-xs"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Configurar Clave SOL
          </Button>
        </div>
      </div>

      {/* 2. TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Conexión SOL Activa</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {empresasConectadas} / {totalEmpresas}
            </p>
            <p className="text-[11px] text-slate-400">MYPEs con token generado</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6 stroke-[1.75]" />
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Buzón Electrónico</p>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {totalBuzon}
            </p>
            <p className="text-[11px] text-slate-400">
              {totalNotificaciones} notificaciones · {totalMensajes} mensajes
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
            <Inbox className="h-6 w-6 stroke-[1.75]" />
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Plazos Urgentes</p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {buzonUrgentes}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{buzonNoLeidos} requerimiento(s) sin leer</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="h-6 w-6 stroke-[1.75]" />
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Autologin Disponible</p>
            <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {clientes.filter(c => Boolean(c.usuario_sol)).length}
            </p>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Acceso rápido con 1-clic</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
            <KeyRound className="h-6 w-6 stroke-[1.75]" />
          </div>
        </Card>
      </div>

      {/* 3. PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("BUZON")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "BUZON"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Inbox className="h-4 w-4" />
          Buzón Electrónico SOL ({buzonMensajes.length})
        </button>

        <button
          onClick={() => setActiveTab("EMPRESAS")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "EMPRESAS"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Estado de Conexión SOL por MYPE ({clientes.length})
        </button>

        <button
          onClick={() => setActiveTab("TOKEN_TEST")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "TOKEN_TEST"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Generador y Validador de Token SUNAT
        </button>
      </div>

      {/* PESTAÑA 1: BUZÓN ELECTRÓNICO SOL */}
      {activeTab === "BUZON" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden animate-fade-in">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-blue-600" />
                  Buzón Electrónico SUNAT: Notificaciones y Mensajes Reales
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Actos administrativos oficiales con validez legal y comunicaciones informativas (SIRE, reportes CPE, cronogramas).
                </CardDescription>
              </div>

              {/* Filtros de Empresa, Estado y Sincronización */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filtroBuzonClienteId}
                  onChange={(e) => setFiltroBuzonClienteId(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="TODOS">Todas las MYPEs</option>
                  {clientes.map(cli => (
                    <option key={cli.id} value={cli.id}>
                      {cli.razon_social} (RUC {cli.ruc})
                    </option>
                  ))}
                </select>

                <select
                  value={filtroBuzonEstado}
                  onChange={(e) => setFiltroBuzonEstado(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="URGENTE">Urgentes con plazo</option>
                  <option value="NO_LEIDO">No leídos</option>
                  <option value="LEIDO">Leídos</option>
                </select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (filtroBuzonClienteId !== "TODOS") {
                      handleSincronizarBuzon(Number(filtroBuzonClienteId));
                    } else {
                      handleSincronizarBuzonTodos();
                    }
                  }}
                  disabled={sincronizandoBuzon}
                  className="h-8 text-xs gap-1 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  title="Sincronizar buzón real con SUNAT según el filtro"
                >
                  <RefreshCw className={`h-3 w-3 ${sincronizandoBuzon ? "animate-spin" : ""}`} />
                  <span>{filtroBuzonClienteId !== "TODOS" ? "Sincronizar Cliente" : "Sincronizar Todos"}</span>
                </Button>
              </div>
            </div>

            {/* Selector de Categoría: Notificaciones vs Mensajes */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-1">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFiltroCategoriaBuzon("TODOS")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    filtroCategoriaBuzon === "TODOS"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Todos ({buzonMensajes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCategoriaBuzon("NOTIFICACION")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filtroCategoriaBuzon === "NOTIFICACION"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <FileText className="h-3 w-3" />
                  Buzón Notificaciones ({totalNotificaciones})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCategoriaBuzon("MENSAJE")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filtroCategoriaBuzon === "MENSAJE"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Mail className="h-3 w-3" />
                  Buzón Mensajes ({totalMensajes})
                </button>
              </div>

              {/* Barra de Búsqueda */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar asunto, N° notificación o RUC..."
                  value={searchTermBuzon}
                  onChange={(e) => setSearchTermBuzon(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Código / N°</th>
                    <th className="p-3">Tipo Documento</th>
                    <th className="p-3">Empresa MYPE</th>
                    <th className="p-3">Asunto / Resumen</th>
                    <th className="p-3 text-center">Plazo Subsanación</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {mensajesFiltrados.map((msg) => (
                    <tr
                      key={msg.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        msg.estado === "URGENTE" ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-500">
                        {new Date(msg.fecha_deposito).toLocaleDateString()}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {msg.categoria_buzon === "MENSAJE" ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 text-[10px]">
                            <Mail className="h-2.5 w-2.5" /> Mensaje
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 text-[10px]">
                            <FileText className="h-2.5 w-2.5" /> Notificación
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {msg.numero_notificacion}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {getTipoDocumentoBadge(msg.tipo_documento)}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {msg.cliente_razon_social || msg.cliente_ruc}
                      </td>
                      <td className="p-3 max-w-md truncate text-slate-700 dark:text-slate-300" title={limpiarTextoUI(msg.asunto)}>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate font-medium">{limpiarTextoUI(msg.asunto)}</span>
                          {(msg.adjunto_nombre || (msg.detalle?.adjuntos && msg.detalle.adjuntos.length > 0)) && (
                            <span className="shrink-0 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-1.5 py-0.5 rounded shadow-2xs" title="Contiene documento o constancia PDF oficial adjunta">
                              PDF
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {msg.plazo_dias ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 text-[10px]">
                            <Clock className="h-3 w-3" />
                            {msg.plazo_dias} días hábiles
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {msg.estado === "URGENTE" ? (
                          <Badge variant="destructive" className="text-[10px]">Urgente</Badge>
                        ) : msg.estado === "LEIDO" ? (
                          <Badge variant="outline" className="text-[10px] text-slate-500">Leído</Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">No leído</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirDetalleBuzon(msg)}
                          className="h-7 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 gap-1 cursor-pointer font-medium"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver Detalle
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {mensajesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        {buzonLoading ? "Cargando notificaciones de Buzón SOL..." : "No se registraron notificaciones con los filtros seleccionados."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PESTAÑA 2: ESTADO DE CONEXIÓN SOL & AUTOLOGIN */}
      {activeTab === "EMPRESAS" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden animate-fade-in">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Directorio de Credenciales SOL & Tokens Activos
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Supervisión de tokens de autenticación para autologin inmediato y sincronización con SUNAT
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Empresa MYPE</th>
                    <th className="p-3">RUC</th>
                    <th className="p-3">Usuario SOL</th>
                    <th className="p-3 text-center">Clave SOL</th>
                    <th className="p-3 text-center">Conectividad SUNAT</th>
                    <th className="p-3">Vigencia del Token</th>
                    <th className="p-3 text-right">Acciones Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {clientes.map((cli) => {
                    const estaConectado = cli.sunat_estado_conexion === "CONECTADO";
                    const tieneUsuario = Boolean(cli.usuario_sol);

                    return (
                      <tr key={cli.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {cli.razon_social}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {cli.ruc}
                        </td>
                        <td className="p-3 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {cli.usuario_sol || <span className="text-slate-400 font-normal italic">Sin registrar</span>}
                        </td>
                        <td className="p-3 text-center">
                          {cli.tiene_clave_sol ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                              ✓ Registrada
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] text-slate-400">
                              No asignada
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {estaConectado ? (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Conectado
                            </Badge>
                          ) : cli.sunat_estado_conexion === "PENDIENTE_VALIDACION" ? (
                            <Badge variant="warning" className="text-[10px] gap-1">
                              Pendiente
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] text-slate-400">
                              No configurado
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {cli.sunat_token_expires_at ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Válido (1 hora)
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sin token generado</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Sincronizar Buzón SOL Individual */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSincronizarBuzon(cli.id)}
                              disabled={sincronizandoBuzon}
                              className="h-7 px-2.5 text-xs border-indigo-200 dark:border-indigo-900 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1 cursor-pointer"
                              title={`Obtener notificaciones del Buzón SOL para ${cli.razon_social}`}
                            >
                              <Inbox className="h-3 w-3" />
                              <span>Sincronizar Buzón</span>
                            </Button>

                            {/* Autologin 1-clic */}
                            {tieneUsuario ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAutologinSunat(cli)}
                                className="h-7 px-2.5 text-xs border-blue-200 dark:border-blue-900 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 cursor-pointer"
                                title="Abrir portal de SUNAT con autologueo"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Autologin SOL</span>
                              </Button>
                            ) : null}

                            {/* Validar Conexión */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleValidarSunatConexion(cli.id)}
                              className="h-7 px-2.5 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 cursor-pointer"
                              title="Validar y generar nuevo token"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Validar Token</span>
                            </Button>

                            {/* Configurar Clave SOL */}
                            <Button
                              size="sm"
                              onClick={() => abrirModalSunat(cli)}
                              className="h-7 px-2.5 text-xs bg-slate-800 hover:bg-slate-900 text-white gap-1 cursor-pointer"
                            >
                              <KeyRound className="h-3 w-3" />
                              <span>Clave SOL</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PESTAÑA 3: GENERADOR Y VALIDADOR DE TOKEN SUNAT */}
      {activeTab === "TOKEN_TEST" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Formulario de prueba */}
          <Card className="lg:col-span-5 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Validador Rápido de Token SUNAT
              </CardTitle>
              <CardDescription className="text-xs">
                Pruebe la validez de cualquier combinación RUC + Usuario + Clave SOL y genere el token firmado de sesión para el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProbarTokenLibre} className="space-y-3.5 text-xs">
                {tokenLibreError && (
                  <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p>{tokenLibreError}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="testRuc" className="text-xs font-semibold">RUC (11 dígitos):</Label>
                  <Input
                    id="testRuc"
                    maxLength={11}
                    value={testRuc}
                    onChange={(e) => setTestRuc(e.target.value.replace(/\D/g, ""))}
                    className="text-xs h-8 font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Verificado mediante algoritmo Módulo 11 oficial</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="testUsuario" className="text-xs font-semibold">Usuario SOL:</Label>
                  <Input
                    id="testUsuario"
                    value={testUsuario}
                    onChange={(e) => setTestUsuario(e.target.value.toUpperCase())}
                    className="text-xs h-8 font-mono uppercase"
                    placeholder="MODDATOS"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="testClave" className="text-xs font-semibold">Clave SOL:</Label>
                  <Input
                    id="testClave"
                    type="password"
                    value={testClave}
                    onChange={(e) => setTestClave(e.target.value)}
                    className="text-xs h-8"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={generandoTokenLibre}
                    className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${generandoTokenLibre ? "animate-spin" : ""}`} />
                    {generandoTokenLibre ? "Validando con SUNAT..." : "Validar y Generar Token Ahora"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Resultado de la prueba */}
          <Card className="lg:col-span-7 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Respuesta del Servidor de Autenticación
              </CardTitle>
              <CardDescription className="text-xs">
                Estructura del Token de Acceso generado para el consumo de servicios de SUNAT y Buzón Electrónico.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tokenLibreResult ? (
                <div className="space-y-3 text-xs animate-fade-in">
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Autenticación Conforme
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {tokenLibreResult.mensaje}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-[10px]">
                      {tokenLibreResult.token_type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">RUC CONTRIBUYENTE:</span>
                      <strong>{tokenLibreResult.contribuyente.ruc}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ESTADO SUNAT:</span>
                      <strong className="text-emerald-600">{tokenLibreResult.contribuyente.estado} - {tokenLibreResult.contribuyente.condicion}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">USUARIO SOL:</span>
                      <strong>{tokenLibreResult.contribuyente.usuario_sol}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">TIEMPO DE EXPIRACIÓN:</span>
                      <strong>{tokenLibreResult.expires_in} segundos (1 hora)</strong>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="font-semibold text-slate-700 dark:text-slate-300">Access Token Oficial Generado:</Label>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(tokenLibreResult.access_token);
                          setTokenCopiado(true);
                          setTimeout(() => setTokenCopiado(false), 2000);
                        }}
                        className="text-blue-600 dark:text-blue-400 text-[11px] inline-flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        {tokenCopiado ? "¡Copiado!" : "Copiar Token"}
                      </button>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] break-all select-all">
                      {tokenLibreResult.access_token}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <ShieldCheck className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs">Complete los datos de la izquierda y presione "Validar y Generar Token Ahora" para ver la respuesta en tiempo real.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
