"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  api,
  getSavedUser,
  Usuario,
  Cliente,
  Transaccion
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface ClientePortalContextType {
  user: Usuario | null;
  clienteInfo: Cliente | null;
  clienteInactivo: boolean;
  transacciones: Transaccion[];
  loading: boolean;
  pendientesCount: number;
  validadosCount: number;
  bancarizacionCount: number;
  ultimoDigitoRuc: string;
  fechaVencimiento: string;
  activeRuc: string | null;
  loadClienteData: (ruc: string) => Promise<void>;
  abrirModalSubida: (trx: Transaccion) => void;
  abrirVisor: (docId: number, nombre: string) => void;
  renderBadgeEstado: (estado: string) => React.ReactNode;
  
  // Modales
  uploadModalOpen: boolean;
  setUploadModalOpen: (open: boolean) => void;
  selectedTrx: Transaccion | null;
  fileToUpload: File | null;
  setFileToUpload: (file: File | null) => void;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: string | null;
  handleFileSelection: (file: File) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleSubirSustento: () => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  visorModalOpen: boolean;
  setVisorModalOpen: (open: boolean) => void;
  docVisorUrl: string | null;
  docVisorNombre: string;
  docVisorId: number | null;
}

const ClientePortalContext = createContext<ClientePortalContextType | undefined>(undefined);

export function ClientePortalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rucParam = searchParams.get("ruc");

  const [user, setUser] = useState<Usuario | null>(null);
  const [clienteInfo, setClienteInfo] = useState<Cliente | null>(null);
  const [clienteInactivo, setClienteInactivo] = useState<boolean>(false);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Subida de Archivos
  const [selectedTrx, setSelectedTrx] = useState<Transaccion | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados del Visor de Archivo
  const [visorModalOpen, setVisorModalOpen] = useState(false);
  const [docVisorUrl, setDocVisorUrl] = useState<string | null>(null);
  const [docVisorNombre, setDocVisorNombre] = useState<string>("");
  const [docVisorId, setDocVisorId] = useState<number | null>(null);

  const activeRuc = rucParam || user?.ruc || null;

  useEffect(() => {
    const saved = getSavedUser();
    setUser(saved);

    const targetRuc = rucParam || saved?.ruc;
    if (!saved && !rucParam) {
      router.push("/login?unauthorized=true");
      return;
    }

    if (targetRuc) {
      loadClienteData(targetRuc);
    } else {
      setLoading(false);
    }
  }, [rucParam]);

  const loadClienteData = async (ruc: string) => {
    setLoading(true);
    setClienteInactivo(false);
    try {
      const cliRes = await api.getCliente(ruc);
      setClienteInfo(cliRes.cliente);

      const isActivo = cliRes.cliente ? (cliRes.cliente.activo !== false && (cliRes.cliente.activo as any) !== 0) : true;
      if (!isActivo) {
        setClienteInactivo(true);
        setTransacciones([]);
        return;
      }

      const trxRes = await api.getTransacciones({ ruc });
      setTransacciones(trxRes.transacciones || []);

      // Obtener vencimiento dinámico oficial SUNAT para el RUC
      try {
        const cronoRes = await api.getVencimientoRuc(ruc, "2026-08");
        if (cronoRes && cronoRes.vencimientoFormateado) {
          setFechaVencimiento(cronoRes.vencimientoFormateado);
        }
      } catch (cronoErr) {
        console.warn("No se pudo obtener el vencimiento dinámico de SUNAT:", cronoErr);
      }
    } catch (err: any) {
      console.error("Error al cargar datos del portal cliente:", err);
      if (err.message && (err.message.includes("inactiv") || err.message.includes("403") || err.status === 403)) {
        setClienteInactivo(true);
        setTransacciones([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      setUploadError("Formato no válido. Solo se permiten archivos PDF o imágenes (JPG, PNG, WebP).");
      setFileToUpload(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("El documento excede el límite máximo configurado de 10 MB.");
      setFileToUpload(null);
      return;
    }

    setFileToUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const abrirModalSubida = (trx: Transaccion) => {
    setSelectedTrx(trx);
    setFileToUpload(null);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadModalOpen(true);
  };

  const handleSubirSustento = async () => {
    if (!selectedTrx || !fileToUpload) {
      setUploadError("Por favor seleccione un archivo para adjuntar.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await api.uploadDocumento(selectedTrx.id, fileToUpload);
      setUploadSuccess("¡Documento cargado exitosamente! El estado ha cambiado a 'Documento Recibido'.");

      const currentRuc = clienteInfo?.ruc || activeRuc;
      if (currentRuc) {
        const trxRes = await api.getTransacciones({ ruc: currentRuc });
        setTransacciones(trxRes.transacciones || []);
      }

      setTimeout(() => {
        setUploadModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setUploadError(err.message || "Error al subir el archivo.");
    } finally {
      setUploading(false);
    }
  };

  const abrirVisor = (docId: number, nombre: string) => {
    setDocVisorId(docId);
    setDocVisorNombre(nombre);
    setDocVisorUrl(api.getDocumentoFileUrl(docId, false));
    setVisorModalOpen(true);
  };

  const renderBadgeEstado = (estado: string) => {
    switch (estado) {
      case "INFORMACION_INCOMPLETA":
        return <Badge variant="destructive">Falta Documento</Badge>;
      case "SUSTENTO_RECIBIDO":
        return <Badge variant="warning">Documento Recibido (En revisión)</Badge>;
      case "VALIDADO":
        return <Badge variant="success">Validado Conforme</Badge>;
      case "RECHAZADO":
        return <Badge variant="destructive">Observado / Rechazado</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const pendientesCount = transacciones.filter(
    (t) => t.estado_sustento === "INFORMACION_INCOMPLETA" || t.estado_sustento === "RECHAZADO"
  ).length;

  const validadosCount = transacciones.filter((t) => t.estado_sustento === "VALIDADO").length;
  const bancarizacionCount = transacciones.filter((t) => t.requiere_bancarizacion === 1).length;

  const ultimoDigitoRuc = clienteInfo?.ruc ? clienteInfo.ruc.slice(-1) : "7";
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("Viernes, 18 de Septiembre de 2026");

  return (
    <ClientePortalContext.Provider
      value={{
        user,
        clienteInfo,
        clienteInactivo,
        transacciones,
        loading,
        pendientesCount,
        validadosCount,
        bancarizacionCount,
        ultimoDigitoRuc,
        fechaVencimiento,
        activeRuc,
        loadClienteData,
        abrirModalSubida,
        abrirVisor,
        renderBadgeEstado,
        uploadModalOpen,
        setUploadModalOpen,
        selectedTrx,
        fileToUpload,
        setFileToUpload,
        uploading,
        uploadError,
        uploadSuccess,
        handleFileSelection,
        handleDrop,
        handleSubirSustento,
        fileInputRef,
        visorModalOpen,
        setVisorModalOpen,
        docVisorUrl,
        docVisorNombre,
        docVisorId
      }}
    >
      {children}
    </ClientePortalContext.Provider>
  );
}

export function useClientePortal() {
  const context = useContext(ClientePortalContext);
  if (!context) {
    throw new Error("useClientePortal debe usarse dentro de un ClientePortalProvider");
  }
  return context;
}
