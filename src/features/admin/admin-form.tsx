"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminService } from "@/lib/api/admin.service";
import type {
  AdminField,
  AdminResourceConfig,
} from "@/lib/admin/resources";
import { cn } from "@/lib/utils";

import type { LookupMap } from "./admin-value";
import { OptionsEditor, type DraftOption } from "./options-editor";
import { questionPrompt, DEFAULT_QUESTION_PROMPT } from "@/lib/quiz/prompts";

/** Archivo pendiente de subir junto con su preview local (object URL). */
export interface AdminPendingFile {
  name: string;
  file: File;
  uploadTo: string;
}

/** Estado de un editor de opciones al momento de enviar el formulario. */
export interface AdminOptionList {
  /** Opciones cargadas desde el backend (para detectar borrados). */
  originals: DraftOption[];
  /** Opciones actuales del formulario. */
  drafts: DraftOption[];
}

export interface AdminFormProps {
  resource: AdminResourceConfig;
  initialValues?: Record<string, unknown>;
  relationOptions: Record<string, LookupMap>;
  /** Campos con valor fijo (ej. mapa fijado por un filtro): se muestran
   * deshabilitados pero se incluyen en el payload. */
  fixedValues?: Record<string, string | number | boolean>;
  submitLabel: string;
  busy: boolean;
  error?: string | null;
  /** Archivos de imagen que deben subirse a R2 recién al guardar, y listas
   * de opciones por campo options-editor. */
  onSubmit: (
    payload: Record<string, unknown>,
    files: AdminPendingFile[],
    optionLists: Record<string, AdminOptionList>,
  ) => void;
}

