"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ContadorTributacionRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente al nuevo módulo separado de SIRE SUNAT
    router.replace("/contador/sire");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Redirigiendo a SIRE SUNAT...
        </h2>
        <p className="text-xs text-slate-500">
          Los módulos de SIRE y PLAME ahora cuentan con secciones independientes en el menú.
        </p>
      </div>
    </div>
  );
}
