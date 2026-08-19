"use client";

import { cn } from "@/lib/utils";
import { STATUS_MAP } from "@/lib/constants";

interface StatusBadgeProps {
  statusKey: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ statusKey, className, size = "md" }: StatusBadgeProps) {
  const def = STATUS_MAP[statusKey];
  if (!def) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium border border-black/10 whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
      style={{ backgroundColor: def.bg, color: def.text }}
      title={def.label}
    >
      {def.label}
    </span>
  );
}
