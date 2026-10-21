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
  Info
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
  DeclaracionMensual,
  PlamePeriodo,
  PlameTrabajador
} from "@/lib/api";

export default function ContadorTributacionPage() {
  const { clientes } = useContador();

  // Estados de Selección
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("2026-08");
  const [activeTab, setActiveTab] = useState<"sire" | "liquidacion" | "plame">("sire");

  // Estados SIRE (RCE Compras / RVIE Ventas)
  const [sireTipo, setSireTipo] = useState<"RCE" | "RVIE">("RCE");
  const [sirePropuesta, setSirePropuesta] = useState<SirePropuesta | null>(null);
  const [sireComprobantes, setSireComprobantes] = useState<SireComprobante[]>([]);
  const [sireMetricas, setSireMetricas] = useState<SireMetricas | null>(null);
  const [sireLoading, setSireLoading] = useState<boolean>(false);
  const [sireActionLoading, setSireActionLoading] = useState<boolean>(false);
  const [sireFiltroEstado, setSireFiltroEstado] = useState<string>("TODOS");

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

  // Estados PLAME
  const [plamePeriodo, setPlamePeriodo] = useState<PlamePeriodo | null>(null);
  const [plameTrabajadores, setPlameTrabajadores] = useState<PlameTrabajador[]>([]);
  const [plameMetricas, setPlameMetricas] = useState<any>(null);
  const [plameLoading, setPlameLoading] = useState(false);
  const [plameValidacion, setPlameValidacion] = useState<{
    esValido: boolean;
    totalErrores?: number;
    errores?: any[];
    mensaje?: string;
  } | null>(null);
  const [modalTrabajadorOpen, setModalTrabajadorOpen] = useState(false);
  const [trabajadorForm, setTrabajadorForm] = useState({
    id: undefined as number | undefined,
    tipo_documento: "01",
    numero_documento: "",
    nombres: "",
    apellidos: "",
    cargo: "Asistente Operativo",
    fecha_ingreso: "2026-01-15",
    dias_laborados: 30,
    horas_ordinarias: 240,
    sueldo_base: 1200,
    asignacion_familiar: 102.5,
    horas_extras: 0,
    regimen_pensionario: "ONP" as "ONP" | "INTEGRA" | "PRIMA" | "PROFUTURO" | "HABITAT"
  });

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
    } else if (activeTab === "plame") {
      cargarPlame();
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

  const handleExtraerSire = async () => {
    if (!clienteSeleccionado) return;
    setSireActionLoading(true);
    try {
      await api.extraerSirePropuesta(clienteSeleccionado.id, selectedPeriodo, sireTipo);
      await cargarSire();
      showNotification(`Propuesta SIRE (${sireTipo === "RCE" ? "Compras" : "Ventas"}) sincronizada exitosamente con SUNAT.`);
    } catch (err: any) {
      showNotification(err.message || "Error al sincronizar con SIRE", true);
    } finally {
      setSireActionLoading(false);
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

  // ==========================================
  // MÉTODOS PLAME
  // ==========================================
  const cargarPlame = async () => {
    if (!clienteSeleccionado) return;
    setPlameLoading(true);
    try {
      const res = await api.getPlamePeriodo(clienteSeleccionado.id, selectedPeriodo);
      setPlamePeriodo(res.periodo || null);
      setPlameTrabajadores(res.trabajadores || []);
      setPlameMetricas(res.metricas || null);
      setPlameValidacion(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setPlameLoading(false);
    }
  };

  const handleValidarPlanilla = async () => {
    if (!clienteSeleccionado) return;
    try {
      const res = await api.validarPlame(clienteSeleccionado.id, selectedPeriodo);
      setPlameValidacion(res);
      if (res.esValido) {
        showNotification("Planilla validada sin inconsistencias. Lista para generar estructuras oficiales.");
      } else {
        showNotification(`Se identificaron ${res.totalErrores || res.errores?.length || 0} inconsistencias estructurales.`, true);
      }
    } catch (err: any) {
      showNotification(err.message || "Error al validar planilla", true);
    }
  };

  const handleGenerarArchivosPlame = async () => {
    if (!clienteSeleccionado) return;
    try {
      const res = await api.generarArchivosPlame(clienteSeleccionado.id, selectedPeriodo);
      showNotification(`Archivos generados: ${res.archivos.map((a: any) => a.nombre).join(", ")}`);

      if (res.archivos.length > 0) {
        const blobRem = new Blob([res.archivos[0].contenido], { type: "text/plain;charset=utf-8" });
        const url = window.URL.createObjectURL(blobRem);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.archivos[0].nombre;
        a.click();
      }
    } catch (err: any) {
      showNotification(err.message || "Error al generar archivos PLAME", true);
    }
  };

  const handleDeclararPlame = async () => {
    if (!clienteSeleccionado) return;
    if (!confirm("¿Desea marcar el periodo PLAME como DECLARADO y generar el NPS de tributos laborales?")) return;
    try {
      const res = await api.declararPlame(clienteSeleccionado.id, selectedPeriodo);
      showNotification(`PLAME declarado con éxito. NPS generado: ${res.nps}`);
      cargarPlame();
    } catch (err: any) {
      showNotification(err.message || "Error al declarar PLAME", true);
    }
  };

  const handleGuardarTrabajadorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado) return;
    try {
      await api.guardarPlameTrabajador(clienteSeleccionado.id, selectedPeriodo, trabajadorForm);
      setModalTrabajadorOpen(false);
      showNotification("Trabajador registrado y aportes recalculados correctamente.");
      cargarPlame();
    } catch (err: any) {
      showNotification(err.message || "Error al guardar trabajador", true);
    }
  };

  const handleEliminarTrabajador = async (id?: number) => {
    if (!id) return;
    if (!confirm("¿Eliminar este trabajador de la nómina mensual?")) return;
    try {
      await api.eliminarPlameTrabajador(id);
      showNotification("Trabajador removido.");
      cargarPlame();
    } catch (err: any) {
      showNotification(err.message || "Error al eliminar trabajador", true);
    }
  };

  // Filtrado de comprobantes SIRE
  const comprobantesFiltrados = sireComprobantes.filter((c) => {
    if (sireFiltroEstado === "TODOS") return true;
    return c.estado_cruce === sireFiltroEstado;
  });

  return (
    <div className="space-y-6 pb-12">
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

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
              Capítulo 5 • Objetivo O2
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/80 text-white">
              SUNAT RESTful API Live
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Módulo Tributario: Integración SIRE & PLAME
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-2xl">
            Sincronización de propuestas RVIE/RCE, conciliación automática de comprobantes, liquidación de impuestos mensuales (Form. 621) y planilla electrónica (PDT 0601).
          </p>
        </div>

        {/* SELECTORES DE CLIENTE Y PERIODO */}
        <div className="flex flex-wrap items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/20">
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase text-blue-200">Cliente MYPE</label>
            <select
              value={clienteSeleccionado?.id || ""}
              onChange={(e) => setSelectedClienteId(Number(e.target.value))}
              className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100 text-sm rounded-lg px-3 py-1.5 font-medium border border-blue-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razon_social} ({c.ruc})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase text-blue-200">Periodo Fiscal</label>
            <select
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100 text-sm rounded-lg px-3 py-1.5 font-medium border border-blue-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              <optgroup label="Ejercicio 2026">
                <option value="2026-08">2026 - Agosto</option>
                <option value="2026-07">2026 - Julio</option>
                <option value="2026-06">2026 - Junio</option>
              </optgroup>
              <optgroup label="Ejercicio 2025">
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

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("sire")}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === "sire"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          SIRE: Compras y Ventas (RCE / RVIE)
        </button>

        <button
          onClick={() => setActiveTab("liquidacion")}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === "liquidacion"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
        >
          <Calculator className="w-4 h-4" />
          Liquidación de Impuestos & NPS (Form. 621)
        </button>

        <button
          onClick={() => setActiveTab("plame")}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === "plame"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
        >
          <Users className="w-4 h-4" />
          Planilla Mensual PLAME (PDT 0601)
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SIRE (RCE / RVIE)                                  */}
      {/* ========================================================= */}
      {activeTab === "sire" && (
        <div className="space-y-6">
          {/* BARRA DE HERRAMIENTAS SIRE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mr-2">Libro:</span>
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

              <Badge variant="outline" className="ml-2 font-mono text-xs">
                {sirePropuesta?.estado || "NO_DESCARGADO"}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExtraerSire}
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
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  {["TODOS", "COINCIDE", "SOLO_EN_SUNAT", "EXCLUIDO"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setSireFiltroEstado(st)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${sireFiltroEstado === st
                          ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                        }`}
                    >
                      {st}
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
                            ) : comp.estado_cruce === "EXCLUIDO" ? (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 text-[10px]">
                                Excluido
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                {comp.estado_cruce}
                              </Badge>
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
      {/* TAB 3: PLAME (PLANILLA ELECTRÓNICA PDT 0601)              */}
      {/* ========================================================= */}
      {activeTab === "plame" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Planilla Mensual de Pagos (PLAME) - PDT 0601
                </h2>
                <Badge variant="outline" className="font-mono text-xs">
                  {plamePeriodo?.estado || "BORRADOR"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo de aportes laborales (EsSalud 9%, ONP 13% o AFP), validación de DNI y exportación de archivos planos (.rem, .jor, .snl).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTrabajadorForm({
                    id: undefined,
                    tipo_documento: "01",
                    numero_documento: "",
                    nombres: "",
                    apellidos: "",
                    cargo: "Operario",
                    fecha_ingreso: "2026-02-01",
                    dias_laborados: 30,
                    horas_ordinarias: 240,
                    sueldo_base: 1100,
                    asignacion_familiar: 102.5,
                    horas_extras: 0,
                    regimen_pensionario: "ONP"
                  });
                  setModalTrabajadorOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Trabajador
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleValidarPlanilla}
                className="gap-2 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Validar Estructura SUNAT
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerarArchivosPlame}
                className="gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Generar Archivos PLAME (.rem, .jor)
              </Button>

              <Button
                size="sm"
                onClick={handleDeclararPlame}
                disabled={plamePeriodo?.estado === "DECLARADO"}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                Declarar en SUNAT
              </Button>
            </div>
          </div>

          {/* ALERTA DE VALIDACIÓN PLAME */}
          {plameValidacion && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${plameValidacion.esValido
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-800 dark:text-rose-300"
                }`}
            >
              <div className="flex items-center gap-3">
                {plameValidacion.esValido ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {plameValidacion.esValido
                      ? "Planilla validada satisfactoriamente (0 inconsistencias)"
                      : `Atención: Se identificaron inconsistencias estructurales`}
                  </h3>
                  <div className="text-xs mt-1 space-y-0.5">
                    {plameValidacion.errores && plameValidacion.errores.length > 0 ? (
                      plameValidacion.errores.map((err, i) => (
                        <p key={i}>
                          • <strong>{err.nombres || "Trabajador"} ({err.dni || err.campo}):</strong> {err.motivo || err.mensaje}
                        </p>
                      ))
                    ) : (
                      <p>{plameValidacion.mensaje}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOTALES DE LA PLANILLA */}
          {plamePeriodo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase">Trabajadores en Planilla</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {plamePeriodo.total_trabajadores} activos
                  </p>
                  <p className="text-xs text-slate-400 mt-1">T-Registro integrado</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase">Remuneración Bruta Total</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    S/ {Number(plamePeriodo.total_remuneracion || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Incluye básicos y asignación familiar</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase">Aporte EsSalud (9%)</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    S/ {Number(plamePeriodo.total_essalud || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">A cargo del empleador</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Aportes & Retenciones</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    S/ {Number(
                      (plamePeriodo.total_essalud || 0) +
                      (plamePeriodo.total_onp || 0) +
                      (plamePeriodo.total_afp || 0)
                    ).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    ONP: S/ {Number(plamePeriodo.total_onp || 0).toFixed(2)} | AFP: S/ {Number(plamePeriodo.total_afp || 0).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TABLA DE TRABAJADORES */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold">Nómina de Trabajadores Registrados</CardTitle>
              <CardDescription>
                Detalle individual de remuneraciones y deducciones tributarias obligatorias del Formulario 0601.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {plameLoading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                  <p className="text-sm">Cargando nómina...</p>
                </div>
              ) : plameTrabajadores.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium">No hay trabajadores registrados en este periodo.</p>
                  <p className="text-xs text-slate-500 mt-1">Presione "Registrar Trabajador" para añadir miembros a la planilla.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3 text-left">Documento / Nombres</th>
                        <th className="px-4 py-3 text-left">Cargo</th>
                        <th className="px-4 py-3 text-left">Pensión</th>
                        <th className="px-4 py-3 text-right">Sueldo Básico</th>
                        <th className="px-4 py-3 text-right">Asig. Familiar</th>
                        <th className="px-4 py-3 text-right">Total Bruto</th>
                        <th className="px-4 py-3 text-right">EsSalud 9%</th>
                        <th className="px-4 py-3 text-right">Ret. Pensión</th>
                        <th className="px-4 py-3 text-right">Neto a Pagar</th>
                        <th className="px-4 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {plameTrabajadores.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {t.apellidos}, {t.nombres}
                            </div>
                            <div className="font-mono text-slate-500 text-[10px]">
                              {t.tipo_documento === "01" ? "DNI" : "CE"}: {t.numero_documento}
                            </div>
                          </td>
                          <td className="px-4 py-3">{t.cargo}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px]">
                              {t.regimen_pensionario}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium">
                            S/ {Number(t.sueldo_base).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            S/ {Number(t.asignacion_familiar).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            S/ {Number(t.total_remuneracion_bruta).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            S/ {Number(t.aporte_essalud).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-rose-600 dark:text-rose-400">
                            - S/ {Number(t.descuento_pension).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                            S/ {Number(t.neto_pagar).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarTrabajador(t.id)}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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
      {/* MODAL: REGISTRAR / EDITAR TRABAJADOR PLAME                */}
      {/* ========================================================= */}
      {modalTrabajadorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Registrar Trabajador en Nómina PLAME
              </h3>
              <button
                onClick={() => setModalTrabajadorOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarTrabajadorSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Número de DNI (8 dígitos)</Label>
                  <Input
                    required
                    maxLength={8}
                    value={trabajadorForm.numero_documento}
                    onChange={(e) => setTrabajadorForm({ ...trabajadorForm, numero_documento: e.target.value })}
                    placeholder="72849182"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nombres</Label>
                  <Input
                    required
                    value={trabajadorForm.nombres}
                    onChange={(e) => setTrabajadorForm({ ...trabajadorForm, nombres: e.target.value })}
                    placeholder="Carlos Alberto"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Apellidos</Label>
                  <Input
                    required
                    value={trabajadorForm.apellidos}
                    onChange={(e) => setTrabajadorForm({ ...trabajadorForm, apellidos: e.target.value })}
                    placeholder="López Ramos"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cargo / Ocupación</Label>
                  <Input
                    required
                    value={trabajadorForm.cargo}
                    onChange={(e) => setTrabajadorForm({ ...trabajadorForm, cargo: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Régimen Pensionario</Label>
                <select
                  value={trabajadorForm.regimen_pensionario}
                  onChange={(e) =>
                    setTrabajadorForm({
                      ...trabajadorForm,
                      regimen_pensionario: e.target.value as any
                    })
                  }
                  className="w-full text-xs rounded-lg p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="ONP">ONP (D.L. 19990 - 13%)</option>
                  <option value="INTEGRA">AFP Integra (~11.85%)</option>
                  <option value="PRIMA">AFP Prima (~11.85%)</option>
                  <option value="PROFUTURO">AFP Profuturo (~11.85%)</option>
                  <option value="HABITAT">AFP Habitat (~11.85%)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Sueldo Básico (S/)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={trabajadorForm.sueldo_base}
                    onChange={(e) =>
                      setTrabajadorForm({ ...trabajadorForm, sueldo_base: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Asig. Familiar (S/)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={trabajadorForm.asignacion_familiar}
                    onChange={(e) =>
                      setTrabajadorForm({ ...trabajadorForm, asignacion_familiar: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Horas Extras (S/)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={trabajadorForm.horas_extras}
                    onChange={(e) =>
                      setTrabajadorForm({ ...trabajadorForm, horas_extras: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl space-y-1 text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-indigo-900 dark:text-indigo-300">Cálculo Automático Proyectado:</p>
                <div className="flex justify-between">
                  <span>EsSalud Empleador (9%):</span>
                  <span className="font-mono font-bold text-emerald-600">
                    S/ {((trabajadorForm.sueldo_base + trabajadorForm.asignacion_familiar) * 0.09).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Retención Pensión:</span>
                  <span className="font-mono font-bold text-rose-600">
                    S/ {(
                      (trabajadorForm.sueldo_base + trabajadorForm.asignacion_familiar) *
                      (trabajadorForm.regimen_pensionario === "ONP" ? 0.13 : 0.1185)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" type="button" size="sm" onClick={() => setModalTrabajadorOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Guardar en PLAME
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
