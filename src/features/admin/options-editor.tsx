"use client";

import { useState, type MouseEvent } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Opción de respuesta en edición (borrador). */
export interface DraftOption {
  /** Clave local única dentro del formulario. */
  key: string;
  /** ID de la opción existente (undefined para las nuevas). */
  id?: number | string;
  text: string;
  is_correct: boolean;
  order: string;
  x: string;
  y: string;
}

export interface OptionsEditorProps {
  imageUrl: string | null;
  value: DraftOption[];
  onChange: (next: DraftOption[]) => void;
  loading?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function newKey() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function OptionsEditor({
  imageUrl,
  value,
  onChange,
  loading,
}: OptionsEditorProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = value.find((option) => option.key === selectedKey) ?? null;

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando opciones…</p>
    );
  }

  if (!imageUrl) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        La pregunta todavía no tiene imagen. Agregá una imagen arriba para poder
        marcar las opciones de respuesta.
      </div>
    );
  }

  function updateOption(key: string, patch: Partial<DraftOption>) {
    onChange(value.map((option) => (option.key === key ? { ...option, ...patch } : option)));
  }

  function removeOption(key: string) {
    onChange(value.filter((option) => option.key !== key));
    if (selectedKey === key) setSelectedKey(null);
  }

  function handleImageClick(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100).toFixed(2);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100).toFixed(2);
    const nextOrder =
      value.reduce((max, option) => Math.max(max, Number(option.order) || 0), 0) + 1;
    const option: DraftOption = {
      key: newKey(),
      text: "",
      is_correct: false,
      order: String(nextOrder),
      x,
      y,
    };
    onChange([...value, option]);
    setSelectedKey(option.key);
  }

  const selectedIndex = selected ? value.indexOf(selected) : -1;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Marcar opciones sobre la imagen"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const nextOrder =
              value.reduce((max, option) => Math.max(max, Number(option.order) || 0), 0) + 1;
            const option: DraftOption = {
              key: newKey(),
              text: "",
              is_correct: false,
              order: String(nextOrder),
              x: "50",
              y: "50",
            };
            onChange([...value, option]);
            setSelectedKey(option.key);
          }
        }}
        onClick={handleImageClick}
        className="relative w-full cursor-crosshair overflow-hidden rounded-lg ring-1 ring-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Imagen de la pregunta"
          draggable={false}
          className="h-auto w-full select-none"
        />
        {value.map((option, index) => (
          <button
            key={option.key}
            type="button"
            aria-label={`Opción ${index + 1}`}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedKey(option.key);
            }}
            className={cn(
              "absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold shadow-md transition-colors",
              option.is_correct
                ? "bg-green-600 text-white"
                : "bg-foreground text-background",
              selectedKey === option.key && "ring-2 ring-destructive",
            )}
            style={{ left: `${option.x}%`, top: `${option.y}%` }}
            title={option.text || `Opción ${index + 1}`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {selected && selectedIndex >= 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Opción {selectedIndex + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Eliminar opción"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => removeOption(selected.key)}
            >
              <Trash2 />
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`opt-${selected.key}-text`}>Texto</Label>
            <Input
              id={`opt-${selected.key}-text`}
              value={selected.text}
              placeholder="Texto de la opción (opcional)"
              onChange={(event) => updateOption(selected.key, { text: event.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`opt-${selected.key}-x`}>X (0-100)</Label>
              <Input
                id={`opt-${selected.key}-x`}
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={selected.x}
                onChange={(event) => updateOption(selected.key, { x: event.target.value })}
                className="h-8 w-24"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`opt-${selected.key}-y`}>Y (0-100)</Label>
              <Input
                id={`opt-${selected.key}-y`}
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={selected.y}
                onChange={(event) => updateOption(selected.key, { y: event.target.value })}
                className="h-8 w-24"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`opt-${selected.key}-order`}>Orden</Label>
              <Input
                id={`opt-${selected.key}-order`}
                type="number"
                min={0}
                step={1}
                value={selected.order}
                onChange={(event) => updateOption(selected.key, { order: event.target.value })}
                className="h-8 w-20"
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-1">
              <input
                type="checkbox"
                checked={selected.is_correct}
                onChange={(event) =>
                  updateOption(selected.key, { is_correct: event.target.checked })
                }
                className="size-4 accent-foreground"
              />
              <span className="text-sm">Correcta</span>
            </label>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Hacé clic sobre la imagen para agregar una opción. Después tocá cada
          marcador para editarla.
        </p>
      )}
    </div>
  );
}