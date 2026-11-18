"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  Building2,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para el flujo de Autenticación Multifactor (MFA / 2FA)
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Detección de mensajes de redirección (Timeout de 45 min o acceso no autorizado)
  const isExpired = searchParams.get("expired") === "true";
  const isUnauthorized = searchParams.get("unauthorized") === "true";
  const demoParam = searchParams.get("demo");

  // Autologin por demo query param si se requiere
  useEffect(() => {
    if (demoParam === "contador") {
      handleQuickLogin("contador@contatask.pe", "password123");
    } else if (demoParam === "textiles") {
      handleQuickLogin("contacto@textileslima.com", "password123");
    } else if (demoParam === "elnorte") {
      handleQuickLogin("ventas@ferreteriaelnorte.pe", "password123");
    } else if (demoParam === "colegio") {
      handleQuickLogin("administracion@colegiomaria.edu.pe", "password123");
    }
  }, [demoParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor complete todos los campos.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.login(email, password);

      // Si el usuario tiene MFA habilitado, pasar al paso 2
      if (data.mfaRequired && data.mfaToken) {
        setMfaPending(true);
        setMfaToken(data.mfaToken);
        setMfaEmail(data.email || email);
        setMfaCode("");
        setMfaError(null);
        return;
      }

      // Redirigir según rol
        if (data.usuario?.rol === "CONTADOR") {
          router.push("/contador");
        } else {
          router.push("/portal-cliente");
        }
      } catch (err: any) {
        setError(err.message || "Credenciales incorrectas. Verifique su correo o contraseña.");
      } finally {
        setLoading(false);
      }
    };

    const handleMfaSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mfaCode.trim()) {
        setMfaError("Por favor ingrese el código de verificación.");
        return;
      }

      setLoading(true);
      setMfaError(null);

      try {
        const data = await api.loginMfa(mfaToken, mfaCode.trim());
        if (data.usuario?.rol === "CONTADOR") {
          router.push("/contador");
        } else {
          router.push("/portal-cliente");
        }
      } catch (err: any) {
        setMfaError(err.message || "Código incorrecto o sesión expirada.");
      } finally {
        setLoading(false);
      }
    };

    const handleCancelMfa = () => {
      setMfaPending(false);
      setMfaToken("");
      setMfaCode("");
      setMfaError(null);
      setUseRecoveryCode(false);
    };

    const handleQuickLogin = async (userEmail: string, userPass: string) => {
      setEmail(userEmail);
      setPassword(userPass);
      setLoading(true);
      setError(null);

      try {
        const data = await api.login(userEmail, userPass);
          if (data.mfaRequired && data.mfaToken) {
            setMfaPending(true);
            setMfaToken(data.mfaToken);
            setMfaEmail(data.email || userEmail);
            return;
          }
          if (data.usuario?.rol === "CONTADOR") {
            router.push("/contador");
          } else {
            router.push("/portal-cliente");
          }
        } catch (err: any) {
          setError(err.message || "Error al iniciar sesión de demostración.");
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)] py-8 px-4">
          <div className="w-full max-w-md space-y-6">
              { isExpired && !mfaPending && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs animate-fade-in">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Sesión expirada</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      Han transcurrido más de 45 minutos de inactividad. Por favor ingrese nuevamente.
                    </p>
                  </div>
                </div>
              )}

              { isUnauthorized && !isExpired && !mfaPending && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs animate-fade-in">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Sesión requerida</p>
                    <p className="text-red-700 dark:text-red-300">
                      Debe iniciar sesión para acceder al portal.
                    </p>
                  </div>
                </div>
              )}

                    {/* PASO 2: VERIFICACIÓN MULTIFACTOR (MFA) */}
                    {mfaPending ? (
                      <Card className="shadow-lg border-slate-200 dark:border-slate-800 animate-fade-in">
                        <CardHeader className="space-y-2 text-center pb-4">
                          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                          <CardTitle className="text-xl font-bold">Verificación en Dos Pasos</CardTitle>
                          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Esta cuenta está protegida con autenticación multifactor. Ingrese el código generado para{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{mfaEmail}</span>.
                          </CardDescription>
                        </CardHeader>

                              <CardContent className="space-y-4">
                                {mfaError && (
                                  <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{mfaError}</span>
                                  </div>
              )}

                                <form onSubmit={handleMfaSubmit} className="space-y-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label htmlFor="mfaCode" className="text-xs font-semibold">
                                        {useRecoveryCode ? "Código de Respaldo" : "Código de 6 dígitos"}
                                      </Label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setUseRecoveryCode(!useRecoveryCode);
                                          setMfaCode("");
                                          setMfaError(null);
                                        }}
                                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                                      >
                                        {useRecoveryCode ? (
                                          <>
                                            <Smartphone className="h-3 w-3" />
                                            <span>Usar App Autenticadora</span>
                                          </>
                                        ) : (
                                          <>
                                            <KeyRound className="h-3 w-3" />
                                            <span>Usar código de respaldo</span>
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    <div className="relative">
                                      {useRecoveryCode ? (
                                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                      ) : (
                                        <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                      )}
                                      <Input
                                        id="mfaCode"
                                        type="text"
                                        autoFocus
                                        autoComplete="one-time-code"
                                        placeholder={useRecoveryCode ? "XXXX-XXXX" : "000000"}
                                        maxLength={useRecoveryCode ? 10 : 6}
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.toUpperCase())}
                                        className="pl-9 text-center text-lg tracking-widest font-mono font-bold"
                                        required
                                      />
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {useRecoveryCode
                                        ? "Ingrese uno de los códigos de emergencia de 8 caracteres (formato XXXX-XXXX)."
                                        : "Abra Google Authenticator, Microsoft Authenticator o su app TOTP y digite el código actual."}
                                    </p>
                                  </div>

                                    <div className="pt-2 flex flex-col gap-2">
                                      <Button
                                        type="submit"
                                        className="w-full text-xs font-semibold h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        disabled={loading || !mfaCode.trim()}
                                      >
                                        {loading ? "Validando código..." : "Verificar y Acceder"}
                                        <ShieldCheck className="h-4 w-4" />
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleCancelMfa}
                                        className="w-full text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                        disabled={loading}
                                      >
                                        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                                        Volver a ingresar con otra cuenta
                                      </Button>
                                    </div>
                                </form>
                              </CardContent>
                            </Card>
                            ) : (
                            /* PASO 1: LOGIN ESTÁNDAR */
                            <Card className="shadow-lg border-slate-200 dark:border-slate-800">
                              <CardHeader className="space-y-2 text-center">
                                <div className="mx-auto h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                                  <Lock className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl font-bold">Iniciar Sesión</CardTitle>
                              </CardHeader>

                          <CardContent className="space-y-4">
                            {error && (
                              <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{error}</span>
                              </div>
                            )}

                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="email" className="text-xs">Correo Electrónico</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                  id="email"
                                  type="email"
                                  placeholder="ejemplo@contatask.pe"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  className="pl-9 text-xs"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs">Contraseña</Label>
                              </div>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                  id="password"
                                  type="password"
                                  placeholder="••••••••"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="pl-9 text-xs"
                                  required
                                />
                              </div>
                            </div>

                            <Button type="submit" className="w-full text-xs font-semibold h-10 gap-2" disabled={loading}>
                              {loading ? "Verificando..." : "Ingresar al Portal"}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    )}
                  </div>
    </div>
              );
}

              export default function LoginPage() {
  return (
              <Suspense fallback={<div className="flex justify-center items-center min-h-[50vh]">Cargando...</div>}>
                <LoginForm />
              </Suspense>
              );
}
