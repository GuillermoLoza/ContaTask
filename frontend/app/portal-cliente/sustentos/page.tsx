"use client";

import { useState } from "react";
import {
  FileCheck2,
  Search,
  Eye,
  FileUp,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useClientePortal } from "@/context/ClientePortalContext";

export default function SustentosPage() {
  const {
    transacciones,
    loading,
    abrirModalSubida,
    abrirVisor,
    renderBadgeEstado
  } = useClientePortal();

  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState<string>("");

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando comprobantes...
      </div>
    );
  }

  // Filtrado de transacciones
  const transaccionesFiltradas = transacciones.filter((trx) => {
    if (filtroEstado !== "TODOS" && trx.estado_sustento !== filtroEstado) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchComp = trx.numero_comprobante?.toLowerCase().includes(term);
      const matchTipo = trx.comprobante_tipo?.toLowerCase().includes(term);
      const matchProv = trx.emisor_razon_social?.toLowerCase().includes(term);
      const matchRuc = trx.emisor_ruc?.includes(term);
      if (!matchComp && !matchTipo && !matchProv && !matchRuc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                Mis Comprobantes y Documentos Digitales
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Aislamiento estricto por RUC: únicamente se visualizan las operaciones correspondientes a su empresa.
              </CardDescription>
            </div>

            <Badge variant="outline" className="text-xs font-mono">
              {transaccionesFiltradas.length} operaciones encontradas
            </Badge>
          </div>

          {/* Filtros de búsqueda */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por tipo, número de comprobante, RUC o razón social del emisor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="INFORMACION_INCOMPLETA">Falta Documento</option>
                <option value="SUSTENTO_RECIBIDO">Documento Recibido (En revisión)</option>
                <option value="VALIDADO">Validado Conforme</option>
                <option value="RECHAZADO">Observado / Rechazado</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Periodo / Fecha</th>
                  <th className="p-3">Tipo & N° Comprobante</th>
                  <th className="p-3">Emisor / Proveedor</th>
                  <th className="p-3 text-right">Monto Total (S/)</th>
                  <th className="p-3 text-center">Estado Documento</th>
                  <th className="p-3">Observación del Contador</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {transaccionesFiltradas.map((trx) => {
                  const requiereSubida =
                    trx.estado_sustento === "INFORMACION_INCOMPLETA" ||
                    trx.estado_sustento === "RECHAZADO";

                  return (
                    <tr
                      key={trx.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        trx.estado_sustento === "RECHAZADO" ? "bg-red-50/20 dark:bg-red-950/10" : ""
                      }`}
                    >
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{trx.periodo}</div>
                        <div className="text-[11px] text-slate-500">{trx.fecha_emision}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {trx.comprobante_tipo} {trx.numero_comprobante}
                        </div>
                        {trx.requiere_bancarizacion === 1 && (
                          <Badge variant="outline" className="text-[10px] text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30 mt-0.5">
                            Ley 30730 (Voucher)
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                          {trx.emisor_razon_social}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">RUC: {trx.emisor_ruc}</div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        S/ {trx.monto_total.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        {renderBadgeEstado(trx.estado_sustento)}
                      </td>
                      <td className="p-3 max-w-xs">
                        {trx.observaciones ? (
                          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                            {trx.observaciones}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sin observaciones</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {trx.ultimo_documento_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirVisor(trx.ultimo_documento_id!, trx.ultimo_documento_nombre || "documento")}
                              className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                              title="Ver documento entregado"
                            >
                              <Eye className="h-3 w-3" /> Ver
                            </Button>
                          )}

                          <Button
                            size="sm"
                            onClick={() => abrirModalSubida(trx)}
                            className={`h-7 px-2.5 text-[11px] gap-1 cursor-pointer ${
                              requiereSubida
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
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

                {transaccionesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No se encontraron comprobantes con el filtro aplicado.
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
