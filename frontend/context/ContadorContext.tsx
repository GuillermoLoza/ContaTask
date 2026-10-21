"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  getSavedUser,
  Usuario,
  Cliente,
  Transaccion,
  Notificacion,
  WhatsAppStatus,
  EmailTemplate,
  SmtpConfig,
  CorreoRecibido,
  CorreoStats,
  ImapConfig,
  AdjuntoCorreo,
  SunatCredenciales,
  SunatValidacionResult,
  SunatAutologinPayload,
  BuzonSolMensaje,
  BuzonSolStats,
  CronogramaClienteItem,
  CronogramaOficial
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export type CronogramaItem = CronogramaClienteItem;

interface ContadorContextType {
  user: Usuario | null;
  loading: boolean;
  clientes: Cliente[];
  transacciones: Transaccion[];
  notificaciones: Notificacion[];
  notifResumen: any;
  cronogramaSunat: CronogramaItem[];
  cronogramaOficial: CronogramaOficial | null;
  cronogramaCargando: boolean;
  periodoFiscalActivo: string;
  setPeriodoFiscalActivo: (periodo: string) => void;
  refrescarCronograma: (periodo?: string) => Promise<void>;
  cambiarPeriodoFiscal: (nuevoPeriodo: string) => Promise<void>;
  sincronizarCronogramaConPortal: (periodo?: string) => Promise<any>;
  loadAllData: () => Promise<void>;
  renderBadgeEstado: (estado: string) => React.ReactNode;

  // Filtros de transacciones
  selectedClienteId: string;
  setSelectedClienteId: (val: string) => void;
  selectedEstado: string;
  setSelectedEstado: (val: string) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  transaccionesFiltradas: Transaccion[];

  // Modal 1: Solicitar / Notificar
  solicitarModalOpen: boolean;
  setSolicitarModalOpen: (open: boolean) => void;
  trxParaSolicitar: Transaccion | null;
  clienteParaNotificar: any | null;
  canalEnvio: "WHATSAPP" | "EMAIL";
  setCanalEnvio: (c: "WHATSAPP" | "EMAIL") => void;
  forzarFallo: boolean;
  setForzarFallo: (f: boolean) => void;
  mensajePersonalizado: string;
  setMensajePersonalizado: (m: string) => void;
  solicitudEnviando: boolean;
  resultadoEnvio: any;
  abrirModalSolicitarTrx: (trx: Transaccion) => void;
  abrirModalNotificarVencimiento: (item: any) => void;
  handleEnviarSolicitud: () => Promise<void>;

  // Modal 2: Evaluar Documento
  evaluarModalOpen: boolean;
  setEvaluarModalOpen: (open: boolean) => void;
  trxParaEvaluar: Transaccion | null;
  accionEvaluacion: "APROBAR" | "RECHAZAR";
  setAccionEvaluacion: (a: "APROBAR" | "RECHAZAR") => void;
  motivoRechazo: string;
  setMotivoRechazo: (m: string) => void;
  evaluando: boolean;
  evalError: string | null;
  abrirModalEvaluar: (trx: Transaccion) => void;
  handleConfirmarEvaluacion: () => Promise<void>;

  // Modal 3: Visor de Documento
  visorModalOpen: boolean;
  setVisorModalOpen: (open: boolean) => void;
  docVisorUrl: string | null;
  docVisorNombre: string;
  docVisorId: number | null;
  abrirVisor: (docId: number, nombre: string) => void;

  // Modal Cliente MYPE Unificado (Datos de la Empresa y Clave SOL)
  clienteModalOpen: boolean;
  setClienteModalOpen: (open: boolean) => void;
  clienteEnEdicion: Cliente | null;
  setClienteEnEdicion: (cli: Cliente | null) => void;
  activeClienteTab: "DATOS" | "SUNAT";
  setActiveClienteTab: (tab: "DATOS" | "SUNAT") => void;
  nuevoRuc: string;
  setNuevoRuc: (r: string) => void;
  nuevaRazonSocial: string;
  setNuevaRazonSocial: (rs: string) => void;
  nuevoNombreComercial: string;
  setNuevoNombreComercial: (nc: string) => void;
  nuevoContactoNombre: string;
  setNuevoContactoNombre: (cn: string) => void;
  nuevoEmail: string;
  setNuevoEmail: (e: string) => void;
  nuevoCelular: string;
  setNuevoCelular: (c: string) => void;
  nuevoRegimen: string;
  setNuevoRegimen: (r: string) => void;
  nuevaDireccion: string;
  setNuevaDireccion: (d: string) => void;
  nuevoUsuarioSol: string;
  setNuevoUsuarioSol: (u: string) => void;
  nuevaClaveSol: string;
  setNuevaClaveSol: (p: string) => void;
  nuevoSunatClientId: string;
  setNuevoSunatClientId: (id: string) => void;
  nuevoSunatClientSecret: string;
  setNuevoSunatClientSecret: (s: string) => void;
  creandoCliente: boolean;
  clienteError: string | null;
  clienteSuccess: string | null;
  abrirModalNuevoCliente: () => void;
  abrirModalEditarCliente: (cliente: Cliente, tab?: "DATOS" | "SUNAT") => void;
  handleCrearCliente: (e?: React.FormEvent) => Promise<void>;
  handleGuardarCliente: (e?: React.FormEvent) => Promise<void>;
  handleValidarSunatEnModalCliente: () => Promise<void>;
  handleAutologinEnModalCliente: () => Promise<void>;
  handleToggleClienteEstado: (id: number, nuevoEstado: boolean) => Promise<void>;

  // WhatsApp Web JS
  whatsappStatus: WhatsAppStatus | null;
  loadingWhatsApp: boolean;
  initializingWhatsApp: boolean;
  confirmingScan: boolean;
  sendingTestMessage: boolean;
  testPhoneNumber: string;
  setTestPhoneNumber: (p: string) => void;
  testMessageText: string;
  setTestMessageText: (m: string) => void;
  testResult: any;
  testError: string | null;
  customPushname: string;
  setCustomPushname: (n: string) => void;
  countdown: number;
  realtimeActive: boolean;
  linkMethod: "QR" | "PHONE";
  setLinkMethod: (m: "QR" | "PHONE") => void;
  configModalOpen: boolean;
  setConfigModalOpen: (o: boolean) => void;
  senderPhoneNumber: string;
  setSenderPhoneNumber: (p: string) => void;
  senderPushname: string;
  setSenderPushname: (n: string) => void;
  savingConfig: boolean;
  configSuccessMsg: string | null;
  generatingPairingCode: boolean;
  pairingCodeCopied: boolean;
  pairingCountdown: number;
  cargarWhatsAppStatus: () => Promise<void>;
  handleGuardarConfigNumero: (e?: React.FormEvent) => Promise<void>;
  handleGenerarPairingCode: () => Promise<void>;
  handleCopiarPairingCode: () => void;
  handleConfirmarConNumero: () => Promise<void>;
  handleIniciarSesionWhatsApp: () => Promise<void>;
  handleConfirmarEscaneo: () => Promise<void>;
  handleDesconectarWhatsApp: () => Promise<void>;
  handleEnviarMensajePrueba: (e: React.FormEvent) => Promise<void>;

  // Centro de Correos y SMTP
  emailTemplates: EmailTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (t: string) => void;
  emailTo: string;
  setEmailTo: (to: string) => void;
  emailSubject: string;
  setEmailSubject: (s: string) => void;
  emailCustomMessage: string;
  setEmailCustomMessage: (m: string) => void;
  emailSelectedClienteId: string;
  setEmailSelectedClienteId: (id: string) => void;
  emailSending: boolean;
  emailSuccessMsg: string | null;
  emailErrorMsg: string | null;
  emailPreviewHtml: string;
  loadingPreview: boolean;
  actualizarPrevisualizacion: (templateId?: string, clienteIdStr?: string, customMsg?: string) => Promise<void>;
  handleSeleccionarClienteEmail: (clienteId: string) => void;
  handleSeleccionarPlantillaEmail: (templateId: string) => void;
  handleEnviarCorreo: (e?: React.FormEvent) => Promise<void>;

