"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Crosshair } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

export default function LandingPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/home");
  }, [status, router]);

  if (status === "authenticated") return null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex size-24 items-center justify-center rounded-[28px] bg-primary/10 text-primary ring-1 ring-primary/20">
          <Crosshair className="size-12" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Smokeame Ventana
          </h1>
          <p className="max-w-md text-pretty text-base text-muted-foreground sm:text-lg">
            Aprende los lugares y los lineups del counter strike 2 respondiendo
            preguntas
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button asChild size="lg" className="h-14 rounded-full px-14 text-lg">
          <Link href="/auth/login">Juga</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          ¿Todavía no tenés cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
