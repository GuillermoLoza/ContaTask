"use client";

import {
  FileCheck2,
  Search,
  Eye,
  Send,
  CheckCircle2,
  Filter,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useContador } from "@/context/ContadorContext";

export default function ContadorTransaccionesPage() {
  const {
    clientes,
    loading,
    selectedClienteId,
    setSelectedClienteId,
    selectedEstado,
    setSelectedEstado,
    searchTerm,
    setSearchTerm,
    transaccionesFiltradas,
    abrirModalSolicitarTrx,
    abrirModalEvaluar,
    abrirVisor,
    renderBadgeEstado
  } = useContador();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando matriz de sustentos...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-blue-600" />
                Matriz de Sustentos Contables y Bancarización
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Supervisión, evaluación y auditoría de comprobantes y constancias bancarias según Ley N° 30730
              </CardDescription>
            </div>

            <Badge variant="outline" className="text-xs font-mono">
              {transaccionesFiltradas.length} operaciones filtradas
            </Badge>
          </div>

          {/* Filtros de la Matriz */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por comprobante, cliente, RUC o emisor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div>
              <select
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="TODOS">Todos los Clientes MYPE</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social} ({c.ruc})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="INFORMACION_INCOMPLETA">Falta Sustento</option>
                <option value="SUSTENTO_RECIBIDO">Sustento Recibido</option>
                <option value="VALIDADO">Validado Conforme</option>
                <option value="RECHAZADO">Rechazado (Obs.)</option>
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
                  <th className="p-3">Empresa MYPE</th>
                  <th className="p-3">Tipo & N° Comprobante</th>
                  <th className="p-3">Emisor / Proveedor</th>
                  <th className="p-3 text-right">Monto Total</th>
                  <th className="p-3 text-center">Estado Sustento</th>
                  <th className="p-3">Observación</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {transaccionesFiltradas.map((trx) => (
                  <tr
                    key={trx.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      trx.estado_sustento === "RECHAZADO" ? "bg-red-50/30 dark:bg-red-950/15" : ""
                    }`}
                  >
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{trx.periodo}</div>
                      <div className="text-[11px] text-slate-500">{trx.fecha_emision}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 max-w-[140px] truncate" title={trx.cliente_razon_social}>
                      {trx.cliente_razon_social}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {trx.comprobante_tipo} {trx.numero_comprobante}
                      </div>
                      {trx.requiere_bancarizacion === 1 && (
                        <Badge variant="outline" className="text-[9px] text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30 mt-0.5">
                          Bancarización (Ley 30730)
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 max-w-[150px] truncate text-slate-700 dark:text-slate-300">
                      {trx.emisor_razon_social}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      S/ {trx.monto_total.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      {renderBadgeEstado(trx.estado_sustento)}
                    </td>
                    <td className="p-3 max-w-[150px] truncate text-[11px] text-slate-500">
                      {trx.observaciones || "-"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {trx.ultimo_documento_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirVisor(trx.ultimo_documento_id!, trx.ultimo_documento_nombre || "sustento")}
                            className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                            title="Ver documento adjunto"
                          >
                            <Eye className="h-3 w-3" /> Ver
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => abrirModalEvaluar(trx)}
                          className="h-7 px-2 text-[11px] bg-slate-800 hover:bg-slate-900 text-white gap-1 cursor-pointer"
                          title="Aprobar o rechazar sustento"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Evaluar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => abrirModalSolicitarTrx(trx)}
                          className="h-7 px-2 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1 cursor-pointer"
                          title="Solicitar sustento al cliente por WhatsApp o Correo"
                        >
                          <Send className="h-3 w-3" /> Solicitar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {transaccionesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No se encontraron comprobantes con los filtros seleccionados.
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
