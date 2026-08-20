"use client";

import { Crosshair, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

export function AppHeader({ className }: { className?: string }) {
  const { logout } = useAuth();

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-12 w-full max-w-md items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
            <Crosshair className="size-4" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Smokeame Ventana</span>
        </div>
        <Button
          variant="ghost"
          aria-label="Cerrar sesión"
          onClick={logout}
        >
          <LogOut />
        </Button>
      </div>
    </header>
  );
}