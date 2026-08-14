import { Badge } from "@/components/ui/badge";
import type { AdminField } from "@/lib/admin/resources";

export type LookupMap = Map<string, string>;

function rawLabel(value: unknown, field?: AdminField): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field?.type === "select" && field.options) {
    return field.options.find((option) => option.value === value)?.label ?? String(value);
  }
  return String(value);
}

export function AdminCell({
  value,
  field,
  lookups,
  maxLength = 40,
}: {
  value: unknown;
  field?: AdminField;
  lookups?: Record<string, LookupMap>;
  maxLength?: number;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  if (field?.type === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Sí" : "No"}
      </Badge>
    );
  }

  if (field?.type === "relation" && lookups?.[field.name]) {
    const label = lookups[field.name].get(String(value)) ?? String(value);
    return <span className="max-w-[16rem] truncate">{label}</span>;
  }

  if (field?.type === "select") {
    const label = field.options?.find((option) => option.value === value)?.label;
    return <Badge variant="outline">{label ?? String(value)}</Badge>;
  }

  if (field?.type === "datetime") {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return <span>{rawLabel(value, field)}</span>;
    return (
      <span className="whitespace-nowrap">
        {date.toLocaleString("es-AR", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </span>
    );
  }

  const text = String(value);
  return (
    <span className="block max-w-[16rem] truncate" title={text}>
      {text.length > maxLength ? `${text.slice(0, maxLength)}…` : text}
    </span>
  );
}