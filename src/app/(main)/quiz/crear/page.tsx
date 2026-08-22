"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Crosshair, LoaderCircle, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InterstitialAd } from "@/components/ads/interstitial-ad";
import { PageHeader } from "@/components/layout/page-header";
import { mapService } from "@/lib/api/map.service";
import { quizService } from "@/lib/api/quiz.service";
import { userService } from "@/lib/api/user.service";
import { quizSession } from "@/lib/quiz-session";
import { MapCard } from "@/features/mapas/components/map-card";
import { cn } from "@/lib/utils";
import type { Lineup, Place } from "@/types";

type Scope = "select" | "all";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  reference: "Referencia",
  utility: "Utilidad",
  landing_spot: "Dónde cae",
  key_combo: "Teclas",
  player_position: "Jugador",
  map_location: "Lugares",
  map_area: "Zonas",
};

const UTIL_SHORT_LABELS: Record<string, string> = {
  smoke: "Smoke",
  molotov: "Molotov",
  flashbang: "Flash",
  he: "HE",
  decoy: "Decoy",
};

// Utilidades por nivel, desde la config del tipo "utility" (JSON text).
function parseUtilityLevels(text: string): Array<[string, number]> {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>)
        .filter(([, level]) => typeof level === "number")
        .map(([util, level]) => [util, level as number] as [string, number])
        .sort((a, b) => a[1] - b[1]);
    }
  } catch {
    /* JSON inválido: no se muestra nada. */
  }
  return [];
}

// Cantidades fijas para elegir cuántas preguntas hacer.
const FIXED_COUNTS = [5, 10, 20, 50, 100];

