"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  Coins,
  Crown,
  LoaderCircle,
  Lock,
  MapPin,
  Unlock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mapService } from "@/lib/api/map.service";
import { userService } from "@/lib/api/user.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Place } from "@/types";

const UTIL_LABELS: Record<string, string> = {
  smoke: "Smoke",
  flashbang: "Flash",
  he: "HE",
  molotov: "Molotov",
  decoy: "Decoy",
};

export default function MapDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<string[]>([]);
  const [error, setError] = useState("");

  const { data: maps = [] } = useQuery({
    queryKey: ["maps"],
    queryFn: mapService.list,
  });
  const map = maps.find((item) => item.id === slug);

  const { data: places = [], isLoading: placesLoading } = useQuery({
    queryKey: ["map-places", slug],
    queryFn: () => mapService.getPlaces(slug),
    enabled: Boolean(slug),
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: userService.me,
  });
  const coins = me?.progression.coins ?? 0;
  const remainingStarter = me?.unlocked.remainingStarterPlaces ?? 0;
  const userPlan = me?.user.plan ?? "free";
  const proLocked = Boolean(map?.requiresProPlan) && userPlan === "free";

  const unlock = useMutation({
    mutationFn: ({
      kind,
      id,
      via,
    }: {
      kind: "map" | "place" | "lineup";
      id: string | number;
      via?: "coins" | "starter";
    }) => userService.unlock(kind, id, via),
    onSuccess: (payload, variables) => {
      queryClient.setQueryData(["me"], payload);
      queryClient.invalidateQueries({ queryKey: ["maps"] });
      queryClient.invalidateQueries({ queryKey: ["map-places", slug] });
      const itemId = String(variables.id);
      if (variables.kind === "map") {
        const name = maps.find((item) => item.id === itemId)?.name ?? "el mapa";
        toast.success(`¡Desbloqueaste ${name}!`);
      } else if (variables.kind === "lineup") {
        const lineup = places
          .flatMap((place) => place.lineups ?? [])
          .find((item) => String(item.id) === itemId);
        toast.success(
          `¡Desbloqueaste el lineup "${lineup?.title ?? "sin nombre"}"! Te quedan ${payload.progression.coins} monedas.`,
        );
      } else {
        const name = places.find((item) => item.id === itemId)?.name ?? "el lugar";
        toast.success(
          variables.via === "starter"
            ? `¡Desbloqueaste ${name} gratis!`
            : `¡Desbloqueaste ${name}! Te quedan ${payload.progression.coins} monedas.`,
        );
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo desbloquear.");
    },
  });

  function toggleOpen(placeId: string) {
    setOpen((current) =>
      current.includes(placeId)
        ? current.filter((id) => id !== placeId)
        : [...current, placeId],
    );
  }

  if (!map) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/mapas"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <p className="text-sm text-muted-foreground">
          {placesLoading ? "Cargando el mapa…" : "Mapa no encontrado."}
        </p>
      </div>
    );
  }

  const locked = !map.unlocked && !map.isFree;
  const mapUnlockCost = map.unlockCost ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/mapas"
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{map.name}</h1>
          {map.isFree ? (
            <Badge variant="secondary" className="w-fit bg-success/10 text-success">
              Gratis
            </Badge>
          ) : map.requiresProPlan && !map.unlocked ? (
            <Badge
              variant="secondary"
              className="w-fit gap-1 bg-primary/10 text-primary"
            >
              <Crown className="size-3" />
              Pro
            </Badge>
          ) : locked ? (
            <Badge variant="secondary" className="w-fit gap-1">
              <Lock className="size-3" />
              Bloqueado
            </Badge>
          ) : (
            <Badge variant="secondary" className="w-fit">
              Desbloqueado
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm ring-1 ring-foreground/10">
          <Coins className="size-3.5 text-warning" />
          <span className="font-semibold tabular-nums">{coins}</span>
        </div>
      </div>

      {error ? (
        <p className="text-center text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {locked ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/40 p-4">
          {proLocked ? (
            <>
              <p className="text-sm text-muted-foreground">
                Este mapa es exclusivo del Plan Pro. Pasate al plan Pro para
                desbloquearlo con monedas.
              </p>
              <Button size="lg" className="w-full" disabled>
                <Crown />
                Requiere Plan Pro
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Desbloqueá el mapa para poder desbloquear sus lugares y lineups.
              </p>
              <Button
                size="lg"
                className="w-full"
                disabled={coins < mapUnlockCost || unlock.isPending}
                onClick={() => {
                  setError("");
                  unlock.mutate({ kind: "map", id: map.id });
                }}
              >
                {unlock.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <>
                    <Unlock />
                    Desbloquear mapa
                    <span className="ml-auto flex items-center gap-1">
                      <Coins className="size-4" />
                      {mapUnlockCost}
                    </span>
                  </>
                )}
              </Button>
              {coins < mapUnlockCost ? (
                <p className="text-center text-xs text-muted-foreground">
                  Te faltan {mapUnlockCost - coins} monedas. Ganá monedas en los quizzes.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {map.imageUrl ? (
        <MapOverview
          mapName={map.name}
          mapImageUrl={map.imageUrl}
          places={places}
          onPlaceClick={(place) => {
            if (!locked) toggleOpen(place.id);
          }}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Lugares</h2>
          <span className="text-xs text-muted-foreground">
            {places.filter((place) => place.unlocked).length} de {places.length} desbloqueados
          </span>
        </div>
        {!locked && remainingStarter > 0 ? (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Te quedan{" "}
            <span className="font-semibold text-foreground">{remainingStarter}</span>{" "}
            {remainingStarter === 1 ? "lugar inicial gratis" : "lugares iniciales gratis"}{" "}
            para desbloquear sin gastar monedas.
          </p>
        ) : null}
        {places.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este mapa no tiene lugares todavía.</p>
        ) : (
          places.map((place) => (
            <PlaceRow
              key={place.id}
              place={place}
              locked={locked}
              coins={coins}
              canAfford={coins >= (place.unlockCost ?? 0)}
              remainingStarter={remainingStarter}
              expanded={open.includes(place.id)}
              unlocking={unlock.isPending}
              onToggle={() => toggleOpen(place.id)}
              onUnlock={() => {
                setError("");
                unlock.mutate({ kind: "place", id: place.id });
              }}
              onUnlockStarter={() => {
                setError("");
                unlock.mutate({ kind: "place", id: place.id, via: "starter" });
              }}
              onUnlockLineup={(lineupId) => {
                setError("");
                unlock.mutate({ kind: "lineup", id: lineupId });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MapOverview({
  mapName,
  mapImageUrl,
  places,
  onPlaceClick,
}: {
  mapName: string;
  mapImageUrl: string;
  places: Place[];
  onPlaceClick: (place: Place) => void;
}) {
  const markers = places.filter(
    (place) => place.position && (place.position.x > 0 || place.position.y > 0),
  );

  return (
    <div className="relative w-full overflow-hidden rounded-xl ring-1 ring-foreground/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mapImageUrl}
        alt={`Mapa ${mapName}`}
        draggable={false}
        className="h-auto w-full select-none"
      />
      {markers.map((place, index) => {
        const isUnlocked = place.unlocked;
        return (
          <button
            key={place.id}
            type="button"
            onClick={() => onPlaceClick(place)}
            aria-label={`${place.name}${isUnlocked ? " (desbloqueado)" : " (bloqueado)"}`}
            className={cn(
              "absolute z-10 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-sm outline-none transition-transform hover:scale-110",
              isUnlocked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-foreground/50 bg-background/80 text-muted-foreground",
            )}
            style={{
              left: `${place.position.x}%`,
              top: `${place.position.y}%`,
            }}
          >
            <span className="absolute inset-1 rounded-full border border-current opacity-50" />
            {isUnlocked ? <span className="relative">{index + 1}</span> : <Lock className="relative size-3" />}
          </button>
        );
      })}
    </div>
  );
}

function PlaceRow({
  place,
  locked,
  coins,
  canAfford,
  expanded,
  unlocking,
  remainingStarter,
  onToggle,
  onUnlock,
  onUnlockStarter,
  onUnlockLineup,
}: {
  place: Place;
  /** true si el MAPA está bloqueado. */
  locked: boolean;
  coins: number;
  canAfford: boolean;
  expanded: boolean;
  unlocking: boolean;
  remainingStarter: number;
  onToggle: () => void;
  onUnlock: () => void;
  onUnlockStarter: () => void;
  onUnlockLineup: (lineupId: string) => void;
}) {
  const isUnlocked = Boolean(place.unlocked);
  const lineups = place.lineups ?? [];
  const unlockedLineups = lineups.filter((lineup) => lineup.unlocked).length;
  const canExpand = !locked;

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center gap-3 px-3 py-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
            isUnlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <MapPin className="size-4" />
        </span>
        <button
          type="button"
          onClick={onToggle}
          disabled={!canExpand}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 flex-col items-start text-left"
        >
          <span className="truncate text-sm font-semibold">{place.name}</span>
          <span className="text-xs text-muted-foreground">
            {lineups.length > 0
              ? `${unlockedLineups} de ${lineups.length} lineups desbloqueados`
              : isUnlocked
                ? "Sin lineups todavía"
                : locked
                  ? "Requiere el mapa desbloqueado"
                  : "Bloqueado"}
          </span>
        </button>

        {isUnlocked ? (
          <Button variant="ghost" size="sm" aria-pressed={expanded} onClick={onToggle}>
            <ChevronDown
              className={cn("size-4 transition-transform", expanded && "rotate-180")}
            />
          </Button>
        ) : locked ? (
          <Badge variant="secondary" className="gap-1">
            <Lock className="size-3" />
          </Badge>
        ) : remainingStarter > 0 ? (
          <Button
            size="sm"
            variant="outline"
            disabled={unlocking}
            onClick={onUnlockStarter}
          >
            <Unlock className="size-3.5" />
            Gratis
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={!canAfford || unlocking}
            onClick={onUnlock}
          >
            <Coins className="size-3.5" />
            {place.unlockCost ?? 0}
          </Button>
        )}
      </div>

      {canExpand && expanded ? (
        <div className="flex flex-col border-t border-border/60 px-3 py-1">
          {lineups.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              Todavía no hay lineups en este lugar.
            </p>
          ) : (
            lineups.map((lineup) => (
              <div key={lineup.id} className="flex items-center gap-2 border-b border-border/40 py-2 last:border-b-0">
                <Badge variant="secondary" className="shrink-0">
                  {UTIL_LABELS[lineup.util] ?? lineup.util}
                </Badge>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{lineup.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {lineup.questionCount ?? 0} {lineup.questionCount === 1 ? "pregunta" : "preguntas"}
                  </span>
                  {lineup.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{lineup.description}</p>
                  ) : null}
                </div>
                {lineup.unlocked ? (
                  <Badge variant="secondary" className="shrink-0">
                    Desbloqueado
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={coins < (lineup.unlockCost ?? 0) || unlocking}
                    onClick={() => onUnlockLineup(String(lineup.id))}
                  >
                    <Coins className="size-3.5" />
                    {lineup.unlockCost ?? 0}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
