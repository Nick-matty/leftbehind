import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Empty state — docs/design-system.md §6.
 * A 24px icon, one sentence explaining why it is empty, one action.
 * Never a fake record to fill the space.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-6",
        className,
      )}
    >
      <Icon aria-hidden className="size-6 text-subtle-foreground" />
      <div className="flex flex-col gap-1">
        <h3 className="font-ui text-title-md text-foreground">{title}</h3>
        <p className="measure text-body-md text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
