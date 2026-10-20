"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  CheckCheck,
  Send,
  Wifi,
  WifiOff,
  Settings,
  ShieldCheck,
  LogOut,
  Info,
  Search,
  Plus,
  Paperclip,
  Phone,
  User,
  Building2,
  Sparkles,
  Clock,
  ChevronDown,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  Download,
  Filter,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContador } from "@/context/ContadorContext";
import {
  api,
  WhatsAppChatMensaje,
  WhatsAppConversacion,
  Cliente
} from "@/lib/api";

export default function ContadorWhatsAppPage() {
  const {
    clientes,
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
    countdown,
    realtimeActive,
    linkMethod,
    setLinkMethod,
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
    handleEnviarMensajePrueba
  } = useContador();

  // Vista principal: "chat" o "pairing"
  const [activeTab, setActiveTab] = useState<"chat" | "pairing">("chat");

  // Estado del Chat
  const [conversaciones, setConversaciones] = useState<WhatsAppConversacion[]>([]);
  const [loadingConversaciones, setLoadingConversaciones] = useState(false);
  const [chatActivo, setChatActivo] = useState<WhatsAppConversacion | null>(null);
  const [mensajes, setMensajes] = useState<WhatsAppChatMensaje[]>([]);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [inputMensaje, setInputMensaje] = useState("");
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  // Filtros y búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "no_leidos" | "clientes">("todos");

  // Modal para iniciar nuevo chat
  const [modalNuevoChat, setModalNuevoChat] = useState(false);
  const [nuevoChatTelefono, setNuevoChatTelefono] = useState("");
  const [nuevoChatNombre, setNuevoChatNombre] = useState("");
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number | null>(null);

  // Simulación rápida de cliente
  const [simulandoRespuesta, setSimulandoRespuesta] = useState(false);
  const [simularTexto, setSimularTexto] = useState("");
  const [modalSimular, setModalSimular] = useState(false);

  // Scroll automático
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end"
    });
  };

  // Sonido sutil de notificación web
  const playNotificationSound = () => {
    try {
      if (typeof window === "undefined") return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext bloqueado o no disponible
    }
  };

  // Cargar lista de conversaciones
  const fetchConversaciones = async () => {
    setLoadingConversaciones(true);
    try {
      const res = await api.getWhatsAppConversaciones();
      if (res.success && Array.isArray(res.conversaciones)) {
        setConversaciones(res.conversaciones);
        // Si no hay chat seleccionado y hay conversaciones, seleccionar la primera
        if (!chatActivo && res.conversaciones.length > 0) {
          seleccionarChat(res.conversaciones[0]);
        }
      }
    } catch (err) {
      console.warn("Error al cargar conversaciones de WhatsApp:", err);
    } finally {
      setLoadingConversaciones(false);
    }
  };

  // Cargar mensajes de un chat
  const cargarMensajesChat = async (phone: string) => {
    setLoadingMensajes(true);
    try {
      const res = await api.getWhatsAppMensajes(phone);
      if (res.success && Array.isArray(res.mensajes)) {
        setMensajes(res.mensajes);
        setTimeout(() => scrollToBottom(false), 80);
      }
      // Marcar como leído
      await api.marcarWhatsAppChatLeido(phone).catch(() => {});
      // Actualizar contador en local
      setConversaciones((prev) =>
        prev.map((c) => (c.phone_number === phone ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.warn("Error al cargar mensajes:", err);
    } finally {
      setLoadingMensajes(false);
    }
  };

  // Seleccionar conversación
  const seleccionarChat = (conv: WhatsAppConversacion) => {
    setChatActivo(conv);
    cargarMensajesChat(conv.phone_number);
  };

  // Carga inicial
  useEffect(() => {
    fetchConversaciones();
  }, []);

  // Escuchar mensajes entrantes en tiempo real por SSE
  useEffect(() => {
    const handleNewMessage = (e: Event) => {
      const customEvent = e as CustomEvent<WhatsAppChatMensaje>;
      const msg = customEvent.detail;
      if (!msg) return;

      playNotificationSound();

      // Si el mensaje pertenece al chat actualmente abierto
      if (chatActivo && (msg.phone_number === chatActivo.phone_number || msg.phone_number.includes(chatActivo.phone_number) || chatActivo.phone_number.includes(msg.phone_number))) {
        setMensajes((prev) => {
          // Evitar duplicados por id o message_id
          if (prev.some((m) => m.id === msg.id || (m.message_id && m.message_id === msg.message_id))) {
            return prev;
          }
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(true), 60);

        // Si fue un mensaje recibido, marcarlo leído
        if (!msg.from_me) {
          api.marcarWhatsAppChatLeido(msg.phone_number).catch(() => {});
        }
      }

      // Actualizar la lista de conversaciones
      setConversaciones((prev) => {
        const index = prev.findIndex(
          (c) => c.phone_number === msg.phone_number || c.phone_number.includes(msg.phone_number) || msg.phone_number.includes(c.phone_number)
        );

        if (index >= 0) {
          const updated = [...prev];
          const existing = updated[index];
          const isCurrentChat = chatActivo && (chatActivo.phone_number === existing.phone_number);
          updated[index] = {
            ...existing,
            last_message: msg.message_text,
            last_timestamp: msg.timestamp,
            last_from_me: msg.from_me,
            unread_count: isCurrentChat ? 0 : (!msg.from_me ? existing.unread_count + 1 : existing.unread_count)
          };
          // Mover al inicio de la lista
          const item = updated.splice(index, 1)[0];
          return [item, ...updated];
        } else {
          // Nueva conversación recibida
          const newConv: WhatsAppConversacion = {
            phone_number: msg.phone_number,
            contact_name: msg.contact_name || `+${msg.phone_number}`,
            cliente_id: msg.cliente_id,
            cliente_ruc: msg.cliente_ruc,
            cliente_razon_social: msg.contact_name,
            last_message: msg.message_text,
            last_timestamp: msg.timestamp,
            unread_count: msg.from_me ? 0 : 1,
            last_from_me: msg.from_me
          };
          return [newConv, ...prev];
        }
      });
    };

    window.addEventListener("whatsapp:new_message", handleNewMessage);
    return () => {
      window.removeEventListener("whatsapp:new_message", handleNewMessage);
    };
  }, [chatActivo]);

  // Enviar mensaje en el chat
  const handleEnviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMensaje.trim() || !chatActivo || enviandoMensaje) return;

    const texto = inputMensaje.trim();
    setInputMensaje("");
    setEnviandoMensaje(true);

    try {
      const res = await api.sendWhatsAppChatMessage({
        to: chatActivo.phone_number,
        message: texto,
        clienteId: chatActivo.cliente_id || undefined,
        clienteRuc: chatActivo.cliente_ruc || undefined
      });

      if (res.success && res.data) {
        // Agregar optimistamente o confirmar
        setMensajes((prev) => {
          if (prev.some((m) => m.id === res.data.id || m.message_id === res.data.message_id)) {
            return prev;
          }
          return [...prev, res.data];
        });
        setTimeout(() => scrollToBottom(true), 60);

        // Actualizar conversación
        setConversaciones((prev) => {
          const index = prev.findIndex((c) => c.phone_number === chatActivo.phone_number);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              last_message: texto,
              last_timestamp: res.data.timestamp || new Date().toISOString(),
              last_from_me: 1
            };
            const item = updated.splice(index, 1)[0];
            return [item, ...updated];
          }
          return prev;
        });
      }
    } catch (err: any) {
      console.error("Error al enviar mensaje:", err);
      // Restaurar el mensaje en el input si falló
      setInputMensaje(texto);
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // Iniciar nuevo chat desde el modal
  const handleCrearNuevoChat = () => {
    if (!nuevoChatTelefono.trim()) return;

    let cleanPhone = nuevoChatTelefono.replace(/\D/g, "");
    if (cleanPhone.length === 9) cleanPhone = `51${cleanPhone}`;

    const clienteAsoc = clientes.find((c) => c.id === clienteSeleccionadoId);

    const nuevaConv: WhatsAppConversacion = {
      phone_number: cleanPhone,
      contact_name: nuevoChatNombre.trim() || clienteAsoc?.razon_social || `+${cleanPhone}`,
      cliente_id: clienteAsoc?.id || null,
      cliente_ruc: clienteAsoc?.ruc || null,
      cliente_razon_social: clienteAsoc?.razon_social || null,
      last_message: "Conversación iniciada",
      last_timestamp: new Date().toISOString(),
      unread_count: 0,
      last_from_me: 1
    };

    setConversaciones((prev) => [
      nuevaConv,
      ...prev.filter((c) => c.phone_number !== cleanPhone)
    ]);
    seleccionarChat(nuevaConv);
    setModalNuevoChat(false);
    setNuevoChatTelefono("");
    setNuevoChatNombre("");
    setClienteSeleccionadoId(null);
  };

  // Simular respuesta de cliente para pruebas interactivas
  const handleSimularEntrante = async (textoPersonalizado?: string) => {
    if (!chatActivo) return;
    setSimulandoRespuesta(true);

    const texto = textoPersonalizado || simularTexto || "Hola estimado contador, recibí su notificación. Le adjunto los comprobantes en un momento.";

    try {
      await api.simularWhatsAppEntrante({
        from: chatActivo.phone_number,
        senderName: chatActivo.contact_name || chatActivo.cliente_razon_social || "Cliente Contable",
        text: texto
      });
      setModalSimular(false);
      setSimularTexto("");
    } catch (err) {
      console.error("Error al simular mensaje:", err);
    } finally {
      setSimulandoRespuesta(false);
    }
  };

  // Plantillas contables de SUNAT
  const plantillasContables = [
    {
      titulo: "📅 Cronograma SUNAT",
      icono: Calendar,
      mensaje: `Estimado(a) contribuyente, le recordamos que de acuerdo al último dígito de su RUC (${chatActivo?.cliente_ruc?.slice(-1) || "X"}), el cronograma de vencimiento de su declaración de este periodo está próximo a vencer. Por favor enviar sus compras y ventas a tiempo.`
    },
    {
      titulo: "🧾 Solicitud de Facturas",
      icono: FileText,
      mensaje: `Buenas tardes. Le saludamos del Estudio Contable. Por favor requerimos que nos comparta sus facturas de compras y gastos de este mes en PDF/XML para realizar la liquidación de impuestos.`
    },
    {
      titulo: "💵 Liquidación de Tributos",
      icono: DollarSign,
      mensaje: `Estimado cliente, su declaración mensual ha sido liquidada conforme al e-Menú SUNAT. Su importe a pagar en la Boleta de Pago Virtual (IGV/Renta) ha sido generado. Puede solicitar su número de pago NPA o coordinar el abono.`
    },
    {
      titulo: "📢 Notificación Buzón SOL",
      icono: AlertCircle,
      mensaje: `Alerta: Hemos detectado una nueva notificación administrativa en su Buzón Electrónico SOL de SUNAT. Le recomendamos revisarla con urgencia o autorizar nuestra atención técnica inmediata.`
    }
  ];

  // Aplicar plantilla rápida
  const aplicarPlantilla = (texto: string) => {
    setInputMensaje(texto);
  };

  // Formato de hora legible
  const formatHora = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Formato relativo de fecha
  const formatFechaRelativa = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const hoy = new Date();
      if (d.toDateString() === hoy.toDateString()) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      if (d.toDateString() === ayer.toDateString()) {
        return "Ayer";
      }
      return d.toLocaleDateString([], { day: "2-digit", month: "short" });
    } catch {
      return "";
    }
  };

  // Conversaciones filtradas
  const conversacionesFiltradas = useMemo(() => {
    return conversaciones.filter((conv) => {
      // Filtro de texto
      const q = busqueda.toLowerCase().trim();
      const matchTexto =
        !q ||
        conv.phone_number.includes(q) ||
        (conv.contact_name && conv.contact_name.toLowerCase().includes(q)) ||
        (conv.cliente_razon_social && conv.cliente_razon_social.toLowerCase().includes(q)) ||
        (conv.cliente_ruc && conv.cliente_ruc.includes(q)) ||
        (conv.last_message && conv.last_message.toLowerCase().includes(q));

      if (!matchTexto) return false;

      // Filtro de tipo
      if (filtroTipo === "no_leidos") return conv.unread_count > 0;
      if (filtroTipo === "clientes") return Boolean(conv.cliente_ruc || conv.cliente_id);

      return true;
    });
  }, [conversaciones, busqueda, filtroTipo]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* 1. TOP HEADER & BARRA DE ESTADO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
              whatsappStatus?.isConnected
                ? "bg-emerald-500/10 text-emerald-600 ring-4 ring-emerald-500/10"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 ring-4 ring-slate-500/10"
            }`}
          >
            {whatsappStatus?.isConnected ? (
              <MessageSquare className="h-6 w-6 stroke-[2]" />
            ) : (
              <WifiOff className="h-6 w-6 stroke-[2]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                WhatsApp Web Contable en Tiempo Real
              </h2>
              <Badge
                variant={whatsappStatus?.isConnected ? "success" : "secondary"}
                className="text-[11px] font-semibold"
              >
                {whatsappStatus?.isConnected ? "En Línea" : "Modo Offline / Resiliente"}
              </Badge>
              {realtimeActive && (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                  SSE Activo
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {whatsappStatus?.isConnected
                ? `Conectado como +51 ${whatsappStatus.connectedUser?.phoneNumber || senderPhoneNumber} (${whatsappStatus.connectedUser?.pushname || senderPushname || "Estudio Contable"})`
                : "Comuníquese en vivo con sus clientes tributarios por WhatsApp con almacenamiento y trazabilidad"}
            </p>
          </div>
        </div>

        {/* Acciones principales y switch de pestañas */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Selector de Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "chat"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat en Vivo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pairing")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "pairing"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              Vincular Dispositivo (QR)
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              cargarWhatsAppStatus();
              fetchConversaciones();
            }}
            disabled={loadingWhatsApp || loadingConversaciones}
            className="text-xs gap-1.5 h-9 bg-white dark:bg-slate-900 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingWhatsApp || loadingConversaciones ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          {whatsappStatus?.isConnected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDesconectarWhatsApp}
              className="text-xs gap-1.5 h-9 cursor-pointer"
              title="Cerrar sesión de WhatsApp"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Desconectar</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. TAB: CHAT EN VIVO DE WHATSAPP WEB */}
      {activeTab === "chat" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-210px)] min-h-[640px]">
          
          {/* PANEL IZQUIERDO: LISTA DE CHATS (4 COLS) */}
          <div className="lg:col-span-4 border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/60">
            {/* Header del panel de chats */}
            <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Conversaciones
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {conversaciones.length}
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalNuevoChat(true)}
                  className="text-xs h-8 gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo Chat
                </Button>
              </div>
            </div>

            {/* Buscador de contactos */}
            <div className="p-2.5 border-b border-slate-200/70 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar por cliente, RUC o número..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="text-xs pl-8 h-8 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filtros rápidos en pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFiltroTipo("todos")}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    filtroTipo === "todos"
                      ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo("no_leidos")}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    filtroTipo === "no_leidos"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  No leídos
                  {conversaciones.some((c) => c.unread_count > 0) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo("clientes")}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    filtroTipo === "clientes"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  Con RUC SUNAT
                </button>
              </div>
            </div>

            {/* Lista scrollable de conversaciones */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {loadingConversaciones ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs text-slate-500">Cargando chats de WhatsApp...</p>
                </div>
              ) : conversacionesFiltradas.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {busqueda ? "No se encontraron contactos" : "Sin conversaciones aún"}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
                    Haga clic en "+ Nuevo Chat" para abrir una conversación con un cliente.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModalNuevoChat(true)}
                    className="text-xs text-emerald-600 border-emerald-300"
                  >
                    Iniciar Primer Chat
                  </Button>
                </div>
              ) : (
                conversacionesFiltradas.map((conv) => {
                  const isSelected = chatActivo?.phone_number === conv.phone_number;
                  const displayName = conv.contact_name || conv.cliente_razon_social || `+${conv.phone_number}`;

                  return (
                    <div
                      key={conv.phone_number}
                      onClick={() => seleccionarChat(conv)}
                      className={`p-3 transition-colors cursor-pointer flex items-center gap-3 relative ${
                        isSelected
                          ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-emerald-600"
                          : "hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          {displayName.slice(0, 2).toUpperCase()}
                        </div>
                        {conv.cliente_ruc && (
                          <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[9px] rounded-full p-0.5 shadow-xs" title="Cliente con RUC SUNAT">
                            <Building2 className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Info del chat */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {displayName}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {formatFechaRelativa(conv.last_timestamp)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          {conv.cliente_ruc && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-300 text-blue-600 bg-blue-50/50 dark:bg-blue-950/40 font-mono">
                              RUC: {conv.cliente_ruc}
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono truncate">
                            +{conv.phone_number}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            {conv.last_from_me === 1 && (
                              <CheckCheck className="h-3 w-3 text-sky-500 shrink-0" />
                            )}
                            <span className="truncate">{conv.last_message || "Sin mensajes"}</span>
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="h-4 min-w-[16px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PANEL DERECHO: CONVERSACIÓN ACTIVA (8 COLS) */}
          <div className="lg:col-span-8 flex flex-col h-full bg-slate-100/60 dark:bg-slate-950/70 relative">
            {chatActivo ? (
              <>
                {/* 1. HEADER DEL CHAT ACTIVO */}
                <div className="p-3 px-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {(chatActivo.contact_name || chatActivo.cliente_razon_social || chatActivo.phone_number)
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {chatActivo.contact_name || chatActivo.cliente_razon_social || `+${chatActivo.phone_number}`}
                        </h3>
                        {chatActivo.cliente_ruc && (
                          <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 bg-blue-50/50 dark:bg-blue-950/40 font-mono">
                            RUC: {chatActivo.cliente_ruc}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
                        <span>+{chatActivo.phone_number}</span>
                        <span>•</span>
                        <span className="text-emerald-600 flex items-center gap-1 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          WhatsApp en vivo
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Acciones del chat activo */}
                  <div className="flex items-center gap-1.5">
                    {/* Botón Simular Respuesta del Cliente */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModalSimular(true)}
                      className="text-xs h-8 gap-1.5 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 cursor-pointer"
                      title="Simular un mensaje entrante de este cliente para probar el tiempo real"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Simular Respuesta</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cargarMensajesChat(chatActivo.phone_number)}
                      disabled={loadingMensajes}
                      className="text-xs h-8 p-2"
                      title="Refrescar mensajes"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingMensajes ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>

                {/* 2. ÁREA DE MENSAJES CON FONDO PATRÓN WHATSAPP */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#0000000a_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]">
                  {loadingMensajes ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
                        <p className="text-xs text-slate-500">Cargando historial de chat...</p>
                      </div>
                    </div>
                  ) : mensajes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-sm">
                        <MessageSquare className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          Inicie la conversación
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Envíe un recordatorio o utilice las plantillas contables de SUNAT para contactar a este cliente.
                        </p>
                      </div>
                    </div>
                  ) : (
                    mensajes.map((m, idx) => {
                      const isMe = m.from_me === 1;

                      return (
                        <div
                          key={m.id || idx}
                          className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-in`}
                        >
                          <div
                            className={`max-w-[75%] sm:max-w-[65%] rounded-2xl p-3 shadow-xs relative text-xs ${
                              isMe
                                ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs"
                                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60"
                            }`}
                          >
                            {/* Remitente si no es el contador */}
                            {!isMe && (
                              <p className="font-bold text-[10px] text-emerald-600 dark:text-emerald-400 mb-1">
                                {m.contact_name || chatActivo.contact_name || "Cliente"}
                              </p>
                            )}

                            {/* Contenido multimedia si existe */}
                            {m.media_url && (
                              <div className="mb-2 p-2 rounded-lg bg-black/5 dark:bg-white/10 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-emerald-600" />
                                <span className="text-[11px] font-mono truncate">{m.media_name || "Archivo adjunto"}</span>
                              </div>
                            )}

                            {/* Texto del mensaje con saltos de línea preservados */}
                            <p className="whitespace-pre-wrap leading-relaxed break-words text-[13px]">
                              {m.message_text}
                            </p>

                            {/* Hora y checks de lectura */}
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-300 font-mono">
                              <span>{formatHora(m.timestamp)}</span>
                              {isMe && (
                                <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 3. BARRA DE PLANTILLAS RÁPIDAS SUNAT */}
                <div className="px-3 py-2 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Plantillas SUNAT:
                  </span>
                  {plantillasContables.map((tpl, i) => {
                    const Icon = tpl.icono;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => aplicarPlantilla(tpl.mensaje)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 shrink-0 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Icon className="h-3 w-3 text-emerald-600" />
                        {tpl.titulo}
                      </button>
                    );
                  })}
                </div>

                {/* 4. BARRA DE INPUT PARA ESCRIBIR Y ENVIAR */}
                <form
                  onSubmit={handleEnviarMensaje}
                  className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-end gap-2"
                >
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Escriba un mensaje (Shift + Enter para nueva línea)..."
                      value={inputMensaje}
                      onChange={(e) => setInputMensaje(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleEnviarMensaje();
                        }
                      }}
                      rows={1}
                      className="resize-none min-h-[42px] max-h-32 text-xs py-2.5 pl-3 pr-8 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={enviandoMensaje || !inputMensaje.trim()}
                    className="h-10 w-10 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-xs cursor-pointer flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    <Send className={`h-4 w-4 ${enviandoMensaje ? "animate-spin" : ""}`} />
                  </Button>
                </form>
              </>
            ) : (
              /* ESTADO VACÍO CUANDO NO HAY CHAT SELECCIONADO */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="h-20 w-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-500/10 shadow-sm">
                  <MessageSquare className="h-10 w-10 stroke-[1.75]" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    WhatsApp Web Empresarial ContaTask
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Seleccione un chat de la lista izquierda o inicie una conversación directa con sus clientes tributarios registrados.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setModalNuevoChat(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Iniciar Nuevo Chat con Cliente
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB: VINCULACIÓN DE DISPOSITIVO (QR & EMPAREJAMIENTO) */}
      {activeTab === "pairing" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQUIERDA: VINCULACIÓN (QR O CÓDIGO) (7 COLS) */}
          <Card className="lg:col-span-7 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-emerald-600" />
                    Vinculación de Cuenta de WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Seleccione el método de vinculación oficial para habilitar el envío fehaciente
                  </CardDescription>
                </div>

                {/* Selector de Método: QR vs Código de Emparejamiento */}
                <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLinkMethod("QR")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      linkMethod === "QR"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Código QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkMethod("PHONE")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      linkMethod === "PHONE"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Número de Celular
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 flex-1 flex flex-col justify-center">
              {whatsappStatus?.isConnected ? (
                <div className="py-12 text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center ring-8 ring-emerald-500/10">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    ¡Cuenta Vinculada y Operativa!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    La sesión está activa. Puede despachar mensajes directos y recordatorios de vencimiento desde las opciones de la plataforma.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("chat")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer mt-2"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Ir al Chat en Vivo
                  </Button>
                </div>
              ) : linkMethod === "QR" ? (
                /* MÉTODO 1: CÓDIGO QR */
                <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
                  {whatsappStatus?.qrCode ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 shadow-sm inline-block">
                        <img
                          src={whatsappStatus.qrCode}
                          alt="Código QR de WhatsApp"
                          className="w-56 h-56 object-contain mx-auto"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
                        <span>Expira en:</span>
                        <span className="font-bold text-emerald-600">{countdown} segundos</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                        Abra WhatsApp en su celular &gt; Dispositivos vinculados &gt; Vincular un dispositivo.
                      </p>
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={handleConfirmarEscaneo}
                          disabled={confirmingScan}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {confirmingScan ? "Confirmando..." : "Confirmar Vinculación"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 space-y-3">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                        <QrCode className="h-7 w-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Generar Sesión de WhatsApp
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Haga clic abajo para iniciar el cliente de WhatsApp y generar el código QR en tiempo real.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleIniciarSesionWhatsApp}
                        disabled={initializingWhatsApp}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${initializingWhatsApp ? "animate-spin" : ""}`} />
                        {initializingWhatsApp ? "Iniciando cliente..." : "Iniciar WhatsApp Web"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* MÉTODO 2: EMPAREJAMIENTO CON NÚMERO CELULAR */
                <div className="space-y-4 py-4 max-w-md mx-auto w-full">
                  <div className="space-y-1">
                    <Label htmlFor="phoneNum" className="text-xs font-semibold">
                      Número Celular (Perú +51):
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-mono border border-slate-200 dark:border-slate-700">
                        +51
                      </span>
                      <Input
                        id="phoneNum"
                        placeholder="920843098"
                        value={senderPhoneNumber}
                        onChange={(e) => setSenderPhoneNumber(e.target.value.replace(/\D/g, ""))}
                        className="text-xs h-9 font-mono"
                      />
                      <Button
                        size="sm"
                        onClick={handleGenerarPairingCode}
                        disabled={generatingPairingCode || senderPhoneNumber.length < 9}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0 cursor-pointer h-9"
                      >
                        {generatingPairingCode ? "Generando..." : "Pedir Código"}
                      </Button>
                    </div>
                  </div>

                  {whatsappStatus?.pairingCode && (
                    <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-center space-y-2 animate-fade-in">
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                        Código de Emparejamiento:
                      </span>
                      <div className="text-3xl font-mono font-extrabold tracking-widest text-emerald-700 dark:text-emerald-300 py-1">
                        {whatsappStatus.pairingCode}
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopiarPairingCode}
                          className="text-xs gap-1 h-7 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                        >
                          {pairingCodeCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {pairingCodeCopied ? "Copiado" : "Copiar Código"}
                        </Button>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Expira en {pairingCountdown}s
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                        Abra WhatsApp &gt; Dispositivos vinculados &gt; Vincular con número de teléfono e ingrese este código.
                      </p>
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={handleConfirmarConNumero}
                          disabled={confirmingScan}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {confirmingScan ? "Confirmando..." : "Confirmar Vinculación"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* COLUMNA DERECHA: CONFIGURACIÓN REMITENTE + PROBADOR (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Perfil del Estudio Contable */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-slate-500" />
                  Configuración del Remitente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <form onSubmit={handleGuardarConfigNumero} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="pushname" className="text-xs">Nombre para Mostrar (Pushname):</Label>
                    <Input
                      id="pushname"
                      value={senderPushname}
                      onChange={(e) => setSenderPushname(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="numConfig" className="text-xs">Número Remitente:</Label>
                    <Input
                      id="numConfig"
                      value={senderPhoneNumber}
                      onChange={(e) => setSenderPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  {configSuccessMsg && (
                    <p className="text-[11px] text-emerald-600 font-semibold">{configSuccessMsg}</p>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingConfig}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs cursor-pointer"
                  >
                    {savingConfig ? "Guardando..." : "Guardar Perfil Remitente"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Probador de Mensajes en Vivo */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Send className="h-4 w-4 text-emerald-600" />
                  Probador de Envío Directo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <form onSubmit={handleEnviarMensajePrueba} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="testPhone" className="text-xs">Número Destino (con código país):</Label>
                    <Input
                      id="testPhone"
                      placeholder="51920843098"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      className="text-xs h-8 font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="testMsg" className="text-xs">Mensaje de Prueba:</Label>
                    <Textarea
                      id="testMsg"
                      rows={3}
                      value={testMessageText}
                      onChange={(e) => setTestMessageText(e.target.value)}
                      className="text-xs resize-none"
                      required
                    />
                  </div>

                  {testError && (
                    <p className="text-[11px] text-red-600 font-semibold">{testError}</p>
                  )}

                  {testResult && (
                    <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                      <p className="font-semibold">✓ Mensaje despachado con éxito</p>
                      <p className="font-mono text-[10px] mt-0.5">ID: {testResult.messageId || "Generado"}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={sendingTestMessage || !whatsappStatus?.isConnected}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className={`h-3 w-3 ${sendingTestMessage ? "animate-spin" : ""}`} />
                    {sendingTestMessage ? "Despachando..." : "Despachar Mensaje de Prueba"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL: INICIAR NUEVO CHAT */}
      {modalNuevoChat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                Iniciar Nuevo Chat de WhatsApp
              </h3>
              <button
                onClick={() => setModalNuevoChat(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Opción 1: Seleccionar Cliente de la base de datos */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Seleccionar Cliente del Estudio Contable:
                </Label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {clientes.map((c) => {
                    const isSelected = clienteSeleccionadoId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setClienteSeleccionadoId(c.id);
                          setNuevoChatNombre(c.razon_social);
                          if (c.celular) setNuevoChatTelefono(c.celular);
                        }}
                        className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{c.razon_social}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            RUC: {c.ruc} {c.celular ? `• Cel: ${c.celular}` : "• Sin celular"}
                          </p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Opción 2: Ingreso directo de número */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <Label htmlFor="numDirecto" className="text-xs font-semibold">
                    Número Celular (Destino):
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-mono border border-slate-200 dark:border-slate-700">
                      +51
                    </span>
                    <Input
                      id="numDirecto"
                      placeholder="920843098"
                      value={nuevoChatTelefono}
                      onChange={(e) => setNuevoChatTelefono(e.target.value.replace(/\D/g, ""))}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nombreDirecto" className="text-xs font-semibold">
                    Nombre o Razón Social (Opcional):
                  </Label>
                  <Input
                    id="nombreDirecto"
                    placeholder="Ej. Distribuidora del Norte SAC"
                    value={nuevoChatNombre}
                    onChange={(e) => setNuevoChatNombre(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalNuevoChat(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCrearNuevoChat}
                disabled={!nuevoChatTelefono.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Abrir Chat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIMULAR RESPUESTA DEL CLIENTE */}
      {modalSimular && chatActivo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Simular Respuesta Entrante
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Prueba la recepción en tiempo real desde: {chatActivo.contact_name || chatActivo.phone_number}
                </p>
              </div>
              <button
                onClick={() => setModalSimular(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Seleccione una respuesta rápida típica de un contribuyente o escriba un mensaje personalizado:
              </p>

              <div className="space-y-1.5">
                {[
                  "Buenas tardes contador, confirmo que recibí el cronograma. Mañana a primera hora le envío las facturas de ventas.",
                  "Hola estimado, ya realicé el pago de la boleta de tributos mediante la banca por internet. ¿Le envío la constancia?",
                  "Estimado asesor contable, acabo de recibir la alerta del Buzón SOL. Por favor indíqueme si requiere que ingresemos a subsanar.",
                  "Perfecto, adjunto el reporte de inventario valorizado de este cierre de mes."
                ].map((txt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSimularEntrante(txt)}
                    disabled={simulandoRespuesta}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all text-[11px] leading-relaxed cursor-pointer"
                  >
                    💬 "{txt}"
                  </button>
                ))}
              </div>

              <div className="space-y-1 pt-2">
                <Label className="text-xs font-semibold">O escriba un mensaje propio:</Label>
                <Textarea
                  placeholder="Escriba la respuesta del cliente..."
                  rows={2}
                  value={simularTexto}
                  onChange={(e) => setSimularTexto(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalSimular(false)}
                className="text-xs"
              >
                Cerrar
              </Button>
              <Button
                size="sm"
                onClick={() => handleSimularEntrante()}
                disabled={simulandoRespuesta}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
              >
                <Send className={`h-3.5 w-3.5 ${simulandoRespuesta ? "animate-spin" : ""}`} />
                {simulandoRespuesta ? "Emitiendo..." : "Emitir Mensaje Entrante"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
