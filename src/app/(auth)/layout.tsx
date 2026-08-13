import type { ReactNode } from "react";

import { Crosshair } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
          <Crosshair className="size-5" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-semibold tracking-tight">LineupLab</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}