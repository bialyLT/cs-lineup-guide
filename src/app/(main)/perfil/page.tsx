"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Coins,
  Flame,
  MapPin,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { rankingService } from "@/lib/api/ranking.service";
import { userService } from "@/lib/api/user.service";
import { useAuth } from "@/lib/auth/auth-context";
import { LevelProgressBar } from "@/features/perfil/components/level-progress-bar";
import { StatCard } from "@/features/perfil/components/stat-card";
import Link from "next/link";

export default function PerfilPage() {
  const { user } = useAuth();
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: userService.me,
    staleTime: 0,
  });
  const { data: ranking } = useQuery({
    queryKey: ["ranking"],
    queryFn: rankingService.global,
    staleTime: 60_000,
  });

  if (isLoading || !me) {
    return (
      <PageHeader eyebrow="Perfil" title="Tu progreso" />
    );
  }

  const progression = me.progression;
  const initials = (user?.displayName || user?.username || "")
    .slice(0, 2)
    .toUpperCase();
  const unlockedPlaces = me.unlocked.places.length;
  const top = ranking?.you.rank;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Perfil" title="Tu progreso" />

      <section className="flex items-center gap-4">
        <Avatar className="size-16 text-lg">
          <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5">
          <span className="text-lg font-semibold tracking-tight">
            {user?.displayName || user?.username}
          </span>
          <Badge variant="secondary" className="w-fit">
            Jugador activo
          </Badge>
        </div>
      </section>

      <LevelProgressBar xp={progression.xp} />

      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Flame className="text-warning" />}
          label="Racha"
          value={progression.streak}
          tone="warning"
        />
        <StatCard
          icon={<Coins className="text-warning" />}
          label="Monedas"
          value={progression.coins}
          tone="warning"
        />
        <StatCard
          icon={<Trophy className="text-warning" />}
          label="Mejor racha"
          value={progression.bestStreak ?? 0}
          tone="warning"
        />
        <StatCard icon={<Zap />} label="Experiencia" value={progression.xp} />
        <StatCard
          icon={<CheckCircle2 />}
          label="Lugares desbloqueados"
          value={unlockedPlaces}
          tone="success"
        />
        <StatCard
          icon={<Trophy />}
          label="Top global"
          value={top ? `#${top}` : "#0"}
          tone="success"
        />
      </section>

      <Separator />

      {user?.isStaff ? (
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-4 transition-colors hover:bg-muted/70"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
            <ShieldCheck className="size-5" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Panel de administración</span>
            <span className="text-xs text-muted-foreground">
              Gestioná usuarios y contenido
            </span>
          </div>
        </Link>
      ) : null}

      <Separator />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Próximos pasos</h2>
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {me.unlocked.freePlaceUsed ? (
              <>
                Seguí respondiendo quizzes para ganar monedas y desbloquear
                nuevos lugares, tipos de pregunta y mapas.
              </>
            ) : (
              <>
                Elegí tu lugar gratuito en un mapa disponible para empezar a
                practicar sus lineups.
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}