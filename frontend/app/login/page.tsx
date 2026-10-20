"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Mail, AlertCircle, CheckCircle2, Building2, UserCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, setToken, setSavedUser } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detección de mensajes de redirección (Timeout de 30 min o acceso no autorizado)
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
      // Redirigir según rol (RF-C01 Criterio 1)
      if (data.usuario.rol === "CONTADOR") {
        router.push("/contador");
      } else {
        router.push("/portal-cliente");
      }
    } catch (err: any) {
      // RF-C01 Criterio 2
      setError(err.message || "Credenciales incorrectas. Verifique su correo o contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setLoading(true);
    setError(null);

    try {
      const data = await api.login(userEmail, userPass);
      if (data.usuario.rol === "CONTADOR") {
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
        {/* Banner de Timeout de Inactividad (RF-C01 Criterio 4) */}
        {isExpired && (
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

        {/* Banner de Acceso No Autorizado (RF-C01 Criterio 3) */}
        {isUnauthorized && !isExpired && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs animate-fade-in">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Ruta protegida</p>
              <p className="text-red-700 dark:text-red-300">
                Debe iniciar sesión para acceder al portal.
              </p>
            </div>
          </div>
        )}

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

          <CardFooter className="flex flex-col space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-center w-full">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Usuarios de prueba:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-auto py-2 flex flex-col items-start gap-0.5 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                onClick={() => handleQuickLogin("contador@contatask.pe", "password123")}
                disabled={loading}
              >
                <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> Contador
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">CPCC. Pedro Lozano</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-auto py-2 flex flex-col items-start gap-0.5 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                onClick={() => handleQuickLogin("contacto@textileslima.com", "password123")}
                disabled={loading}
              >
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Textiles Lima
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">RUC 20512345671</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-auto py-2 flex flex-col items-start gap-0.5 border-purple-200 dark:border-purple-900 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                onClick={() => handleQuickLogin("ventas@ferreteriaelnorte.pe", "password123")}
                disabled={loading}
              >
                <span className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Ferretería Norte
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">RUC 20608765432</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-auto py-2 flex flex-col items-start gap-0.5 border-amber-200 dark:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                onClick={() => handleQuickLogin("administracion@colegiomaria.edu.pe", "password123")}
                disabled={loading}
              >
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Col. María Aux.
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">RUC 20491238475</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
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
