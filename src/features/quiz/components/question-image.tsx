"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface QuestionImageProps {
  /** URL de la imagen de referencia (opcional: se muestra una silueta placeholder). */
  src?: string;
  alt?: string;
  /** Puntos/ReferencePoints que se ubican sobre la imagen. */
  children?: ReactNode;
  aspectRatio?: string;
  placeholderLabel?: string;
  className?: string;
}

/**
 * Contenedor de la imagen de una pregunta. Las referencias se colocan con
 * coordenadas relativas (0-100) mediante children posicionados.
 */
export function QuestionImage({
  src,
  alt = "Mapa de referencia",
  children,
  aspectRatio = "aspect-[4/5]",
  placeholderLabel,
  className,
}: QuestionImageProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 items-center justify-center overflow-hidden",
        className,
      )}
    >
      {src ? (
        <div className="relative max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="block h-auto max-h-[38vh] w-auto max-w-full"
          />
          {children}
        </div>
      ) : (
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl ring-1 ring-foreground/10",
            aspectRatio,
          )}
        >
          <div
            className="absolute inset-0 flex items-center justify-center bg-muted"
            aria-hidden
          >
            <div className="absolute inset-0 opacity-[0.55] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:calc(100%/8)_calc(100%/6)]" />
            <span className="relative text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {placeholderLabel ?? "Mapa"}
            </span>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}