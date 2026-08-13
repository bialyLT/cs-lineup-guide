import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { mockRanking } from "@/features/ranking/mock";
import { RankingItem } from "@/features/ranking/components/ranking-item";

export const metadata: Metadata = { title: "Ranking" };

export default function RankingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Ranking" title="Top jugadores" description="Ranking global ordenado por experiencia." />

      <div className="flex flex-col gap-2">
        {mockRanking.map((entry) => (
          <RankingItem
            key={entry.id}
            entry={entry}
            isCurrentUser={entry.id === "u4"}
          />
        ))}
      </div>
    </div>
  );
}