"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Coins, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { mapService } from "@/lib/api/map.service";
import { userService } from "@/lib/api/user.service";
import { quizService } from "@/lib/api/quiz.service";
import { quizSession } from "@/lib/quiz-session";
import { PlaceSelector } from "@/features/mapas/components/place-selector";

const MAX_PLACES = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["maps"],
    queryFn: mapService.list,
  });

  const starterMap = maps.find((map) => map.isFree && map.places.length > 0);

  const start = useMutation({
    mutationFn: async (placeIds: string[]) => {
      const mapId = starterMap!.id;
      const me = await userService.selectStarterPlaces(placeIds.map(Number));
      queryClient.setQueryData(["me"], me);
      const quiz = await quizService.create([mapId]);
      quizSession.save(quiz);
      router.push("/quiz");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo empezar.");
    },
  });

  function toggle(placeId: string) {
    setSelected((current) =>
      current.includes(placeId)
        ? current.filter((id) => id !== placeId)
        : current.length >= MAX_PLACES
          ? current
          : [...current, placeId],
    );
  }

  if (isLoading && maps.length === 0) {
    return <PageHeader eyebrow="Empezá" title="Cargando…" />;
  }

  if (!starterMap) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay un mapa inicial disponible.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Empezá a jugar"
        title="Elegí tus primeros lugares"
        description={`Marcá hasta ${MAX_PLACES} lugares de ${starterMap.name} que quieras aprender a adivinar. El primer quiz te va a preguntar dónde están. El resto se desbloquea con monedas.`}
      />

      <PlaceSelector
        mapName={starterMap.name}
        mapImageUrl={starterMap.imageUrl}
        places={starterMap.places}
        selectedIds={selected}
        max={MAX_PLACES}
        onToggle={toggle}
      />

      <div className="flex flex-col gap-2 pt-2">
        {error ? (
          <p className="text-center text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <p className="text-center text-xs text-muted-foreground">
          Elegiste {selected.length} de {MAX_PLACES} lugares
          <span className="mx-1">·</span>
          <Coins className="mb-0.5 inline size-3 text-warning" />
          ganá monedas en los quizzes para desbloquear el resto
        </p>
        <Button
          size="lg"
          className="w-full"
          disabled={selected.length === 0 || start.isPending}
          onClick={() => {
            setError("");
            start.mutate(selected);
          }}
        >
          {start.isPending ? (
            <>
              <LoaderCircle className="animate-spin" />
              Creando tu primer quiz…
            </>
          ) : (
            <>
              Empezar mi primer quiz
              <ArrowRight data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
