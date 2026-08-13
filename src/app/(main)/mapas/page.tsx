"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { mockMaps } from "@/features/mapas/mock";
import { MapCard } from "@/features/mapas/components/map-card";

type Scope = "select" | "all";

export default function MapasPage() {
  const [scope, setScope] = useState<Scope>("select");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(["mirage"]));

  const unlockedCount = useMemo(
    () => mockMaps.filter((map) => map.unlocked || map.isFree).length,
    [],
  );

  const toggled = new Set(scope === "all" ? mockMaps.map((map) => map.id) : selected);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Mapas"
        title="Elegí tus mapas"
        description="Mirage está disponible gratis. El resto se desbloquea con monedas."
      />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            { key: "select", label: "Elegir mapas" },
            { key: "all", label: "Todos los mapas" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setScope(key)}
            aria-pressed={scope === key}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors data-[pressed=true]:bg-background data-[pressed=true]:text-foreground data-[pressed=false]:text-muted-foreground"
            data-pressed={scope === key}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {mockMaps.map((map) => (
          <MapCard
            key={map.id}
            map={map}
            selected={toggled.has(map.id)}
            onToggle={
              scope === "select"
                ? () => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(map.id)) next.delete(map.id);
                      else next.add(map.id);
                      return next;
                    });
                  }
                : undefined
            }
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <p className="text-center text-xs text-muted-foreground">
          {unlockedCount} de {mockMaps.length} mapas desbloqueados
        </p>
        <Link href="/quiz" className="block">
          <Button size="lg" className="w-full" disabled={toggled.size === 0}>
            Crear quiz con {toggled.size} {toggled.size === 1 ? "mapa" : "mapas"}
              <ArrowRight data-icon="inline-end" />
            </Button>
        </Link>
      </div>
    </div>
  );
}