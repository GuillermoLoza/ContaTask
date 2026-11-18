"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  UserCog,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  Phone,
  Award,
  MapPin,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Clock,
  Shield,
  Smartphone,
  Check,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContador } from "@/context/ContadorContext";
import { api } from "@/lib/api";
import { MfaModal } from "@/components/MfaModal";

export default function ContadorPerfilPage() {
  const { user, clientes, transacciones, actualizarPerfilUsuario, recargarPerfil } = useContador();

  // Estados de formulario - Datos Personales
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [colegiatura, setColegiatura] = useState("");
  const [cargoTitulo, setCargoTitulo] = useState("");

  // Estados de formulario - Datos del Estudio
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [ruc, setRuc] = useState("");
  const [direccionEstudio, setDireccionEstudio] = useState("");
  const [pieFirma, setPieFirma] = useState("");

  // Estados de formulario - Cambio de Contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Feedback de guardado
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [savingStudy, setSavingStudy] = useState(false);
  const [studySuccess, setStudySuccess] = useState<string | null>(null);
  const [studyError, setStudyError] = useState<string | null>(null);

  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Modal MFA
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<{ mfaEnabled: boolean; remainingRecoveryCodes: number } | null>(null);
  const [loadingMfaStatus, setLoadingMfaStatus] = useState(false);

  // Inicializar campos con la información actual del usuario
  useEffect(() => {
    if (user) {
      setNombre(user.nombre || "");
      setEmail(user.email || "");
      setTelefono(user.telefono || "");
      setColegiatura(user.colegiatura || "");
      setCargoTitulo(user.cargoTitulo || user.cargo_titulo || "");
      setEmpresaNombre(user.empresaNombre || user.empresa_nombre || "");
      setRuc(user.ruc || "");
      setDireccionEstudio(user.direccionEstudio || user.direccion_estudio || "");
      setPieFirma(user.pieFirma || user.pie_firma || "");
    }
  }, [user]);

  // Cargar estado de MFA
  const loadMfaStatus = async () => {
    setLoadingMfaStatus(true);
    try {
      const res = await api.getMfaStatus();
      setMfaStatus(res);
    } catch (err) {
      console.warn("No se pudo cargar estado MFA:", err);
    } finally {
      setLoadingMfaStatus(false);
    }
  };

  useEffect(() => {
    loadMfaStatus();
  }, [mfaModalOpen]);

  // Guardar datos personales y profesionales
  const handleGuardarDatosPersonales = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      await actualizarPerfilUsuario({
        nombre,
        email,
        telefono,
        colegiatura,
        cargoTitulo
      });
      setProfileSuccess("Datos personales y profesionales actualizados exitosamente.");
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || "Error al actualizar los datos personales.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Guardar datos del estudio contable
  const handleGuardarDatosEstudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudy(true);
    setStudySuccess(null);
    setStudyError(null);

    try {
      await actualizarPerfilUsuario({
        empresaNombre,
        ruc,
        direccionEstudio,
        pieFirma
      });
      setStudySuccess("Información del estudio contable guardada exitosamente.");
      setTimeout(() => setStudySuccess(null), 4000);
    } catch (err: any) {
      setStudyError(err.message || "Error al guardar los datos del estudio.");
    } finally {
      setSavingStudy(false);
    }
  };

  // Cambiar contraseña
  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("La confirmación de la contraseña no coincide.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess("¡Contraseña actualizada exitosamente!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || "Error al actualizar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. TARJETA CABECERA DE PERFIL */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#131b2e] to-blue-950 text-white border border-slate-800 shadow-xl p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          {/* Avatar con anillo luminoso */}
          <div className="relative">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-2xl ring-4 ring-blue-500/30">
              <User className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div
              className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                mfaStatus?.mfaEnabled ? "bg-emerald-500" : "bg-amber-500"
              }`}
              title={mfaStatus?.mfaEnabled ? "2FA Activo" : "2FA Desactivado"}
            >
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Información Principal */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {user?.nombre || "Lic. Guillermo Lozano"}
              </h1>
              <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-semibold text-[11px]">
                Contador Certificado
              </Badge>
              {colegiatura && (
                <Badge variant="outline" className="text-blue-300 border-blue-500/40 text-[11px] font-mono">
                  {colegiatura}
                </Badge>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300">
              {cargoTitulo || "Contador Público Colegiado - Especialista Tributario"}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-blue-400" />
                {user?.email || "contador@contasync.pe"}
              </span>
              {telefono && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  {telefono}
                </span>
              )}
              {empresaNombre && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                  {empresaNombre}
                </span>
              )}
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => setMfaModalOpen(true)}
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{mfaStatus?.mfaEnabled ? "Gestionar 2FA" : "Activar 2FA"}</span>
            </Button>
          </div>
        </div>

        {/* Mini métricas del contador */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-center">
          <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="text-lg sm:text-xl font-bold text-white">{clientes?.length || 0}</span>
            <p className="text-[10px] sm:text-[11px] text-slate-400">Clientes Asignados</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="text-lg sm:text-xl font-bold text-blue-400">{transacciones?.length || 0}</span>
            <p className="text-[10px] sm:text-[11px] text-slate-400">Documentos Totales</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800">
            <span
              className={`text-lg sm:text-xl font-bold ${
                mfaStatus?.mfaEnabled ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {mfaStatus?.mfaEnabled ? "Protegido" : "Básico"}
            </span>
            <p className="text-[10px] sm:text-[11px] text-slate-400">Nivel de Seguridad</p>
          </div>
        </div>
      </div>

      {/* 2. PESTAÑAS DE CONFIGURACIÓN DEL PERFIL */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full bg-slate-200 dark:bg-slate-900 p-1 rounded-xl">
          <TabsTrigger value="personal" className="text-xs font-semibold gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Datos Personales</span>
            <span className="sm:hidden">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="estudio" className="text-xs font-semibold gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Estudio Contable</span>
            <span className="sm:hidden">Estudio</span>
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="text-xs font-semibold gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Seguridad y Acceso</span>
            <span className="sm:hidden">Seguridad</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DATOS PERSONALES Y PROFESIONALES */}
        <TabsContent value="personal" className="space-y-4">
          <Card className="shadow-md border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Información Personal y Colegiatura
              </CardTitle>
              <CardDescription className="text-xs">
                Configure su nombre oficial, correo electrónico y matrícula ante el Colegio de Contadores Públicos.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGuardarDatosPersonales}>
              <CardContent className="space-y-4 text-xs">
                {profileSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}
                {profileError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre" className="text-xs font-semibold">
                      Nombre Completo *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Lic. Guillermo Lozano"
                        className="pl-9 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">
                      Correo Electrónico *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contador@contatask.pe"
                        className="pl-9 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="telefono" className="text-xs font-semibold">
                      Teléfono Celular / WhatsApp
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="telefono"
                        type="text"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="+51 920 843 098"
                        className="pl-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="colegiatura" className="text-xs font-semibold">
                      N° Colegiatura / Matrícula Profesional
                    </Label>
                    <div className="relative">
                      <Award className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="colegiatura"
                        type="text"
                        value={colegiatura}
                        onChange={(e) => setColegiatura(e.target.value)}
                        placeholder="CCPL 48291"
                        className="pl-9 text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Ejemplo: CCPL (Colegio de Contadores Públicos de Lima) o de su región.
                    </p>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="cargoTitulo" className="text-xs font-semibold">
                      Título / Especialidad Profesional
                    </Label>
                    <Input
                      id="cargoTitulo"
                      type="text"
                      value={cargoTitulo}
                      onChange={(e) => setCargoTitulo(e.target.value)}
                      placeholder="Contador Público Colegiado - Asesor Tributario y Financiero"
                      className="text-xs"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Guardar Datos Personales</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 2: DATOS DEL ESTUDIO CONTABLE */}
        <TabsContent value="estudio" className="space-y-4">
          <Card className="shadow-md border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Información del Estudio Contable
              </CardTitle>
              <CardDescription className="text-xs">
                Datos de la firma contable, dirección fiscal y pie de firma utilizado en notificaciones tributarias.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGuardarDatosEstudio}>
              <CardContent className="space-y-4 text-xs">
                {studySuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{studySuccess}</span>
                  </div>
                )}
                {studyError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{studyError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="empresaNombre" className="text-xs font-semibold">
                      Nombre del Estudio / Razón Social
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="empresaNombre"
                        type="text"
                        value={empresaNombre}
                        onChange={(e) => setEmpresaNombre(e.target.value)}
                        placeholder="Estudio Contable Lozano & Asociados S.A.C."
                        className="pl-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ruc" className="text-xs font-semibold">
                      RUC del Estudio o Profesional
                    </Label>
                    <Input
                      id="ruc"
                      type="text"
                      maxLength={11}
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
                      placeholder="20601234567"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="direccionEstudio" className="text-xs font-semibold">
                      Dirección de Oficina / Despacho
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="direccionEstudio"
                        type="text"
                        value={direccionEstudio}
                        onChange={(e) => setDireccionEstudio(e.target.value)}
                        placeholder="Av. Rivera Navarrete 501, Of. 602, San Isidro, Lima"
                        className="pl-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="pieFirma" className="text-xs font-semibold">
                      Pie de Firma para Notificaciones y Correos
                    </Label>
                    <Textarea
                      id="pieFirma"
                      rows={4}
                      value={pieFirma}
                      onChange={(e) => setPieFirma(e.target.value)}
                      placeholder="Atentamente,&#10;Lic. Guillermo Lozano - CPC&#10;Estudio Contable Lozano & Asociados&#10;Central: (01) 420-9800 | WhatsApp: +51 920 843 098"
                      className="text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      Esta firma aparecerá automáticamente al final de los correos y recordatorios de vencimiento SUNAT enviados a sus clientes MYPE.
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="submit"
                  disabled={savingStudy}
                  className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  {savingStudy ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Guardar Información del Estudio</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 3: SEGURIDAD Y ACCESO */}
        <TabsContent value="seguridad" className="space-y-6">
          {/* Tarjeta de Autenticación Multifactor (2FA) */}
          <Card className="shadow-md border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Autenticación en Dos Pasos (MFA / 2FA)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Proteja el acceso al portal contable requiriendo un código de 6 dígitos de Google Authenticator o Microsoft Authenticator.
                  </CardDescription>
                </div>
                <Badge
                  className={`text-xs ${
                    mfaStatus?.mfaEnabled
                      ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {mfaStatus?.mfaEnabled ? "✓ Habilitado" : "Deshabilitado"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-emerald-500" />
                    {mfaStatus?.mfaEnabled
                      ? "Protección TOTP Activa en su Cuenta"
                      : "Aumente la Seguridad de sus Clientes y Documentos"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {mfaStatus?.mfaEnabled
                      ? `Su cuenta cuenta con ${mfaStatus.remainingRecoveryCodes} códigos de respaldo disponibles.`
                      : "Evite el acceso no autorizado a los RUCs y transacciones de sus clientes incluso si su contraseña es vulnerada."}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => setMfaModalOpen(true)}
                  className={`text-xs font-semibold gap-1.5 shrink-0 ${
                    mfaStatus?.mfaEnabled
                      ? "bg-slate-800 hover:bg-slate-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{mfaStatus?.mfaEnabled ? "Configurar / Códigos" : "Configurar 2FA Ahora"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta de Cambio de Contraseña */}
          <Card className="shadow-md border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Cambiar Contraseña
              </CardTitle>
              <CardDescription className="text-xs">
                Actualice su contraseña periódicamente para mantener la integridad de sus accesos.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCambiarPassword}>
              <CardContent className="space-y-4 text-xs">
                {passwordSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}
                {passwordError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="currentPass" className="text-xs font-semibold">
                    Contraseña Actual *
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="currentPass"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPass" className="text-xs font-semibold">
                      Nueva Contraseña * (Mínimo 6 caracteres)
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="newPass"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPass" className="text-xs font-semibold">
                      Confirmar Nueva Contraseña *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirmPass"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 text-xs"
                        required
                      />
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="submit"
                  disabled={savingPassword || !currentPassword || !newPassword}
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {savingPassword ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Actualizar Contraseña</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Información de Sesión y Políticas */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Políticas de Sesión Activa</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              ContaTask cierra automáticamente la sesión tras <strong>45 minutos de inactividad continua</strong> para garantizar que ninguna terminal desatendida exponga información confidencial de las MYPES.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal 2FA integrado */}
      <MfaModal
        open={mfaModalOpen}
        onOpenChange={setMfaModalOpen}
        userEmail={user?.email}
      />
    </div>
  );
}