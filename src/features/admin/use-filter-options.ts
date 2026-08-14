"use client";

import { useQuery } from "@tanstack/react-query";

import { adminService } from "@/lib/api/admin.service";
import type { AdminResourceConfig } from "@/lib/admin/resources";

import type { LookupMap } from "./admin-value";

/**
 * Carga las opciones de los filtros declarados en `resource.filters`.
 * Para filtros "relation" lista el recurso destino; si el filtro depende de
 * otro activo (ej. el lugar del mapa), pasa ese valor como query param.
 */
export function useFilterOptions(
  resource: AdminResourceConfig | undefined,
  activeFilters: Record<string, string>,
) {
  const relationFilters = (resource?.filters ?? []).filter(
    (filter) => filter.options === "relation" && filter.resource,
  );

  return useQuery({
    queryKey: ["admin-filter-options", resource?.key, activeFilters],
    queryFn: async () => {
      const options: Record<string, LookupMap> = {};
      if (!resource) return options;
      for (const filter of relationFilters) {
        const query: Record<string, string> = {};
        if (filter.dependsOn) {
          const depValue = activeFilters[filter.dependsOn.filter];
          if (depValue) query[filter.dependsOn.map] = depValue;
        }
        const records = await adminService.list(filter.resource!, query);
        options[filter.name] = new Map(
          records.map((record) => [
            String(record.id),
            String(record[filter.displayField ?? "id"] ?? record.id),
          ]),
        );
      }
      return options;
    },
    enabled: Boolean(resource?.filters?.length),
    staleTime: 30_000,
  });
}