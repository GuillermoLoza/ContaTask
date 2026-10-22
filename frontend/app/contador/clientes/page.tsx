"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
  ExternalLink,
  Search,
  CheckCircle,
  FolderClock,
  UserX,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Filter,
  KeyRound,
  ShieldCheck,
  Pencil,
  Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useContador } from "@/context/ContadorContext";
import { Cliente } from "@/lib/api";

export default function ContadorClientesPage() {
  const {
    clientes,
    loading,
    abrirModalNuevoCliente,
    abrirModalEditarCliente,
    setClienteModalOpen,
    handleToggleClienteEstado,
    abrirModalSunat,
    handleAutologinSunat,
    handleSincronizarBuzon
  } = useContador();

  // Estados de filtrado local
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<"TODOS" | "ACTIVOS" | "INACTIVOS">("TODOS");

  // Modal de confirmación para activar / desactivar
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [accionActivar, setAccionActivar] = useState(false);
  const [procesando, setProcesando] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-xs text-slate-500">
        Cargando directorio de clientes...
      </div>
    );
  }

  // Filtrado de clientes
  const clientesFiltrados = clientes.filter((cli) => {
    const isActivo = cli.activo !== false;
    if (filterEstado === "ACTIVOS" && !isActivo) return false;
    if (filterEstado === "INACTIVOS" && isActivo) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchRazon = cli.razon_social?.toLowerCase().includes(term);
      const matchRuc = cli.ruc?.includes(term);
      const matchContacto = cli.contacto_nombre?.toLowerCase().includes(term);
      const matchEmail = cli.email?.toLowerCase().includes(term);
      if (!matchRazon && !matchRuc && !matchContacto && !matchEmail) {
        return false;
      }
    }
    return true;
  });

  const totalActivos = clientes.filter((c) => c.activo !== false).length;
  const totalInactivos = clientes.filter((c) => c.activo === false).length;

  const solicitarCambioEstado = (cliente: Cliente, activar: boolean) => {
    setClienteSeleccionado(cliente);
    setAccionActivar(activar);
    setConfirmModalOpen(true);
  };

  const ejecutarCambioEstado = async () => {
    if (!clienteSeleccionado) return;
    setProcesando(true);
    try {
      await handleToggleClienteEstado(clienteSeleccionado.id, accionActivar);
      setConfirmModalOpen(false);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">

      {/*TABLA PRINCIPAL DE CLIENTES */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Directorio de Clientes
              </CardTitle>
            </div>

            <Button
              size="sm"
              onClick={() => abrirModalNuevoCliente()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="h-4 w-4" /> Nuevo
            </Button>
          </div>

          {/* Barra de Búsqueda y Filtro de Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3">
            <div className="relative sm:col-span-8">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por Razón Social, RUC o correo de contacto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="sm:col-span-4 flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setFilterEstado("TODOS")}
                className={`flex-1 py-1 text-center font-medium rounded-md transition-all cursor-pointer ${filterEstado === "TODOS"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
              >
                Todos ({clientes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterEstado("ACTIVOS")}
                className={`flex-1 py-1 text-center font-medium rounded-md transition-all cursor-pointer ${filterEstado === "ACTIVOS"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
              >
                Activos ({totalActivos})
              </button>
              <button
                type="button"
                onClick={() => setFilterEstado("INACTIVOS")}
                className={`flex-1 py-1 text-center font-medium rounded-md transition-all cursor-pointer ${filterEstado === "INACTIVOS"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
              >
                Inactivos ({totalInactivos})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Razón Social</th>
                  <th className="p-3">RUC</th>
                  <th className="p-3">Régimen Tributario</th>
                  <th className="p-3 text-center">Conexión SUNAT</th>
                  <th className="p-3">Contacto / Correo</th>
                  <th className="p-3">Celular</th>
                  <th className="p-3 text-center">Estado</th>
                  {/*<th className="p-3 text-center">Documentos Faltantes</th>*/}
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {clientesFiltrados.map((cli) => {
                  const pendientes = cli.pendientes_sustento ?? 0;
                  const isActivo = cli.activo !== false;

                  return (
                    <tr
                      key={cli.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors`}
                    >
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <span>{cli.razon_social}</span>
                          {!isActivo && (
                            <span className="text-[10px] text-slate-400 italic">
                              (Desactivado)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {cli.ruc}
                      </td>
                      <td className="p-3">
                        {cli.regimen_tributario}
                      </td>
                      <td className="p-3 text-center">
                        {cli.sunat_estado_conexion === "CONECTADO" ? (
                          <Badge
                            variant="success"
                            className="text-[10px] gap-1 cursor-pointer"
                            onClick={() => abrirModalEditarCliente(cli, "SUNAT")}
                            title="Conexión SOL activa. Clic para ver o editar credenciales."
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Conectado
                          </Badge>
                        ) : cli.usuario_sol ? (
                          <Badge
                            variant="warning"
                            className="text-[10px] cursor-pointer"
                            onClick={() => abrirModalEditarCliente(cli, "SUNAT")}
                            title="Credenciales registradas. Clic para validar o editar."
                          >
                            Pendiente
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] text-slate-400 cursor-pointer"
                            onClick={() => abrirModalEditarCliente(cli, "SUNAT")}
                            title="Clic para registrar Usuario y Clave SOL"
                          >
                            Sin Clave SOL
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div>{cli.contacto_nombre}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{cli.email}</div>
                      </td>
                      <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {cli.celular ? (cli.celular.startsWith("+") ? cli.celular : `+51 ${cli.celular}`) : "-"}
                      </td>
                      <td className="p-3 text-center">
                        {isActivo ? (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      {/*<td className="p-3 text-center">
                        {pendientes > 0 ? (
                          <Badge variant="warning" className="text-[10px] font-semibold">
                            {pendientes} pendientes
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px] font-semibold">
                            Al día
                          </Badge>
                        )}
                      </td>*/}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalEditarCliente(cli, "DATOS")}
                            className="h-7 px-2 text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1 cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="h-3 w-3 text-blue-600" />
                          </Button>

                          {/* Configurar Clave SOL */}
                          {/*<Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalEditarCliente(cli, "SUNAT")}
                            className="h-7 px-2 text-xs border-blue-200 dark:border-blue-900 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 cursor-pointer"
                            title="Gestionar Clave SOL, Token y Conexión"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>SOL</span>
                          </Button>*/}

                          {/* Autologin Directo */}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAutologinSunat(cli)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                            title="Login en SOL"
                            disabled={!cli.usuario_sol}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                            <span>SOL</span>
                          </Button>

                          {/* Sincronizar Buzón SOL */}
                          {/*cli.usuario_sol && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSincronizarBuzon(cli.id)}
                              className="h-7 px-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              title="Sincronizar notificaciones de Buzón SOL"
                            >
                              <Inbox className="h-3.5 w-3.5" />
                            </Button>
                          )*/}
                          {/* Enlace al Portal del Cliente */}
                          {isActivo ? (
                            <Link
                              href={`/portal-cliente?ruc=${cli.ruc}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                              title="Abrir vista que ve este cliente"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                              <span>Portal</span>
                            </Link>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-slate-200/60 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 text-xs font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed select-none"
                              title="Portal no disponible: Cliente inactivo"
                            >
                              <ExternalLink className="h-3.5 w-3.5 opacity-40" />
                              <span className="line-through opacity-70">Portal</span>
                            </span>
                          )}

                          {/* Botón para Desactivar o Activar Cliente */}
                          {isActivo ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => solicitarCambioEstado(cli, false)}
                              className="h-7 px-2.5 text-xs text-red-600 hover:text-red-700 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1 cursor-pointer"
                              title="Desactivar"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => solicitarCambioEstado(cli, true)}
                              className="h-7 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 cursor-pointer"
                              title="Volver a activar cliente"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Activar</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {clientesFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No se encontraron clientes con el filtro aplicado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE CONFIRMACIÓN: ACTIVAR / DESACTIVAR */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {accionActivar ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Activar Cliente
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Desactivar Cliente
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {clienteSeleccionado && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <p><strong>Empresa:</strong> {clienteSeleccionado.razon_social}</p>
                <p><strong>RUC:</strong> {clienteSeleccionado.ruc}</p>
                <p><strong>Régimen:</strong> {clienteSeleccionado.regimen_tributario}</p>
              </div>

              {accionActivar ? (
                <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p className="font-semibold">¿Desea volver a activar este cliente?</p>
                  <p className="text-[11px] leading-relaxed">
                    Volverá a aparecer en el listado activo de clientes, en el cronograma SUNAT y estará habilitado para recibir notificaciones y subir documentos.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">¿Está seguro de desactivar este cliente?</p>
                  <p className="text-[11px] leading-relaxed">
                    El cliente no se eliminará definitivamente para preservar la integridad de sus comprobantes e historial. Podrá reactivarlo en cualquier momento.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmModalOpen(false)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={ejecutarCambioEstado}
              disabled={procesando}
              className={`text-white text-xs cursor-pointer ${accionActivar
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
                }`}
            >
              {procesando
                ? "Procesando..."
                : accionActivar
                  ? "Activar"
                  : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
