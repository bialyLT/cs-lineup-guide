"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Crosshair } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, user } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(user?.isEmailVerified ? "/home" : "/verify-email");
    }
  }, [status, user?.isEmailVerified, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="text-sm text-muted-foreground">Cargando…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
          <Crosshair className="size-5" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-semibold tracking-tight">Smokeame Ventana</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}