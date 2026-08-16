"use client";

import { Check, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Place } from "@/types";

interface PlaceSelectorProps {
  mapName: string;
  mapImageUrl?: string;
  places: Place[];
  selectedIds: string[];
  max?: number;
  onToggle: (placeId: string) => void;
}

/**
 * Selector de lugares sobre el overview del mapa. Sirve para elegir los
 * primeros lugares del usuario (onboarding).
 */
export function PlaceSelector({
  mapName,
  mapImageUrl,
  places,
  selectedIds,
  max = 5,
  onToggle,
}: PlaceSelectorProps) {
  const atMax = selectedIds.length >= max;

  function toggle(placeId: string) {
    if (selectedIds.includes(placeId)) {
      onToggle(placeId);
      return;
    }
    if (!atMax) onToggle(placeId);
  }

  const markers = places.filter(
    (place) =>
      place.position &&
      (place.position.x > 0 || place.position.y > 0),
  );

  return (
    <div className="flex flex-col gap-4">
      {mapImageUrl ? (
        <div className="relative w-full overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapImageUrl}
            alt={`Mapa ${mapName}`}
            draggable={false}
            className="h-auto w-full select-none"
          />
          {markers.map((place, index) => {
            const selected = selectedIds.includes(place.id);
            const disabled = !selected && atMax;
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => toggle(place.id)}
                disabled={disabled}
                aria-pressed={selected}
                aria-label={place.name}
                className={cn(
                  "absolute z-10 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-sm outline-none transition-transform",
                  selected
                    ? "scale-110 border-primary bg-primary text-primary-foreground"
                    : "border-foreground/50 bg-background/80 text-foreground hover:scale-110",
                  disabled && "opacity-40",
                )}
                style={{
                  left: `${place.position.x}%`,
                  top: `${place.position.y}%`,
                }}
              >
                <span className="absolute inset-1 rounded-full border border-current opacity-50" />
                {selected ? (
                  <Check className="relative size-3.5" strokeWidth={3} />
                ) : (
                  <span className="relative">{index + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          El mapa no tiene imagen todavía.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {places.map((place) => {
          const selected = selectedIds.includes(place.id);
          const disabled = !selected && atMax;
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => toggle(place.id)}
              disabled={disabled}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
                disabled && "opacity-50",
              )}
            >
              <MapPin className="size-3.5" />
              {place.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
