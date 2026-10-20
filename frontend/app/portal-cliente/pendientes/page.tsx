"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileUp,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClientePortal } from "@/context/ClientePortalContext";

export default function PendientesPage() {
  const searchParams = useSearchParams();
  const rucParam = searchParams.get("ruc");
  const querySuffix = rucParam ? `?ruc=${encodeURIComponent(rucParam)}` : "";

  const {
    transacciones,
    loading,
    abrirModalSubida
  } = useClientePortal();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando requerimientos pendientes...
      </div>
    );
  }

  const pendientesDeSubida = transacciones.filter(
    (t) => t.estado_sustento === "INFORMACION_INCOMPLETA" || t.estado_sustento === "RECHAZADO"
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileUp className="h-5 w-5 text-amber-600" />
            Comprobantes que Requieren Documentos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adjunte las constancias bancarias o facturas para que su contador las valide ante SUNAT
          </p>
        </div>

        <Badge variant="outline" className="text-xs">
          {pendientesDeSubida.length} requerimientos pendientes
        </Badge>
      </div>

      {pendientesDeSubida.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-3 rounded-2xl">
          <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            ¡Todos sus documentos están al día!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No tiene comprobantes pendientes de adjuntar. Su contador cuenta con toda la documentación necesaria para la declaración mensual.
          </p>
          <div className="pt-2">
            <Link
              href={`/portal-cliente/sustentos${querySuffix}`}
              className="inline-flex items-center text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Ver todos mis comprobantes
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendientesDeSubida.map((trx) => (
            <Card
              key={trx.id}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-xl p-5 space-y-3.5 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {trx.periodo} • {trx.fecha_emision}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {trx.comprobante_tipo} {trx.numero_comprobante}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {trx.emisor_razon_social} (RUC: {trx.emisor_ruc})
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                    S/ {trx.monto_total.toFixed(2)}
                  </span>
                  {trx.requiere_bancarizacion === 1 && (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-[9px] text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30">
                        Bancarización Ley 30730
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {trx.observaciones && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs">
                  <strong>Observación del contador:</strong> {trx.observaciones}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Formatos: PDF, JPG o PNG
                </span>

                <Button
                  size="sm"
                  onClick={() => abrirModalSubida(trx)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileUp className="h-3.5 w-3.5" />
                  Adjuntar Voucher Ahora
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
