"use client";

import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { rankingService } from "@/lib/api/ranking.service";
import { useAuth } from "@/lib/auth/auth-context";
import { RankingItem } from "@/features/ranking/components/ranking-item";

export default function RankingPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["ranking"],
    queryFn: rankingService.global,
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Ranking" title="Top jugadores" description="Ranking global ordenado por experiencia." />

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Cargando ranking…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.entries.map((entry) => (
            <RankingItem
              key={entry.userId}
              entry={entry}
              isCurrentUser={entry.userId === user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}