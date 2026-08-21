"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, adminService } from "@/lib/api/admin.service";
import { getAdminResource, type AdminFilter } from "@/lib/admin/resources";
import { AdminCell } from "@/features/admin/admin-value";
import { useFilterOptions } from "@/features/admin/use-filter-options";
import { useRelationOptions } from "@/features/admin/use-relation-options";

function AdminResourceListPageContent() {
  const params = useParams<{ resource: string }>();
  const resource = getAdminResource(params.resource);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    if (!resource?.filters) return filters;
    for (const filter of resource.filters) {
      const value = searchParams.get(filter.name);
      if (value) filters[filter.name] = value;
    }
    return filters;
  }, [resource, searchParams]);

  const filtersQuery = useMemo(() => {
    const entries = Object.entries(activeFilters);
    if (entries.length === 0) return "";
    return `?${entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&")}`;
  }, [activeFilters]);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["admin-list", resource?.key, activeFilters],
    queryFn: () => adminService.list(resource!.key, activeFilters),
    enabled: Boolean(resource),
  });

  const relationOptionsQuery = useRelationOptions(resource!);
  const filterOptionsQuery = useFilterOptions(resource!, activeFilters);

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => adminService.remove(resource!.key, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-list", resource?.key] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  if (!resource) {
    return (
      <p className="text-sm text-muted-foreground">
        Recurso de administración desconocido.
      </p>
    );
  }

  const lookups = relationOptionsQuery.data;
  const filterOptions = filterOptionsQuery.data;

  function filterOptionsFor(filter: AdminFilter) {
    if (filter.options === "select") {
      return new Map(
        (filter.optionsList ?? []).map((option) => [option.value, option.label]),
      );
    }
    return filterOptions?.[filter.name] ?? new Map<string, string>();
  }

  function setFilter(field: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(field, value);
    else next.delete(field);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{resource.label}</h1>
          {resource.description ? (
            <p className="text-sm text-muted-foreground">{resource.description}</p>
          ) : null}
        </div>
        {!resource.readOnly ? (
          <Button asChild>
            <Link href={`/admin/${resource.key}/new${filtersQuery}`}>
              <Plus />
              Nuevo {resource.singular.toLowerCase()}
            </Link>
          </Button>
        ) : null}
        {resource.headerActions?.map((action) => (
          <Button key={action.href} variant="outline" asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </div>

      {resource.filters?.length ? (
        <div className="flex flex-wrap items-center gap-3">
          {resource.filters.map((filter) => {
            const options = filterOptionsFor(filter);
            return (
              <div key={filter.name} className="flex items-center gap-1.5">
                <Label
                  htmlFor={`filter-${filter.name}`}
                  className="text-sm text-muted-foreground"
                >
                  {filter.label}
                </Label>
                <select
                  id={`filter-${filter.name}`}
                  value={activeFilters[filter.name] ?? ""}
                  onChange={(event) => setFilter(filter.name, event.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="">Todos</option>
                  {[...options.entries()].map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      ) : null}

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Filtrado por:</span>
          {Object.entries(activeFilters).map(([filterName, value]) => {
            const filter = resource.filters?.find((f) => f.name === filterName);
            const label = filterOptionsFor(filter ?? { name: filterName, label: filterName, options: "select" }).get(value) ?? value;
            return (
              <span
                key={filterName}
                className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 ring-1 ring-border"
              >
                {filter?.label ?? filterName}: {label}
                <button
                  type="button"
                  aria-label={`Quitar filtro ${filterName}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setFilter(filterName, "")}
                >
                  ×
                </button>
              </span>
            );
          })}
          <Button variant="ghost" size="sm" asChild>
            <Link href={pathname}>Quitar filtros</Link>
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          No se pudo cargar el recurso. Verificá que tengas permisos de administrador.
        </p>
      ) : rows.length === 0 ? (
        <Card size="sm" className="p-4 text-sm text-muted-foreground">
          {hasActiveFilters
            ? "No hay registros que coincidan con el filtro."
            : "No hay registros todavía."}
        </Card>
      ) : (
        <Card size="sm" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  {resource.listColumns.map((column) => (
                    <th key={column} className="px-3 py-2.5 font-medium">
                      {resource.fields.find((field) => field.name === column)?.label ?? column}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/40">
                    {resource.listColumns.map((column) => (
                      <td key={column} className="px-3 py-2.5">
                        <AdminCell
                          value={row[column]}
                          field={resource.fields.find((field) => field.name === column)}
                          lookups={lookups}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        {resource.rowLink ? (
                          <Button variant="ghost" size="icon-sm" asChild aria-label={resource.rowLink.label}>
                            <Link href={resource.rowLink.href(row.id)}>
                              <MapPin />
                            </Link>
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon-sm" asChild aria-label="Editar">
                          <Link href={`/admin/${resource.key}/${row.id}${filtersQuery}`}>
                            <Pencil />
                          </Link>
                        </Button>
                        {!resource.readOnly ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Eliminar"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `¿Eliminar ${resource.singular.toLowerCase()} #${row.id}? Esta acción no se puede deshacer.`,
                                )
                              ) {
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {deleteMutation.isError ? (
        <p className="text-sm text-destructive">
          {(deleteMutation.error as ApiError).message}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminResourceListPage() {
  return (
    <Suspense fallback={null}>
      <AdminResourceListPageContent />
    </Suspense>
  );
}