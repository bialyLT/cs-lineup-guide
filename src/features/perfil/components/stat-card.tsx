import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning";
  className?: string;
}

const toneStyles = {
  default: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
};

export function StatCard({ icon, label, value, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10",
        className,
      )}
    >
      <span className={cn("[&_svg]:size-4", toneStyles[tone])}>{icon}</span>
      <span className="text-lg font-semibold tabular-nums leading-none">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}