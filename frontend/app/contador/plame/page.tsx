"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Trash2,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Download
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContador } from "@/context/ContadorContext";
import {
  api,
  PlamePeriodo,
  PlameTrabajador
} from "@/lib/api";

export default function ContadorPlamePage() {
  const { clientes } = useContador();

  // Estados de Selección
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("2026-08");

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
    cargarPlame();
  }, [clienteSeleccionado, selectedPeriodo]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4500);
    }
  };

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

      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Planilla Mensual PLAME (PDT 0601)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de nómina laboral, cálculo de EsSalud (9%), retención ONP/AFP y exportación de archivos estructurados.
          </p>
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
                className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-hidden cursor-pointer font-mono"
              >
                <option value="2026-08" className="bg-white dark:bg-slate-900">2026-08 (Agosto)</option>
                <option value="2026-07" className="bg-white dark:bg-slate-900">2026-07 (Julio)</option>
                <option value="2026-06" className="bg-white dark:bg-slate-900">2026-06 (Junio)</option>
                <option value="2026-05" className="bg-white dark:bg-slate-900">2026-05 (Mayo)</option>
                <option value="2026-04" className="bg-white dark:bg-slate-900">2026-04 (Abril)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PLAME */}
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

      {/* MODAL: REGISTRAR / EDITAR TRABAJADOR PLAME */}
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