  // Configuración SMTP
  smtpConfig: SmtpConfig | null;
  smtpModalOpen: boolean;
  setSmtpModalOpen: (o: boolean) => void;
  smtpHost: string;
  setSmtpHost: (h: string) => void;
  smtpPort: number;
  setSmtpPort: (p: number) => void;
  smtpUser: string;
  setSmtpUser: (u: string) => void;
  smtpPass: string;
  setSmtpPass: (p: string) => void;
  smtpFrom: string;
  setSmtpFrom: (f: string) => void;
  smtpSecure: boolean;
  setSmtpSecure: (s: boolean) => void;
  smtpTesting: boolean;
  smtpTestEmail: string;
  setSmtpTestEmail: (e: string) => void;
  smtpTestResult: string | null;
  smtpSaving: boolean;
  handleTestSmtp: () => Promise<void>;
  handleGuardarSmtp: (e: React.FormEvent) => Promise<void>;

  // Detalle de Correo Enviado
  detalleCorreoModalOpen: boolean;
  setDetalleCorreoModalOpen: (o: boolean) => void;
  correoSeleccionado: Notificacion | null;
  setCorreoSeleccionado: (n: Notificacion | null) => void;

  // Buzón de Correos Recibidos (IMAP)
  correosRecibidos: CorreoRecibido[];
  correosStats: CorreoStats | null;
  imapConfig: ImapConfig | null;
  sincronizandoBandeja: boolean;
  filtroBandejaSoloNoLeidos: boolean;
  setFiltroBandejaSoloNoLeidos: (v: boolean) => void;
  filtroBandejaConAdjuntos: boolean;
  setFiltroBandejaConAdjuntos: (v: boolean) => void;
  busquedaBandeja: string;
  setBusquedaBandeja: (s: string) => void;
  correoRecibidoSeleccionado: CorreoRecibido | null;
  setCorreoRecibidoSeleccionado: (c: CorreoRecibido | null) => void;
  modalDetalleCorreoRecibidoOpen: boolean;
  setModalDetalleCorreoRecibidoOpen: (o: boolean) => void;
  cargarCorreosRecibidos: () => Promise<void>;
  handleSincronizarBandeja: () => Promise<any>;
  handleMarcarCorreoLeido: (id: number, leido?: boolean) => Promise<void>;
  handleConvertirAdjuntoEnSustento: (
    correoId: number,
    data: {
      transaccionId: number;
      nombreArchivo: string;
      nombreOriginal: string;
      rutaArchivo?: string;
      mimeType: string;
      tamanoBytes: number;
    }
  ) => Promise<void>;
  handleEliminarCorreoRecibido: (id: number) => Promise<void>;
  handleSimularCorreoEntrante: (ruc?: string) => Promise<void>;

  // SUNAT SOL & Buzón SOL
  buzonMensajes: BuzonSolMensaje[];
  buzonStats: BuzonSolStats | null;
  buzonLoading: boolean;
  sincronizandoBuzon: boolean;
  filtroBuzonEstado: string;
  setFiltroBuzonEstado: (e: string) => void;
  filtroBuzonClienteId: string;
  setFiltroBuzonClienteId: (id: string) => void;
  buzonMensajeSeleccionado: BuzonSolMensaje | null;
  setBuzonMensajeSeleccionado: (m: BuzonSolMensaje | null) => void;
  modalDetalleBuzonOpen: boolean;
  setModalDetalleBuzonOpen: (o: boolean) => void;
  cargandoDetalleBuzon: boolean;
  abrirDetalleBuzon: (m: BuzonSolMensaje) => Promise<void>;

  // Modal Configuración Clave SOL & Token
  sunatModalOpen: boolean;
  setSunatModalOpen: (o: boolean) => void;
  clienteParaSunat: Cliente | null;
  setClienteParaSunat: (c: Cliente | null) => void;
  usuarioSol: string;
  setUsuarioSol: (u: string) => void;
  claveSol: string;
  setClaveSol: (p: string) => void;
  sunatClientId: string;
  setSunatClientId: (id: string) => void;
  sunatClientSecret: string;
  setSunatClientSecret: (s: string) => void;
  sunatValidando: boolean;
  sunatGuardando: boolean;
  sunatResult: SunatValidacionResult | null;
  sunatError: string | null;

  // Acciones SUNAT
  abrirModalSunat: (cliente: Cliente) => void;
  handleGuardarSunatCredenciales: (e?: React.FormEvent) => Promise<void>;
  handleValidarSunatConexion: (clienteId?: number) => Promise<SunatValidacionResult | void>;
  handleAutologinSunat: (cliente: Cliente) => Promise<void>;
  cargarBuzonSol: (clienteId?: number, estado?: string) => Promise<void>;
  handleSincronizarBuzon: (clienteId?: number) => Promise<void>;
  handleSincronizarBuzonTodos: () => Promise<void>;
  handleMarcarBuzonLeido: (mensajeId: number) => Promise<void>;
}

const ContadorContext = createContext<ContadorContextType | undefined>(undefined);

