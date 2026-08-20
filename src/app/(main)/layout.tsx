"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useAuth } from "@/lib/auth/auth-context";
import { userService } from "@/lib/api/user.service";

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user } = useAuth();
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: userService.me,
    enabled: status === "authenticated" && Boolean(user?.isEmailVerified),
    staleTime: 0,
  });

  // Sin sesión o con email sin verificar, no hay acceso a la app.
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && user && !user.isEmailVerified) {
      router.replace("/verify-email");
    }
  }, [status, user, router]);

  // Sin lugares iniciales elegidos, lo primero es el onboarding.
  useEffect(() => {
    if (
      status === "authenticated" &&
      me &&
      !me.unlocked.starterPlacesSelected &&
      pathname !== "/onboarding"
    ) {
      router.replace("/onboarding");
    }
  }, [status, me, pathname, router]);

  if (
    status === "loading" ||
    status === "unauthenticated" ||
    (status === "authenticated" && user && !user.isEmailVerified)
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="text-sm text-muted-foreground">Cargando…</span>
      </div>
    );
  }

  // El quiz (jugando) y el onboarding tienen su propio encabezado / foco.
  const isOnboarding = pathname === "/onboarding";
  const showAppHeader = pathname !== "/quiz" && !isOnboarding;

  return (
    <div className="min-h-dvh">
      {showAppHeader ? <AppHeader /> : null}
      <main className="mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-8">
        {children}
      </main>
      {!isOnboarding ? <BottomNav /> : null}
    </div>
  );
}