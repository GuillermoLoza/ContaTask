"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Calculator,
  Users,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  Building2,
  Calendar,
  Check,
  Ban,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  MessageSquare,
  FileSpreadsheet,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  Globe,
  ShieldCheck,
  ExternalLink,
  Lock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContador } from "@/context/ContadorContext";
import {
  api,
  SirePropuesta,
  SireComprobante,
  SireMetricas,
  DeclaracionMensual
} from "@/lib/api";

export default function ContadorSirePage() {
  const { clientes } = useContador();

  // Estados de Selección
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("2026-08");
  const [activeTab, setActiveTab] = useState<"sire" | "liquidacion">("sire");

  // Estados SIRE (RCE Compras / RVIE Ventas)
  const [sireTipo, setSireTipo] = useState<"RCE" | "RVIE">("RCE");
  const [sirePropuesta, setSirePropuesta] = useState<SirePropuesta | null>(null);
  const [sireComprobantes, setSireComprobantes] = useState<SireComprobante[]>([]);
  const [sireMetricas, setSireMetricas] = useState<SireMetricas | null>(null);
  const [sireLoading, setSireLoading] = useState<boolean>(false);
  const [sireActionLoading, setSireActionLoading] = useState<boolean>(false);
  const [sireFiltroEstado, setSireFiltroEstado] = useState<string>("TODOS");
  const [sireAmbiente, setSireAmbiente] = useState<"prod" | "beta">("prod");
  const [sireTestingApi, setSireTestingApi] = useState<boolean>(false);
  const [modalSireApiOpen, setModalSireApiOpen] = useState<boolean>(false);
  const [sireApiTestResult, setSireApiTestResult] = useState<any | null>(null);

  // Modal Exclusión SIRE
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [comprobanteToExcluir, setComprobanteToExcluir] = useState<SireComprobante | null>(null);
  const [motivoExclusion, setMotivoExclusion] = useState("Gasto personal / no deducible (Art. 44 LIR)");

  // Modal Agregar Manual SIRE (Luz/Agua/Servicios)
  const [modalManualOpen, setModalManualOpen] = useState(false);
  const [manualData, setManualData] = useState({
    tipo_comprobante: "14", // 14: Recibo Servicio Público
    serie: "S001",
    numero: "",
    fecha_emision: new Date().toISOString().slice(0, 10),
    emisor_ruc: "20100119854",
    emisor_razon_social: "SEDAPAL S.A.",
    base_imponible: 150,
    igv: 27,
    monto_total: 177,
    moneda: "PEN"
  });

  // Estados Liquidación Mensual
  const [declaracion, setDeclaracion] = useState<DeclaracionMensual | null>(null);
  const [liqLoading, setLiqLoading] = useState(false);
  const [declarandoLoading, setDeclarandoLoading] = useState(false);

  // Notificaciones & Feedback UI
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clienteSeleccionado = clientes.find((c) => c.id === selectedClienteId) || clientes[0];

  useEffect(() => {
    if (clientes.length > 0 && !selectedClienteId) {
      setSelectedClienteId(clientes[0].id);
    }
  }, [clientes, selectedClienteId]);

  useEffect(() => {
    if (!clienteSeleccionado) return;

    if (activeTab === "sire") {
      cargarSire();
    } else if (activeTab === "liquidacion") {
      cargarLiquidacion();
    }
  }, [clienteSeleccionado, selectedPeriodo, sireTipo, activeTab]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4500);
    }
  };

  // ==========================================
  // MÉTODOS SIRE
  // ==========================================
  const cargarSire = async () => {
    if (!clienteSeleccionado) return;
    setSireLoading(true);
    try {
      const res = await api.getSirePropuesta(clienteSeleccionado.id, selectedPeriodo, sireTipo);
      if (res && res.propuesta) {
        setSirePropuesta(res.propuesta);
        setSireComprobantes(res.comprobantes || []);
        setSireMetricas(res.metricas || null);
      } else {
        setSirePropuesta(null);
        setSireComprobantes([]);
        setSireMetricas(null);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSireLoading(false);
    }
  };

  const handleExtraerSire = async (forzar?: boolean) => {
    if (!clienteSeleccionado) return;
    setSireActionLoading(true);
    try {
      const res = await api.extraerSirePropuesta(clienteSeleccionado.id, selectedPeriodo, sireTipo, {
        ambiente: sireAmbiente,
        forzarApi: Boolean(forzar)
      });
      await cargarSire();
      if (res?.propuesta?.origen_datos === "API_SUNAT_OFICIAL") {
        showNotification(`Propuesta SIRE oficial extraída exitosamente de SUNAT (Ticket: ${res.propuesta.ticket_sunat || "OK"}).`);
      } else {
        showNotification(res?.message || `Propuesta SIRE (${sireTipo === "RCE" ? "Compras" : "Ventas"}) sincronizada exitosamente.`);
      }
    } catch (err: any) {
      showNotification(err.message || "Error al sincronizar con SIRE", true);
    } finally {
      setSireActionLoading(false);
    }
  };

  const handleTestSireApi = async () => {
    if (!clienteSeleccionado) return;
    setSireTestingApi(true);
    try {
      const res = await api.testSireApiConexion(clienteSeleccionado.id, sireAmbiente);
      setSireApiTestResult(res);
      setModalSireApiOpen(true);
      if (res.conectado) {
        showNotification("Conexión con el servicio Web API SUNAT SIRE validada exitosamente.");
      } else {
        showNotification(res.mensaje || "Diagnóstico de conexión API SUNAT obtenido.", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Error al verificar conexión con la API SUNAT", true);
    } finally {
      setSireTestingApi(false);
    }
  };

  const handleExcluirConfirm = async () => {
    if (!comprobanteToExcluir) return;
    try {
      await api.excluirSireComprobante(comprobanteToExcluir.id, motivoExclusion);
      setModalExcluirOpen(false);
      setComprobanteToExcluir(null);
      showNotification("Comprobante excluido del registro tributario correctamente.");
      cargarSire();
    } catch (err: any) {
      showNotification(err.message || "Error al excluir comprobante", true);
    }
  };

  const handleIncluir = async (comp: SireComprobante) => {
    try {
      await api.incluirSireComprobante(comp.id);
      showNotification("Comprobante reincorporado al registro fiscal.");
      cargarSire();
    } catch (err: any) {
      showNotification(err.message || "Error al reincorporar comprobante", true);
    }
  };

  const handleAgregarManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado) return;
    try {
      await api.agregarSireComprobanteManual(clienteSeleccionado.id, selectedPeriodo, {
        tipo_registro: sireTipo,
        ...manualData
      });
      setModalManualOpen(false);
      showNotification("Comprobante manual (servicio público) registrado con éxito.");
      cargarSire();
    } catch (err: any) {
      showNotification(err.message || "Error al registrar comprobante manual", true);
    }
  };

  const handleConsolidarPropuesta = async () => {
    if (!clienteSeleccionado) return;
    if (!confirm("¿Está seguro de cerrar y consolidar la propuesta final para presentar ante SUNAT?")) return;
    try {
      await api.consolidarSirePropuesta(clienteSeleccionado.id, selectedPeriodo, sireTipo);
      showNotification("Propuesta consolidada y aprobada con éxito en estado FINAL_ACEPTADA.");
      cargarSire();
    } catch (err: any) {
      showNotification(err.message || "Error al consolidar propuesta", true);
    }
  };

  // ==========================================
  // MÉTODOS LIQUIDACIÓN
  // ==========================================
  const cargarLiquidacion = async () => {
    if (!clienteSeleccionado) return;
    setLiqLoading(true);
    try {
      const res = await api.getLiquidacionTributaria(clienteSeleccionado.id, selectedPeriodo);
      setDeclaracion(res.liquidacion || null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLiqLoading(false);
    }
  };

  const handleDeclararYGenerarNps = async () => {
    if (!clienteSeleccionado) return;
    if (!confirm("¿Desea registrar la Declaración Jurada Mensual en SUNAT, generar el NPS y notificar al cliente?")) return;
    setDeclarandoLoading(true);
    try {
      const res = await api.declararYGenerarNps(clienteSeleccionado.id, selectedPeriodo);
      setDeclaracion(res.declaracion);
      showNotification(`¡Declaración Jurada presentada con éxito! NPS generado: ${res.declaracion.nps}`);
    } catch (err: any) {
      showNotification(err.message || "Error al registrar declaración", true);
    } finally {
      setDeclarandoLoading(false);
    }
  };

  // Filtrado de comprobantes SIRE
  const comprobantesFiltrados = sireComprobantes.filter((c) => {
    if (sireFiltroEstado === "TODOS") return true;
    return c.estado_cruce === sireFiltroEstado;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* ALERTS */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 1. CABECERA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            SIRE SUNAT
          </h1>
        </div>

        {/* SELECTORES DE CLIENTE Y PERIODO */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cliente</span>
              <select
                value={clienteSeleccionado?.id || ""}
                onChange={(e) => setSelectedClienteId(Number(e.target.value))}
                className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-hidden cursor-pointer max-w-[200px] sm:max-w-[240px] truncate"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {c.razon_social} ({c.ruc})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Periodo Fiscal</span>
              <select
                value={selectedPeriodo}
                onChange={(e) => setSelectedPeriodo(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <optgroup label="Ejercicio 2026" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <option value="2026-08">2026 - Agosto</option>
                  <option value="2026-07">2026 - Julio</option>
                  <option value="2026-06">2026 - Junio</option>
                </optgroup>
                <optgroup label="Ejercicio 2025" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <option value="2025-12">2025 - Diciembre</option>
                  <option value="2025-11">2025 - Noviembre</option>
                  <option value="2025-10">2025 - Octubre</option>
                  <option value="2025-09">2025 - Setiembre</option>
                  <option value="2025-08">2025 - Agosto</option>
                  <option value="2025-07">2025 - Julio</option>
                  <option value="2025-06">2025 - Junio</option>
                  <option value="2025-05">2025 - Mayo</option>
                  <option value="2025-04">2025 - Abril</option>
                  <option value="2025-03">2025 - Marzo</option>
                  <option value="2025-02">2025 - Febrero</option>
                  <option value="2025-01">2025 - Enero</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("sire")}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "sire"
            ? "border-blue-600 text-blue-600 dark:text-blue-400"
            : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          SIRE: Compras y Ventas (RCE / RVIE)
        </button>

        <button
          onClick={() => setActiveTab("liquidacion")}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "liquidacion"
            ? "border-blue-600 text-blue-600 dark:text-blue-400"
            : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
        >
          <Calculator className="w-4 h-4" />
          Liquidación de Impuestos & NPS (Form. 621)
        </button>

        </div>

      {/* ========================================================= */}
      {/* TAB 1: SIRE (RCE / RVIE)                                  */}
      {/* ========================================================= */}
      {activeTab === "sire" && (
        <div className="space-y-6">
          {/* BARRA DE HERRAMIENTAS SIRE */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mr-1">Libro:</span>
              <button
                onClick={() => setSireTipo("RCE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sireTipo === "RCE"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
              >
                RCE (Registro de Compras)
              </button>
              <button
                onClick={() => setSireTipo("RVIE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sireTipo === "RVIE"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
              >
                RVIE (Registro de Ventas)
              </button>

              <Badge variant="outline" className="ml-1 font-mono text-xs">
                {sirePropuesta?.estado || "NO_DESCARGADO"}
              </Badge>

              {sirePropuesta?.origen_datos === "API_SUNAT_OFICIAL" ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 gap-1.5 font-medium text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  API SUNAT Oficial
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 gap-1.5 font-medium text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Modo Asistido
                </Badge>
              )}

              {/* Selector de Ambiente SUNAT */}
              <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800/60 text-[11px] ml-1">
                <button
                  type="button"
                  title="Ambiente de Producción SUNAT (api-sire.sunat.gob.pe)"
                  onClick={() => setSireAmbiente("prod")}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    sireAmbiente === "prod"
                      ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Prod
                </button>
                <button
                  type="button"
                  title="Ambiente de Pruebas Beta SUNAT (api-sire-beta.sunat.gob.pe)"
                  onClick={() => setSireAmbiente("beta")}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    sireAmbiente === "beta"
                      ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Beta
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSireApi}
                disabled={sireTestingApi || !clienteSeleccionado}
                className="gap-2 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
              >
                <Globe className={`w-3.5 h-3.5 ${sireTestingApi ? "animate-spin" : ""}`} />
                Probar Conexión API
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExtraerSire(false)}
                disabled={sireActionLoading}
                className="gap-2 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sireActionLoading ? "animate-spin" : ""}`} />
                Extraer Propuesta SIRE SUNAT
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalManualOpen(true)}
                className="gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Recibo Manual (Luz/Agua)
              </Button>

              {clienteSeleccionado && sirePropuesta && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(api.getDescargaPlanoSireUrl(clienteSeleccionado.id, selectedPeriodo, sireTipo), "_blank");
                    }}
                    className="gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar TXT SUNAT
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleConsolidarPropuesta}
                    disabled={sirePropuesta.estado === "FINAL_ACEPTADA"}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Consolidar Propuesta Final
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* BANNER DE ORIGEN DE DATOS Y DIAGNÓSTICO SUNAT SIRE */}
          {sirePropuesta && (
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              sirePropuesta.origen_datos === "API_SUNAT_OFICIAL"
                ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60"
                : "bg-blue-50/80 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/60"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  sirePropuesta.origen_datos === "API_SUNAT_OFICIAL"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                }`}>
                  {sirePropuesta.origen_datos === "API_SUNAT_OFICIAL" ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {sirePropuesta.origen_datos === "API_SUNAT_OFICIAL"
                        ? "Servicio Web Oficial API SUNAT SIRE (OAuth 2.0)"
                        : "Modo Asistido (Cruce con Transacciones Registradas)"}
                    </span>
                    {sirePropuesta.ticket_sunat && (
                      <Badge variant="outline" className="font-mono text-[10px] bg-white/70 dark:bg-slate-900/70">
                        Ticket: {sirePropuesta.ticket_sunat}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase font-mono bg-white/70 dark:bg-slate-900/70">
                      Ambiente: {sireAmbiente === "beta" ? "BETA (api-sire-beta)" : "PRODUCCIÓN (api-sire)"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {sirePropuesta.api_diagnostico ||
                      (sirePropuesta.origen_datos === "API_SUNAT_OFICIAL"
                        ? "Comprobantes sincronizados directamente desde los servidores de SUNAT mediante su API REST oficial."
                        : "Para conectar en vivo con api-sire.sunat.gob.pe, registre su Client ID y Client Secret en Gestión de Clientes.")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSireApi}
                  disabled={sireTestingApi}
                  className="text-xs gap-1.5 h-8 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-50"
                >
                  <Globe className={`w-3.5 h-3.5 text-blue-600 ${sireTestingApi ? "animate-spin" : ""}`} />
                  Diagnosticar Conexión
                </Button>
              </div>
            </div>
          )}

          {/* MÉTRICAS DE LA PROPUESTA Y CONCILIACIÓN */}
          {sireMetricas && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Total Comprobantes</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {sireMetricas.total}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {sireMetricas.coincidentes} coinciden al 100% con el sistema
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Base Aceptada</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                        S/ {Number(sireMetricas.baseAceptada || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                      <Calculator className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Importe gravado registrado</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">IGV Aceptado</p>
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        S/ {Number(sireMetricas.igvAceptado || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {sireTipo === "RCE" ? "Crédito fiscal deducible" : "Débito fiscal por ventas"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Tasa de Coincidencia</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {sireMetricas.porcentajeCoincidencia}%
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${sireMetricas.porcentajeCoincidencia}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TABLA DE COMPROBANTES CON CRUCE */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">
                    Comprobantes de {sireTipo === "RCE" ? "Compras (RCE)" : "Ventas (RVIE)"} - Periodo {selectedPeriodo}
                  </CardTitle>
                  <CardDescription>
                    Cruce automático contra repositorio digital: identifique discrepancias y excluya compras no deducibles.
                  </CardDescription>
                </div>

                {/* FILTROS POR ESTADO DE CRUCE */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full">
                  {[
                    { id: "TODOS", label: "Todos" },
                    { id: "COINCIDE", label: "Coinciden (100%)" },
                    { id: "SOLO_EN_SUNAT", label: "Solo en SUNAT" },
                    { id: "SOLO_EN_SISTEMA", label: "Solo en Sistema" },
                    { id: "DISCREPANCIA_MONTO", label: "Discrepancia" },
                    { id: "EXCLUIDO", label: "Excluidos" }
                  ].map((filtro) => (
                    <button
                      key={filtro.id}
                      onClick={() => setSireFiltroEstado(filtro.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${sireFiltroEstado === filtro.id
                        ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                        }`}
                    >
                      {filtro.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {sireLoading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                  <p className="text-sm">Cargando registros del SIRE...</p>
                </div>
              ) : comprobantesFiltrados.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Info className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium">No se registran comprobantes para este filtro o periodo.</p>
                  <p className="text-xs text-slate-500 mt-1">Presione "Extraer Propuesta SIRE SUNAT" para sincronizar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3 text-left">Tipo / Número</th>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Emisor / RUC</th>
                        <th className="px-4 py-3 text-right">Base Imponible</th>
                        <th className="px-4 py-3 text-right">IGV</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Estado Cruce</th>
                        <th className="px-4 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {comprobantesFiltrados.map((comp) => (
                        <tr
                          key={comp.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${comp.estado_cruce === "EXCLUIDO" ? "opacity-60 bg-rose-50/20" : ""
                            }`}
                        >
                          <td className="px-4 py-3 font-medium">
                            <span className="font-mono text-slate-900 dark:text-slate-100">
                              {comp.tipo_comprobante === "01"
                                ? "01 Factura"
                                : comp.tipo_comprobante === "03"
                                  ? "03 Boleta"
                                  : comp.tipo_comprobante === "14"
                                    ? "14 Serv. Público"
                                    : `${comp.tipo_comprobante}`}
                            </span>
                            <div className="font-mono text-slate-500 text-[10px]">
                              {comp.serie}-{comp.numero}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{comp.fecha_emision}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                              {comp.emisor_razon_social}
                            </div>
                            <div className="font-mono text-slate-500 text-[10px]">{comp.emisor_ruc}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium">
                            S/ {Number(comp.base_imponible).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                            S/ {Number(comp.igv).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            S/ {Number(comp.monto_total).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.estado_cruce === "COINCIDE" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 text-[10px]">
                                Coincide 100%
                              </Badge>
                            ) : comp.estado_cruce === "SOLO_EN_SUNAT" ? (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 text-[10px]">
                                Solo en SUNAT
                              </Badge>
                            ) : comp.estado_cruce === "SOLO_EN_SISTEMA" ? (
                              <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 text-[10px]">
                                Solo en Sistema
                              </Badge>
                            ) : comp.estado_cruce === "DISCREPANCIA_MONTO" ? (
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 text-[10px]">
                                Discrepancia Monto
                              </Badge>
                            ) : comp.estado_cruce === "EXCLUIDO" ? (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 text-[10px]">
                                Excluido
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                {comp.estado_cruce}
                              </Badge>
                            )}
                            {comp.motivo_exclusion && comp.estado_cruce !== "EXCLUIDO" && (
                              <div className="text-[10px] text-slate-500 mt-0.5 max-w-[150px] mx-auto truncate" title={comp.motivo_exclusion}>
                                {comp.motivo_exclusion}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.estado_cruce === "EXCLUIDO" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIncluir(comp)}
                                className="h-7 text-[11px] text-emerald-600 hover:text-emerald-700"
                              >
                                Reincorporar
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setComprobanteToExcluir(comp);
                                  setModalExcluirOpen(true);
                                }}
                                className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                Excluir
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LIQUIDACIÓN DE IMPUESTOS (FORMULARIO 621)         */}
      {/* ========================================================= */}
      {activeTab === "liquidacion" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Liquidación Mensual de Impuestos - Formulario Virtual 621
              </h2>
              <p className="text-xs text-slate-500">
                Cálculo del IGV (Débito vs Crédito) y Pago a Cuenta del Impuesto a la Renta mensual para {clienteSeleccionado?.razon_social}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={cargarLiquidacion}
                disabled={liqLoading}
                className="gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${liqLoading ? "animate-spin" : ""}`} />
                Recalcular
              </Button>

              <Button
                size="sm"
                onClick={handleDeclararYGenerarNps}
                disabled={declarandoLoading || declaracion?.estado_declaracion === "DECLARADO" || declaracion?.estado_declaracion === "CON_NPS"}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-3.5 h-3.5" />
                Presentar DJ & Generar NPS
              </Button>
            </div>
          </div>

          {/* ESTADO DE CONCILIACIÓN CON SUNAT */}
          {declaracion && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${declaracion.estado_coincidencia === "COINCIDE"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                }`}
            >
              <div className="flex items-center gap-3">
                {declaracion.estado_coincidencia === "COINCIDE" ? (
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-600" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {declaracion.estado_coincidencia === "COINCIDE"
                      ? "Conformidad Tributaria: El cálculo interno coincide 100% con la proyección de SUNAT"
                      : "Discrepancia detectada entre cálculo de ContaTask y proyección SUNAT"}
                  </h3>
                  <p className="text-xs opacity-90">
                    {declaracion.estado_coincidencia === "COINCIDE"
                      ? "Los montos de IGV y Renta calculados a partir de los libros consolidados del SIRE son idénticos a los del Formulario 621."
                      : "Revise los comprobantes excluidos o manuales para asegurar la coherencia antes de enviar."}
                  </p>
                </div>
              </div>
              <Badge className="font-mono text-xs">
                {declaracion.estado_coincidencia === "COINCIDE" ? "100% MATCH" : "REVISIÓN SUGERIDA"}
              </Badge>
            </div>
          )}

          {/* COMPARATIVA EN 2 COLUMNAS: INTERNO VS SUNAT */}
          {declaracion && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* COLUMNA 1: CONTATASK */}
              <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
                <CardHeader className="bg-blue-50/50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      Cálculo Interno (ContaTask ERP)
                    </CardTitle>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Régimen: {declaracion.regimen_tributario}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Ventas Netas Gravadas:</span>
                    <span className="font-mono font-semibold">
                      S/ {Number(declaracion.ventas_base).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Débito Fiscal (IGV Ventas 18%):</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      + S/ {Number(declaracion.ventas_igv).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Compras Netas Gravadas:</span>
                    <span className="font-mono font-semibold">
                      S/ {Number(declaracion.compras_base).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Crédito Fiscal (IGV Compras 18%):</span>
                    <span className="font-mono font-semibold text-rose-600">
                      - S/ {Number(declaracion.compras_igv).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 bg-slate-50 dark:bg-slate-800/50 px-2 rounded-lg font-medium">
                    <span>IGV a Pagar del Mes:</span>
                    <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                      S/ {Number(declaracion.igv_determinado).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">
                      Pago a Cuenta Renta ({Number(declaracion.coeficiente_renta * 100).toFixed(1)}%):
                    </span>
                    <span className="font-mono font-semibold">
                      S/ {Number(declaracion.renta_determinada).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 bg-blue-50 dark:bg-blue-950/40 px-3 rounded-lg font-bold text-slate-900 dark:text-slate-100 text-sm">
                    <span>Total Tributos a Pagar:</span>
                    <span className="font-mono text-base text-blue-700 dark:text-blue-300">
                      S/ {Number(declaracion.total_tributo_pagar).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* COLUMNA 2: PROYECCIÓN SUNAT */}
              <Card className="border-indigo-200 dark:border-indigo-900 shadow-sm">
                <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Proyección Oficial SUNAT (Form. 621)
                    </CardTitle>
                    <Badge variant="outline" className="text-indigo-600 border-indigo-300">
                      SIRE Automático
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Casilla 100 (Ventas Gravadas):</span>
                    <span className="font-mono font-semibold">
                      S/ {Number(declaracion.ventas_base).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Casilla 101 (IGV Débito):</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      + S/ {Number(declaracion.ventas_igv).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Casilla 107 (Compras Nacionales):</span>
                    <span className="font-mono font-semibold">
                      S/ {Number(declaracion.compras_base).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Casilla 108 (Crédito Fiscal):</span>
                    <span className="font-mono font-semibold text-rose-600">
                      - S/ {Number(declaracion.compras_igv).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 bg-slate-50 dark:bg-slate-800/50 px-2 rounded-lg font-medium">
                    <span>Casilla 140 (IGV Resultante SUNAT):</span>
                    <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                      S/ {Number(declaracion.calculo_sunat_igv ?? declaracion.igv_determinado).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Casilla 312 (Pago a Cuenta Renta SUNAT):</span>
                    <span className="font-mono font-semibold">
                      S/ {Number(declaracion.calculo_sunat_renta ?? declaracion.renta_determinada).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 bg-indigo-50 dark:bg-indigo-950/40 px-3 rounded-lg font-bold text-slate-900 dark:text-slate-100 text-sm">
                    <span>Casilla 180 (Importe Total SUNAT):</span>
                    <span className="font-mono text-base text-indigo-700 dark:text-indigo-300">
                      S/ {Number(
                        (declaracion.calculo_sunat_igv ?? declaracion.igv_determinado) +
                        (declaracion.calculo_sunat_renta ?? declaracion.renta_determinada)
                      ).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PANEL DE NPS Y CONSTANCIA */}
          {declaracion && (
            <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Constancia de Presentación & Número de Pago SUNAT (NPS)
                  </CardTitle>
                  <Badge className="bg-emerald-600 text-white font-mono">
                    ESTADO: {declaracion.estado_declaracion}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Número de Pago SUNAT</p>
                    <p className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                      {declaracion.nps || "PENDIENTE DE GENERAR"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Válido para banca por internet y agentes autorizados
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 uppercase font-semibold">N° Orden DJ</p>
                    <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {declaracion.numero_orden_dj || "PENDIENTE"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Fecha Límite: {declaracion.fecha_limite_pago || "18/09/2026"}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Notificación al Cliente</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Aviso automático enviado a {clienteSeleccionado?.celular} y {clienteSeleccionado?.email}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDeclararYGenerarNps}
                        className="text-xs gap-1.5 w-full"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        Reenviar por WhatsApp
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EXCLUIR COMPROBANTE NO DEDUCIBLE                   */}
      {/* ========================================================= */}
      {modalExcluirOpen && comprobanteToExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                Excluir Comprobante del Registro
              </h3>
              <button
                onClick={() => setModalExcluirOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
              <p>
                <strong>Comprobante:</strong> {comprobanteToExcluir.serie}-{comprobanteToExcluir.numero}
              </p>
              <p>
                <strong>Emisor:</strong> {comprobanteToExcluir.emisor_razon_social} ({comprobanteToExcluir.emisor_ruc})
              </p>
              <p>
                <strong>Monto Total:</strong> S/ {Number(comprobanteToExcluir.monto_total).toFixed(2)} (IGV: S/ {Number(comprobanteToExcluir.igv).toFixed(2)})
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Motivo de Exclusión / Irregularidad</Label>
              <select
                value={motivoExclusion}
                onChange={(e) => setMotivoExclusion(e.target.value)}
                className="w-full text-xs rounded-lg p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Gasto personal / no deducible (Art. 44 LIR)">Gasto personal / no deducible (Art. 44 LIR)</option>
                <option value="Comprobante no corresponde al giro del negocio">Comprobante no corresponde al giro del negocio</option>
                <option value="Comprobante anulado en origen por el proveedor">Comprobante anulado en origen por el proveedor</option>
                <option value="Factura duplicada o registrada indebidamente">Factura duplicada o registrada indebidamente</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalExcluirOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleExcluirConfirm} className="bg-rose-600 hover:bg-rose-700 text-white">
                Confirmar Exclusión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AGREGAR RECIBO MANUAL (SERVICIOS PÚBLICOS LUZ/AGUA) */}
      {/* ========================================================= */}
      {modalManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Agregar Recibo de Servicios Públicos (Manual)
              </h3>
              <button
                onClick={() => setModalManualOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Los recibos de agua, luz o telecomunicaciones muchas veces no se sincronizan automáticamente en el SIRE y deben registrarse con Tipo 14 para acreditar crédito fiscal.
            </p>

            <form onSubmit={handleAgregarManualSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Serie</Label>
                  <Input
                    required
                    value={manualData.serie}
                    onChange={(e) => setManualData({ ...manualData, serie: e.target.value })}
                    placeholder="S001"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Número</Label>
                  <Input
                    required
                    value={manualData.numero}
                    onChange={(e) => setManualData({ ...manualData, numero: e.target.value })}
                    placeholder="00129481"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>RUC Emisor (Prestador)</Label>
                  <Input
                    required
                    value={manualData.emisor_ruc}
                    onChange={(e) => setManualData({ ...manualData, emisor_ruc: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Razón Social Emisor</Label>
                  <Input
                    required
                    value={manualData.emisor_razon_social}
                    onChange={(e) => setManualData({ ...manualData, emisor_razon_social: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Base Imponible</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={manualData.base_imponible}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      const igv = Math.round(base * 0.18 * 100) / 100;
                      setManualData({
                        ...manualData,
                        base_imponible: base,
                        igv: igv,
                        monto_total: Math.round((base + igv) * 100) / 100
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>IGV (18%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualData.igv}
                    readOnly
                    className="bg-slate-100 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Total</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualData.monto_total}
                    readOnly
                    className="bg-slate-100 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" type="button" size="sm" onClick={() => setModalManualOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Guardar e Incluir al RCE
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DIAGNÓSTICO Y CONEXIÓN API SUNAT SIRE             */}
      {/* ========================================================= */}
      {modalSireApiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Diagnóstico del Servicio Web API SUNAT SIRE
                </h3>
              </div>
              <button
                onClick={() => setModalSireApiOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {sireApiTestResult && (
              <div className="space-y-4 text-xs">
                {/* Tarjeta de Estado */}
                <div className={`p-4 rounded-xl border ${
                  sireApiTestResult.conectado
                    ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                    : sireApiTestResult.modo === "SIN_CREDENCIALES_API"
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                      : "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {sireApiTestResult.conectado
                        ? "🟢 Conexión Activa y Validada con SUNAT"
                        : sireApiTestResult.modo === "SIN_CREDENCIALES_API"
                          ? "🟡 Credenciales Web API No Configuradas"
                          : "🔴 Falla de Autenticación con SUNAT"}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {sireApiTestResult.modo}
                    </Badge>
                  </div>
                  <p className="mt-2 text-slate-700 dark:text-slate-300">
                    {sireApiTestResult.mensaje}
                  </p>
                </div>

                {/* Detalles de la Conexión */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 font-medium">Contribuyente:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {sireApiTestResult.ruc || clienteSeleccionado?.ruc} - {sireApiTestResult.razonSocial || clienteSeleccionado?.razon_social}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 font-medium">Servidor OAuth 2.0:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      api-seguridad.sunat.gob.pe
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 font-medium">Endpoint Oficial SIRE:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      https://api-sire.sunat.gob.pe/v1/contribuyente/mype
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 font-medium">Ambiente:</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {sireAmbiente === "beta" ? "BETA (api-sire-beta)" : "PRODUCCIÓN (api-sire)"}
                    </span>
                  </div>
                  {sireApiTestResult.tokenValidoHasta && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 font-medium">Token Válido Hasta:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {new Date(sireApiTestResult.tokenValidoHasta).toLocaleString("es-PE")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Instrucciones de Configuración SOL si falta configurar */}
                {!sireApiTestResult.conectado && (
                  <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                    <p className="font-bold text-blue-900 dark:text-blue-300 text-xs flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-600" />
                      ¿Cómo obtener el Client ID y Client Secret de SUNAT?
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <li>Ingrese a <strong>SUNAT Operaciones en Línea (SOL)</strong> con su RUC y Clave SOL.</li>
                      <li>Diríjase a la sección <strong>Empresas &gt; Credenciales de Servicios Web</strong>.</li>
                      <li>Haga clic en <strong>"Registrar Aplicación"</strong>, ingrese el nombre <em>ContaTask SIRE</em> y seleccione el scope <strong>SIRE</strong>.</li>
                      <li>Copie el <strong>Client ID</strong> y <strong>Client Secret</strong> generados y regístrelos en <strong>Gestión de Clientes &gt; Credenciales SOL</strong> en ContaTask.</li>
                    </ol>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalSireApiOpen(false)}
                  >
                    Cerrar
                  </Button>
                  {sireApiTestResult.conectado ? (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      onClick={() => {
                        setModalSireApiOpen(false);
                        handleExtraerSire(true);
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Extraer Propuesta Oficial Ahora
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                      onClick={() => {
                        setModalSireApiOpen(false);
                        window.location.href = "/contador/clientes";
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ir a Gestión de Clientes
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
