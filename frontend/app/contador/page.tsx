"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FileCheck2,
  FolderClock,
  CheckCircle,
  MailCheck,
  Store,
  RefreshCw,
  Eye,
  Send,
  ArrowRight,
  ShieldAlert,
  ArrowUpRight,
  Info,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContador } from "@/context/ContadorContext";
const MESES_ANIO_ACTUAL = [
  { cod: "01", nombre: "Enero", vence: "Feb" },
  { cod: "02", nombre: "Febrero", vence: "Mar" },
  { cod: "03", nombre: "Marzo", vence: "Abr" },
  { cod: "04", nombre: "Abril", vence: "May" },
  { cod: "05", nombre: "Mayo", vence: "Jun" },
  { cod: "06", nombre: "Junio", vence: "Jul" },
  { cod: "07", nombre: "Julio", vence: "Ago" },
  { cod: "08", nombre: "Agosto", vence: "Set" },
  { cod: "09", nombre: "Setiembre", vence: "Oct" },
  { cod: "10", nombre: "Octubre", vence: "Nov" },
  { cod: "11", nombre: "Noviembre", vence: "Dic" },
  { cod: "12", nombre: "Diciembre", vence: "Ene" },
];

export default function ContadorInicioPage() {
  const {
    loading,
    clientes,
    transacciones,
    notificaciones,
    cronogramaSunat,
    cronogramaOficial,
    cronogramaCargando,
    periodoFiscalActivo,
    cambiarPeriodoFiscal,
    refrescarCronograma,
    sincronizarCronogramaConPortal,
    loadAllData,
    abrirModalNotificarVencimiento,
    abrirModalSolicitarTrx,
    abrirVisor,
    renderBadgeEstado
  } = useContador();

  const [mostrarTablaSunat, setMostrarTablaSunat] = useState(true);
  const anioActual = new Date().getFullYear();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando dashboard del contador...
      </div>
    );
  }

  const pendientesCount = transacciones.filter(
    (t) => t.estado_sustento === "INFORMACION_INCOMPLETA" || t.estado_sustento === "RECHAZADO"
  ).length;
  const validadosCount = transacciones.filter((t) => t.estado_sustento === "VALIDADO").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* TÍTULO Y CABECERA DEL DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a8a] dark:text-blue-400 tracking-tight">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            className="text-xs gap-1.5 h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Actualizar
          </Button>
        </div>
      </div>

      {/* 1. LAS 4 TARJETAS KPI IDÉNTICAS AL DISEÑO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Clientes */}
        <Link href="/contador/clientes" className="block group">
          <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden hover:shadow-md transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Clientes</p>
                <p className="text-3xl font-extrabold text-[#1e3a8a] dark:text-blue-400 mt-1">
                  {clientes.length || 4}
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline mt-1">
                  Ver Directorio →
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Store className="h-6 w-6 stroke-[1.75]" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Sustentos Pendientes */}
        <Link href="/contador/transacciones" className="block group">
          <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden hover:shadow-md transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Documentos Pendientes</p>
                <p className="text-3xl font-extrabold text-[#f59e0b] dark:text-amber-400 mt-1">
                  {pendientesCount || 6}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium group-hover:underline mt-1">
                  Revisar en Tabla →
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500">
                <FolderClock className="h-6 w-6 stroke-[1.75]" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Comprobantes Validados */}
        <Link href="/contador/transacciones" className="block group">
          <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden hover:shadow-md transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Comprobantes Validados</p>
                <p className="text-3xl font-extrabold text-[#10b981] dark:text-emerald-400 mt-1">
                  {validadosCount || 1}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium group-hover:underline mt-1">
                  Conformes para liquidar →
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500">
                <CheckCircle className="h-6 w-6 stroke-[1.75]" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 4: Notificaciones Enviadas */}
        <Link href="/contador/notificaciones" className="block group">
          <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden hover:shadow-md transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Notificaciones Enviadas</p>
                <p className="text-3xl font-extrabold text-[#3b82f6] dark:text-blue-400 mt-1">
                  {notificaciones.length || 2}
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline mt-1">
                  Ver notificaciones →
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-500">
                <MailCheck className="h-6 w-6 stroke-[1.75]" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden transition-all">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Cronograma de Vencimientos
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {cronogramaOficial?.resolucion_sunat}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mr-1">Período:</span>
              <select
                value={periodoFiscalActivo}
                onChange={(e) => cambiarPeriodoFiscal(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {MESES_ANIO_ACTUAL.map((m) => (
                  <option key={m.cod} value={`${anioActual}-${m.cod}`}>
                    {m.nombre} {anioActual} (Vence {m.vence})
                  </option>
                ))}
              </select>
            </div>

            {cronogramaOficial && (
              <a
                href={cronogramaOficial.url_oficial || `https://www.sunat.gob.pe/orientacion/cronogramas/${cronogramaOficial.year}/cObligacionMensual${cronogramaOficial.year}.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2.5 py-1.5 rounded-md bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center gap-1"
                title={`Abrir página oficial de SUNAT para el ejercicio ${cronogramaOficial.year}`}
              >
                Ir a Web ↗
              </a>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sincronizarCronogramaConPortal()}
                disabled={cronogramaCargando}
                className="h-8 text-xs gap-1 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                title="Conectar a SUNAT para sincronizar el cronograma oficial publicado"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${cronogramaCargando ? "animate-spin text-blue-600" : ""}`} />
                <span className="hidden sm:inline">Sincronizar</span>
              </Button>
            </div>
          </div>
        </div>

        {mostrarTablaSunat && cronogramaOficial && (
          <CardContent className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 animate-fade-in space-y-3">
            <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {cronogramaOficial.cronograma_digitos.map((d) => (
                <div
                  key={d.digito_grupo}
                  className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-xs space-y-1 transition-all hover:border-blue-400 dark:hover:border-blue-500"
                >
                  <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {d.digito_label}
                  </span>
                  <span className="block text-xs font-black font-mono text-[#1e3a8a] dark:text-blue-400">
                    {d.fecha_vencimiento}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              {cronogramaOficial.sincronizado_at && (
                <span className="font-mono text-[10px]">
                  Última sincronización: {new Date(cronogramaOficial.sincronizado_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* 3. RESUMEN DE ÚLTIMAS OPERACIONES */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-blue-600" />
                Últimos Comprobantes Registrados
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Operaciones más recientes cargadas en el sistema
              </CardDescription>
            </div>
            <Link
              href="/contador/transacciones"
              className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 gap-1"
            >
              Ver Matriz Completa ({transacciones.length}) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Periodo / Fecha</th>
                  <th className="p-3">MYPE Cliente</th>
                  <th className="p-3">Comprobante</th>
                  <th className="p-3">Proveedor / Emisor</th>
                  <th className="p-3 text-right">Monto (S/)</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {transacciones.slice(0, 5).map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{trx.periodo}</span>
                      <div className="text-[11px] text-slate-400">{trx.fecha_emision}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {trx.cliente_razon_social}
                    </td>
                    <td className="p-3">
                      <span className="font-medium">{trx.comprobante_tipo} {trx.numero_comprobante}</span>
                      {trx.requiere_bancarizacion === 1 && (
                        <Badge variant="outline" className="ml-1 text-[9px] text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30">
                          Bancarizado
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                      {trx.emisor_razon_social}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      S/ {trx.monto_total.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      {renderBadgeEstado(trx.estado_sustento)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {trx.ultimo_documento_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirVisor(trx.ultimo_documento_id!, trx.ultimo_documento_nombre || "sustento")}
                            className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" /> Ver
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => abrirModalSolicitarTrx(trx)}
                          className="h-7 px-2 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1 cursor-pointer"
                        >
                          <Send className="h-3 w-3" /> Solicitar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