export default function QuizCreatePage() {
  const router = useRouter();
  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["maps"],
    queryFn: mapService.list,
  });
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: userService.me,
  });
  const { data: quizConfig } = useQuery({
    queryKey: ["quiz-config"],
    queryFn: quizService.config,
  });

  const [scope, setScope] = useState<Scope>("select");
  // touched=true una vez que el usuario eligió manualmente (evita pisar la preselección).
  const [touched, setTouched] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // touched=true una vez que el usuario eligió lugares a mano (evita pisar la preselección).
  const [placesTouched, setPlacesTouched] = useState(false);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  // touched=true una vez que el usuario eligió lineups a mano (evita pisar la preselección).
  const [lineupsTouched, setLineupsTouched] = useState(false);
  const [selectedLineups, setSelectedLineups] = useState<Set<string>>(new Set());
  const [questionType, setQuestionType] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "hard">("easy");
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [adVisible, setAdVisible] = useState(false);

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
  // Todos los lugares desbloqueados de la selección de mapas.
  const allSelectablePlaceIds = useMemo(
    () => new Set(selectablePlaces.map(({ place }) => place.id)),
    [selectablePlaces],
  );
  // Selección efectiva: todos los lugares por defecto hasta que el usuario toque.
  const effectivePlaces = placesTouched ? selectedPlaces : allSelectablePlaceIds;
  const selectedPlacesList = useMemo(
    () =>
      selectablePlaces.filter(({ place }) => effectivePlaces.has(place.id)),
    [selectablePlaces, effectivePlaces],
  );

  // Lineups desbloqueados de los mapas elegidos (se pueden filtrar en el quiz).
  const selectableLineups = useMemo(() => {
    const result: { mapId: string; place: Place; lineup: Lineup }[] = [];
    for (const mapId of toggled) {
      const map = maps.find((item) => item.id === mapId);
      if (!map) continue;
      for (const place of map.places) {
        for (const lineup of place.lineups ?? []) {
          if (lineup.unlocked) result.push({ mapId, place, lineup });
        }
      }
    }
    return result;
  }, [maps, toggled]);
  // Los lineups arrancan deseleccionados (opt-in): así "solo lugares" es el
  // comportamiento real y no se cuelan preguntas de lineup cuando el usuario
  // elige únicamente lugares.
  const effectiveLineups = lineupsTouched ? selectedLineups : new Set<string>();
  const selectedLineupsList = useMemo(
    () =>
      selectableLineups.filter(({ lineup }) => effectiveLineups.has(lineup.id)),
    [selectableLineups, effectiveLineups],
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
    setPlacesTouched(true);
    setSelectedPlaces((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function toggleLineup(lineupId: string) {
    setLineupsTouched(true);
    setSelectedLineups((prev) => {
      const next = new Set(prev);
      if (next.has(lineupId)) next.delete(lineupId);
      else next.add(lineupId);
      return next;
    });
  }

  const availableQuery = useQuery({
    queryKey: [
      "quiz-available",
      [...toggled].sort(),
      [...effectivePlaces].sort(),
      [...effectiveLineups].sort(),
      questionType,
    ],
    queryFn: () =>
      quizService.available({
        maps: toggled,
        placeIds: [...effectivePlaces].map(Number),
        lineupIds: [...effectiveLineups].map(Number),
        type: questionType || undefined,
      }),
    enabled: toggled.length > 0,
  });
  const max = availableQuery.data?.available ?? 0;
  // Cantidad efectiva: sin elegir, arranca en min(max, 5); siempre acotada a max.
  const effectiveCount = count === 0 ? Math.min(max, 5) : Math.min(count, max);
  // Total de lugares y lineups de los mapas elegidos (aunque estén bloqueados):
  // la meta. Suma 1 pregunta por lugar + las preguntas de cada lineup.
  const total = useMemo(
    () =>
      toggled.reduce((sum, mapId) => {
        const map = maps.find((item) => item.id === mapId);
        if (!map) return sum;
        const lineupQuestions = (map.places ?? []).reduce(
          (s, place) =>
            s +
            (place.lineups ?? []).reduce(
              (q, lineup) => q + (lineup.questionCount ?? 0),
              0,
            ),
          0,
        );
        return sum + (map.places?.length ?? 0) + lineupQuestions;
      }, 0),
    [maps, toggled],
  );
  // Botones fijos (5, 10, 20, 50, 100) + "Máximo" (total). Solo aparecen los
  // fijos que el total puede alcanzar, y se deshabilitan los que el disponible
  // todavía no permite (incentivo para seguir desbloqueando).
  const countOptions = useMemo(() => {
    if (max <= 0) return [];
    const fixed = FIXED_COUNTS.filter((value) => value <= total);
    const values = fixed.includes(total) ? fixed : [...fixed, total];
    return values.map((value) => ({ value, enabled: value <= max }));
  }, [max, total]);

  const generate = useMutation({
      mutationFn: (mapIds: string[]) =>
        quizService.create(mapIds, {
          placeIds: [...effectivePlaces].map(Number),
          lineupIds: [...effectiveLineups].map(Number),
          questionType: questionType || undefined,
          count: effectiveCount || undefined,
          difficulty,
        }),
    onSuccess: (quiz) => {
      quizSession.save(quiz);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo crear el quiz.");
      setAdVisible(false);
    },
  });

  // Se avanza al quiz recién cuando la publicidad está cerrada y la creación terminó.
  useEffect(() => {
    if (generate.isSuccess && !adVisible) router.push("/quiz");
  }, [generate.isSuccess, adVisible, router]);

  const availableTypes = me?.unlocked.questionTypes ?? [];
  const typeOptions = ["", ...availableTypes];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Quiz"
        title="Crear un quiz"
        description="Elegí mapas, lugares y lineups, y definí cuántas preguntas querés."
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
                const isSelected = effectivePlaces.has(place.id);
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Lineups desbloqueados</h2>
            <span className="text-xs text-muted-foreground">
              {selectedLineupsList.length} de {selectableLineups.length} seleccionados
            </span>
          </div>
          {selectableLineups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tenés lineups desbloqueados en estos mapas. Desbloquealos desde el detalle del mapa.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectableLineups.map(({ place, lineup }) => {
                const isSelected = effectiveLineups.has(lineup.id);
                return (
                  <button
                    key={lineup.id}
                    type="button"
                    onClick={() => toggleLineup(lineup.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex max-w-full flex-col items-start gap-0.5 rounded-xl border px-3 py-1.5 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <Crosshair className="size-3.5 shrink-0" />
                      <span className="truncate">{lineup.title}</span>
                    </span>
                    <span
                      className={cn(
                        "text-[11px]",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {place.name} · {lineup.questionCount ?? 0}{" "}
                      {lineup.questionCount === 1 ? "pregunta" : "preguntas"}
                    </span>
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
          <p className="text-xs text-muted-foreground">
            Desbloqueo de tipos (configurable desde el panel &quot;Tipos de pregunta&quot;):
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {(me?.unlocked.questionTypeConfigs ?? []).map((config) => {
              const isUnlocked = availableTypes.includes(config.questionType);
              const unlock =
                config.unlockLevel === null
                  ? "Monedas"
                  : config.unlockLevel === 0
                    ? "Inicial"
                    : `Nv ${config.unlockLevel}`;
              return (
                <span
                  key={config.questionType}
                  className={cn(
                    isUnlocked
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {config.label} ({unlock})
                  {isUnlocked ? " ✓" : ""}
                </span>
              );
            })}
          </div>
          {(() => {
            const utilityConfig = (me?.unlocked.questionTypeConfigs ?? []).find(
              (config) => config.questionType === "utility",
            );
            const levels = utilityConfig
              ? parseUtilityLevels(utilityConfig.utilityLevels)
              : [];
            if (levels.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {levels.map(([util, level]) => {
                  const unlocked = me?.unlocked.utilities.includes(util);
                  return (
                    <span
                      key={util}
                      className={cn(unlocked && "font-semibold text-foreground")}
                    >
                      {UTIL_SHORT_LABELS[util] ?? util} (Nv {level})
                      {unlocked ? " ✓" : ""}
                    </span>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : null}

      {toggled.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Dificultad</h2>
          <div className="flex flex-wrap gap-2">
            {(["easy", "hard"] as const).map((value) => {
              const label = value === "easy" ? "Fácil" : "Difícil";
              const isActive = difficulty === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty(value)}
                  aria-pressed={isActive}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {label}
                  {value === "hard" && quizConfig
                    ? ` · ${quizConfig.hardSecondsPerQuestion}s`
                    : ""}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Fácil va sin tiempo. Difícil usa un timer por pregunta (se ajusta en el panel).
          </p>
        </div>
      ) : null}

      {toggled.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Cantidad de preguntas</h2>
          <span className="text-sm font-semibold tabular-nums">{effectiveCount}</span>
          {max > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {countOptions.map(({ value, enabled }) => {
                  const isMax = value === total;
                  const isActive = effectiveCount === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={!enabled}
                      onClick={() => setCount(value)}
                      aria-pressed={isActive}
                      className={cn(
                        "flex flex-col items-center rounded-full border px-4 py-1.5 tabular-nums transition-colors",
                        isMax && "px-4",
                        !enabled && "cursor-not-allowed opacity-40",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <span className="text-sm font-semibold leading-tight">{value}</span>
                      {isMax ? (
                        <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                          Máximo
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Hay {max} preguntas disponibles de {total} en total. Desbloqueá más lugares, lineups o tipos para ampliar el quiz.
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
            setAdVisible(true);
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

      <InterstitialAd
        open={adVisible}
        ready={generate.isSuccess}
        onClose={() => setAdVisible(false)}
      />
    </div>
  );
}