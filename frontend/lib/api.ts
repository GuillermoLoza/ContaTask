const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: "CONTADOR" | "CLIENTE";
  ruc?: string;
  empresaNombre?: string;
  telefono?: string;
}

export interface Cliente {
  id: number;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  regimen_tributario: string;
  contacto_nombre?: string;
  email: string;
  celular: string;
  direccion?: string;
  activo?: boolean;
  usuario_sol?: string;
  clave_sol?: string;
  tiene_clave_sol?: boolean;
  sunat_client_id?: string;
  sunat_client_secret?: string;
  sunat_estado_conexion?: "NO_CONFIGURADO" | "PENDIENTE_VALIDACION" | "CONECTADO" | "ERROR";
  sunat_token_expires_at?: string;
  sunat_ultimo_acceso?: string;
  sunat_ultimo_error?: string;
  total_transacciones?: number;
  pendientes_sustento?: number;
  validados?: number;
  monto_bancarizacion?: number;
}

export interface Transaccion {
  id: number;
  cliente_id: number;
  periodo: string;
  tipo_operacion: string;
  comprobante_tipo: string;
  numero_comprobante?: string;
  emisor_ruc?: string;
  emisor_razon_social?: string;
  fecha_emision: string;
  moneda: string;
  monto_total: number;
  monto_igv: number;
  requiere_bancarizacion: number;
  estado_sustento: "INFORMACION_INCOMPLETA" | "SUSTENTO_RECIBIDO" | "VALIDADO" | "RECHAZADO";
  observaciones?: string;
  cliente_razon_social?: string;
  cliente_ruc?: string;
  total_documentos?: number;
  ultimo_documento_id?: number;
  ultimo_documento_nombre?: string;
}

export interface DocumentoSustento {
  id: number;
  transaccion_id: number;
  nombre_archivo: string;
  nombre_original: string;
  ruta_archivo: string;
  mime_type: string;
  tamano_bytes: number;
  estado_revision: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  motivo_rechazo?: string;
  fecha_subida: string;
}

export interface Notificacion {
  id: number;
  cliente_id: number;
  transaccion_id?: number;
  canal: "WHATSAPP" | "EMAIL";
  destinatario: string;
  asunto?: string;
  mensaje: string;
  estado: "ENVIADO" | "FALLIDO" | "RESPALDO_ENVIADO";
  error_log?: string;
  fecha_envio: string;
  cliente_razon_social?: string;
}

export interface HistorialAuditoria {
  id: number;
  transaccion_id: number;
  usuario_id: number;
  accion: string;
  estado_anterior?: string;
  estado_nuevo?: string;
  motivo?: string;
  fecha: string;
  usuario_nombre?: string;
}

// Funciones de gestión de token
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("contatask_token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("contatask_token", token);
    localStorage.setItem("contatask_last_activity", Date.now().toString());
  }
}

export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("contatask_token");
    localStorage.removeItem("contatask_user");
    localStorage.removeItem("contatask_last_activity");
  }
}

export function getSavedUser(): Usuario | null {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("contatask_user");
  return user ? JSON.parse(user) : null;
}

export function setSavedUser(user: Usuario) {
  if (typeof window !== "undefined") {
    localStorage.setItem("contatask_user", JSON.stringify(user));
  }
}

export function checkInactivityTimeout(): boolean {
  if (typeof window === "undefined") return false;
  const lastActivity = localStorage.getItem("contatask_last_activity");
  if (!lastActivity) return false;

  const diffMinutes = (Date.now() - parseInt(lastActivity, 10)) / (1000 * 60);
  if (diffMinutes >= 45) {
    clearSession();
    return true; // Expiró
  }

  // Actualizar marca de actividad
  localStorage.setItem("contatask_last_activity", Date.now().toString());
  return false;
}

