"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle, Megaphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// Tag de la red publicitaria (Adsterra, PropellerAds, etc.). Mientras esté
// vacío se muestra un placeholder para probar el flujo.
const INTERSTITIAL_AD_HTML = "";

interface InterstitialAdProps {
  open: boolean;
  ready: boolean;
  onClose: () => void;
}

export function InterstitialAd({ open, ready, onClose }: InterstitialAdProps) {
  const [phase, setPhase] = useState<"ad" | "waiting">("ad");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPhase("ad");
  }

  useEffect(() => {
    if (phase === "waiting" && ready) onClose();
  }, [phase, ready, onClose]);

  function handleClose() {
    if (ready) onClose();
    else setPhase("waiting");
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
          aria-label="Publicidad"
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
                <Megaphone className="size-3.5" />
                Publicidad
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Cerrar publicidad"
                onClick={handleClose}
              >
                <X />
              </Button>
            </div>

            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-4">
              {phase === "ad" ? (
                INTERSTITIAL_AD_HTML ? (
                  <iframe
                    title="Publicidad"
                    srcDoc={INTERSTITIAL_AD_HTML}
                    sandbox="allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
                    className="size-full min-h-64 border-0"
                  />
                ) : (
                  <>
                    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Megaphone className="size-6" />
                    </span>
                    <p className="text-sm font-medium">Espacio publicitario</p>
                    <p className="text-center text-xs text-muted-foreground">
                      Acá se muestra el interstitial al iniciar el quiz. Cerrá la
                      publicidad para continuar mientras se preparan las preguntas.
                    </p>
                  </>
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <LoaderCircle className="animate-spin text-muted-foreground" />
                  <p className="text-sm font-medium">Preparando el quiz…</p>
                  <p className="text-xs text-muted-foreground">
                    Cargando las preguntas elegidas.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}