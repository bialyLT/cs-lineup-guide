"use client";

import { useQuery } from "@tanstack/react-query";

import { adminService } from "@/lib/api/admin.service";
import type { AdminResourceConfig } from "@/lib/admin/resources";

import type { LookupMap } from "./admin-value";

export function relationFieldsOf(resource: AdminResourceConfig | undefined) {
  if (!resource) return [];
  return resource.fields.filter(
    (field) => field.type === "relation" && field.resource,
  );
}

/**
 * Carga las opciones de los campos de relación de un recurso:
 * para cada relación, un Map<id, label> con los registros del recurso destino.
 */
export function useRelationOptions(resource: AdminResourceConfig | undefined) {
  const relationFields = relationFieldsOf(resource);
  const resources = relationFields.map((field) => field.resource!);

  return useQuery({
    queryKey: ["admin-options", resource?.key, resources],
    queryFn: async () => {
      const options: Record<string, LookupMap> = {};
      if (!resource) return options;
      for (const field of relationFields) {
        const records = await adminService.list(field.resource!);
        options[field.name] = new Map(
          records.map((record) => [
            String(record.id),
            String(record[field.displayField ?? "id"] ?? record.id),
          ]),
        );
      }
      return options;
    },
    enabled: Boolean(resource),
    staleTime: 30_000,
  });
}