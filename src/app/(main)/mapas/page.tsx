"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { mapService } from "@/lib/api/map.service";
import { quizService } from "@/lib/api/quiz.service";
import { quizSession } from "@/lib/quiz-session";
import { MapCard } from "@/features/mapas/components/map-card";

type Scope = "select" | "all";

export default function MapasPage() {
  const router = useRouter();
  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["maps"],
    queryFn: mapService.list,
  });

  const [scope, setScope] = useState<Scope>("select");
  // touched=true una vez que el usuario eligió manualmente (evita pisar la preselección).
  const [touched, setTouched] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const accessible = useMemo(
    () => maps.filter((map) => map.unlocked || map.isFree),
    [maps],
  );
  const defaultSelection = useMemo(
    () => new Set(accessible.filter((map) => map.isFree).map((map) => map.id)),
    [accessible],
  );

  // Selección efectiva: preselección (mapas gratis) hasta que el usuario toque.
  const selection = touched ? selected : defaultSelection;
  const selectedIds = [...selection].filter((id) =>
    accessible.some((map) => map.id === id),
  );
  const shown = scope === "all" ? maps : accessible;

  function toggleMap(id: string) {
    if (scope !== "select") return;
    setTouched(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const generate = useMutation({
    mutationFn: (mapIds: string[]) => quizService.create(mapIds),
    onSuccess: (quiz) => {
      quizSession.save(quiz);
      router.push("/quiz");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo crear el quiz.");
    },
  });

  const toggled = scope === "all"
    ? accessible.map((map) => map.id)
    : selectedIds;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Mapas"
        title="Elegí tus mapas"
        description="Los mapas gratuitos están disponibles. El resto se desbloquea con monedas."
      />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            { key: "select", label: "Desbloqueados" },
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
        {isLoading && maps.length === 0 ? (
          <p className="col-span-2 text-sm text-muted-foreground">Cargando mapas…</p>
        ) : (
          shown.map((map) => (
            <MapCard
              key={map.id}
              map={map}
              selected={toggled.includes(map.id)}
              onToggle={
                scope === "select" && (map.unlocked || map.isFree)
                  ? () => toggleMap(map.id)
                  : undefined
              }
            />
          ))
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {error ? (
          <p className="text-center text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <p className="text-center text-xs text-muted-foreground">
          {accessible.length} de {maps.length} mapas desbloqueados
        </p>
        <Button
          size="lg"
          className="w-full"
          disabled={toggled.length === 0 || generate.isPending}
          onClick={() => {
            setError("");
            generate.mutate(toggled);
          }}
        >
          {generate.isPending ? (
            <>
              <LoaderCircle className="animate-spin" />
              Creando quiz…
            </>
          ) : (
            <>
              Crear quiz con {toggled.length} {toggled.length === 1 ? "mapa" : "mapas"}
              <ArrowRight data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}