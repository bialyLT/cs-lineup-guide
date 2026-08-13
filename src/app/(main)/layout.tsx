"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useAuth } from "@/lib/auth/auth-context";

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="text-sm text-muted-foreground">Cargando…</span>
      </div>
    );
  }

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