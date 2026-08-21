"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clapperboard,
  Coins,
  Crown,
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
import { userService, videoRewardService } from "@/lib/api/user.service";
import { useAuth } from "@/lib/auth/auth-context";
import { LevelProgressBar } from "@/features/perfil/components/level-progress-bar";
import { StatCard } from "@/features/perfil/components/stat-card";
import { RewardedVideoDialog } from "@/components/ads/rewarded-video-dialog";
import Link from "next/link";

function formatNextClaim(nextClaimAt: string | null): string {
  if (!nextClaimAt) return "";
  const ms = new Date(nextClaimAt).getTime() - Date.now();
  if (ms <= 0) return "ahora";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.ceil((ms % 3_600_000) / 60_000);
  return hours > 0 ? `en ${hours}h ${minutes}min` : `en ${minutes}min`;
}

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
  const { data: reward } = useQuery({
    queryKey: ["video-reward"],
    queryFn: videoRewardService.status,
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.data && !query.state.data.eligible ? 60_000 : false,
  });
  const [rewardOpen, setRewardOpen] = useState(false);

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
  const plan = me.user.plan ?? "free";

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
          {plan === "pro" ? (
            <Badge variant="secondary" className="w-fit gap-1 bg-primary/10 text-primary">
              <Crown className="size-3" />
              Plan Pro
            </Badge>
          ) : (
            <Badge variant="secondary" className="w-fit">
              Plan Free
            </Badge>
          )}
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

      {reward?.enabled ? (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setRewardOpen(true)}
            disabled={!reward.eligible}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-4 text-left transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              <Clapperboard className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold">
                Ganá {reward.coins} monedas viendo un video
              </span>
              <span className="text-xs text-muted-foreground">
                {reward.eligible
                  ? "Mirá un video y cobralas al terminar"
                  : `Disponible de nuevo ${formatNextClaim(reward.nextClaimAt)}`}
              </span>
            </div>
          </button>
          <p className="px-1 text-xs text-muted-foreground">
            Se puede reclamar una vez cada {reward.cooldownHours}{" "}
            {reward.cooldownHours === 1 ? "hora" : "horas"}.
          </p>
        </section>
      ) : null}

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
            {me.unlocked.starterPlacesSelected ? (
              <>
                Seguí respondiendo quizzes para ganar monedas y desbloquear
                nuevos lugares, tipos de pregunta y mapas.
              </>
            ) : (
              <>
                Elegí tus primeros lugares para empezar a adivinar dónde están.
              </>
            )}
          </p>
        </div>
        {!me.unlocked.starterPlacesSelected ? (
          <Link
            href="/onboarding"
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-transform active:scale-[0.98]"
          >
            Elegir mis primeros lugares
          </Link>
        ) : null}
      </section>

      <RewardedVideoDialog
        open={rewardOpen}
        status={reward}
        onClose={() => setRewardOpen(false)}
      />
    </div>
  );
}