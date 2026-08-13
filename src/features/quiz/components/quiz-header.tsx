"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuizHeaderProps {
  title?: string;
  current: number;
  total: number;
  backHref?: string;
  className?: string;
}

export function QuizHeader({
  title = "Quiz",
  current,
  total,
  backHref = "/home",
  className,
}: QuizHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex h-12 items-center justify-between">
        <Link
          href={backHref}
          aria-label="Volver"
          className="-ml-2 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <span className="text-sm font-semibold tracking-tight">{title}</span>
        <span className="min-w-10 text-right text-sm font-medium tabular-nums text-muted-foreground">
          {current} / {total}
        </span>
      </div>
    </header>
  );
}