"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // El quiz tiene su propio encabezado (volver + progreso).
  const showAppHeader = !pathname.startsWith("/quiz");

  return (
    <div className="min-h-dvh">
      {showAppHeader ? <AppHeader /> : null}
      <main className="mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}