export function ContadorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Datos principales
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notifResumen, setNotifResumen] = useState<any>(null);

  // Filtros de transacciones
  const [selectedClienteId, setSelectedClienteId] = useState<string>("TODOS");
  const [selectedEstado, setSelectedEstado] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal 1: Solicitar / Notificar
  const [solicitarModalOpen, setSolicitarModalOpen] = useState(false);
  const [trxParaSolicitar, setTrxParaSolicitar] = useState<Transaccion | null>(null);
  const [clienteParaNotificar, setClienteParaNotificar] = useState<any | null>(null);
  const [canalEnvio, setCanalEnvio] = useState<"WHATSAPP" | "EMAIL">("WHATSAPP");
  const [forzarFallo, setForzarFallo] = useState(false);
  const [mensajePersonalizado, setMensajePersonalizado] = useState("");
  const [solicitudEnviando, setSolicitudEnviando] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<any>(null);

  // Modal 2: Evaluar Documento
  const [evaluarModalOpen, setEvaluarModalOpen] = useState(false);
  const [trxParaEvaluar, setTrxParaEvaluar] = useState<Transaccion | null>(null);
  const [accionEvaluacion, setAccionEvaluacion] = useState<"APROBAR" | "RECHAZAR">("APROBAR");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [evaluando, setEvaluando] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Modal 3: Visor de Documento
  const [visorModalOpen, setVisorModalOpen] = useState(false);
  const [docVisorUrl, setDocVisorUrl] = useState<string | null>(null);
  const [docVisorNombre, setDocVisorNombre] = useState<string>("");
  const [docVisorId, setDocVisorId] = useState<number | null>(null);

  // Modal Cliente MYPE Unificado (Datos Comerciales y Clave SOL)
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [clienteEnEdicion, setClienteEnEdicion] = useState<Cliente | null>(null);
  const [activeClienteTab, setActiveClienteTab] = useState<"DATOS" | "SUNAT">("DATOS");
  const [nuevoRuc, setNuevoRuc] = useState("");
  const [nuevaRazonSocial, setNuevaRazonSocial] = useState("");
  const [nuevoNombreComercial, setNuevoNombreComercial] = useState("");
  const [nuevoContactoNombre, setNuevoContactoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoCelular, setNuevoCelular] = useState("");
  const [nuevoRegimen, setNuevoRegimen] = useState("MYPE Tributario");
  const [nuevaDireccion, setNuevaDireccion] = useState("");
  const [nuevoUsuarioSol, setNuevoUsuarioSol] = useState("");
  const [nuevaClaveSol, setNuevaClaveSol] = useState("");
  const [nuevoSunatClientId, setNuevoSunatClientId] = useState("");
  const [nuevoSunatClientSecret, setNuevoSunatClientSecret] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [clienteError, setClienteError] = useState<string | null>(null);
  const [clienteSuccess, setClienteSuccess] = useState<string | null>(null);

  // WhatsApp Web JS
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(false);
  const [initializingWhatsApp, setInitializingWhatsApp] = useState(false);
  const [confirmingScan, setConfirmingScan] = useState(false);
  const [sendingTestMessage, setSendingTestMessage] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("51920843098");
  const [testMessageText, setTestMessageText] = useState(
    "Estimado(a) cliente, le informamos que su declaración tributaria SUNAT período Agosto 2026 vence el 18/09/2026. Por favor adjunte sus documentos pendientes en ContaTask."
  );
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [customPushname, setCustomPushname] = useState("Estudio Contable Lozano & Asociados");
  const [countdown, setCountdown] = useState<number>(20);
  const [realtimeActive, setRealtimeActive] = useState<boolean>(false);
  const [linkMethod, setLinkMethod] = useState<"QR" | "PHONE">("QR");
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [senderPhoneNumber, setSenderPhoneNumber] = useState<string>("920843098");
  const [senderPushname, setSenderPushname] = useState<string>("Estudio Contable Lozano & Asociados");
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);
  const [generatingPairingCode, setGeneratingPairingCode] = useState<boolean>(false);
  const [pairingCodeCopied, setPairingCodeCopied] = useState<boolean>(false);
  const [pairingCountdown, setPairingCountdown] = useState<number>(120);

  // Centro de Correos y SMTP
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("sunat_vencimiento");
  const [emailTo, setEmailTo] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailCustomMessage, setEmailCustomMessage] = useState<string>("");
  const [emailSelectedClienteId, setEmailSelectedClienteId] = useState<string>("");
  const [emailSending, setEmailSending] = useState<boolean>(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // Configuración SMTP
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [smtpModalOpen, setSmtpModalOpen] = useState<boolean>(false);
  const [smtpHost, setSmtpHost] = useState<string>("smtp.ethereal.email");
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState<string>("");
  const [smtpPass, setSmtpPass] = useState<string>("");
  const [smtpFrom, setSmtpFrom] = useState<string>('"Estudio Contable Lozano & Asociados" <notificaciones@contatask.pe>');
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);
  const [smtpTesting, setSmtpTesting] = useState<boolean>(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState<string>("");
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);
  const [smtpSaving, setSmtpSaving] = useState<boolean>(false);

  // Modal para detalle de correo
  const [detalleCorreoModalOpen, setDetalleCorreoModalOpen] = useState<boolean>(false);
  const [correoSeleccionado, setCorreoSeleccionado] = useState<Notificacion | null>(null);

  // Buzón de Correos Recibidos (IMAP)
  const [correosRecibidos, setCorreosRecibidos] = useState<CorreoRecibido[]>([]);
  const [correosStats, setCorreosStats] = useState<CorreoStats | null>(null);
  const [imapConfig, setImapConfig] = useState<ImapConfig | null>(null);
  const [sincronizandoBandeja, setSincronizandoBandeja] = useState<boolean>(false);
  const [filtroBandejaSoloNoLeidos, setFiltroBandejaSoloNoLeidos] = useState<boolean>(false);
  const [filtroBandejaConAdjuntos, setFiltroBandejaConAdjuntos] = useState<boolean>(false);
  const [busquedaBandeja, setBusquedaBandeja] = useState<string>("");
  const [correoRecibidoSeleccionado, setCorreoRecibidoSeleccionado] = useState<CorreoRecibido | null>(null);
  const [modalDetalleCorreoRecibidoOpen, setModalDetalleCorreoRecibidoOpen] = useState<boolean>(false);

  // SUNAT SOL & Buzón SOL
  const [buzonMensajes, setBuzonMensajes] = useState<BuzonSolMensaje[]>([]);
  const [buzonStats, setBuzonStats] = useState<BuzonSolStats | null>(null);
  const [buzonLoading, setBuzonLoading] = useState<boolean>(false);
  const [sincronizandoBuzon, setSincronizandoBuzon] = useState<boolean>(false);
  const [filtroBuzonEstado, setFiltroBuzonEstado] = useState<string>("TODOS");
  const [filtroBuzonClienteId, setFiltroBuzonClienteId] = useState<string>("TODOS");
  const [buzonMensajeSeleccionado, setBuzonMensajeSeleccionado] = useState<BuzonSolMensaje | null>(null);
  const [modalDetalleBuzonOpen, setModalDetalleBuzonOpen] = useState<boolean>(false);
  const [cargandoDetalleBuzon, setCargandoDetalleBuzon] = useState<boolean>(false);

  // Modal Configuración Clave SOL & Token
  const [sunatModalOpen, setSunatModalOpen] = useState<boolean>(false);
  const [clienteParaSunat, setClienteParaSunat] = useState<Cliente | null>(null);
  const [usuarioSol, setUsuarioSol] = useState<string>("");
  const [claveSol, setClaveSol] = useState<string>("");
  const [sunatClientId, setSunatClientId] = useState<string>("");
  const [sunatClientSecret, setSunatClientSecret] = useState<string>("");
  const [sunatValidando, setSunatValidando] = useState<boolean>(false);
  const [sunatGuardando, setSunatGuardando] = useState<boolean>(false);
  const [sunatResult, setSunatResult] = useState<SunatValidacionResult | null>(null);
  const [sunatError, setSunatError] = useState<string | null>(null);

  // Cronograma SUNAT Automatizado
  const [periodoFiscalActivo, setPeriodoFiscalActivo] = useState<string>("2026-08");
  const [cronogramaSunat, setCronogramaSunat] = useState<CronogramaItem[]>([]);
  const [cronogramaOficial, setCronogramaOficial] = useState<CronogramaOficial | null>(null);
  const [cronogramaCargando, setCronogramaCargando] = useState<boolean>(false);

  const cargarCronograma = async (periodoParam?: string) => {
    const periodo = periodoParam || periodoFiscalActivo;
    setCronogramaCargando(true);
    try {
      const res = await api.getCronogramaClientes(periodo);
      if (res && res.items) {
        setCronogramaSunat(res.items);
        setCronogramaOficial(res.cronoOficial);
      }
    } catch (err: any) {
      console.warn("No se pudo cargar el cronograma automatizado de SUNAT:", err?.message);
    } finally {
      setCronogramaCargando(false);
    }
  };

  const cambiarPeriodoFiscal = async (nuevoPeriodo: string) => {
    setPeriodoFiscalActivo(nuevoPeriodo);
    await cargarCronograma(nuevoPeriodo);
  };

  const refrescarCronograma = async (periodo?: string) => {
    await cargarCronograma(periodo);
  };

  const sincronizarCronogramaConPortal = async (periodoParam?: string) => {
    const periodo = periodoParam || periodoFiscalActivo;
    setCronogramaCargando(true);
    try {
      const res = await api.sincronizarCronogramaSunatPortal(periodo);
      await cargarCronograma(periodo);
      return res;
    } catch (err: any) {
      alert("Error al sincronizar con portal oficial de SUNAT: " + (err.message || err));
      throw err;
    } finally {
      setCronogramaCargando(false);
    }
  };

  useEffect(() => {
    const saved = getSavedUser();
    if (!saved) {
      router.push("/login?unauthorized=true");
      return;
    }
    if (saved.rol !== "CONTADOR") {
      router.push("/portal-cliente");
      return;
    }
    setUser(saved);
    loadAllData();
  }, []);

  // Escuchar eventos en tiempo real vía Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const streamUrl = api.getWhatsAppStreamUrl();
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        setRealtimeActive(true);
      };

      eventSource.onmessage = (event) => {
        try {
          if (!event.data) return;
          const data = JSON.parse(event.data);

          if (data?.type === "chat_message" && data.message) {
            // Disparar evento global para componentes de Chat en vivo
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("whatsapp:new_message", { detail: data.message }));
            }
            return;
          }

          const statusData = data?.type === "status" ? data.data : data;

          if (statusData && statusData.status) {
            setWhatsappStatus(statusData);
            if (typeof statusData.qrRemainingSeconds === "number" && statusData.qrRemainingSeconds > 0) {
              setCountdown(statusData.qrRemainingSeconds);
            }
            if (typeof statusData.pairingCodeRemainingSeconds === "number") {
              setPairingCountdown(statusData.pairingCodeRemainingSeconds);
            }
            if (statusData.configuredPhoneNumber) {
              setSenderPhoneNumber(statusData.configuredPhoneNumber.replace(/^51/, ""));
            }
            if (statusData.configuredPushname) {
              setSenderPushname(statusData.configuredPushname);
            }
          }
        } catch {
          // Ignorar pings
        }
      };

      eventSource.onerror = () => {
        setRealtimeActive(false);
      };
    } catch (err) {
      console.warn("No se pudo iniciar el canal SSE de WhatsApp:", err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Tickers regresivos
  useEffect(() => {
    if (whatsappStatus?.status !== "QR_READY") return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 20 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [whatsappStatus?.status, whatsappStatus?.qrCode]);

  useEffect(() => {
    if (!whatsappStatus?.pairingCode) return;
    const timer = setInterval(() => {
      setPairingCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [whatsappStatus?.pairingCode]);

  const cargarWhatsAppStatus = async () => {
    setLoadingWhatsApp(true);
    try {
      const res = await api.getWhatsAppStatus();
      if (res?.whatsapp) {
        setWhatsappStatus(res.whatsapp);
        if (typeof res.whatsapp.qrRemainingSeconds === "number") {
          setCountdown(res.whatsapp.qrRemainingSeconds);
        }
        if (typeof res.whatsapp.pairingCodeRemainingSeconds === "number") {
          setPairingCountdown(res.whatsapp.pairingCodeRemainingSeconds);
        }
        if (res.whatsapp.configuredPhoneNumber) {
          setSenderPhoneNumber(res.whatsapp.configuredPhoneNumber.replace(/^51/, ""));
        }
        if (res.whatsapp.configuredPushname) {
          setSenderPushname(res.whatsapp.configuredPushname);
        }
      }
    } catch (err: any) {
      console.warn("No se pudo cargar estado de WhatsApp:", err?.message);
    } finally {
      setLoadingWhatsApp(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cliData, trxData, notifData, resData] = await Promise.all([
        api.getClientes(),
        api.getTransacciones(),
        api.getNotificacionesAudit(),
        api.getNotificacionesResumen(),
        cargarWhatsAppStatus()
      ]);
      setClientes(cliData.clientes || []);
      setTransacciones(trxData.transacciones || []);
      setNotificaciones(notifData.notificaciones || []);
      setNotifResumen(resData.resumen || null);

      try {
        const [tplRes, smtpRes] = await Promise.all([
          api.getEmailTemplates(),
          api.getSmtpConfig()
        ]);
        if (tplRes?.templates) {
          setEmailTemplates(tplRes.templates);
        }
        if (smtpRes?.config) {
          setSmtpConfig(smtpRes.config);
          setSmtpHost(smtpRes.config.host || "smtp.ethereal.email");
          setSmtpPort(smtpRes.config.port || 587);
          setSmtpUser(smtpRes.config.rawUser || "");
          setSmtpFrom(smtpRes.config.from || '"Estudio Contable Lozano & Asociados" <notificaciones@contatask.pe>');
          setSmtpSecure(smtpRes.config.secure || false);
        }
      } catch (mailErr) {
        console.warn("No se pudo cargar configuración inicial de correos:", mailErr);
      }

      await cargarCorreosRecibidos();
      await cargarBuzonSol();
      await cargarCronograma();
    } catch (err) {
      console.error("Error al cargar datos del contador:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.rol === "CONTADOR") {
      cargarCorreosRecibidos();
    }
  }, [filtroBandejaSoloNoLeidos, filtroBandejaConAdjuntos, busquedaBandeja]);

  useEffect(() => {
    if (user?.rol === "CONTADOR") {
      cargarBuzonSol();
    }
  }, [filtroBuzonClienteId, filtroBuzonEstado]);

  // WhatsApp Handlers
  const handleGuardarConfigNumero = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setConfigSuccessMsg(null);
    try {
      const res = await api.configureWhatsAppAccount({
        phoneNumber: senderPhoneNumber,
        pushname: senderPushname
      });
      if (res?.whatsapp) {
        setWhatsappStatus(res.whatsapp);
      }
      setConfigSuccessMsg("¡Número de teléfono y perfil guardados exitosamente!");
      setTimeout(() => setConfigSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error al guardar configuración: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleGenerarPairingCode = async () => {
    setGeneratingPairingCode(true);
    setTestError(null);
    try {
      const res = await api.requestWhatsAppPairingCode({
        phoneNumber: senderPhoneNumber,
        pushname: senderPushname
      });
      if (res?.whatsapp) {
        setWhatsappStatus(res.whatsapp);
        if (res.whatsapp.pairingCodeRemainingSeconds) {
          setPairingCountdown(res.whatsapp.pairingCodeRemainingSeconds);
        }
      }
    } catch (err: any) {
      alert(`Error al generar código de vinculación: ${err.message}`);
    } finally {
      setGeneratingPairingCode(false);
    }
  };

  const handleCopiarPairingCode = () => {
    if (!whatsappStatus?.pairingCode) return;
    navigator.clipboard.writeText(whatsappStatus.pairingCode);
    setPairingCodeCopied(true);
    setTimeout(() => setPairingCodeCopied(false), 2500);
  };

  const handleConfirmarConNumero = async () => {
    setConfirmingScan(true);
    try {
      const res = await api.confirmScanWhatsApp({
        phoneNumber: senderPhoneNumber,
        pushname: senderPushname
      });
      if (res?.whatsapp) {
        setWhatsappStatus(res.whatsapp);
      }
      setTestResult({
        success: true,
        message: `¡WhatsApp Web vinculado exitosamente con el número +51 ${senderPhoneNumber}!`
      });
      setConfigModalOpen(false);
    } catch (err: any) {
      alert(`Error al vincular: ${err.message}`);
    } finally {
      setConfirmingScan(false);
    }
  };

  const handleIniciarSesionWhatsApp = async () => {
    setInitializingWhatsApp(true);
    setTestResult(null);
    setTestError(null);
    try {
      await api.initializeWhatsApp();
      await cargarWhatsAppStatus();
    } catch (err: any) {
      alert(`Error al inicializar WhatsApp Web: ${err.message}`);
    } finally {
      setInitializingWhatsApp(false);
    }
  };

  const handleConfirmarEscaneo = async () => {
    setConfirmingScan(true);
    try {
      const res = await api.confirmScanWhatsApp({
        phoneNumber: senderPhoneNumber || testPhoneNumber || "51987112233",
        pushname: senderPushname || customPushname || "Estudio Contable Lozano & Asociados"
      });
      if (res?.whatsapp) {
        setWhatsappStatus(res.whatsapp);
      }
      setTestResult({
        success: true,
        message: "¡WhatsApp Web vinculado y listo para el envío directo!"
      });
    } catch (err: any) {
      alert(`Error al vincular: ${err.message}`);
    } finally {
      setConfirmingScan(false);
    }
  };

  const handleDesconectarWhatsApp = async () => {
    if (!confirm("¿Está seguro de cerrar y desconectar la sesión de WhatsApp Web?")) return;
    try {
      await api.disconnectWhatsApp();
      await cargarWhatsAppStatus();
      setTestResult(null);
    } catch (err: any) {
      alert(`Error al desconectar WhatsApp: ${err.message}`);
    }
  };

  const handleEnviarMensajePrueba = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhoneNumber.trim() || !testMessageText.trim()) {
      setTestError("Por favor especifique el número de teléfono y el mensaje.");
      return;
    }
    setSendingTestMessage(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await api.sendWhatsAppTestMessage(testPhoneNumber, testMessageText);
      setTestResult(res);
      await cargarWhatsAppStatus();
      const notifData = await api.getNotificacionesAudit();
      setNotificaciones(notifData.notificaciones || []);
    } catch (err: any) {
      setTestError(err.message || "Error al enviar mensaje directo de WhatsApp.");
    } finally {
      setSendingTestMessage(false);
    }
  };

  // Correos & SMTP Handlers
  const actualizarPrevisualizacion = async (templateId?: string, clienteIdStr?: string, customMsg?: string) => {
    const tid = templateId || selectedTemplateId;
    const cid = clienteIdStr !== undefined ? clienteIdStr : emailSelectedClienteId;
    const cli = clientes.find((c) => c.id === Number(cid));
    const msg = customMsg !== undefined ? customMsg : emailCustomMessage;

    setLoadingPreview(true);
    try {
      const res = await api.previewEmailTemplate({
        templateId: tid,
        clienteId: cli ? cli.id : undefined,
        data: {
          clienteNombre: cli?.contacto_nombre || cli?.razon_social || "Empresa MYPE de Ejemplo S.A.C.",
          ruc: cli?.ruc || "20601234567",
          periodo: "Agosto 2026",
          vencimiento: "18/09/2026",
          pendientes: cli?.pendientes_sustento ?? 3,
          mensajeLibre: msg || "Estimado cliente, le informamos sobre el estado tributario de su empresa ante SUNAT...",
        }
      });
      if (res?.html) {
        setEmailPreviewHtml(res.html);
        if (!emailSubject || tid !== selectedTemplateId) {
          setEmailSubject(res.subject);
        }
      }
    } catch (err) {
      console.warn("Error generando previsualización de correo:", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSeleccionarClienteEmail = (clienteId: string) => {
    setEmailSelectedClienteId(clienteId);
    const cli = clientes.find((c) => c.id === Number(clienteId));
    if (cli) {
      setEmailTo(cli.email);
    }
    actualizarPrevisualizacion(selectedTemplateId, clienteId);
  };

  const handleSeleccionarPlantillaEmail = (templateId: string) => {
    setSelectedTemplateId(templateId);
    actualizarPrevisualizacion(templateId);
  };

  const handleEnviarCorreo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailTo || !emailTo.includes("@")) {
      setEmailErrorMsg("Por favor ingrese un correo electrónico destinatario válido.");
      return;
    }
    setEmailSending(true);
    setEmailSuccessMsg(null);
    setEmailErrorMsg(null);

    const cli = clientes.find((c) => c.id === Number(emailSelectedClienteId));
    try {
      const res = await api.sendEmail({
        to: emailTo,
        subject: emailSubject,
        templateId: selectedTemplateId,
        clienteId: cli ? cli.id : undefined,
        templateData: {
          clienteNombre: cli?.contacto_nombre || cli?.razon_social,
          ruc: cli?.ruc,
          periodo: "Agosto 2026",
          vencimiento: "18/09/2026",
          pendientes: cli?.pendientes_sustento ?? 0,
          mensajeLibre: emailCustomMessage,
        }
      });
      const modoTexto = res.result?.mode === "SIMULADO_LOCAL" ? "Modo Desarrollo Local" : "Servidor SMTP Activo";
      setEmailSuccessMsg(`¡Correo despachado con éxito! Entregado vía ${modoTexto}. ID de mensaje: ${res.result?.messageId || "Generado"}`);
      const notifData = await api.getNotificacionesAudit();
      setNotificaciones(notifData.notificaciones || []);
    } catch (err: any) {
      setEmailErrorMsg(err.message || "Error al enviar el correo electrónico.");
    } finally {
      setEmailSending(false);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await api.testSmtpConnection({
        testEmail: smtpTestEmail || undefined,
        host: smtpHost,
        port: Number(smtpPort),
        user: smtpUser,
        pass: smtpPass,
        secure: smtpSecure
      });
      setSmtpTestResult(`✓ ${res.result?.message || "Conexión SMTP exitosa"}`);
    } catch (err: any) {
      setSmtpTestResult(`✗ Falló la verificación SMTP: ${err.message}`);
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleGuardarSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSaving(true);
    try {
      const res = await api.updateSmtpConfig({
        host: smtpHost,
        port: Number(smtpPort),
        user: smtpUser,
        pass: smtpPass,
        from: smtpFrom,
        secure: smtpSecure
      });
      setSmtpConfig(res.config);
      setSmtpModalOpen(false);
      alert("¡Configuración de servidor SMTP e IMAP guardada exitosamente!");
      cargarCorreosRecibidos();
      handleSincronizarBandeja().catch(() => { });
    } catch (err: any) {
      alert(`Error al guardar configuración SMTP: ${err.message}`);
    } finally {
      setSmtpSaving(false);
    }
  };

  // =========================================================================
  // GESTIÓN DE BANDEJA DE CORREOS RECIBIDOS (IMAP)
  // =========================================================================
  const cargarCorreosRecibidos = async () => {
    try {
      const res = await api.getCorreosRecibidos({
        soloNoLeidos: filtroBandejaSoloNoLeidos,
        conAdjuntos: filtroBandejaConAdjuntos,
        search: busquedaBandeja || undefined
      });
      if (res?.success) {
        setCorreosRecibidos(res.correos || []);
        setCorreosStats(res.stats || null);
        if (res.imapConfig) {
          setImapConfig(res.imapConfig);
        }
      }
    } catch (err: any) {
      console.warn("No se pudieron cargar correos recibidos:", err?.message);
    }
  };

  const handleSincronizarBandeja = async () => {
    setSincronizandoBandeja(true);
    try {
      const res = await api.sincronizarBandeja();
      await cargarCorreosRecibidos();
      return res;
    } catch (err: any) {
      console.error("Error al sincronizar bandeja IMAP:", err);
      throw err;
    } finally {
      setSincronizandoBandeja(false);
    }
  };

  const handleMarcarCorreoLeido = async (id: number, leido = true) => {
    try {
      await api.marcarCorreoLeido(id, leido);
      setCorreosRecibidos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, leido } : c))
      );
      setCorreosStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          noLeidos: leido ? Math.max(0, prev.noLeidos - 1) : prev.noLeidos + 1
        };
      });
      if (correoRecibidoSeleccionado?.id === id) {
        setCorreoRecibidoSeleccionado((prev) => prev ? { ...prev, leido } : null);
      }
    } catch (err) {
      console.error("Error al marcar correo como leído:", err);
    }
  };

  const handleConvertirAdjuntoEnSustento = async (
    correoId: number,
    data: {
      transaccionId: number;
      nombreArchivo: string;
      nombreOriginal: string;
      rutaArchivo?: string;
      mimeType: string;
      tamanoBytes: number;
    }
  ) => {
    try {
      await api.convertirAdjuntoEnSustento(correoId, data);
      await Promise.all([
        cargarCorreosRecibidos(),
        loadAllData()
      ]);
    } catch (err: any) {
      console.error("Error al vincular adjunto como sustento:", err);
      throw err;
    }
  };

  const handleEliminarCorreoRecibido = async (id: number) => {
    try {
      await api.eliminarCorreoRecibido(id);
      setCorreosRecibidos((prev) => prev.filter((c) => c.id !== id));
      if (correoRecibidoSeleccionado?.id === id) {
        setModalDetalleCorreoRecibidoOpen(false);
        setCorreoRecibidoSeleccionado(null);
      }
    } catch (err: any) {
      console.error("Error al eliminar correo:", err);
      throw err;
    }
  };

  const handleSimularCorreoEntrante = async (ruc?: string) => {
    try {
      const cliTarget = ruc ? clientes.find((c) => c.ruc === ruc) : clientes[0];
      await api.simularCorreoRecibido({
        ruc: cliTarget?.ruc || "20512345671",
        remitente: cliTarget ? `${cliTarget.contacto_nombre || "Representante"} (${cliTarget.razon_social})` : "Carlos Mendoza (Textiles Lima S.A.C.)",
        email: cliTarget?.email || "contacto@textileslima.com",
        asunto: `Voucher de pago y comprobante de operaciones [RUC: ${cliTarget?.ruc || "20512345671"}]`,
        cuerpo: `Estimado(a) CPCC. Pedro Lozano,\n\nCumplimos con remitirle en archivo adjunto la constancia de pago y transferencia bancaria solicitada para la conciliación contable del mes.\n\nAtentamente,\n${cliTarget?.razon_social || "Textiles Lima S.A.C."}`,
        adjuntos: [
          {
            nombre_archivo: `voucher_transferencia_${Date.now()}.pdf`,
            nombre_original: "voucher_transferencia_bancaria.pdf",
            mime_type: "application/pdf",
            tamano_bytes: 342000,
            url: "/api/documentos/archivo/voucher_transferencia_bancaria.pdf"
          }
        ]
      });
      await cargarCorreosRecibidos();
    } catch (err: any) {
      console.error("Error al simular correo entrante:", err);
    }
  };

  // Modales Handlers
  const abrirModalSolicitarTrx = (trx: Transaccion) => {
    setTrxParaSolicitar(trx);
    setClienteParaNotificar(null);
    setResultadoEnvio(null);
    setForzarFallo(false);
    setMensajePersonalizado("");
    setSolicitarModalOpen(true);
  };

  const abrirModalNotificarVencimiento = (item: any) => {
    setClienteParaNotificar(item);
    setTrxParaSolicitar(null);
    setResultadoEnvio(null);
    setForzarFallo(false);
    setMensajePersonalizado(
      `Estimado(a) ${item.nombre},\nLe recordamos que el vencimiento de su declaración tributaria ante SUNAT es el ${item.vencimiento}. Cuenta con ${item.pendientes} requerimiento(s) de documento pendiente(s).\nPor favor ingrese a su portal: http://localhost:3000/portal-cliente?ruc=${item.ruc}`
    );
    setSolicitarModalOpen(true);
  };

  const handleEnviarSolicitud = async () => {
    const clienteId = trxParaSolicitar?.cliente_id || clienteParaNotificar?.clienteDbId || 1;
    const transaccionId = trxParaSolicitar?.id;
    setSolicitudEnviando(true);
    try {
      const res = await api.enviarNotificacion({
        clienteId,
        transaccionId,
        canal: canalEnvio,
        forzarFalloWhatsApp: forzarFallo,
        customMensaje: mensajePersonalizado || undefined
      });
      setResultadoEnvio(res.resultado);
      const notifData = await api.getNotificacionesAudit();
      setNotificaciones(notifData.notificaciones || []);
    } catch (err: any) {
      alert(`Error al enviar notificación: ${err.message}`);
    } finally {
      setSolicitudEnviando(false);
    }
  };

  const abrirModalEvaluar = (trx: Transaccion) => {
    setTrxParaEvaluar(trx);
    setAccionEvaluacion("APROBAR");
    setMotivoRechazo("");
    setEvalError(null);
    setEvaluarModalOpen(true);
  };

  const handleConfirmarEvaluacion = async () => {
    if (!trxParaEvaluar) return;
    if (accionEvaluacion === "RECHAZAR" && !motivoRechazo.trim()) {
      setEvalError("Debe detallar el motivo de rechazo de la observación.");
      return;
    }
    setEvaluando(true);
    setEvalError(null);
    try {
      await api.evaluarTransaccion(trxParaEvaluar.id, accionEvaluacion, motivoRechazo);
      setEvaluarModalOpen(false);
      const trxData = await api.getTransacciones();
      setTransacciones(trxData.transacciones || []);
    } catch (err: any) {
      setEvalError(err.message || "Error al evaluar documento");
    } finally {
      setEvaluando(false);
    }
  };

  const abrirVisor = (docId: number, nombre: string) => {
    setDocVisorId(docId);
    setDocVisorNombre(nombre);
    setDocVisorUrl(api.getDocumentoFileUrl(docId, false));
    setVisorModalOpen(true);
  };

  // Acciones de Gestión de Clientes MYPE (Crear, Editar y Unificar SOL)
  const abrirModalNuevoCliente = () => {
    setClienteEnEdicion(null);
    setActiveClienteTab("DATOS");
    setNuevoRuc("");
    setNuevaRazonSocial("");
    setNuevoNombreComercial("");
    setNuevoContactoNombre("");
    setNuevoEmail("");
    setNuevoCelular("");
    setNuevoRegimen("MYPE Tributario");
    setNuevaDireccion("");
    setNuevoUsuarioSol("");
    setNuevaClaveSol("");
    setNuevoSunatClientId("");
    setNuevoSunatClientSecret("");
    setClienteError(null);
    setClienteSuccess(null);
    setClienteModalOpen(true);
  };

  const abrirModalEditarCliente = (cliente: Cliente, tab: "DATOS" | "SUNAT" = "DATOS") => {
    setClienteEnEdicion(cliente);
    setActiveClienteTab(tab);
    setNuevoRuc(cliente.ruc || "");
    setNuevaRazonSocial(cliente.razon_social || "");
    setNuevoNombreComercial(cliente.nombre_comercial || "");
    setNuevoContactoNombre(cliente.contacto_nombre || "");
    setNuevoEmail(cliente.email || "");
    setNuevoCelular(cliente.celular || "");
    setNuevoRegimen(cliente.regimen_tributario || "MYPE Tributario");
    setNuevaDireccion(cliente.direccion || "");
    setNuevoUsuarioSol(cliente.usuario_sol || "");
    setNuevaClaveSol("");
    setNuevoSunatClientId(cliente.sunat_client_id || "");
    setNuevoSunatClientSecret("");
    setClienteError(null);
    setClienteSuccess(null);
    setClienteModalOpen(true);
  };

  const handleGuardarCliente = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nuevoRuc.trim() || !nuevaRazonSocial.trim() || !nuevoEmail.trim() || !nuevoCelular.trim()) {
      setClienteError("RUC, Razón Social, Correo Electrónico y Celular son obligatorios.");
      return;
    }
    if (nuevoRuc.length !== 11) {
      setClienteError("El RUC debe tener exactamente 11 dígitos numéricos.");
      return;
    }

    setCreandoCliente(true);
    setClienteError(null);
    setClienteSuccess(null);

    const payload: Partial<Cliente> = {
      ruc: nuevoRuc.trim(),
      razon_social: nuevaRazonSocial.trim(),
      nombre_comercial: nuevoNombreComercial ? nuevoNombreComercial.trim() : undefined,
      contacto_nombre: nuevoContactoNombre ? nuevoContactoNombre.trim() : undefined,
      email: nuevoEmail.trim().toLowerCase(),
      celular: nuevoCelular.trim(),
      regimen_tributario: nuevoRegimen,
      direccion: nuevaDireccion ? nuevaDireccion.trim() : undefined,
      usuario_sol: nuevoUsuarioSol ? nuevoUsuarioSol.trim().toUpperCase() : undefined,
      clave_sol: nuevaClaveSol ? nuevaClaveSol.trim() : undefined,
      sunat_client_id: nuevoSunatClientId ? nuevoSunatClientId.trim() : undefined,
      sunat_client_secret: nuevoSunatClientSecret ? nuevoSunatClientSecret.trim() : undefined,
    };

    try {
      if (clienteEnEdicion) {
        await api.updateCliente(clienteEnEdicion.id, payload);
        setClienteSuccess("Información de la empresa y credenciales SOL actualizadas exitosamente.");
      } else {
        await api.createCliente(payload);
        setClienteSuccess("Cliente MYPE registrado exitosamente.");
      }

      const [cliData] = await Promise.all([
        api.getClientes(),
        refrescarCronograma()
      ]);
      setClientes(cliData.clientes || []);

      setTimeout(() => {
        setClienteModalOpen(false);
        setClienteSuccess(null);
      }, 1000);
    } catch (err: any) {
      setClienteError(err.message || "Error al procesar la información del cliente");
    } finally {
      setCreandoCliente(false);
    }
  };

  const handleCrearCliente = handleGuardarCliente;

  const handleValidarSunatEnModalCliente = async () => {
    const rucVal = nuevoRuc.trim();
    const usuVal = nuevoUsuarioSol.trim().toUpperCase();
    const claVal = nuevaClaveSol.trim() || (clienteEnEdicion ? clienteEnEdicion.clave_sol : "");

    if (!rucVal || !usuVal) {
      setClienteError("Debe ingresar RUC y Usuario SOL para validar la conexión.");
      return;
    }

    setSunatValidando(true);
    setClienteError(null);
    try {
      let res;
      if (clienteEnEdicion) {
        res = await api.validarSunatConexion(clienteEnEdicion.id, {
          ruc: rucVal,
          usuario_sol: usuVal,
          clave_sol: claVal || undefined
        });
      } else {
        res = await api.generarTokenSunatDirecto({
          ruc: rucVal,
          usuario_sol: usuVal,
          clave_sol: claVal || "moddatos123"
        });
      }
      setSunatResult(res);
      setClienteSuccess(`¡Conexión SOL validada exitosamente! Token generado: ${res.access_token?.slice(0, 16)}...`);
      const cliData = await api.getClientes();
      setClientes(cliData.clientes || []);
    } catch (err: any) {
      setClienteError(`Fallo al validar con SUNAT: ${err.message}`);
    } finally {
      setSunatValidando(false);
    }
  };

  const handleAutologinEnModalCliente = async () => {
    if (!clienteEnEdicion) {
      alert("Guarde primero el cliente para habilitar el autologin en SUNAT SOL.");
      return;
    }
    handleAutologinSunat(clienteEnEdicion);
  };


  const handleToggleClienteEstado = async (id: number, nuevoEstado: boolean) => {
    try {
      await api.updateClienteEstado(id, nuevoEstado);
      const cliData = await api.getClientes();
      setClientes(cliData.clientes || []);
    } catch (err: any) {
      alert(`Error al cambiar estado del cliente: ${err.message}`);
    }
  };

  // Acciones SUNAT Operaciones en Línea (SOL) y Buzón Electrónico
  const cargarBuzonSol = async (clienteIdParam?: number, estadoParam?: string) => {
    setBuzonLoading(true);
    try {
      const cId = clienteIdParam !== undefined ? clienteIdParam : (filtroBuzonClienteId !== "TODOS" ? Number(filtroBuzonClienteId) : undefined);
      const est = estadoParam !== undefined ? estadoParam : filtroBuzonEstado;
      const res = await api.getBuzonSolMensajes({
        clienteId: cId,
        estado: est !== "TODOS" ? est : undefined
      });
      if (res?.mensajes) {
        setBuzonMensajes(res.mensajes);
        setBuzonStats(res.stats || null);
      }
    } catch (err: any) {
      console.warn("No se pudo cargar el Buzón SOL:", err?.message);
    } finally {
      setBuzonLoading(false);
    }
  };

  const abrirDetalleBuzon = async (msg: BuzonSolMensaje) => {
    setBuzonMensajeSeleccionado(msg);
    setModalDetalleBuzonOpen(true);
    if (!msg.detalle) {
      setCargandoDetalleBuzon(true);
      try {
        const enriched = await api.getBuzonSolDetalle(msg.id);
        if (enriched) {
          setBuzonMensajeSeleccionado(enriched);
          setBuzonMensajes(prev => prev.map(m => m.id === msg.id ? enriched : m));
        }
      } catch (err) {
        console.warn("No se pudo cargar detalle extendido de SUNAT:", err);
      } finally {
        setCargandoDetalleBuzon(false);
      }
    }
  };

  const abrirModalSunat = async (cliente: Cliente) => {
    setClienteParaSunat(cliente);
    setUsuarioSol(cliente.usuario_sol || "");
    setClaveSol("");
    setSunatClientId(cliente.sunat_client_id || "");
    setSunatClientSecret("");
    setSunatResult(null);
    setSunatError(null);
    setSunatModalOpen(true);

    try {
      const res = await api.getSunatCredenciales(cliente.id);
      if (res) {
        setUsuarioSol(res.usuario_sol || "");
        setSunatClientId(res.sunat_client_id || "");
      }
    } catch (err) {
      console.warn("No se pudieron cargar credenciales previas:", err);
    }
  };

  const handleGuardarSunatCredenciales = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clienteParaSunat) return;

    setSunatGuardando(true);
    setSunatError(null);
    try {
      await api.guardarSunatCredenciales(clienteParaSunat.id, {
        usuario_sol: usuarioSol,
        clave_sol: claveSol || undefined,
        sunat_client_id: sunatClientId || undefined,
        sunat_client_secret: sunatClientSecret || undefined
      });

      // Recargar clientes para reflejar estado
      const cliData = await api.getClientes();
      setClientes(cliData.clientes || []);

      // Si se especificó clave, validar y generar token automáticamente
      if (claveSol && claveSol.trim().length >= 4) {
        await handleValidarSunatConexion(clienteParaSunat.id);
      }
    } catch (err: any) {
      setSunatError(err.message || "Error al guardar credenciales SOL");
    } finally {
      setSunatGuardando(false);
    }
  };

  const handleValidarSunatConexion = async (clienteId?: number) => {
    const targetCliente = clienteId ? clientes.find(c => c.id === clienteId) || clienteParaSunat : clienteParaSunat;
    if (!targetCliente) return;

    setSunatValidando(true);
    setSunatError(null);
    try {
      const res = await api.validarSunatConexion(targetCliente.id, {
        usuario_sol: usuarioSol || targetCliente.usuario_sol || undefined,
        clave_sol: claveSol || undefined,
        sunat_client_id: sunatClientId || targetCliente.sunat_client_id || undefined,
        sunat_client_secret: sunatClientSecret || undefined
      });

      setSunatResult(res);

      // Recargar directorio de clientes y buzón
      const [cliData] = await Promise.all([
        api.getClientes(),
        cargarBuzonSol(targetCliente.id)
      ]);
      setClientes(cliData.clientes || []);

      return res;
    } catch (err: any) {
      setSunatError(err.message || "Error al validar conexión con SUNAT");
    } finally {
      setSunatValidando(false);
    }
  };

  const handleAutologinSunat = async (cliente: Cliente) => {
    try {
      const url = api.getSunatAutologinLaunchUrl(cliente.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      alert("Error al iniciar autologin SOL: " + (err.message || err));
    }
  };

  const handleSincronizarBuzon = async (clienteIdParam?: number) => {
    const id = clienteIdParam || (filtroBuzonClienteId !== "TODOS" ? Number(filtroBuzonClienteId) : (clienteParaSunat?.id));

    // Si no se especifica un cliente, sincronizar masivamente a TODOS los clientes
    if (!id) {
      return handleSincronizarBuzonTodos();
    }

    setSincronizandoBuzon(true);
    try {
      const res = await api.sincronizarBuzonSol(id);
      if (res?.mensajes) {
        setBuzonMensajes(res.mensajes);
        setBuzonStats(res.stats || null);
        alert(`✅ ${res.message}`);
      }
    } catch (err: any) {
      alert("Error al sincronizar Buzón SOL del cliente: " + (err.message || err));
    } finally {
      setSincronizandoBuzon(false);
    }
  };

  const handleSincronizarBuzonTodos = async () => {
    setSincronizandoBuzon(true);
    try {
      const res = await api.sincronizarBuzonSolTodos();
      if (res?.mensajes) {
        setBuzonMensajes(res.mensajes);
        setBuzonStats(res.stats || null);
        alert(`✅ ${res.message}`);
      }
    } catch (err: any) {
      alert("Error al sincronizar Buzón SOL masivo: " + (err.message || err));
    } finally {
      setSincronizandoBuzon(false);
    }
  };

  const handleMarcarBuzonLeido = async (mensajeId: number) => {
    try {
      const res = await api.marcarBuzonSolLeido(mensajeId);
      if (res?.mensaje) {
        setBuzonMensajes(prev => prev.map(m => m.id === mensajeId ? { ...m, estado: "LEIDO", fecha_lectura: new Date().toISOString() } : m));
        if (buzonStats) {
          setBuzonStats({
            ...buzonStats,
            no_leidos: Math.max(0, buzonStats.no_leidos - 1),
            leidos: buzonStats.leidos + 1
          });
        }
      }
    } catch (err: any) {
      console.error("Error al marcar notificación como leída:", err);
    }
  };

  const renderBadgeEstado = (estado: string) => {
    switch (estado) {
      case "INFORMACION_INCOMPLETA":
        return <Badge variant="destructive">Falta Documento</Badge>;
      case "SUSTENTO_RECIBIDO":
        return <Badge variant="warning">Documento Recibido</Badge>;
      case "VALIDADO":
        return <Badge variant="success">Validado Conforme</Badge>;
      case "RECHAZADO":
        return <Badge variant="destructive">Rechazado (Obs.)</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  // Filtrado de transacciones
  const transaccionesFiltradas = transacciones.filter((trx) => {
    if (selectedClienteId !== "TODOS" && trx.cliente_id !== Number(selectedClienteId)) {
      return false;
    }
    if (selectedEstado !== "TODOS" && trx.estado_sustento !== selectedEstado) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchDoc = trx.numero_comprobante?.toLowerCase().includes(term);
      const matchClient = trx.cliente_razon_social?.toLowerCase().includes(term);
      const matchRuc = trx.cliente_ruc?.includes(term);
      const matchEmisor = trx.emisor_razon_social?.toLowerCase().includes(term);
      if (!matchDoc && !matchClient && !matchRuc && !matchEmisor) {
        return false;
      }
    }
    return true;
  });

  return (
    <ContadorContext.Provider
      value={{
        user,
        loading,
        clientes,
        transacciones,
        notificaciones,
        notifResumen,
        cronogramaSunat,
        cronogramaOficial,
        cronogramaCargando,
        periodoFiscalActivo,
        setPeriodoFiscalActivo,
        refrescarCronograma,
        cambiarPeriodoFiscal,
        sincronizarCronogramaConPortal,
        loadAllData,
        renderBadgeEstado,
        selectedClienteId,
        setSelectedClienteId,
        selectedEstado,
        setSelectedEstado,
        searchTerm,
        setSearchTerm,
        transaccionesFiltradas,
        solicitarModalOpen,
        setSolicitarModalOpen,
        trxParaSolicitar,
        clienteParaNotificar,
        canalEnvio,
        setCanalEnvio,
        forzarFallo,
        setForzarFallo,
        mensajePersonalizado,
        setMensajePersonalizado,
        solicitudEnviando,
        resultadoEnvio,
        abrirModalSolicitarTrx,
        abrirModalNotificarVencimiento,
        handleEnviarSolicitud,
        evaluarModalOpen,
        setEvaluarModalOpen,
        trxParaEvaluar,
        accionEvaluacion,
        setAccionEvaluacion,
        motivoRechazo,
        setMotivoRechazo,
        evaluando,
        evalError,
        abrirModalEvaluar,
        handleConfirmarEvaluacion,
        visorModalOpen,
        setVisorModalOpen,
        docVisorUrl,
        docVisorNombre,
        docVisorId,
        abrirVisor,
        clienteModalOpen,
        setClienteModalOpen,
        clienteEnEdicion,
        setClienteEnEdicion,
        activeClienteTab,
        setActiveClienteTab,
        nuevoRuc,
        setNuevoRuc,
        nuevaRazonSocial,
        setNuevaRazonSocial,
        nuevoNombreComercial,
        setNuevoNombreComercial,
        nuevoContactoNombre,
        setNuevoContactoNombre,
        nuevoEmail,
        setNuevoEmail,
        nuevoCelular,
        setNuevoCelular,
        nuevoRegimen,
        setNuevoRegimen,
        nuevaDireccion,
        setNuevaDireccion,
        nuevoUsuarioSol,
        setNuevoUsuarioSol,
        nuevaClaveSol,
        setNuevaClaveSol,
        nuevoSunatClientId,
        setNuevoSunatClientId,
        nuevoSunatClientSecret,
        setNuevoSunatClientSecret,
        creandoCliente,
        clienteError,
        clienteSuccess,
        abrirModalNuevoCliente,
        abrirModalEditarCliente,
        handleCrearCliente,
        handleGuardarCliente,
        handleValidarSunatEnModalCliente,
        handleAutologinEnModalCliente,
        handleToggleClienteEstado,
        whatsappStatus,
        loadingWhatsApp,
        initializingWhatsApp,
        confirmingScan,
        sendingTestMessage,
        testPhoneNumber,
        setTestPhoneNumber,
        testMessageText,
        setTestMessageText,
        testResult,
        testError,
        customPushname,
        setCustomPushname,
        countdown,
        realtimeActive,
        linkMethod,
        setLinkMethod,
        configModalOpen,
        setConfigModalOpen,
        senderPhoneNumber,
        setSenderPhoneNumber,
        senderPushname,
        setSenderPushname,
        savingConfig,
        configSuccessMsg,
        generatingPairingCode,
        pairingCodeCopied,
        pairingCountdown,
        cargarWhatsAppStatus,
        handleGuardarConfigNumero,
        handleGenerarPairingCode,
        handleCopiarPairingCode,
        handleConfirmarConNumero,
        handleIniciarSesionWhatsApp,
        handleConfirmarEscaneo,
        handleDesconectarWhatsApp,
        handleEnviarMensajePrueba,
        emailTemplates,
        selectedTemplateId,
        setSelectedTemplateId,
        emailTo,
        setEmailTo,
        emailSubject,
        setEmailSubject,
        emailCustomMessage,
        setEmailCustomMessage,
        emailSelectedClienteId,
        setEmailSelectedClienteId,
        emailSending,
        emailSuccessMsg,
        emailErrorMsg,
        emailPreviewHtml,
        loadingPreview,
        actualizarPrevisualizacion,
        handleSeleccionarClienteEmail,
        handleSeleccionarPlantillaEmail,
        handleEnviarCorreo,
        smtpConfig,
        smtpModalOpen,
        setSmtpModalOpen,
        smtpHost,
        setSmtpHost,
        smtpPort,
        setSmtpPort,
        smtpUser,
        setSmtpUser,
        smtpPass,
        setSmtpPass,
        smtpFrom,
        setSmtpFrom,
        smtpSecure,
        setSmtpSecure,
        smtpTesting,
        smtpTestEmail,
        setSmtpTestEmail,
        smtpTestResult,
        smtpSaving,
        handleTestSmtp,
        handleGuardarSmtp,
        detalleCorreoModalOpen,
        setDetalleCorreoModalOpen,
        correoSeleccionado,
        setCorreoSeleccionado,

        // Buzón IMAP
        correosRecibidos,
        correosStats,
        imapConfig,
        sincronizandoBandeja,
        filtroBandejaSoloNoLeidos,
        setFiltroBandejaSoloNoLeidos,
        filtroBandejaConAdjuntos,
        setFiltroBandejaConAdjuntos,
        busquedaBandeja,
        setBusquedaBandeja,
        correoRecibidoSeleccionado,
        setCorreoRecibidoSeleccionado,
        modalDetalleCorreoRecibidoOpen,
        setModalDetalleCorreoRecibidoOpen,
        cargarCorreosRecibidos,
        handleSincronizarBandeja,
        handleMarcarCorreoLeido,
        handleConvertirAdjuntoEnSustento,
        handleEliminarCorreoRecibido,
        handleSimularCorreoEntrante,

        // SUNAT SOL & Buzón SOL
        buzonMensajes,
        buzonStats,
        buzonLoading,
        sincronizandoBuzon,
        filtroBuzonEstado,
        setFiltroBuzonEstado,
        filtroBuzonClienteId,
        setFiltroBuzonClienteId,
        buzonMensajeSeleccionado,
        setBuzonMensajeSeleccionado,
        modalDetalleBuzonOpen,
        setModalDetalleBuzonOpen,
        cargandoDetalleBuzon,
        abrirDetalleBuzon,

        // Modal Configuración Clave SOL & Token
        sunatModalOpen,
        setSunatModalOpen,
        clienteParaSunat,
        setClienteParaSunat,
        usuarioSol,
        setUsuarioSol,
        claveSol,
        setClaveSol,
        sunatClientId,
        setSunatClientId,
        sunatClientSecret,
        setSunatClientSecret,
        sunatValidando,
        sunatGuardando,
        sunatResult,
        sunatError,

        // Acciones SUNAT
        abrirModalSunat,
        handleGuardarSunatCredenciales,
        handleValidarSunatConexion,
        handleAutologinSunat,
        cargarBuzonSol,
        handleSincronizarBuzon,
        handleSincronizarBuzonTodos,
        handleMarcarBuzonLeido
      }}
    >
      {children}
    </ContadorContext.Provider>
  );
}

export function useContador() {
  const context = useContext(ContadorContext);
  if (!context) {
    throw new Error("useContador debe usarse dentro de un ContadorProvider");
  }
  return context;
}
