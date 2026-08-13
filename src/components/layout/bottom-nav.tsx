"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, Home, Map as MapIcon, Trophy, User } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/quiz", label: "Quiz", icon: Crosshair },
  { href: "/mapas", label: "Mapas", icon: MapIcon },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 pt-2.5",
                "pb-[calc(env(safe-area-inset-bottom)+0.25rem)]",
                "text-muted-foreground transition-colors",
                active && "text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "size-5",
                  active && "stroke-[2.4]",
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className="text-[10px] font-medium leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}