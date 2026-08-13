import type { Metadata } from "next";
import { CheckCircle2, Flame, Gamepad2, Coins, Target, Trophy } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { mockProgression, mockUser } from "@/features/perfil/mock";
import { LevelProgressBar } from "@/features/perfil/components/level-progress-bar";
import { StatCard } from "@/features/perfil/components/stat-card";

export const metadata: Metadata = { title: "Perfil" };

export default function PerfilPage() {
  const initials = (mockUser.displayName ?? mockUser.username).slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Perfil" title="Tu progreso" />

      <section className="flex items-center gap-4">
        <Avatar className="size-16 text-lg">
          <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5">
          <span className="text-lg font-semibold tracking-tight">
            {mockUser.displayName ?? mockUser.username}
          </span>
          <Badge variant="secondary" className="w-fit">
            Jugador activo
          </Badge>
        </div>
      </section>

      <LevelProgressBar xp={mockProgression.xp} />

      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Flame className="text-warning" />}
          label="Racha"
          value={mockProgression.streak}
          tone="warning"
        />
        <StatCard
          icon={<Coins className="text-warning" />}
          label="Monedas"
          value={mockProgression.coins}
          tone="warning"
        />
        <StatCard icon={<CheckCircle2 />} label="Lineups estudiados" value={64} tone="success" />
        <StatCard icon={<Target />} label="Precisión" value="78%" tone="success" />
        <StatCard icon={<Gamepad2 />} label="Quizzes jugados" value={31} />
        <StatCard icon={<Trophy />} label="Top global" value="#12" />
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Próximos pasos</h2>
        <p className="text-sm text-muted-foreground">
          Te faltan 30 monedas para desbloquear Inferno. Seguí tu racha para ganarlas más rápido.
        </p>
      </section>
    </div>
  );
}