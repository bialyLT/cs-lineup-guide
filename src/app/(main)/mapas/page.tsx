"use client";

import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { mapService } from "@/lib/api/map.service";
import { MapCard } from "@/features/mapas/components/map-card";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

export default function MapasPage() {
  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["maps"],
    queryFn: mapService.list,
  });

  const unlockedCount = maps.filter((map) => map.unlocked || map.isFree).length;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div variants={item}>
        <PageHeader
          eyebrow="Mapas"
          title="Explorá los mapas"
          description="Elegí un mapa para ver sus lugares y lineups, y el porcentaje que ya desbloqueaste."
        />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        {isLoading && maps.length === 0 ? (
          <p className="col-span-2 text-sm text-muted-foreground">Cargando mapas…</p>
        ) : (
          maps.map((map) => {
            const stats = map.unlockStats;
            const total = (stats?.totalPlaces ?? 0) + (stats?.totalLineups ?? 0);
            const unlocked = (stats?.unlockedPlaces ?? 0) + (stats?.unlockedLineups ?? 0);
            const progress = total > 0 ? (unlocked / total) * 100 : 0;
            return (
              <MapCard
                key={map.id}
                map={map}
                href={`/mapas/${map.id}`}
                progress={progress}
              />
            );
          })
        )}
      </motion.div>

      <motion.div variants={item}>
        <p className="text-center text-xs text-muted-foreground">
          {unlockedCount} de {maps.length} mapas desbloqueados. El porcentaje suma lugares y lineups.
        </p>
      </motion.div>
    </motion.div>
  );
}