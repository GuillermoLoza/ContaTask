"use client";

import {
  PhoneCall,
  MessageSquare,
  Building2,
  Mail,
  Clock,
  MapPin,
  ShieldCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useClientePortal } from "@/context/ClientePortalContext";

export default function ContactoPage() {
  const { clienteInfo, loading } = useClientePortal();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando información de contacto...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs">
              <PhoneCall className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-extrabold text-white">
                Estudio Contable Lozano & Asociados
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Asesoría Contable, Tributaria y Financiera para Empresas MYPE
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Datos del Contador */}
            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-slate-400 font-semibold">Contador Asignado a su Empresa:</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Lic. Guillermo Lozano
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Colegio de Contadores Públicos de Lima • Matrícula C.C.P.L. N° 45892
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold w-24">WhatsApp:</span>
                  <a
                    href="https://wa.me/51920843098?text=Hola,%20tengo%20una%20consulta%20contable%20desde%20ContaTask"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                  >
                    +51 920 843 098
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold w-24">Correo:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    notificaciones@contatask.pe
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold w-24">Horario:</span>
                  <span>Lunes a Viernes de 8:30 AM a 6:30 PM</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold w-24">Oficina:</span>
                  <span>Av. Javier Prado Este 2465, Of. 802, San Borja, Lima</span>
                </div>
              </div>
            </div>

            {/* Tarjeta de Chat Rápido */}
            <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" /> Canal de Atención Inmediata
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  ¿Tiene alguna duda sobre sus comprobantes o retenciones?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Puede comunicarse directamente con su contador a través de WhatsApp para coordinar la entrega física o digital de documentos contables.
                </p>
              </div>

              <a
                href="https://wa.me/51920843098?text=Hola,%20le%20escribo%20desde%20el%20portal%20ContaTask%20para%20coordinar%20mis%20documentos%20contables"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                Abrir Chat de WhatsApp con mi Contador
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
