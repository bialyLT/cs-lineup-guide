"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Images, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { mapService } from "@/lib/api/map.service";
import { BannerAd } from "@/components/ads/banner-ad";

const UTIL_LABELS: Record<string, string> = {
  smoke: "Smoke",
  flashbang: "Flash",
  he: "HE",
  molotov: "Molotov",
  decoy: "Decoy",
};

export default function LineupDetailPage() {
  const { slug, lineupId } = useParams<{ slug: string; lineupId: string }>();

  const { data: lineup, isLoading, isError } = useQuery({
    queryKey: ["lineup", lineupId],
    queryFn: () => mapService.getLineup(lineupId),
    enabled: Boolean(lineupId),
  });

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href={`/mapas/${slug}`}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="size-6" />
          </span>
          <p className="text-sm font-medium">No tenés acceso a este lineup.</p>
          <p className="text-xs text-muted-foreground">
            Desbloquealo primero desde el mapa para poder verlo.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !lineup) {
    return <PageHeader eyebrow="Lineup" title="Cargando…" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/mapas/${slug}`}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{lineup.title}</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{UTIL_LABELS[lineup.util] ?? lineup.util}</Badge>
          <span className="text-xs text-muted-foreground">
            {lineup.map_name} · {lineup.place_name}
          </span>
        </div>
      </div>

      {lineup.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {lineup.description}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {lineup.images.length > 0 ? (
          lineup.images.map((src, index) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={src}
              src={src}
              alt={`${lineup.title} (imagen ${index + 1})`}
              className="w-full rounded-xl ring-1 ring-foreground/10"
            />
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 p-6 text-center">
            <Images className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Este lineup todavía no tiene imágenes.
            </p>
          </div>
        )}
      </div>

      <BannerAd />
    </div>
  );
}
