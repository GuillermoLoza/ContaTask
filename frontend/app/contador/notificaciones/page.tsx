"use client";

import {
  BellRing,
  MessageSquare,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContador } from "@/context/ContadorContext";

export default function ContadorNotificacionesPage() {
  const {
    notificaciones,
    loading,
    loadAllData,
    abrirModalSolicitarTrx,
    setCorreoSeleccionado,
    setDetalleCorreoModalOpen
  } = useContador();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando bitácora de notificaciones...
      </div>
    );
  }

  const whatsappNotifs = notificaciones.filter((n) => n.canal === "WHATSAPP");
  const emailNotifs = notificaciones.filter((n) => n.canal === "EMAIL");

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Despachos</p>
            <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {notificaciones.length}
            </p>
            <p className="text-[11px] text-slate-400">Notificaciones multicanal</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
            <BellRing className="h-6 w-6 stroke-[1.75]" />
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Canal WhatsApp Web</p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {whatsappNotifs.length}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Mensajes directos</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
            <MessageSquare className="h-6 w-6 stroke-[1.75]" />
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Canal Correo Electrónico</p>
            <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              {emailNotifs.length}
            </p>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Plantillas y respaldo</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
            <Mail className="h-6 w-6 stroke-[1.75]" />
          </div>
        </Card>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BellRing className="h-5 w-5 text-blue-600" />
                Bitácora de Notificaciones SUNAT (Auditoría Multicanal)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Registro fehaciente de requerimientos despachados por WhatsApp y contingencia vía Correo Electrónico
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              className="text-xs gap-1.5 h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Actualizar Bitácora
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Fecha y Hora</th>
                  <th className="p-3">Empresa MYPE</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Destinatario</th>
                  <th className="p-3">Contenido / Asunto</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {notificaciones.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-500">
                      {n.fecha_envio}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {n.cliente_razon_social || `Cliente #${n.cliente_id || "-"}`}
                    </td>
                    <td className="p-3">
                      {n.canal === "WHATSAPP" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <MessageSquare className="h-3 w-3" /> WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          <Mail className="h-3 w-3" /> Correo
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {n.destinatario}
                    </td>
                    <td className="p-3 max-w-sm truncate text-slate-700 dark:text-slate-300">
                      {n.asunto || n.mensaje}
                    </td>
                    <td className="p-3 text-center">
                      {n.estado === "ENVIADO" ? (
                        <Badge variant="success" className="text-[10px]">Entregado</Badge>
                      ) : n.estado === "RESPALDO_ENVIADO" ? (
                        <Badge variant="info" className="text-[10px] bg-blue-600 text-white">Respaldo Correo</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">Fallido</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {n.canal === "EMAIL" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCorreoSeleccionado(n);
                            setDetalleCorreoModalOpen(true);
                          }}
                          className="h-7 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" /> Ver
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {(n as any).resultado_api || n.error_log ? "Directo" : "-"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {notificaciones.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No se registran notificaciones despachadas en la bitácora.
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
