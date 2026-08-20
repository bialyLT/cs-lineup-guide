"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clapperboard, Coins, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { videoRewardService, type VideoRewardStatus } from "@/lib/api/user.service";

interface RewardedVideoDialogProps {
  open: boolean;
  status?: VideoRewardStatus;
  onClose: () => void;
}

export function RewardedVideoDialog({ open, status, onClose }: RewardedVideoDialogProps) {
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setClaimed(false);
  }

  const coins = status?.coins ?? 200;
  const hasVideo = Boolean(status?.videoUrl);

  const claim = useMutation({
    mutationFn: videoRewardService.claim,
    onSuccess: (payload) => {
      setClaimed(true);
      queryClient.setQueryData(["me"], payload);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(`¡Ganaste ${coins} monedas!`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "No se pudo reclamar la recompensa.",
      );
      onClose();
    },
  });

  function handleComplete() {
    if (!claimed && !claim.isPending) claim.mutate();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Video con recompensa"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <Coins className="size-3.5" />
                Ganá {coins} monedas
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Cerrar"
                onClick={onClose}
              >
                <X />
              </Button>
            </div>

            <div className="relative flex flex-col gap-3 p-4">
              {claimed ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 className="size-6" />
                  </span>
                  <p className="text-sm font-semibold">¡{coins} monedas acreditadas!</p>
                  <Button onClick={onClose}>Listo</Button>
                </div>
              ) : hasVideo ? (
                <>
                  <video
                    controls
                    autoPlay
                    onEnded={handleComplete}
                    className="aspect-video w-full rounded-lg border bg-muted"
                    src={status!.videoUrl}
                  />
                  <p className="text-center text-xs text-muted-foreground">
                    Terminá de ver el video para acreditar las {coins} monedas.
                  </p>
                </>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Clapperboard className="size-6" />
                  </span>
                  <p className="text-sm font-medium">Espacio del rewarded video</p>
                  <p className="text-center text-xs text-muted-foreground">
                    Acá se muestra el video publicitario. Al terminar, acreditás {coins}{" "}
                    monedas.
                  </p>
                  <Button onClick={handleComplete}>Terminé de ver</Button>
                </div>
              )}

              {claim.isPending ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/80 backdrop-blur-sm">
                  <LoaderCircle className="animate-spin" />
                  <p className="text-sm font-medium">Acreditando monedas…</p>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}