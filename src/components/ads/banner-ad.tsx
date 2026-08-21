"use client";

import { Megaphone } from "lucide-react";

import { INTERSTITIAL_AD_HTML } from "./interstitial-ad";

/** Banner publicitario (ancho completo) para el pie de las vistas de contenido. */
export function BannerAd() {
  return (
    <section className="rounded-xl border border-border/60 bg-card p-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Megaphone className="size-3.5" />
        Publicidad
      </span>
      <div className="mt-2 overflow-hidden rounded-lg">
        {INTERSTITIAL_AD_HTML ? (
          <iframe
            title="Publicidad"
            srcDoc={INTERSTITIAL_AD_HTML}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            className="h-[250px] w-full border-0"
          />
        ) : (
          <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
            Espacio publicitario
          </div>
        )}
      </div>
    </section>
  );
}
