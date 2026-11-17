"use client";

import React, { useState, useRef, useId } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Trash2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FolderUp,
  FileCheck2,
  ShieldCheck,
  Check
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Transaccion, api, BulkUploadDetail } from "@/lib/api";
import { useClientePortal } from "@/context/ClientePortalContext";

interface StagedFile {
  id: string;
  file: File;
  transaccionId: number | null;
  matchedAuto: boolean;
  error?: string;
}

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelectedTrxId?: number | null;
}

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function tryMatchTransaction(file: File, transacciones: Transaccion[]): Transaccion | null {
  const fileNameNorm = file.name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Coincidencia por número de comprobante (estándar SUNAT: ej. F001-0004523, F001-4523, E001-45)
  for (const trx of transacciones) {
    if (trx.numero_comprobante) {
      const compNorm = trx.numero_comprobante.toLowerCase().replace(/[^a-z0-9]/g, "");
      // Separar serie y número correlativo
      const parts = trx.numero_comprobante.split(/[-_\s]+/);
      const serie = parts[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
      const numero = parts[1]?.toLowerCase().replace(/[^0-9]/g, "") || "";
      const numeroSinCeros = numero.replace(/^0+/, "");

      // Coincidencia exacta de serie + número (ej. f0014523 o f0010004523)
      if (compNorm.length >= 3 && fileNameNorm.includes(compNorm)) {
        return trx;
      }
      if (serie && numeroSinCeros && fileNameNorm.includes(serie) && fileNameNorm.includes(numeroSinCeros)) {
        return trx;
      }
      // Coincidencia por número correlativo único de al menos 4 dígitos
      if (numeroSinCeros.length >= 4 && fileNameNorm.includes(numeroSinCeros)) {
        return trx;
      }
    }
  }

  // 2. Coincidencia por RUC de emisor (11 dígitos)
  for (const trx of transacciones) {
    if (trx.emisor_ruc && trx.emisor_ruc.length === 11 && fileNameNorm.includes(trx.emisor_ruc)) {
      return trx;
    }
  }

  // 3. Coincidencia por palabras clave de razón social
  for (const trx of transacciones) {
    if (trx.emisor_razon_social) {
      const words = trx.emisor_razon_social
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 5 && !["sac", "srl", "eirl", "sociedad", "anonima", "peru"].includes(w));
      for (const word of words) {
        if (fileNameNorm.includes(word)) {
          return trx;
        }
      }
    }
  }

  // 4. Coincidencia por monto en vouchers bancarios (ej. voucher_4850.jpg)
  for (const trx of transacciones) {
    if (trx.monto_total && trx.monto_total >= 50) {
      const montoEntero = Math.floor(trx.monto_total).toString();
      if (montoEntero.length >= 3 && fileNameNorm.includes(montoEntero)) {
        const isVoucherWord =
          fileNameNorm.includes("voucher") ||
          fileNameNorm.includes("pago") ||
          fileNameNorm.includes("transf") ||
          fileNameNorm.includes("deposito") ||
          fileNameNorm.includes("bcp") ||
          fileNameNorm.includes("bbva");
        if (isVoucherWord) {
          return trx;
        }
      }
    }
  }

  return null;
}