async function request(endpoint: string, options: RequestInit = {}) {
  // Comprobar inactividad
  if (checkInactivityTimeout()) {
    window.location.href = "/login?expired=true";
    throw new Error("Sesión expirada por inactividad de 45 minutos");
  }

  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      clearSession();
      window.location.href = "/login?unauthorized=true";
    }
    throw new Error(data.error || `Error en la petición HTTP: ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const data = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (data.token && data.usuario) {
      setToken(data.token);
      setSavedUser(data.usuario);
    }
    return data;
  },

  getCurrentUser: () => request("/auth/me"),
  getDemoUsers: () => request("/auth/demo-users"),

  // Clientes
  getClientes: () => request("/clientes"),
  getCliente: (idOrRuc: string | number) => request(`/clientes/${idOrRuc}`),
  createCliente: (clienteData: Partial<Cliente>) =>
    request("/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clienteData),
    }),
  updateCliente: (id: number, clienteData: Partial<Cliente>): Promise<{ success: boolean; message: string; cliente?: Cliente }> =>
    request(`/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clienteData),
    }),
  updateClienteEstado: (id: number, activo: boolean): Promise<{ success: boolean; message: string; cliente?: Cliente }> =>
    request(`/clientes/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
    }),
  deleteCliente: (id: number): Promise<{ success: boolean; message: string }> =>
    request(`/clientes/${id}`, {
      method: "DELETE",
    }),

  // Transacciones
  getTransacciones: (params: Record<string, string | number | boolean> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") query.append(k, String(v));
    });
    return request(`/transacciones?${query.toString()}`);
  },

  getTransaccion: (id: number) => request(`/transacciones/${id}`),

  evaluarTransaccion: (id: number, accion: "APROBAR" | "RECHAZAR", motivo?: string) =>
    request(`/transacciones/${id}/evaluar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, motivo }),
    }),

  // Documentos
  uploadDocumento: async (transaccionId: number, file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("sustento", file);

    const res = await fetch(`${API_BASE_URL}/documentos/upload/${transaccionId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Error al subir el sustento");
    }
    return data;
  },

  getDocumentoFileUrl: (id: number, download = false) => {
    return `${API_BASE_URL}/documentos/${id}/file${download ? "?download=true" : ""}`;
  },

  // Notificaciones
  enviarNotificacion: (payload: {
    clienteId: number;
    transaccionId?: number;
    canal?: "WHATSAPP" | "EMAIL";
    forzarFalloWhatsApp?: boolean;
    customMensaje?: string;
  }) =>
    request("/notificaciones/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getNotificacionesAudit: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") query.append(k, String(v));
    });
    return request(`/notificaciones?${query.toString()}`);
  },

  getNotificacionesResumen: () => request("/notificaciones/resumen"),

  // WhatsApp Web JS & Chat
  getWhatsAppStatus: (): Promise<{ whatsapp: WhatsAppStatus }> => request("/whatsapp/status"),
  initializeWhatsApp: (): Promise<{ message: string; result: { status: string; qrCode: string } }> =>
    request("/whatsapp/initialize", { method: "POST" }),
  confirmScanWhatsApp: (data?: { phoneNumber?: string; pushname?: string }): Promise<{ message: string; whatsapp: WhatsAppStatus }> =>
    request("/whatsapp/confirm-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    }),
  disconnectWhatsApp: (): Promise<{ status: string; message: string }> =>
    request("/whatsapp/disconnect", { method: "POST" }),
  sendWhatsAppTestMessage: (to: string, message: string): Promise<{ message: string; result: any }> =>
    request("/whatsapp/send-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
    }),
  configureWhatsAppAccount: (data: { phoneNumber: string; pushname?: string }): Promise<{ message: string; whatsapp: WhatsAppStatus }> =>
    request("/whatsapp/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  requestWhatsAppPairingCode: (data: { phoneNumber: string; pushname?: string }): Promise<{ message: string; pairingCode: string; phoneNumber: string; expiresInSeconds: number; whatsapp: WhatsAppStatus }> =>
    request("/whatsapp/pairing-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  getWhatsAppStreamUrl: () => `${API_BASE_URL}/whatsapp/stream`,

  // WhatsApp Chat en Tiempo Real
  getWhatsAppConversaciones: (): Promise<{ success: boolean; conversaciones: WhatsAppConversacion[] }> =>
    request("/whatsapp/chat/conversaciones"),
  getWhatsAppMensajes: (phoneNumber: string): Promise<{ success: boolean; mensajes: WhatsAppChatMensaje[] }> =>
    request(`/whatsapp/chat/${encodeURIComponent(phoneNumber)}/mensajes`),
  sendWhatsAppChatMessage: (data: { to: string; message: string; mediaUrl?: string; mediaType?: string; mediaName?: string; clienteId?: number; clienteRuc?: string }): Promise<{ success: boolean; message: string; data: any }> =>
    request("/whatsapp/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  marcarWhatsAppChatLeido: (phoneNumber: string): Promise<{ success: boolean }> =>
    request(`/whatsapp/chat/${encodeURIComponent(phoneNumber)}/read`, {
      method: "PATCH",
    }),
  simularWhatsAppEntrante: (data: { from: string; senderName?: string; text: string; mediaUrl?: string; mediaType?: string; mediaName?: string }): Promise<{ success: boolean; message: string; data: any }> =>
    request("/whatsapp/chat/simulate-incoming", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  // Endpoints para Centro de Correos (Nodemailer / SMTP)
  sendEmail: (data: {
    to?: string;
    subject?: string;
    html?: string;
    text?: string;
    clienteId?: number;
    transaccionId?: number;
    templateId?: string;
    templateData?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; result: any }> =>
    request("/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getEmailTemplates: (): Promise<{ success: boolean; templates: EmailTemplate[] }> =>
    request("/email/templates"),

  previewEmailTemplate: (data: {
    templateId: string;
    data?: Record<string, any>;
    clienteId?: number;
  }): Promise<{ success: boolean; subject: string; html: string; text: string }> =>
    request("/email/templates/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getSmtpConfig: (): Promise<{ success: boolean; config: SmtpConfig }> =>
    request("/email/config"),

  updateSmtpConfig: (data: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
    secure?: boolean;
  }): Promise<{ success: boolean; message: string; config: SmtpConfig }> =>
    request("/email/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  testSmtpConnection: (data: {
    testEmail?: string;
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    secure?: boolean;
  }): Promise<{ success: boolean; result: any }> =>
    request("/email/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getEmailHistory: (clienteId?: number, limit = 50): Promise<{ success: boolean; history: Notificacion[] }> =>
    request(`/email/history?${clienteId ? `clienteId=${clienteId}&` : ""}limit=${limit}`),

  // Endpoints para Recepción de Correos (IMAP / Bandeja de Entrada)
  getCorreosRecibidos: (params: {
    clienteId?: number;
    ruc?: string;
    soloNoLeidos?: boolean;
    conAdjuntos?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    success: boolean;
    correos: CorreoRecibido[];
    stats: CorreoStats;
    imapConfig: ImapConfig;
  }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") query.append(k, String(v));
    });
    return request(`/email/recibidos?${query.toString()}`);
  },

  getCorreoRecibido: (id: number): Promise<{ success: boolean; correo: CorreoRecibido }> =>
    request(`/email/recibidos/${id}`),

  sincronizarBandeja: (data: {
    maxDescargas?: number;
    soloNoLeidos?: boolean;
  } = {}): Promise<{
    success: boolean;
    procesados: number;
    nuevos: number;
    ultimaSincronizacion: string;
    message: string;
  }> =>
    request("/email/sincronizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  testImapConnection: (): Promise<{ success: boolean; message: string; totalMensajes?: number; mensajesNoLeidos?: number }> =>
    request("/email/test-imap", {
      method: "POST",
    }),

  marcarCorreoLeido: (id: number, leido = true): Promise<{ success: boolean; message: string }> =>
    request(`/email/recibidos/${id}/leido`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leido }),
    }),

  convertirAdjuntoEnSustento: (
    correoId: number,
    data: {
      transaccionId: number;
      nombreArchivo: string;
      nombreOriginal: string;
      rutaArchivo?: string;
      mimeType: string;
      tamanoBytes: number;
    }
  ): Promise<{
    success: boolean;
    message: string;
    documentoId: number;
    transaccionId: number;
  }> =>
    request(`/email/recibidos/${correoId}/convertir-sustento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  eliminarCorreoRecibido: (id: number): Promise<{ success: boolean; message: string }> =>
    request(`/email/recibidos/${id}`, {
      method: "DELETE",
    }),

  simularCorreoRecibido: (data: {
    remitente?: string;
    email?: string;
    asunto?: string;
    cuerpo?: string;
    ruc?: string;
    adjuntos?: AdjuntoCorreo[];
  }): Promise<{ success: boolean; message: string; correo: CorreoRecibido }> =>
    request("/email/simular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  // Endpoints para SUNAT Operaciones en Línea (SOL), Token y Buzón
  getSunatCredenciales: (clienteId: number): Promise<SunatCredenciales> =>
    request(`/sunat/credenciales/${clienteId}`),

  guardarSunatCredenciales: (
    clienteId: number,
    data: {
      usuario_sol: string;
      clave_sol?: string;
      sunat_client_id?: string;
      sunat_client_secret?: string;
    }
  ): Promise<{ success: boolean; message: string; cliente: Partial<Cliente> }> =>
    request(`/sunat/credenciales/${clienteId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  validarSunatConexion: (
    clienteId: number,
    data: {
      ruc?: string;
      usuario_sol?: string;
      clave_sol?: string;
      sunat_client_id?: string;
      sunat_client_secret?: string;
    } = {}
  ): Promise<SunatValidacionResult> =>
    request(`/sunat/validar-conexion/${clienteId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  generarTokenSunatDirecto: (data: {
    ruc: string;
    usuario_sol: string;
    clave_sol: string;
    sunat_client_id?: string;
    sunat_client_secret?: string;
  }): Promise<SunatValidacionResult> =>
    request("/sunat/generar-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getSunatAutologin: (clienteId: number): Promise<SunatAutologinPayload> =>
    request(`/sunat/autologin/${clienteId}`),

  getSunatAutologinLaunchUrl: (clienteId: number): string =>
    `${API_BASE_URL}/sunat/autologin/${clienteId}/launch`,

  getBuzonSolMensajes: (params: {
    clienteId?: number;
    ruc?: string;
    estado?: string;
    categoria?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    success: boolean;
    mensajes: BuzonSolMensaje[];
    stats: BuzonSolStats;
    total: number;
  }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") query.append(k, String(v));
    });
    return request(`/sunat/buzon?${query.toString()}`);
  },

  sincronizarBuzonSol: (clienteId: number): Promise<{
    success: boolean;
    message: string;
    notificaciones_nuevas?: number;
    mensajes_nuevos?: number;
    total_notificaciones_sunat?: number;
    total_mensajes_sunat?: number;
    mensajes: BuzonSolMensaje[];
    stats: BuzonSolStats;
    ultima_sincronizacion: string;
  }> =>
    request(`/sunat/buzon/sincronizar/${clienteId}`, {
      method: "POST",
    }),

  sincronizarBuzonSolTodos: (): Promise<{
    success: boolean;
    message: string;
    total_procesados: number;
    total_nuevas_notificaciones?: number;
    total_nuevos_mensajes?: number;
    total_nuevos?: number;
    total_omitidos: number;
    total_errores?: number;
    detalles: Array<{
      clienteId: number;
      ruc: string;
      razon_social: string;
      estado: string;
      notificaciones?: number;
      mensajes?: number;
      nuevos?: number;
      mensaje_error?: string;
    }>;
    mensajes: BuzonSolMensaje[];
    stats: BuzonSolStats;
    ultima_sincronizacion: string;
  }> =>
    request("/sunat/buzon/sincronizar-todos", {
      method: "POST",
    }),

  marcarBuzonSolLeido: (mensajeId: number): Promise<{
    success: boolean;
    message: string;
    mensaje: BuzonSolMensaje;
  }> =>
    request(`/sunat/buzon/${mensajeId}/leido`, {
      method: "PATCH",
    }),

  getBuzonSolDetalle: (mensajeId: number): Promise<BuzonSolMensaje> =>
    request(`/sunat/buzon/${mensajeId}/detalle`),

  getBuzonSolAdjuntoUrl: (mensajeId: number, codArchivo: number | string): string =>
    `${API_BASE_URL}/sunat/buzon/adjunto/${mensajeId}/${codArchivo}`,

  descargarBuzonSolAdjunto: async (mensajeId: number, codArchivo: number | string, nombreArchivo?: string) => {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/sunat/buzon/adjunto/${mensajeId}/${codArchivo}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      throw new Error(`Error descargando archivo oficial de SUNAT (${res.status})`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo || `Constancia_SUNAT_${codArchivo}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Cronograma SUNAT
  getCronogramaOficial: (periodo?: string): Promise<CronogramaOficial> =>
    request(`/sunat/cronograma${periodo ? `?periodo=${periodo}` : ""}`),

  sincronizarCronogramaSunatPortal: (periodo?: string): Promise<{
    success: boolean;
    periodo: string;
    resolucion: string;
    fuente_oficial: string;
    url_oficial: string;
    portal_sunat_activo: boolean;
    sincronizado_at: string;
    cronograma_digitos: CronogramaDigito[];
  }> =>
    request("/sunat/cronograma/sincronizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo }),
    }),

  getCronogramaClientes: (periodo?: string): Promise<CronogramaClientesResult> =>
    request(`/sunat/cronograma/clientes${periodo ? `?periodo=${periodo}` : ""}`),

  getVencimientoRuc: (
    ruc: string,
    periodo?: string,
    buenContribuyente?: boolean
  ): Promise<{
    ruc: string;
    periodo: string;
    vencimiento: string;
    vencimientoFormateado: string;
  }> => {
    const query = new URLSearchParams();
    if (periodo) query.append("periodo", periodo);
    if (buenContribuyente) query.append("buenContribuyente", "true");
    const qStr = query.toString();
    return request(`/sunat/cronograma/ruc/${ruc}${qStr ? `?${qStr}` : ""}`);
  },

  getSirePropuesta: (clienteId: number | string, periodo: string, tipo: "RCE" | "RVIE" = "RCE"): Promise<{ success: boolean; propuesta: SirePropuesta; comprobantes: SireComprobante[]; metricas: SireMetricas }> =>
    request(`/sire/${clienteId}/propuesta?periodo=${periodo}&tipo=${tipo}`),

  extraerSirePropuesta: (clienteId: number | string, periodo: string, tipo: "RCE" | "RVIE" = "RCE"): Promise<{ success: boolean; message: string; propuesta: SirePropuesta }> =>
    request(`/sire/${clienteId}/extraer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo, tipo })
    }),

  excluirSireComprobante: (comprobanteId: number, motivo?: string): Promise<{ success: boolean; comprobante: SireComprobante }> =>
    request(`/sire/comprobantes/${comprobanteId}/excluir`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo })
    }),

  incluirSireComprobante: (comprobanteId: number): Promise<{ success: boolean; comprobante: SireComprobante }> =>
    request(`/sire/comprobantes/${comprobanteId}/incluir`, {
      method: "PATCH"
    }),

  agregarSireComprobanteManual: (clienteId: number | string, periodo: string, data: any): Promise<{ success: boolean; comprobante: SireComprobante }> =>
    request(`/sire/${clienteId}/comprobantes/manual?periodo=${periodo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }),

  consolidarSirePropuesta: (clienteId: number | string, periodo: string, tipo: "RCE" | "RVIE" = "RCE"): Promise<{ success: boolean; propuesta: SirePropuesta }> =>
    request(`/sire/${clienteId}/consolidar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo, tipo })
    }),

  getLiquidacionTributaria: (clienteId: number | string, periodo: string): Promise<{ success: boolean; liquidacion: DeclaracionMensual }> =>
    request(`/sire/${clienteId}/liquidacion?periodo=${periodo}`),

  declararYGenerarNps: (clienteId: number | string, periodo: string): Promise<{ success: boolean; declaracion: DeclaracionMensual }> =>
    request(`/sire/${clienteId}/declarar-nps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo })
    }),

  getDescargaPlanoSireUrl: (clienteId: number | string, periodo: string, tipo: "RCE" | "RVIE" = "RCE"): string =>
    `${API_BASE_URL}/sire/${clienteId}/archivo-plano?periodo=${periodo}&tipo=${tipo}`,

  getPlamePeriodo: (clienteId: number | string, periodo: string): Promise<{ success: boolean; periodo: PlamePeriodo; trabajadores: PlameTrabajador[]; metricas: any }> =>
    request(`/plame/${clienteId}/periodo?periodo=${periodo}`),

  guardarPlameTrabajador: (clienteId: number | string, periodo: string, data: Partial<PlameTrabajador>): Promise<{ success: boolean; periodo: PlamePeriodo; trabajadores: PlameTrabajador[] }> =>
    request(`/plame/${clienteId}/trabajadores?periodo=${periodo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }),

  eliminarPlameTrabajador: (trabajadorId: number): Promise<{ success: boolean }> =>
    request(`/plame/trabajadores/${trabajadorId}`, {
      method: "DELETE"
    }),

  validarPlame: (clienteId: number | string, periodo: string): Promise<{ success: boolean; esValido: boolean; errores?: any[]; totalErrores?: number; mensaje?: string }> =>
    request(`/plame/${clienteId}/validar?periodo=${periodo}`),

  generarArchivosPlame: (clienteId: number | string, periodo: string): Promise<{ success: boolean; archivos: Array<{ nombre: string; contenido: string; descripcion: string }> }> =>
    request(`/plame/${clienteId}/generar-archivos?periodo=${periodo}`, {
      method: "POST"
    }),

  declararPlame: (clienteId: number | string, periodo: string): Promise<{ success: boolean; mensaje: string; nps: string }> =>
    request(`/plame/${clienteId}/declarar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo })
    }),
};

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  defaultSubject: string;
  variables: string[];
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  rawUser: string;
  from: string;
  isConfigured: boolean;
  mode: "SIMULADO_LOCAL" | "SMTP_ACTIVO";
}

export interface WhatsAppStatus {
  status: "DISCONNECTED" | "INITIALIZING" | "QR_READY" | "CONNECTED" | "ERROR";
  isConnected: boolean;
  qrCode: string | null;
  qrCreatedAt?: number;
  qrExpiresInSeconds?: number;
  qrRemainingSeconds?: number;
  pairingCode?: string | null;
  pairingCodeRemainingSeconds?: number;
  pairingCodeExpiresInSeconds?: number;
  pairingCodePhoneNumber?: string | null;
  configuredPhoneNumber?: string;
  configuredPushname?: string;
  connectedUser: {
    phoneNumber: string;
    formattedNumber: string;
    pushname: string;
    platform: string;
    batteryLevel?: number;
    connectedAt: string;
  } | null;
  sessionStartTime: string | null;
  messagesSentCount: number;
  lastMessage: {
    id: string;
    to: string;
    message: string;
    sentAt: string;
    status: string;
  } | null;
}

export interface WhatsAppChatMensaje {
  id: number;
  message_id: string;
  phone_number: string;
  contact_name: string | null;
  cliente_id: number | null;
  cliente_ruc: string | null;
  from_me: number; // 1 = sent, 0 = received
  message_text: string;
  media_url?: string | null;
  media_type?: string | null;
  media_name?: string | null;
  status: string;
  is_read: number;
  timestamp: string;
}

export interface WhatsAppConversacion {
  phone_number: string;
  contact_name: string | null;
  cliente_id: number | null;
  cliente_ruc: string | null;
  cliente_razon_social: string | null;
  last_message: string;
  last_timestamp: string;
  unread_count: number;
  last_from_me: number;
}

export interface AdjuntoCorreo {
  nombre_archivo: string;
  nombre_original: string;
  mime_type: string;
  tamano_bytes: number;
  ruta_archivo?: string;
  url: string;
}

export interface CorreoRecibido {
  id: number;
  message_id?: string;
  uid?: string;
  remitente: string;
  remitente_email: string;
  destinatario?: string;
  asunto: string;
  fecha: string | number;
  cuerpo_texto: string;
  cuerpo_html?: string | null;
  leido: boolean | number;
  cliente_id?: number | null;
  cliente_ruc?: string | null;
  cliente_razon_social?: string | null;
  cliente_ruc_relacionado?: string | null;
  transaccion_id?: number | null;
  transaccion_comprobante?: string | null;
  tiene_adjuntos: boolean | number;
  adjuntos?: AdjuntoCorreo[];
  procesado_como_sustento: boolean | number;
  created_at?: string;
}

export interface CorreoStats {
  total: number;
  noLeidos: number;
  conAdjuntos: number;
  procesados: number;
}

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  hasPassword: boolean;
  isConfigured: boolean;
  ultimaSincronizacion: string | null;
  sincronizando: boolean;
  ultimoError: string | null;
}

export interface SunatCredenciales {
  clienteId: number;
  ruc: string;
  razon_social: string;
  usuario_sol: string;
  tiene_clave_sol: boolean;
  sunat_client_id?: string;
  sunat_estado_conexion: "NO_CONFIGURADO" | "PENDIENTE_VALIDACION" | "CONECTADO" | "ERROR";
  sunat_token_expires_at?: string;
  sunat_ultimo_acceso?: string;
  sunat_ultimo_error?: string;
  tiene_token: boolean;
}

export interface SunatValidacionResult {
  success: boolean;
  valido: boolean;
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: string;
  modo: string;
  mensaje: string;
  contribuyente: {
    ruc: string;
    razon_social: string;
    usuario_sol: string;
    estado: string;
    condicion: string;
    regimen_tributario: string;
    domicilio_fiscal: string;
  };
}

export interface SunatAutologinPayload {
  cliente: {
    id: number;
    ruc: string;
    razon_social: string;
    usuario_sol: string;
    clave_sol: string;
    tiene_token: boolean;
    token_expires_at?: string;
  };
  sunatPortalUrl: string;
  sunatLoginUrl: string;
  autoSubmitHtml: string;
}

export interface BuzonSolMensaje {
  id: number;
  cliente_id: number;
  cliente_ruc: string;
  cliente_razon_social?: string;
  cliente_email?: string;
  cliente_celular?: string;
  numero_notificacion: string;
  categoria_buzon?: "NOTIFICACION" | "MENSAJE" | string;
  tipo_documento: "CARTA_INDUCTIVA" | "ESQUELA_CITACION" | "ORDEN_PAGO" | "RESOLUCION_COACTIVA" | "AVISO_VENCIMIENTO" | "REPORTE_SIRE" | "REPORTE_COMPROBANTES" | "COMUNICACION_INFORMATIVA" | "NOTIFICACION_OFICIAL" | string;
  asunto: string;
  mensaje: string;
  fecha_deposito: string;
  fecha_lectura?: string;
  estado: "NO_LEIDO" | "LEIDO" | "URGENTE" | "ATENDIDO";
  plazo_dias?: number;
  fecha_vencimiento_plazo?: string;
  adjunto_nombre?: string;
  requiere_respuesta: boolean | number;
  detalle_json?: string;
  detalle?: {
    origen: string;
    datos_documento?: Record<string, any> | null;
    adjuntos?: Array<{
      codArchivo: number | null;
      nombre: string;
      tamano?: string;
      tipo: string;
    }>;
    nombUsuario?: string;
    fecLectura?: string;
    emisor?: string;
    dependencia?: string;
    fechaConsulta?: string;
    resumen?: string;
    texto_html?: string;
    cuerpo_legible?: string;
  };
  created_at: string;
}

export interface BuzonSolStats {
  total: number;
  no_leidos: number;
  urgentes: number;
  leidos: number;
  requieren_respuesta: number;
  total_notificaciones?: number;
  total_mensajes?: number;
}

export interface CronogramaDigito {
  digito_grupo: string;
  digito_label: string;
  fecha_vencimiento: string;
}

export interface CronogramaOficial {
  periodo: string;
  year: number;
  month: number;
  resolucion_sunat: string;
  url_oficial?: string;
  sincronizado_at?: string;
  mes_nombre: string;
  mes_vencimiento_nombre: string;
  year_vencimiento: number;
  cronograma_digitos: CronogramaDigito[];
}

export interface CronogramaClienteItem {
  id: number;
  clienteDbId: number;
  nombre: string;
  nombreComercial?: string;
  ruc: string;
  ultimoDigito: string;
  vencimiento: string;
  vencimientoFormateado: string;
  diasRestantes: number;
  pendientes: number;
  estadoColor: "green" | "orange" | "red" | string;
  estadoTexto: string;
  email: string;
  celular: string;
  regimen_tributario?: string;
}

export interface CronogramaClientesResult {
  success: boolean;
  periodo: string;
  cronoOficial: CronogramaOficial;
  items: CronogramaClienteItem[];
  totalEmpresas: number;
  empresasAlDia: number;
  empresasPendientes: number;
  empresasUrgentes: number;
  sincronizado_at: string;
}

// Interfaces de SIRE (Sistema Integrado de Registros Electrónicos)
export interface SirePropuesta {
  id: number;
  cliente_id: number;
  cliente_ruc: string;
  periodo: string;
  tipo_registro: "RVIE" | "RCE";
  estado: "PROPUESTA_SUNAT" | "PRELIMINAR" | "FINAL_ACEPTADA" | "REEMPLAZADA";
  total_comprobantes: number;
  base_imponible: number;
  igv: number;
  total: number;
  ticket_sunat?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SireComprobante {
  id: number;
  sire_propuesta_id?: number;
  cliente_id: number;
  periodo: string;
  tipo_registro: "RVIE" | "RCE";
  tipo_comprobante: string;
  serie: string;
  numero: string;
  emisor_ruc: string;
  emisor_razon_social: string;
  fecha_emision: string;
  fecha_vcto?: string;
  moneda: string;
  tipo_cambio: number;
  base_imponible: number;
  igv: number;
  monto_total: number;
  estado_cruce: "COINCIDE" | "SOLO_EN_SUNAT" | "SOLO_EN_SISTEMA" | "DISCREPANCIA_MONTO" | "EXCLUIDO";
  transaccion_id?: number | null;
  motivo_exclusion?: string | null;
  es_manual: boolean;
  created_at?: string;
}

export interface SireMetricas {
  total: number;
  coincidentes: number;
  soloSunat: number;
  soloSistema: number;
  excluidos: number;
  baseAceptada: number;
  igvAceptado: number;
  porcentajeCoincidencia: number;
}

export interface DeclaracionMensual {
  id: number;
  cliente_id: number;
  cliente_ruc: string;
  periodo: string;
  regimen_tributario: string;
  ventas_base: number;
  ventas_igv: number;
  compras_base: number;
  compras_igv: number;
  igv_determinado: number;
  coeficiente_renta: number;
  renta_determinada: number;
  total_tributo_pagar: number;
  calculo_sunat_igv?: number;
  calculo_sunat_renta?: number;
  estado_coincidencia: "COINCIDE" | "DISCREPANCIA" | "PENDIENTE_CALCULO";
  estado_declaracion: "CALCULADO" | "DECLARADO" | "CON_NPS" | "PAGADO";
  numero_orden_dj?: string;
  nps?: string;
  fecha_limite_pago?: string;
  constancia_url?: string;
  notificado_cliente: boolean;
  created_at?: string;
  updated_at?: string;
}

// Interfaces de PLAME (Planilla Mensual de Pagos)
export interface PlameTrabajador {
  id?: number;
  plame_periodo_id?: number;
  cliente_id?: number;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  fecha_ingreso?: string;
  dias_laborados: number;
  horas_ordinarias: number;
  sueldo_base: number;
  asignacion_familiar: number;
  horas_extras: number;
  total_remuneracion_bruta: number;
  regimen_pensionario: "ONP" | "INTEGRA" | "PRIMA" | "PROFUTURO" | "HABITAT" | string;
  descuento_pension: number;
  retencion_renta_5ta: number;
  neto_pagar: number;
  aporte_essalud: number;
  es_valido?: boolean;
  error_validacion?: string | null;
  tieneHijos?: boolean;
}

export interface PlamePeriodo {
  id: number;
  cliente_id: number;
  cliente_ruc: string;
  periodo: string;
  total_trabajadores: number;
  total_remuneracion: number;
  total_essalud: number;
  total_onp: number;
  total_afp: number;
  total_renta_5ta: number;
  total_renta_4ta: number;
  estado: "BORRADOR" | "VALIDADO" | "ARCHIVOS_GENERADOS" | "DECLARADO";
  nps_plame?: string;
  archivo_rem_url?: string;
  archivo_jor_url?: string;
  archivo_snl_url?: string;
  created_at?: string;
  updated_at?: string;
}


