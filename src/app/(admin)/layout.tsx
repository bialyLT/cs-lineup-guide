"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ArrowLeft, LayoutDashboard, LogOut, ShieldCheck, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminResources } from "@/lib/admin/resources";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !user?.isStaff) router.replace("/home");
  }, [status, user, router]);

  if (status !== "authenticated" || !user?.isStaff) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="text-sm text-muted-foreground">Verificando permisos…</span>
      </div>
    );
  }

  const navItems: Array<{
    href: string;
    label: string;
    icon?: LucideIcon;
    exact?: boolean;
  }> = [
    { href: "/admin", label: "Inicio", icon: LayoutDashboard, exact: true },
    ...adminResources.map((resource) => ({
      href: `/admin/${resource.key}`,
      label: resource.label,
    })),
  ];

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
              <ShieldCheck className="size-4" strokeWidth={2.5} />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight">
              Panel de administración
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/home">
                <ArrowLeft />
                Volver a la app
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} aria-label="Cerrar sesión">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:flex-row md:py-7">
        <aside className="md:w-60 md:shrink-0">
          <nav className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col">
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-foreground text-background hover:bg-foreground hover:text-background",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.icon ? <item.icon className="size-4 shrink-0" /> : null}
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}