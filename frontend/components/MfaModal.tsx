"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  KeyRound,
  Copy,
  Check,
  Download,
  AlertTriangle,
  RefreshCw,
  Lock,
  X,
  ArrowRight,
  ShieldOff
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  api,
  MfaStatusResponse,
  MfaSetupResponse,
  MfaVerifyResponse
} from "@/lib/api";

interface MfaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
}

export function MfaModal({ open, onOpenChange, userEmail }: MfaModalProps) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<MfaStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados del flujo de configuración
  const [step, setStep] = useState<"STATUS" | "SETUP_SCAN" | "SUCCESS_CODES" | "CONFIRM_DISABLE" | "CONFIRM_REGEN">(
    "STATUS"
  );
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [showManualKey, setShowManualKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Códigos de recuperación
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Contraseña para desactivar o regenerar
  const [password, setPassword] = useState("");

  // Cargar estado al abrir el modal
  useEffect(() => {
    if (open) {
      loadMfaStatus();
    } else {
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setStep("STATUS");
    setSetupData(null);
    setTotpCode("");
    setShowManualKey(false);
    setCopiedKey(false);
    setRecoveryCodes([]);
    setCopiedCodes(false);
    setPassword("");
    setError(null);
    setSuccessMsg(null);
  };

  const loadMfaStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMfaStatus();
      setStatus(data);
      setStep("STATUS");
    } catch (err: any) {
      setError(err.message || "Error al obtener estado de MFA");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const data = await api.setupMfa();
      setSetupData(data);
      setTotpCode("");
      setStep("SETUP_SCAN");
    } catch (err: any) {
      setError(err.message || "Error al iniciar configuración MFA");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || !totpCode.trim()) {
      setError("Por favor ingrese el código de 6 dígitos.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.verifyAndEnableMfa(setupData.secret, totpCode.trim());
      setRecoveryCodes(res.recoveryCodes);
      setStep("SUCCESS_CODES");
      setStatus({
        mfaEnabled: true,
        mfaVerifiedAt: new Date().toISOString(),
        remainingRecoveryCodes: res.recoveryCodes.length
      });
      setSuccessMsg("¡Autenticación de Dos Pasos activada con éxito!");
    } catch (err: any) {
      setError(err.message || "Código incorrecto. Compruebe la hora en su dispositivo móvil e intente de nuevo.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Debe ingresar su contraseña actual.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await api.disableMfa(password);
      setPassword("");
      setStatus({
        mfaEnabled: false,
        mfaVerifiedAt: null,
        remainingRecoveryCodes: 0
      });
      setStep("STATUS");
      setSuccessMsg("Autenticación de Dos Pasos desactivada.");
    } catch (err: any) {
      setError(err.message || "Error al desactivar MFA.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Debe ingresar su contraseña actual.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.regenerateRecoveryCodes(password);
      setPassword("");
      setRecoveryCodes(res.recoveryCodes);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              remainingRecoveryCodes: res.recoveryCodes.length
            }
          : null
      );
      setStep("SUCCESS_CODES");
      setSuccessMsg("Se generaron 8 nuevos códigos de recuperación.");
    } catch (err: any) {
      setError(err.message || "Error al regenerar códigos.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, isKey = false) => {
    navigator.clipboard.writeText(text);
    if (isKey) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const downloadRecoveryCodes = () => {
    const text = [
      "===========================================================",
      " CONTATASK - CÓDIGOS DE RECUPERACIÓN DE RESPALDO (2FA / MFA)",
      ` Cuenta: ${userEmail || "Usuario"}`,
      ` Generados el: ${new Date().toLocaleString()}`,
      "===========================================================",
      "",
      "Cada código sólo puede ser utilizado una única vez.",
      "Guarde este archivo en un lugar seguro fuera de este dispositivo.",
      "",
      ...recoveryCodes.map((code, i) => `  ${i + 1}.  ${code}`),
      "",
      "==========================================================="
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contatask-codigos-recuperacion-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Autenticación Multifactor (2FA)</DialogTitle>
              <DialogDescription className="text-xs">
                Seguridad reforzada con TOTP (Google / Microsoft Authenticator)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2 animate-fade-in">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-xs text-slate-400">Verificando estado de seguridad...</p>
          </div>
        ) : (
          <>
            {/* VISTA 1: ESTADO ACTUAL (DESHABILITADO O HABILITADO) */}
            {step === "STATUS" && (
              <div className="space-y-4 text-xs">
                {status?.mfaEnabled ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                          <ShieldCheck className="h-4 w-4" />
                          2FA Activo y Protegido
                        </span>
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] text-white">
                          Habilitado
                        </Badge>
                      </div>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300/80">
                        Su cuenta solicita un código de 6 dígitos cada vez que inicia sesión.
                      </p>
                      {status.mfaVerifiedAt && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Activado el: {new Date(status.mfaVerifiedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5 text-blue-500" />
                          Códigos de recuperación de respaldo
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {status.remainingRecoveryCodes} disponibles
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Útiles si extravía su teléfono celular o no tiene acceso a la aplicación de códigos.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setError(null);
                          setStep("CONFIRM_REGEN");
                        }}
                        className="w-full text-xs gap-1.5 border-slate-300 dark:border-slate-700"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Regenerar Códigos de Recuperación
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setError(null);
                          setStep("CONFIRM_DISABLE");
                        }}
                        className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        Desactivar Autenticación de Dos Pasos
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-bold text-slate-900 dark:text-white">Mayor Protección</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        La autenticación multifactor previene accesos no autorizados a su información tributaria, comprobantes y clientes, incluso si su contraseña llega a verse comprometida.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        ¿Cómo funciona?
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <li>Instale una aplicación como <strong>Google Authenticator</strong> o <strong>Microsoft Authenticator</strong> en su celular.</li>
                        <li>Escanee el código QR que se generará a continuación.</li>
                        <li>Ingrese el código de 6 dígitos para confirmar y proteger su cuenta.</li>
                      </ol>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="button"
                        onClick={handleStartSetup}
                        disabled={actionLoading}
                        className="w-full text-xs font-semibold h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {actionLoading ? "Generando..." : "Comenzar Configuración"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VISTA 2: ESCANEAR QR Y DIGITAR CÓDIGO */}
            {step === "SETUP_SCAN" && setupData && (
              <form onSubmit={handleVerifyAndEnable} className="space-y-4 text-xs">
                <div className="text-center space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Paso 1: Escanee el código QR con su aplicación
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Abra Google Authenticator o Microsoft Authenticator y seleccione <strong>Escanear código QR</strong>.
                  </p>
                </div>

                {/* Código QR centrado */}
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setupData.qrCodeDataUrl}
                    alt="Código QR MFA"
                    className="w-48 h-48 rounded-lg shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowManualKey(!showManualKey)}
                    className="mt-2 text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {showManualKey ? "Ocultar clave manual" : "¿No puede escanear? Ver clave manual"}
                  </button>

                  {showManualKey && (
                    <div className="mt-2 w-full p-2.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Clave Secreta:</span>
                      <div className="flex items-center justify-center gap-2">
                        <code className="text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-white select-all">
                          {setupData.manualKey}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(setupData.secret, true)}
                          className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          title="Copiar clave"
                        >
                          {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="totpCode" className="text-xs font-semibold">
                    Paso 2: Ingrese el código de 6 dígitos generado por la app
                  </Label>
                  <Input
                    id="totpCode"
                    type="text"
                    autoFocus
                    placeholder="000000"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center font-mono text-xl tracking-widest font-bold h-11"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("STATUS")}
                    className="flex-1 text-xs"
                    disabled={actionLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    disabled={actionLoading || totpCode.length !== 6}
                  >
                    {actionLoading ? "Verificando..." : "Activar 2FA"}
                  </Button>
                </div>
              </form>
            )}

            {/* VISTA 3: CÓDIGOS DE RECUPERACIÓN GENERADOS */}
            {step === "SUCCESS_CODES" && (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ¡Guarde estos códigos de recuperación ahora!
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Si pierde el acceso a su app autenticadora, estos 8 códigos son la única vía para ingresar a su cuenta. Cada código sólo sirve una vez.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800">
                  <div className="grid grid-cols-2 gap-2 text-center font-mono font-bold text-xs tracking-wider">
                    {recoveryCodes.map((code, index) => (
                      <div
                        key={index}
                        className="p-1.5 rounded bg-slate-800/80 border border-slate-700/60 select-all"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(recoveryCodes.join("\n"))}
                    className="flex-1 text-xs gap-1.5"
                  >
                    {copiedCodes ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedCodes ? "Copiados" : "Copiar Códigos"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadRecoveryCodes}
                    className="flex-1 text-xs gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar .txt
                  </Button>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => setStep("STATUS")}
                    className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    He guardado mis códigos de recuperación
                  </Button>
                </div>
              </div>
            )}

            {/* VISTA 4: CONFIRMAR DESACTIVACIÓN (PIDE CONTRASEÑA) */}
            {step === "CONFIRM_DISABLE" && (
              <form onSubmit={handleDisableMfa} className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-300">
                    <ShieldAlert className="h-4 w-4" />
                    ¿Está seguro de desactivar la protección 2FA?
                  </p>
                  <p className="text-[11px] text-red-800 dark:text-red-300/80">
                    Su cuenta volverá a ser vulnerable únicamente con contraseña. Ingrese su clave para confirmar.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="disablePass" className="text-xs font-semibold">
                    Contraseña actual
                  </Label>
                  <Input
                    id="disablePass"
                    type="password"
                    autoFocus
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("STATUS")}
                    className="flex-1 text-xs"
                    disabled={actionLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
                    disabled={actionLoading || !password}
                  >
                    {actionLoading ? "Desactivando..." : "Confirmar Desactivación"}
                  </Button>
                </div>
              </form>
            )}

            {/* VISTA 5: CONFIRMAR REGENERACIÓN DE CÓDIGOS DE RESPALDO */}
            {step === "CONFIRM_REGEN" && (
              <form onSubmit={handleRegenerateCodes} className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                    <RefreshCw className="h-4 w-4" />
                    Regenerar Códigos de Respaldo
                  </p>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300/80">
                    Se invalidarán los códigos anteriores y se generarán 8 nuevos. Ingrese su contraseña actual para continuar.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regenPass" className="text-xs font-semibold">
                    Contraseña actual
                  </Label>
                  <Input
                    id="regenPass"
                    type="password"
                    autoFocus
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("STATUS")}
                    className="flex-1 text-xs"
                    disabled={actionLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    disabled={actionLoading || !password}
                  >
                    {actionLoading ? "Generando..." : "Generar Nuevos Códigos"}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}