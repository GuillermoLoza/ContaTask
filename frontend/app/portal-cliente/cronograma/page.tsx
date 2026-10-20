"use client";

import {
  CalendarDays,
  ShieldCheck,
  AlertCircle,
  FileCheck2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClientePortal } from "@/context/ClientePortalContext";

export default function CronogramaPage() {
  const {
    ultimoDigitoRuc,
    fechaVencimiento,
    pendientesCount,
    loading
  } = useClientePortal();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando cronograma tributario...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-extrabold text-white">
                Cronograma de Obligaciones Tributarias SUNAT
              </CardTitle>
              <CardDescription className="text-xs text-emerald-100">
                Período Fiscal Agosto 2026 — Régimen MYPE Tributario
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Tarjeta Destacada del Vencimiento de esta Empresa */}
          <div className="p-5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                Fecha Límite para su Empresa
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {fechaVencimiento}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Calculado para su RUC terminado en el dígito <strong>"{ultimoDigitoRuc}"</strong>.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <Badge
                variant="outline"
                className="text-xs font-semibold border-emerald-300 text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900"
              >
                {pendientesCount === 0 ? "✓ Documentación al día" : `⚠️ ${pendientesCount} pendientes`}
              </Badge>
            </div>
          </div>

          {/* Recomendaciones Tributarias */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Pautas importantes para evitar infracciones (Art. 176 Código Tributario):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">1. Documento de Bancarización (Ley N° 30730)</p>
                <p>Toda compra igual o superior a S/ 2,000 o US$ 500 debe pagarse mediante depósito, transferencia o cheque no negociable para tener derecho a crédito fiscal IGV y costo/gasto deducible.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">2. Entrega Oportuna de Comprobantes</p>
                <p>Suba sus comprobantes con al menos 48 horas de anticipación a la fecha de vencimiento para que su contador pueda realizar el cruce de información en el sistema SIRE de SUNAT.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
