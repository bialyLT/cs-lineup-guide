"use client";

import { useRef, type PointerEvent } from "react";

import { cn } from "@/lib/utils";

export type AreaState = "idle" | "correct" | "incorrect";

interface MapAreaTapProps {
  /** Zona correcta: posición (0-100) y radio de tolerancia (0-100). */
  target?: { x: number; y: number; radius: number } | null;
  /** Toque actual del usuario (0-100). */
  tap?: { x: number; y: number } | null;
  /** Si puede tocar para seleccionar (fase de respuesta). */
  interactive?: boolean;
  /** Notifica la coordenada del toque en unidades 0-100. */
  onTap?: (pos: { x: number; y: number }) => void;
  /** Estado de corrección para pintar el toque tras responder. */
  state?: AreaState;
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function MapAreaTap({
  target,
  tap,
  interactive = false,
  onTap,
  state = "idle",
}: MapAreaTapProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    if (!interactive || !onTap || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100);
    onTap({ x, y });
  }

  const tapColor =
    state === "correct"
      ? "border-success bg-success text-success-foreground"
      : state === "incorrect"
        ? "border-destructive bg-destructive text-destructive-foreground"
        : "border-primary bg-primary text-primary-foreground";

  return (
    <div
      ref={ref}
      onPointerDown={handlePointer}
      className={cn(
        "absolute inset-0 z-20",
        interactive ? "cursor-crosshair" : "cursor-default",
      )}
      aria-hidden={!interactive}
    >
      {/* Zona correcta: círculo centrado en el marcador del lugar. */}
      {target ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-success/70 bg-success/15"
          style={{
            left: `${target.x}%`,
            top: `${target.y}%`,
            width: `${target.radius * 2}%`,
            height: `${target.radius * 2}%`,
          }}
        />
      ) : null}

      {/* Toque del usuario. */}
      {tap ? (
        <div
          className={cn(
            "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-full border-2 text-[10px] font-semibold shadow-sm",
            tapColor,
          )}
          style={{ left: `${tap.x}%`, top: `${tap.y}%` }}
        >
          {state === "correct" ? "✓" : state === "incorrect" ? "✕" : ""}
        </div>
      ) : null}
    </div>
  );
}
