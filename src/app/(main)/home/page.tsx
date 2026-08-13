"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Coins, Crosshair, Flame, Lock, MapPin, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { StatPill } from "@/components/layout/stat-pill";
import { mockMaps } from "@/features/mapas/mock";
import { MapCard } from "@/features/mapas/components/map-card";
import { mockProgression, mockUser } from "@/features/perfil/mock";
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
  const level = getLevelProgress(mockProgression.xp).level;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div variants={item} className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Buenas, {mockUser.displayName ?? mockUser.username}
        </h1>
        <p className="text-sm text-muted-foreground">
          Seguro hay un lineup nuevo esperándote.
        </p>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap items-center gap-2">
        <StatPill
          icon={<Flame className="text-warning" />}
          label="Racha de respuestas correctas"
          value={mockProgression.streak}
        />
        <StatPill
          icon={<Coins className="text-warning" />}
          label="Monedas disponibles"
          value={mockProgression.coins}
        />
        <StatPill
          icon={<Zap />}
          label="Nivel actual"
          value={`Nv. ${level}`}
        />
      </motion.div>

      <motion.div variants={item}>
        <LevelProgressBar xp={mockProgression.xp} />
      </motion.div>

      <motion.div variants={item}>
        <Link
          href="/quiz"
          className="flex flex-col gap-3 rounded-xl bg-foreground p-5 text-background transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-background/10">
              <Crosshair className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-semibold">Comenzar un quiz</span>
              <span className="text-xs text-background/60">
                Entrenamiento rápido · Mirage
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-background/60">5 preguntas</span>
            <ArrowRight className="size-5" />
          </div>
        </Link>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>Continuá donde quedaste</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Entrenamiento · Mirage</span>
              <span className="tabular-nums text-muted-foreground">3 / 10</span>
            </div>
            <Progress value={30} className="h-1.5" />
            <Link href="/quiz" className="mt-1 block">
              <Button size="sm" className="w-full">
                Continuar
                <ArrowRight data-icon="inline-end" />
              </Button>
            </Link>
          </CardContent>
        </Card>
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
          {mockMaps.map((map) => (
            <MapCard key={map.id} map={map} />
          ))}
        </div>
      </motion.div>

      <motion.div variants={item}>
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-4">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              Inferno, Nuke, Ancient y más
            </span>{" "}
            se desbloquean con monedas. Ganá monedas manteniendo tu racha en los quizzes.
          </p>
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </motion.div>
    </motion.div>
  );
}