export function BulkUploadModal({ open, onOpenChange, initialSelectedTrxId }: BulkUploadModalProps) {
  const { transacciones, activeRuc, loadClienteData } = useClientePortal();

  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<{
    subidos: number;
    fallidos: number;
    detalles: BulkUploadDetail[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchTrxSelection, setBatchTrxSelection] = useState<string>("");

  // Separar transacciones prioritarias (pendientes de sustento) y secundarias
  const trxPendientes = transacciones.filter(
    (t) => t.estado_sustento === "INFORMACION_INCOMPLETA" || t.estado_sustento === "RECHAZADO"
  );
  const trxOtras = transacciones.filter(
    (t) => t.estado_sustento !== "INFORMACION_INCOMPLETA" && t.estado_sustento !== "RECHAZADO"
  );

  const handleFilesAdded = (incomingFiles: FileList | File[]) => {
    setGeneralError(null);
    setUploadResults(null);

    const newStaged: StagedFile[] = [];

    Array.from(incomingFiles).forEach((file) => {
      // Validar si ya existe en la lista
      const alreadyExists = stagedFiles.some(
        (sf) => sf.file.name === file.name && sf.file.size === file.size
      );
      if (alreadyExists) return;

      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      let fileError: string | undefined = undefined;

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        fileError = `Formato "${ext}" no admitido (solo PDF, JPG, PNG, WebP)`;
      } else if (file.size > MAX_FILE_SIZE) {
        fileError = "Excede el límite de 10 MB";
      }

      // Auto-matching con comprobantes
      let matchedTrxId: number | null = initialSelectedTrxId || null;
      let matchedAuto = false;

      if (!matchedTrxId && !fileError) {
        const match = tryMatchTransaction(file, transacciones);
        if (match) {
          matchedTrxId = match.id;
          matchedAuto = true;
        }
      }

      newStaged.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        transaccionId: matchedTrxId,
        matchedAuto,
        error: fileError
      });
    });

    if (newStaged.length === 0 && incomingFiles.length > 0) {
      setGeneralError("Los archivos seleccionados ya fueron agregados a la lista.");
      return;
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAssignTrx = (id: string, trxId: number | null) => {
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, transaccionId: trxId, matchedAuto: false } : f))
    );
  };

  const handleApplyBatchSelection = () => {
    if (!batchTrxSelection) return;
    const targetId = Number(batchTrxSelection);
    setStagedFiles((prev) =>
      prev.map((f) => (f.error ? f : { ...f, transaccionId: targetId, matchedAuto: false }))
    );
  };

  const handleClearAll = () => {
    setStagedFiles([]);
    setUploadResults(null);
    setGeneralError(null);
  };

  const handleStartBulkUpload = async () => {
    const validItems = stagedFiles.filter((f) => !f.error && f.transaccionId !== null);

    if (validItems.length === 0) {
      setGeneralError("Debe asociar al menos un archivo válido a un comprobante antes de iniciar la carga.");
      return;
    }

    const unassignedCount = stagedFiles.filter((f) => !f.error && f.transaccionId === null).length;
    if (unassignedCount > 0) {
      setGeneralError(
        `Tiene ${unassignedCount} archivo(s) sin comprobante asignado. Asígnelos o elimínelos para continuar.`
      );
      return;
    }

    setUploading(true);
    setGeneralError(null);
    setUploadProgress(0);

    try {
      const itemsToUpload = validItems.map((item) => ({
        file: item.file,
        transaccionId: item.transaccionId!
      }));

      const res = await api.uploadDocumentosMasivo(itemsToUpload, (percent) => {
        setUploadProgress(percent);
      });

      setUploadResults({
        subidos: res.subidos,
        fallidos: res.fallidos,
        detalles: res.detalles || []
      });

      // Refrescar datos en el portal
      if (activeRuc) {
        await loadClienteData(activeRuc);
      }
    } catch (err: any) {
      console.error("Error en carga masiva:", err);
      setGeneralError(err.message || "Ocurrió un error al procesar la carga masiva de documentos.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setStagedFiles([]);
    setUploadResults(null);
    setGeneralError(null);
    onOpenChange(false);
  };

  const validFilesReadyCount = stagedFiles.filter((f) => !f.error && f.transaccionId !== null).length;
  const invalidFilesCount = stagedFiles.filter((f) => !!f.error).length;
  const unassignedCount = stagedFiles.filter((f) => !f.error && f.transaccionId === null).length;

  return (
    <Dialog open={open} onOpenChange={(val) => !uploading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Cabecera del Modal */}
        <DialogHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <FolderUp className="h-5 w-5" />
                </span>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Carga Masiva de Documentos y Sustentos
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Suba múltiples comprobantes de pago, vouchers y facturas digitales en una sola operación con vinculación automática.
              </DialogDescription>
            </div>

            {trxPendientes.length > 0 && (
              <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-mono border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 shrink-0">
                {trxPendientes.length} comprobante(s) por sustentar
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {/* Mensaje de Resultado Exitoso */}
          {uploadResults ? (
            <div className="space-y-4 py-4 text-center animate-fade-in">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  ¡Carga Masiva Completada con Éxito!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
                  Se subieron <strong className="text-emerald-600 font-bold">{uploadResults.subidos}</strong> documento(s).
                  Los comprobantes asociados cambiaron automáticamente a estado{" "}
                  <strong className="text-slate-900 dark:text-white font-semibold">&quot;Documento Recibido&quot;</strong> y ya están listos para revisión contable.
                </p>
                {uploadResults.fallidos > 0 && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    Hubo {uploadResults.fallidos} archivo(s) que no se pudieron procesar.
                  </p>
                )}
              </div>

              {/* Listado de resultados por archivo */}
              <div className="text-left max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 divide-y divide-slate-200 dark:divide-slate-800">
                {uploadResults.detalles.map((det, idx) => (
                  <div key={idx} className="p-3 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      {det.estado === "EXITO" ? (
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">
                        {det.nombreOriginal}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {det.comprobante && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {det.comprobante}
                        </span>
                      )}
                      {det.estado === "EXITO" ? (
                        <Badge variant="success" className="text-[10px]">
                          Cargado
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          {det.error || "Error"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Zona Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]"
                    : "border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-900/30"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                />
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2.5">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Arrastre sus archivos aquí o haga clic para seleccionar
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Formatos aceptados: <strong>PDF, JPG, PNG o WebP</strong> • Hasta 10 MB por archivo • Selección múltiple permitida
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Detección inteligente: Si el nombre incluye el N° de factura o RUC, se vinculará automáticamente</span>
                </div>
              </div>

              {/* Barra de Herramientas para Lotes */}
              {stagedFiles.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{stagedFiles.length} archivo(s) en lista</span>
                    {validFilesReadyCount > 0 && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                        {validFilesReadyCount} listos
                      </Badge>
                    )}
                    {unassignedCount > 0 && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40">
                        {unassignedCount} sin asignar
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Selector de asignación en bloque */}
                    <select
                      value={batchTrxSelection}
                      onChange={(e) => setBatchTrxSelection(e.target.value)}
                      className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer max-w-[200px]"
                    >
                      <option value="">Asignar todos a...</option>
                      {trxPendientes.length > 0 && (
                        <optgroup label="Requerimientos Pendientes">
                          {trxPendientes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.comprobante_tipo} {t.numero_comprobante} - S/ {t.monto_total.toFixed(2)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {trxOtras.length > 0 && (
                        <optgroup label="Otros Comprobantes">
                          {trxOtras.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.comprobante_tipo} {t.numero_comprobante} - S/ {t.monto_total.toFixed(2)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleApplyBatchSelection}
                      disabled={!batchTrxSelection}
                      className="h-8 text-xs cursor-pointer"
                    >
                      Aplicar
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearAll}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      title="Vaciar lista"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Mensajes de Alerta General */}
              {generalError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-start gap-2.5 text-xs animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{generalError}</p>
                </div>
              )}

              {/* Lista de Archivos Cargados para Asignar */}
              {stagedFiles.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 max-h-72 overflow-y-auto custom-scrollbar">
                  {stagedFiles.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        item.error
                          ? "bg-red-50/40 dark:bg-red-950/20"
                          : item.transaccionId
                          ? "bg-white dark:bg-slate-900"
                          : "bg-amber-50/20 dark:bg-amber-950/10"
                      }`}
                    >
                      {/* Información del archivo */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.file.name}>
                              {item.file.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              ({formatFileSize(item.file.size)})
                            </span>
                            {item.matchedAuto && (
                              <Badge variant="outline" className="text-[9px] text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 shrink-0">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Auto-vinculado
                              </Badge>
                            )}
                          </div>

                          {item.error ? (
                            <p className="text-[11px] text-red-600 font-medium mt-0.5">
                              {item.error}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400">
                              {item.transaccionId
                                ? "Comprobante asignado para validación contable"
                                : "Seleccione el comprobante correspondiente en el menú desplegable"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Selector de Comprobante para este archivo */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!item.error && (
                          <select
                            value={item.transaccionId || ""}
                            onChange={(e) => handleAssignTrx(item.id, e.target.value ? Number(e.target.value) : null)}
                            className={`h-8 rounded-lg border px-2.5 text-xs cursor-pointer max-w-[260px] truncate ${
                              item.transaccionId
                                ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100 font-medium"
                                : "border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 font-semibold"
                            }`}
                          >
                            <option value="">⚠️ Asignar Comprobante...</option>
                            {trxPendientes.length > 0 && (
                              <optgroup label="🔴 Requerimientos Pendientes (Prioridad)">
                                {trxPendientes.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.comprobante_tipo} {t.numero_comprobante} - {t.emisor_razon_social} (S/ {t.monto_total.toFixed(2)})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {trxOtras.length > 0 && (
                              <optgroup label="⚪ Otros Comprobantes del Período">
                                {trxOtras.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.comprobante_tipo} {t.numero_comprobante} - {t.emisor_razon_social} (S/ {t.monto_total.toFixed(2)})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        )}

                        <button
                          onClick={() => handleRemoveFile(item.id)}
                          className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Eliminar de la lista"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Barra de Progreso de Subida */}
              {uploading && (
                <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      Subiendo {validFilesReadyCount} documento(s) al servidor...
                    </span>
                    <span className="font-mono text-emerald-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie del Modal */}
        <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3">
          {uploadResults ? (
            <div className="w-full flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUploadResults(null);
                  setStagedFiles([]);
                }}
                className="text-xs cursor-pointer"
              >
                Subir Más Documentos
              </Button>
              <Button
                size="sm"
                onClick={handleClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer"
              >
                Finalizar y Ver Comprobantes
              </Button>
            </div>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {stagedFiles.length === 0 ? (
                  <span>Seleccione o arrastre archivos para comenzar</span>
                ) : (
                  <span>
                    <strong>{validFilesReadyCount}</strong> archivo(s) listos para enviar
                    {unassignedCount > 0 && ` • ${unassignedCount} pendiente(s) de asignar`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={uploading}
                  className="text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartBulkUpload}
                  disabled={uploading || validFilesReadyCount === 0 || unassignedCount > 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <FolderUp className="h-4 w-4" />
                  <span>
                    {uploading
                      ? "Cargando archivos..."
                      : `Subir ${validFilesReadyCount} Documento(s)`}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

