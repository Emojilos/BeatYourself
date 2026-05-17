import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Visual density. `default` matches a full-page empty; `compact` fits inside cards/tabs. */
  size?: "default" | "compact";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "default",
}: EmptyStateProps) {
  const isCompact = size === "compact";
  return (
    <div
      role="status"
      className={cn(
        "bg-card flex flex-col items-center rounded-xl border border-dashed text-center",
        isCompact ? "px-4 py-10" : "px-6 py-16",
        className,
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden
          className={cn(
            "text-muted-foreground/60 mb-3",
            isCompact ? "size-8" : "size-10",
          )}
        />
      ) : null}
      <p className={cn("font-medium", isCompact ? "text-sm" : "text-base")}>{title}</p>
      {description ? (
        <p
          className={cn(
            "text-muted-foreground mt-1",
            isCompact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className={cn(isCompact ? "mt-4" : "mt-6")}>{action}</div> : null}
    </div>
  );
}
