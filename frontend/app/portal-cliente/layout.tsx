"use client";

import { Suspense } from "react";
import { ClientePortalProvider } from "@/context/ClientePortalContext";
import { ClientSidebarLayout } from "@/components/ClientSidebarLayout";

export default function PortalClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen text-xs text-slate-500">
          Cargando Portal de Clientes...
        </div>
      }
    >
      <ClientePortalProvider>
        <ClientSidebarLayout>{children}</ClientSidebarLayout>
      </ClientePortalProvider>
    </Suspense>
  );
}
