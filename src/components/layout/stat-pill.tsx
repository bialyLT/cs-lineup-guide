import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatPillProps {
  icon: ReactNode;
  value: string | number;
  label?: string;
  tone?: "default" | "success" | "warning";
  className?: string;
}

const toneStyles = {
  default: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
};

export function StatPill({ icon, value, label, tone = "default", className }: StatPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium",
        toneStyles[tone],
        className,
      )}
      title={label}
    >
      <span className="text-foreground/70 [&_svg]:size-4">{icon}</span>
      {value}
    </div>
  );
}