function fieldError(errors: Record<string, string>, name: string) {
  return errors[name] ?? "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function AdminForm({
  resource,
  initialValues,
  relationOptions,
  fixedValues = {},
  submitLabel,
  busy,
  error,
  onSubmit,
}: AdminFormProps) {
  const editable = resource.fields.filter((field) => !field.hidden);
  const isFixed = (name: string) =>
    Object.prototype.hasOwnProperty.call(fixedValues, name);

  // Preguntas: el enunciado (prompt) se autocompleta según el tipo elegido.
  const typeField = editable.find(
    (field) => field.name === "type" && field.type === "select",
  );
  const promptField = editable.find(
    (field) => field.name === "prompt" && field.type === "textarea",
  );
  const autoFilledPromptRef = useRef<string | null>(null);

  function computePromptFor(typeVal: unknown, placeVal: unknown): string {
    const type =
      typeof typeVal === "string" && typeVal.length > 0 ? typeVal : "";
    if (!type) return DEFAULT_QUESTION_PROMPT;
    const placeName =
      type === "map_location"
        ? relationOptions["place"]?.get(String(placeVal ?? "")) ?? "el lugar"
        : undefined;
    return questionPrompt(type, placeName);
  }

  function maybeFillPrompt(typeVal: unknown, placeVal: unknown) {
    if (!promptField) return;
    const current = String(values[promptField.name] ?? "");
    if (current === "" || current === autoFilledPromptRef.current) {
      const next = computePromptFor(typeVal, placeVal);
      autoFilledPromptRef.current = next;
      setValue(promptField.name, next);
    }
  }

  useEffect(() => {
    if (!promptField || !typeField) return;
    const initialType = values["type"] || effectiveValue(typeField);
    maybeFillPrompt(initialType, values["place"]);
    // Solo al montar: precargar el enunciado por defecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of editable) {
      if (isFixed(field.name)) {
        initial[field.name] = String(fixedValues[field.name]);
        continue;
      }
      const raw = initialValues?.[field.name];
      if (field.type === "boolean") {
        initial[field.name] = Boolean(raw);
      } else if (field.type === "relation" && field.multiple) {
        initial[field.name] = Array.isArray(raw) ? raw.map(String) : [];
      } else if (field.type === "password") {
        initial[field.name] = "";
      } else if (field.type === "map-position") {
        initial[field.name] = {
          x:
            field.positionOutput?.x && initialValues?.[field.positionOutput.x] != null
              ? String(initialValues[field.positionOutput.x])
              : "",
          y:
            field.positionOutput?.y && initialValues?.[field.positionOutput.y] != null
              ? String(initialValues[field.positionOutput.y])
              : "",
        };
      } else if (field.type === "options-editor") {
        initial[field.name] = [] as DraftOption[];
      } else if (raw === null || raw === undefined) {
        initial[field.name] = "";
      } else {
        initial[field.name] = String(raw);
      }
    }
    return initial;
  });

  /**
   * Valor efectivo de un campo: si es un select/relación requerido que el
   * usuario no tocó, usa la primera opción (el navegador la muestra pero el
   * estado quedaba en ""). Evita el falso "campo requerido" sin re-render.
   */
  function effectiveValue(field: AdminField): unknown {
    const raw = values[field.name];
    if (raw !== null && raw !== undefined && raw !== "") return raw;
    if (field.type === "select" && field.required && field.options?.length) {
      return field.options[0].value;
    }
    if (
      field.type === "relation" &&
      !field.multiple &&
      !field.readOnly &&
      field.required
    ) {
      const options = relationOptions[field.name];
      const first = options && options.size > 0 ? [...options.keys()][0] : "";
      return first;
    }
    return raw ?? "";
  }

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<
    Record<string, AdminPendingFile & { preview: string }>
  >({});
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const positionField = editable.find((field) => field.type === "map-position");
  const positionSource = positionField?.positionSource;
  const positionRelationField = positionSource
    ? resource.fields.find((field) => field.name === positionSource.relationField)
    : undefined;
  const positionMapId =
    positionSource && positionRelationField
      ? String(effectiveValue(positionRelationField) ?? "")
      : "";

  // Imagen elegida desde una relación (ej. imágenes del lineup en preguntas):
  // cuando la relación tiene valor, se muestran las imágenes para elegir.
  const imageSourceField = editable.find(
    (field) => field.type === "image" && field.imageSource,
  );
  const imageSourceRelationField = imageSourceField?.imageSource
    ? resource.fields.find(
        (field) => field.name === imageSourceField.imageSource?.relationField,
      )
    : undefined;
  const imageSourceConfig = imageSourceField?.imageSource;
  const imageSourceId =
    imageSourceConfig && imageSourceRelationField
      ? String(effectiveValue(imageSourceRelationField) ?? "")
      : "";

  const sourceImagesQuery = useQuery({
    queryKey: ["admin-source-images", imageSourceConfig?.resource, imageSourceId],
    queryFn: () => {
      if (!imageSourceConfig) return Promise.resolve([]);
      return adminService.list(imageSourceConfig.resource, {
        [imageSourceConfig.relationField]: imageSourceId,
      });
    },
    enabled: Boolean(imageSourceConfig && imageSourceId),
  });
  const [mapImageData, setMapImageData] = useState<
    Record<string, { loaded: boolean; url: string | null }>
  >({});

  // Lugares ya cargados del mapa seleccionado (se marcan como referencia).
  const [placesByMap, setPlacesByMap] = useState<
    Record<string, Array<{ id: number; name: string; x: number | null; y: number | null }>>
  >({});

  useEffect(() => {
    if (!positionSource || !positionMapId) return;
    let active = true;
    const relationField = resource.fields.find(
      (field) => field.name === positionSource.relationField,
    );
    if (!relationField?.resource) return;
    adminService
      .retrieve(relationField.resource, positionMapId)
      .then((record) => {
        const raw = record[positionSource.imageField];
        const url = typeof raw === "string" && raw.length > 0 ? raw : null;
        if (active) {
          setMapImageData((prev) => ({
            ...prev,
            [positionMapId]: { loaded: true, url },
          }));
        }
      })
      .catch(() => {
        if (active) {
          setMapImageData((prev) => ({
            ...prev,
            [positionMapId]: { loaded: true, url: null },
          }));
        }
      });
    return () => {
      active = false;
    };
  }, [positionMapId, positionSource, resource]);

  // Lugares del mapa seleccionado, para mostrarlos como referencia sobre la foto.
  useEffect(() => {
    if (!positionSource || !positionMapId) return;
    let active = true;
    adminService
      .list("places", { map: positionMapId })
      .then((records) => {
        if (!active) return;
        const items = records.map((record) => ({
          id: Number(record.id),
          name: String(record.name ?? ""),
          x: record.position_x != null ? Number(record.position_x) : null,
          y: record.position_y != null ? Number(record.position_y) : null,
        }));
        setPlacesByMap((prev) => ({ ...prev, [positionMapId]: items }));
      })
      .catch(() => {
        if (active) {
          setPlacesByMap((prev) => ({ ...prev, [positionMapId]: [] }));
        }
      });
    return () => {
      active = false;
    };
  }, [positionMapId, positionSource]);

  const optionsOriginalsRef = useRef<Record<string, DraftOption[]>>({});
  const [optionsLoading, setOptionsLoading] = useState(() =>
    Boolean(
      resource.fields.some((field) => field.type === "options-editor") &&
        initialValues?.id != null,
    ),
  );
  const recordId = initialValues?.id != null ? String(initialValues.id) : "";

  useEffect(() => {
    const editors = resource.fields.filter(
      (field) => field.type === "options-editor",
    );
    if (editors.length === 0 || !recordId) return;
    let active = true;
    Promise.all(
      editors.map(async (field) => {
        const config = field.optionsEditor;
        if (!config) return undefined;
        const records = await adminService.list(config.relatedResource, {
          [config.relationField]: recordId,
        });
        const drafts: DraftOption[] = records.map((record) => ({
          key: `opt-${String(record.id)}`,
          id: record.id,
          text: String(record.text ?? ""),
          is_correct: Boolean(record.is_correct),
          order: record.order != null ? String(record.order) : "0",
          x:
            record[config.positionOutput.x] != null
              ? String(record[config.positionOutput.x])
              : "",
          y:
            record[config.positionOutput.y] != null
              ? String(record[config.positionOutput.y])
              : "",
        }));
        return { fieldName: field.name, drafts };
      }),
    )
      .then((results) => {
        if (!active) return;
        const loaded: Record<string, DraftOption[]> = {};
        for (const result of results) {
          if (!result) continue;
          loaded[result.fieldName] = result.drafts;
        }
        setValues((prev) => ({ ...prev, ...loaded }));
        optionsOriginalsRef.current = {
          ...optionsOriginalsRef.current,
          ...loaded,
        };
        setOptionsLoading(false);
      })
      .catch(() => {
        if (active) setOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [recordId, resource]);

  function setValue(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(field: AdminField, file: File | null) {
    if (!file) return;
    const previous = pendingFiles[field.name];
    if (previous) {
      URL.revokeObjectURL(previous.preview);
      previewUrlsRef.current = previewUrlsRef.current.filter(
        (url) => url !== previous.preview,
      );
    }
    const preview = URL.createObjectURL(file);
    previewUrlsRef.current.push(preview);
    setPendingFiles((current) => ({
      ...current,
      [field.name]: { name: field.name, file, uploadTo: field.uploadTo ?? "maps", preview },
    }));
    setValue(field.name, "");
  }

  function handleRemoveImage(field: AdminField) {
    const previous = pendingFiles[field.name];
    if (previous) {
      URL.revokeObjectURL(previous.preview);
      previewUrlsRef.current = previewUrlsRef.current.filter(
        (url) => url !== previous.preview,
      );
    }
    setPendingFiles((current) => {
      const next = { ...current };
      delete next[field.name];
      return next;
    });
    setValue(field.name, "");
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const field of editable) {
      if (field.readOnly || field.type === "password") continue;
      const raw = effectiveValue(field);
      if (field.required) {
        const empty =
          raw === "" ||
          raw === null ||
          raw === undefined ||
          (Array.isArray(raw) && raw.length === 0);
        if (empty) next[field.name] = "Campo requerido.";
      }
      if (field.type === "number" && raw !== "" && raw !== null && raw !== undefined) {
        const num = Number(raw);
        if (Number.isNaN(num)) {
          next[field.name] = "Debe ser un número.";
        } else if (field.min !== undefined && num < field.min) {
          next[field.name] = `Mínimo ${field.min}.`;
        } else if (field.max !== undefined && num > field.max) {
          next[field.name] = `Máximo ${field.max}.`;
        }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const field of editable) {
      if (field.readOnly) continue;
      const raw = effectiveValue(field);
      switch (field.type) {
        case "boolean":
          payload[field.name] = Boolean(raw);
          break;
        case "number": {
          if (raw === "" || raw === null || raw === undefined) {
            if (field.nullable) payload[field.name] = null;
          } else {
            payload[field.name] = Number(raw);
          }
          break;
        }
        case "relation": {
          if (field.multiple) {
            payload[field.name] = Array.isArray(raw) ? raw : [];
          } else if (raw === "" || raw === null || raw === undefined) {
            if (field.nullable) payload[field.name] = null;
          } else {
            payload[field.name] = String(raw);
          }
          break;
        }
        case "password":
          if (typeof raw === "string" && raw.length > 0) {
            payload[field.name] = raw;
          }
          break;
        case "map-position": {
          const pos = (raw ?? {}) as { x?: string; y?: string };
          const toNumber = (value: string | undefined) =>
            value !== "" && value != null && !Number.isNaN(Number(value))
              ? Number(value)
              : null;
          if (field.positionOutput?.x) payload[field.positionOutput.x] = toNumber(pos.x);
          if (field.positionOutput?.y) payload[field.positionOutput.y] = toNumber(pos.y);
          break;
        }
        case "options-editor":
          break;
        default:
          payload[field.name] = raw ?? "";
      }
    }
    return payload;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    const files = editable
      .filter((field) => field.type === "image" && pendingFiles[field.name])
      .map((field) => ({
        name: field.name,
        file: pendingFiles[field.name].file,
        uploadTo: pendingFiles[field.name].uploadTo,
      }));
    const optionLists: Record<string, AdminOptionList> = {};
    for (const field of editable) {
      if (field.type !== "options-editor") continue;
      optionLists[field.name] = {
        originals: optionsOriginalsRef.current[field.name] ?? [],
        drafts: Array.isArray(values[field.name])
          ? (values[field.name] as DraftOption[])
          : [],
      };
    }
    onSubmit(buildPayload(), files, optionLists);
  }

  const inputClass = (name: string) =>
    cn(fieldError(errors, name) && "aria-invalid:border-destructive");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {editable.map((field) => {
        const current = values[field.name];
        const errorText = fieldError(errors, field.name);
        const fixedValue = isFixed(field.name) ? String(fixedValues[field.name]) : null;
        const fixedLabel =
          fixedValue && field.type === "relation"
            ? (relationOptions[field.name] ?? new Map()).get(fixedValue) ?? fixedValue
            : fixedValue;

        if (field.type === "boolean") {
          return (
            <div key={field.name} className="flex items-center gap-2">
              <input
                id={`field-${field.name}`}
                type="checkbox"
                checked={Boolean(current)}
                onChange={(event) => setValue(field.name, event.target.checked)}
                className="size-4 accent-foreground"
              />
              <Label htmlFor={`field-${field.name}`}>{field.label}</Label>
            </div>
          );
        }

        if (field.type === "image") {
          const pending = pendingFiles[field.name];
          const previewSrc = pending
            ? pending.preview
            : current
              ? String(current)
              : null;

          if (field.imageSource && imageSourceId) {
            const sourceImages = sourceImagesQuery.data ?? [];
            return (
              <div key={field.name} className="flex flex-col gap-1.5">
                <Label>{field.label}</Label>
                {sourceImagesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Cargando imágenes del lineup…
                  </p>
                ) : sourceImages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este lineup no tiene imágenes todavía. Agregalas desde{" "}
                    <Link
                      href={`/admin/lineup-images?lineup=${imageSourceId}`}
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Imágenes de lineup
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {sourceImages.map((img) => {
                      const url = String(img.image_url ?? "");
                      const isSelected = String(current) === url;
                      return (
                        <button
                          key={String(img.id)}
                          type="button"
                          onClick={() => setValue(field.name, url)}
                          aria-pressed={isSelected}
                          className={cn(
                            "relative aspect-video overflow-hidden rounded-lg ring-1 transition-colors",
                            isSelected
                              ? "ring-2 ring-primary"
                              : "ring-foreground/10 hover:ring-foreground/30",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Imagen del lineup"
                            className="h-full w-full object-cover"
                          />
                          {isSelected ? (
                            <span className="absolute inset-x-0 bottom-0 bg-primary px-1 py-0.5 text-center text-[10px] font-semibold text-primary-foreground">
                              Seleccionada
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
                {current ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(field)}
                    className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Quitar imagen
                  </button>
                ) : null}
                {field.helpText ? (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                ) : null}
              </div>
            );
          }

          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label>{field.label}</Label>
              <div className="flex items-center gap-3">
                {previewSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewSrc}
                    alt="Vista previa"
                    className="h-16 w-24 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
                  />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                    <ImagePlus className="size-5" />
                  </div>
                )}
                <div className="flex flex-col items-start gap-1.5">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        handleImageChange(field, event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                    <span
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted",
                      )}
                    >
                      {pending ? "Reemplazar" : current ? "Reemplazar" : "Subir imagen"}
                    </span>
                  </label>
                  {pending || current ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(field)}
                      className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Quitar imagen
                    </button>
                  ) : null}
                </div>
              </div>
              {pending ? (
                <p className="text-xs text-muted-foreground">
                  Se subirá al guardar los cambios.
                </p>
              ) : field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
            </div>
          );
        }

if (field.type === "options-editor") {
          const config = field.optionsEditor;
          const imageUrl = config
            ? pendingFiles[config.imageField]?.preview ||
              String(values[config.imageField] ?? "") ||
              String(initialValues?.[config.imageField] ?? "") ||
              null
            : null;
          const drafts = Array.isArray(current)
            ? (current as DraftOption[])
            : [];
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label>{field.label}</Label>
              {!config ? (
                <p className="text-sm text-muted-foreground">
                  Configuración incompleta del editor de opciones.
                </p>
              ) : (
                <OptionsEditor
                  imageUrl={imageUrl}
                  value={drafts}
                  onChange={(next) => setValue(field.name, next)}
                  loading={optionsLoading}
                />
              )}
            </div>
          );
        }

        if (field.type === "map-position") {
          const pos = (current ?? {}) as { x?: string; y?: string };
          const x = pos.x ?? "";
          const y = pos.y ?? "";
          const hasPosition = x !== "" && y !== "";

          const mapEntry = positionMapId ? mapImageData[positionMapId] : undefined;
          const relationField = resource.fields.find(
            (f) => f.name === positionSource?.relationField,
          );
          const relationResource = relationField?.resource;
          const mapLabel = positionSource
            ? (relationOptions[positionSource.relationField] ?? new Map()).get(
                positionMapId,
              ) ?? positionMapId
            : "";

          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label>{field.label}</Label>

              {!positionMapId ? (
                <p className="text-sm text-muted-foreground">
                  Seleccioná un mapa primero para poder marcar la posición del lugar.
                </p>
              ) : !mapEntry?.loaded ? (
                <p className="text-sm text-muted-foreground">
                  Cargando foto del mapa…
                </p>
              ) : !mapEntry.url ? (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4 text-sm">
                  <p className="text-muted-foreground">
                    El mapa{" "}
                    <span className="font-medium text-foreground">{mapLabel}</span> no
                    tiene foto todavía. Agregá la foto del mapa para poder marcar la
                    posición del lugar.
                  </p>
                  {relationResource ? (
                    <Button variant="outline" size="sm" asChild className="w-fit">
                      <Link href={`/admin/${relationResource}/${positionMapId}`}>
                        Agregar foto del mapa
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Marcar posición sobre la foto del mapa"
                    onKeyDown={(event) => {
                      const step = event.shiftKey ? 1 : 0.1;
                      const next = {
                        x: parseFloat(x || "50"),
                        y: parseFloat(y || "50"),
                      };
                      if (event.key === "ArrowLeft") next.x = clamp(next.x - step, 0, 100);
                      else if (event.key === "ArrowRight") next.x = clamp(next.x + step, 0, 100);
                      else if (event.key === "ArrowUp") next.y = clamp(next.y - step, 0, 100);
                      else if (event.key === "ArrowDown") next.y = clamp(next.y + step, 0, 100);
                      else return;
                      event.preventDefault();
                      setValue(field.name, {
                        x: next.x.toFixed(2),
                        y: next.y.toFixed(2),
                      });
                    }}
                    onClick={(event: MouseEvent<HTMLDivElement>) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      const nextX = clamp(
                        ((event.clientX - rect.left) / rect.width) * 100,
                        0,
                        100,
                      );
                      const nextY = clamp(
                        ((event.clientY - rect.top) / rect.height) * 100,
                        0,
                        100,
                      );
                      setValue(field.name, {
                        x: nextX.toFixed(2),
                        y: nextY.toFixed(2),
                      });
                    }}
                    className="relative w-full cursor-crosshair overflow-hidden rounded-lg ring-1 ring-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mapEntry.url}
                      alt={`Mapa ${mapLabel}`}
                      draggable={false}
                      className="h-auto w-full select-none"
                    />
                    {hasPosition ? (
                      <div
                        className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-destructive shadow-md ring-1 ring-destructive/50"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      />
                    ) : null}
                    {(placesByMap[positionMapId] ?? [])
                      .filter(
                        (place) =>
                          place.x != null &&
                          place.y != null &&
                          String(place.id) !== recordId,
                      )
                      .map((place, index) => (
                        <div
                          key={place.id}
                          title={place.name}
                          className="pointer-events-none absolute z-10 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-[9px] font-semibold text-foreground shadow-sm ring-1 ring-foreground/40"
                          style={{ left: `${place.x}%`, top: `${place.y}%` }}
                        >
                          {index + 1}
                        </div>
                      ))}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent px-2 py-1 text-xs font-medium text-foreground">
                      {hasPosition
                        ? `X: ${x} · Y: ${y}`
                        : "Clic para marcar el lugar"}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    El marcador rojo es la posición de este lugar. Los números marcan los
                    lugares ya cargados en el mapa.
                  </p>

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`field-${field.name}-x`}>X (0-100)</Label>
                      <input
                        id={`field-${field.name}-x`}
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={x}
                        onChange={(event) =>
                          setValue(field.name, { ...pos, x: event.target.value })
                        }
                        className="h-8 w-24 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`field-${field.name}-y`}>Y (0-100)</Label>
                      <input
                        id={`field-${field.name}-y`}
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={y}
                        onChange={(event) =>
                          setValue(field.name, { ...pos, y: event.target.value })
                        }
                        className="h-8 w-24 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
                    </div>
                    {hasPosition ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setValue(field.name, { x: "", y: "" })}
                      >
                        Quitar posición
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}

              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
            </div>
          );
        }

        if (field.type === "relation" && field.multiple) {
          const options = relationOptions[field.name] ?? new Map<string, string>();
          const selected = Array.isArray(current) ? current : [];
          return (
            <div key={field.name} className="flex flex-col gap-2">
              <Label>{field.label}</Label>
              <div className="flex flex-wrap gap-2">
                {[...options.entries()].map(([id, label]) => {
                  const checked = selected.includes(id);
                  return (
                    <label
                      key={id}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                        checked
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setValue(
                            field.name,
                            checked
                              ? selected.filter((value) => value !== id)
                              : [...selected, id],
                          );
                        }}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
            </div>
          );
        }

        const isSelect = field.type === "select" || field.type === "relation";
        const isTextarea = field.type === "textarea";

        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <Label htmlFor={`field-${field.name}`}>
              {field.label}
              {field.required && !field.readOnly && !isFixed(field.name) ? (
                <span className="text-destructive"> *</span>
              ) : null}
            </Label>

            {isTextarea ? (
              <textarea
                id={`field-${field.name}`}
                rows={4}
                value={String(current ?? "")}
                disabled={field.readOnly || isFixed(field.name)}
                onChange={(event) => setValue(field.name, event.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              />
            ) : isSelect ? (
              <select
                id={`field-${field.name}`}
                value={String(effectiveValue(field) ?? "")}
                disabled={field.readOnly || isFixed(field.name)}
                onChange={(event) => {
                  const value = event.target.value;
                  if (field.name === typeField?.name) {
                    setValue(field.name, value);
                    maybeFillPrompt(value, values["place"]);
                  } else if (field.name === "place") {
                    setValue(field.name, value);
                    maybeFillPrompt(values["type"], value);
                  } else {
                    setValue(field.name, value);
                  }
                }}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              >
                {!field.required || field.readOnly ? (
                  <option value="">—</option>
                ) : null}
                {field.type === "relation"
                  ? [...(relationOptions[field.name] ?? new Map()).entries()].map(
                      ([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ),
                    )
                  : field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
              </select>
            ) : field.type === "datetime" ? (
              <Input
                id={`field-${field.name}`}
                value={
                  current
                    ? new Date(String(current)).toLocaleString("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : ""
                }
                disabled
                readOnly
              />
            ) : (
              <Input
                id={`field-${field.name}`}
                type={
                  field.type === "password"
                    ? "password"
                    : field.type === "number"
                      ? "number"
                      : "text"
                }
                step={field.step}
                min={field.min}
                max={field.max}
                value={String(current ?? "")}
                disabled={field.readOnly || isFixed(field.name)}
                placeholder={field.placeholder}
                onChange={(event) => setValue(field.name, event.target.value)}
                className={inputClass(field.name)}
              />
            )}

            {errorText ? (
              <p className="text-xs text-destructive">{errorText}</p>
            ) : fixedLabel ? (
              <p className="text-xs text-muted-foreground">
                Fijado a: {fixedLabel}
              </p>
            ) : field.helpText ? (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            ) : null}
          </div>
        );
      })}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}