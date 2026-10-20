"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileUp,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ShieldCheck,
  FileText,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClientePortal } from "@/context/ClientePortalContext";

export default function ResumenPortalClientePage() {
  const searchParams = useSearchParams();
  const rucParam = searchParams.get("ruc");
  const querySuffix = rucParam ? `?ruc=${encodeURIComponent(rucParam)}` : "";

  const {
    clienteInfo,
    transacciones,
    loading,
    pendientesCount,
    validadosCount,
    bancarizacionCount,
    ultimoDigitoRuc,
    fechaVencimiento,
    loadClienteData,
    abrirModalSubida,
    abrirVisor,
    renderBadgeEstado
  } = useClientePortal();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando resumen de la empresa...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera Informativa de Bienvenida */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Portal del Cliente
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">
            Bienvenido(a), {clienteInfo?.contacto_nombre || clienteInfo?.razon_social || "Estimado Cliente"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Supervise el cumplimiento de sus documentos contables y mantenga su empresa al día ante SUNAT.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => clienteInfo && loadClienteData(clienteInfo.ruc)}
            className="text-xs gap-1.5 h-9 bg-white dark:bg-slate-900 shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </Button>
        </div>
      </div>

      {/* 4 Tarjetas KPI Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Operaciones</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
              {transacciones.length}
            </p>
            <p className="text-[11px] text-slate-400">Período Agosto 2026</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <FileText className="h-6 w-6" />
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Documentos Validados</p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {validadosCount}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Conformes para declaración</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </Card>

        <Link
          href={`/portal-cliente/pendientes${querySuffix}`}
          className="block group"
        >
          <Card
            className={`border shadow-xs rounded-xl p-4 flex items-center justify-between transition-colors h-full ${pendientesCount > 0
              ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
              }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pendientes de Entrega</p>
              <p
                className={`text-3xl font-extrabold mt-0.5 ${pendientesCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                  }`}
              >
                {pendientesCount}
              </p>
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1 group-hover:underline">
                {pendientesCount > 0 ? "Requieren su atención →" : "Al día"}
              </p>
            </div>
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center ${pendientesCount > 0
                ? "bg-red-100 dark:bg-red-950/80 text-red-600"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
          </Card>
        </Link>

        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ley de Bancarización</p>
            <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
              {bancarizacionCount}
            </p>
            <p className="text-[11px] text-slate-400">≥ S/ 2,000 (Ley N° 30730)</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Banner de Acción Rápida para Comprobantes Pendientes */}
      {pendientesCount > 0 ? (
        <div className="p-5 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Tiene {pendientesCount} comprobante(s) pendiente(s) de documento bancario
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed max-w-2xl">
                Su contador necesita los vouchers o comprobantes de transferencia para cerrar la liquidación tributaria antes de su vencimiento del <strong>{fechaVencimiento}</strong>.
              </p>
            </div>
          </div>

          <Link
            href={`/portal-cliente/pendientes${querySuffix}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm shrink-0 cursor-pointer"
          >
            <FileUp className="h-4 w-4" />
            Ver y Subir Documentos
          </Link>
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                ¡Excelente! Todos sus comprobantes cuentan con sus documentos al día
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                No registra documentos observados ni comprobantes pendientes en este período.
              </p>
            </div>
          </div>

          <Badge variant="success" className="text-xs">
            100% Cumplido
          </Badge>
        </div>
      )}

      {/* Resumen de Últimos Comprobantes */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Últimas Operaciones Registradas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Mostrando las operaciones más recientes asignadas a su empresa
              </CardDescription>
            </div>
            <Link
              href={`/portal-cliente/sustentos${querySuffix}`}
              className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 gap-1"
            >
              Ver Todos ({transacciones.length}) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Periodo / Fecha</th>
                  <th className="p-3">Comprobante</th>
                  <th className="p-3">Proveedor / Emisor</th>
                  <th className="p-3 text-right">Monto (S/)</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {transacciones.slice(0, 5).map((trx) => {
                  const requiereSubida =
                    trx.estado_sustento === "INFORMACION_INCOMPLETA" ||
                    trx.estado_sustento === "RECHAZADO";

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{trx.periodo}</span>
                        <div className="text-[11px] text-slate-400">{trx.fecha_emision}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium">{trx.comprobante_tipo} {trx.numero_comprobante}</span>
                        {trx.requiere_bancarizacion === 1 && (
                          <Badge variant="outline" className="ml-1.5 text-[9px] text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30">
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
                              onClick={() => abrirVisor(trx.ultimo_documento_id!, trx.ultimo_documento_nombre || "documento")}
                              className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                            >
                              <Eye className="h-3 w-3" /> Ver
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => abrirModalSubida(trx)}
                            className={`h-7 px-2 text-[11px] gap-1 cursor-pointer ${requiereSubida
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                              }`}
                          >
                            <FileUp className="h-3 w-3" />
                            <span>{requiereSubida ? "Cargar Documento" : "Reemplazar"}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {transacciones.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No hay transacciones registradas para este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
