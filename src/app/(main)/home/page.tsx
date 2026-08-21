"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Coins, Crosshair, Flame, Lock, MapPin, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { StatPill } from "@/components/layout/stat-pill";
import { mapService } from "@/lib/api/map.service";
import { userService } from "@/lib/api/user.service";
import { useAuth } from "@/lib/auth/auth-context";
import { MapCard } from "@/features/mapas/components/map-card";
import { LevelProgressBar } from "@/features/perfil/components/level-progress-bar";
import { getLevelProgress } from "@/lib/xp";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function HomePage() {
  const { user } = useAuth();
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: userService.me,
    staleTime: 0,
  });
  const { data: maps = [] } = useQuery({
    queryKey: ["maps"],
    queryFn: mapService.list,
  });

  const progression = me?.progression;
  const level = progression ? getLevelProgress(progression.xp).level : 1;
  const name = user?.displayName || user?.username || me?.user.username || "invitado";

  const availableCount = maps.filter((map) => map.unlocked || map.isFree).length;
  const upcomingNames = maps
    .map((map) => map.name)
    .filter((name) => !["Mirage", "Dust II"].includes(name));
  const upcomingText =
    upcomingNames.length > 1
      ? `Próximamente se agregarán ${upcomingNames.slice(0, -1).join(", ")} y ${
          upcomingNames[upcomingNames.length - 1]
        }.`
      : upcomingNames.length === 1
        ? `Próximamente se agregarán ${upcomingNames[0]}.`
        : "";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div variants={item} className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Buenas, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Seguro hay un lineup nuevo esperándote.
        </p>
      </motion.div>

      {progression ? (
        <>
          <motion.div variants={item} className="flex flex-wrap items-center gap-2">
            <StatPill
              icon={<Flame className="text-warning" />}
              label="Racha de quizes perfectos"
              value={progression.streak}
            />
            <StatPill
              icon={<Coins className="text-warning" />}
              label="Monedas disponibles"
              value={progression.coins}
            />
            <StatPill
              icon={<Zap />}
              label="Nivel actual"
              value={`Nv. ${level}`}
            />
          </motion.div>

          <motion.div variants={item}>
            <LevelProgressBar xp={progression.xp} />
          </motion.div>
        </>
      ) : (
        <motion.div variants={item}>
          <p className="text-sm text-muted-foreground">{isLoading ? "Cargando tu progreso…" : "Sin progreso aún."}</p>
        </motion.div>
      )}

      <motion.div variants={item}>
        <Link
          href="/quiz/crear"
          className="flex flex-col gap-3 rounded-xl bg-foreground p-5 text-background transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-background/10">
              <Crosshair className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-semibold">Crear un quiz</span>
              <span className="text-xs text-background/60">
                Elegí mapas y practicá tus lineups
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-background/60">
              {availableCount} {availableCount === 1 ? "mapa disponible" : "mapas disponibles"}
            </span>
            <ArrowRight className="size-5" />
          </div>
        </Link>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <PageHeader title="Mapas disponibles" className="!gap-0" />
          <Link
            href="/mapas"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {maps.length === 0 ? (
            <p className="col-span-2 text-sm text-muted-foreground">
              {isLoading ? "Cargando mapas…" : "No hay mapas disponibles."}
            </p>
          ) : (
            maps.map((map) => (
              <MapCard
                key={map.id}
                map={map}
                href={`/mapas/${map.id}`}
              />
            ))
          )}
        </div>
      </motion.div>

      {upcomingText ? (
        <motion.div variants={item}>
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-4">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{upcomingText}</span>
            </p>
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
}