"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { mapService } from "@/lib/api/map.service";
import { quizService } from "@/lib/api/quiz.service";
import { userService } from "@/lib/api/user.service";
import { quizSession } from "@/lib/quiz-session";
import { MapCard } from "@/features/mapas/components/map-card";
import { cn } from "@/lib/utils";
import type { Place } from "@/types";

type Scope = "select" | "all";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  reference: "Referencia",
  utility: "Utilidad",
  landing_spot: "Dónde cae",
  key_combo: "Teclas",
  player_position: "Jugador",
  map_location: "Lugares",
};

export default function MapasPage() {
  const router = useRouter();
  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["maps"],
    queryFn: mapService.list,
  });
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: userService.me,
  });

  const [scope, setScope] = useState<Scope>("select");
  // touched=true una vez que el usuario eligió manualmente (evita pisar la preselección).
  const [touched, setTouched] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [questionType, setQuestionType] = useState("");
  const [count, setCount] = useState(0);
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
  const toggled = scope === "all"
    ? accessible.map((map) => map.id)
    : selectedIds;

  // Lugares desbloqueados de los mapas elegidos (se pueden filtrar en el quiz).
  const selectablePlaces = useMemo(() => {
    const result: { mapId: string; place: Place }[] = [];
    for (const mapId of toggled) {
      const map = maps.find((item) => item.id === mapId);
      if (!map) continue;
      for (const place of map.places) {
        if (place.unlocked) result.push({ mapId, place });
      }
    }
    return result;
  }, [maps, toggled]);
  const selectedPlacesList = useMemo(
    () =>
      selectablePlaces.filter(({ place }) => selectedPlaces.has(place.id)),
    [selectablePlaces, selectedPlaces],
  );

  function toggleMap(id: string) {
    if (scope !== "select") return;
    const removing = touched ? selected.has(id) : defaultSelection.has(id);
    setTouched(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (removing) {
      setSelectedPlaces((prev) => {
        const mapPlaces = maps.find((item) => item.id === id)?.places ?? [];
        const removeIds = new Set(mapPlaces.map((place) => place.id));
        return new Set([...prev].filter((placeId) => !removeIds.has(placeId)));
      });
    }
  }

  function togglePlace(placeId: string) {
    setSelectedPlaces((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  const availableQuery = useQuery({
    queryKey: [
      "quiz-available",
      [...toggled].sort(),
      [...selectedPlaces].sort(),
      questionType,
    ],
    queryFn: () =>
      quizService.available({
        maps: toggled,
        placeIds: [...selectedPlaces].map(Number),
        type: questionType || undefined,
      }),
    enabled: toggled.length > 0,
  });
  const max = availableQuery.data?.available ?? 0;
  // Cantidad efectiva: sin elegir, arranca en min(max, 5); siempre acotada a max.
  const effectiveCount = count === 0 ? Math.min(max, 5) : Math.min(count, max);

  const generate = useMutation({
    mutationFn: (mapIds: string[]) =>
      quizService.create(mapIds, {
        placeIds: [...selectedPlaces].map(Number),
        questionType: questionType || undefined,
        count: effectiveCount || undefined,
      }),
    onSuccess: (quiz) => {
      quizSession.save(quiz);
      router.push("/quiz");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo crear el quiz.");
    },
  });

  const availableTypes = me?.unlocked.questionTypes ?? [];
  const typeOptions = ["", ...availableTypes];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Mapas"
        title="Elegí tus mapas"
        description="Elegí lugares y tipos, y definí cuántas preguntas querés."
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

      {toggled.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Lugares</h2>
            <span className="text-xs text-muted-foreground">
              {selectedPlacesList.length} de {selectablePlaces.length} seleccionados
            </span>
          </div>
          {selectablePlaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tenés lugares desbloqueados en estos mapas. Desbloqueá lugares desde el detalle del mapa.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectablePlaces.map(({ place }) => {
                const isSelected = selectedPlaces.has(place.id);
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => togglePlace(place.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <MapPin className="size-3.5" />
                    {place.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {toggled.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Tipo de pregunta</h2>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((type) => {
              const label = type ? QUESTION_TYPE_LABELS[type] ?? type : "Todos";
              const isActive = questionType === type;
              return (
                <button
                  key={type || "all"}
                  type="button"
                  onClick={() => setQuestionType(type)}
                  aria-pressed={isActive}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {toggled.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Cantidad de preguntas</h2>
            <span className="text-sm font-semibold tabular-nums">{effectiveCount}</span>
          </div>
          {max > 0 ? (
            <>
              <input
                type="range"
                min={1}
                max={max}
                value={Math.min(Math.max(effectiveCount, 1), max)}
                onChange={(event) => setCount(Number(event.target.value))}
                className="w-full accent-primary"
                aria-label="Cantidad de preguntas"
              />
              <p className="text-xs text-muted-foreground">
                Máximo {max} preguntas según tu selección. Desbloqueá más lugares o tipos para ampliar el quiz.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay preguntas disponibles para esta selección. {availableQuery.isLoading ? "Calculando…" : ""}
            </p>
          )}
        </div>
      ) : null}

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
          disabled={toggled.length === 0 || max === 0 || generate.isPending}
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
              Crear quiz con {effectiveCount} {effectiveCount === 1 ? "pregunta" : "preguntas"}
              <ArrowRight data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
