"use client";

import { Suspense } from "react";
import { ContadorProvider } from "@/context/ContadorContext";
import { SidebarLayout } from "@/components/SidebarLayout";

export default function ContadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen text-xs text-slate-500">
          Cargando Panel del Contador...
        </div>
      }
    >
      <ContadorProvider>
        <SidebarLayout>{children}</SidebarLayout>
      </ContadorProvider>
    </Suspense>
  );
}
