"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Box, History } from "lucide-react";

import { adminService } from "@/lib/api/admin.service";
import { adminResources } from "@/lib/admin/resources";
import { AdminCell } from "@/features/admin/admin-value";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: adminService.stats,
    staleTime: 15_000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Panel de administración</h1>
        <p className="text-sm text-muted-foreground">
          Gestioná el contenido y los usuarios de LineupLab.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Recursos</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {adminResources.map((resource) => {
              const count = stats?.counts[resource.key] ?? 0;
              return (
                <Link
                  key={resource.key}
                  href={`/admin/${resource.key}`}
                  className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-foreground/40 hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Box className="size-4 shrink-0 text-muted-foreground" />
                    {resource.label}
                  </span>
                  <span className="text-2xl font-semibold tracking-tight">
                    {isError ? "—" : count}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="size-4 text-muted-foreground" />
          Actividad reciente
        </h2>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : stats && stats.recent_activity.length > 0 ? (
          <Card size="sm">
            <CardContent className="flex flex-col divide-y divide-border/60 px-3">
              {stats.recent_activity.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-1 py-2.5">
                  <Badge
                    variant={
                      entry.action === "delete"
                        ? "destructive"
                        : entry.action === "create"
                          ? "default"
                          : "outline"
                    }
                  >
                    {entry.action_display}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {entry.model_name}
                      <span className="text-muted-foreground">
                        {" "}#{entry.object_id} · {entry.summary}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.actor_name ?? "desconocido"} ·{" "}
                      <AdminCell value={entry.created_at} field={{ name: "", label: "", type: "datetime" }} />
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no hay actividad registrada en el panel.
          </p>
        )}
      </section>
    </div>
  );
}