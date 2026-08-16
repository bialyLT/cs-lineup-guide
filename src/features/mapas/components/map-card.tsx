"use client";

import { motion } from "motion/react";
import { Check, Coins, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Map } from "@/types";

interface MapCardProps {
  map: Map;
  selected?: boolean;
  /** Si se pasa, la tarjeta navega al detalle del mapa (link). */
  href?: string;
  onToggle?: () => void;
  className?: string;
}

export function MapCard({ map, selected = false, href, onToggle, className }: MapCardProps) {
  const locked = !map.unlocked;
  const selectable = Boolean(onToggle) && !locked;

  const sharedClass = cn(
    "group relative flex flex-col overflow-hidden rounded-xl text-left ring-1 ring-foreground/10 transition-colors",
    selected && "ring-2 ring-primary",
    locked && "opacity-70",
    className,
  );

  const content = (
    <>
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:16px_16px]" />
        <span className="relative text-4xl font-bold tracking-tighter text-foreground/15">
          {map.name.charAt(0)}
        </span>
        {locked ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/30">
            <span className="flex size-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm">
              <Lock className="size-4" />
            </span>
          </span>
        ) : null}
        {selected ? (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="size-3.5" strokeWidth={3} />
          </motion.span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className={cn("text-sm font-semibold", locked && "text-muted-foreground")}>
          {map.name}
        </span>
        {map.isFree ? (
          <Badge variant="secondary" className="bg-success/10 text-success">
            Gratis
          </Badge>
        ) : locked ? (
          <Badge variant="secondary" className="gap-1">
            <Coins className="size-3 text-warning" />
            {map.unlockCost ?? 0}
          </Badge>
        ) : (
          <Badge variant="secondary">Desbloqueado</Badge>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        whileTap={!locked ? { scale: 0.98 } : undefined}
        className={sharedClass}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={selectable ? { scale: 0.98 } : undefined}
      onClick={selectable ? onToggle : undefined}
      disabled={!selectable}
      aria-pressed={selected}
      className={sharedClass}
    >
      {content}
    </motion.button>
  );
}
