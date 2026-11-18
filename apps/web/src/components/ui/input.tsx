import type * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Input — docs/design-system.md §6.
 * Labels live above the field (never placeholder-only); helper text is 13px muted;
 * invalid fields get a danger border and a 13px message with an icon.
 */
export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-control w-full rounded-md border border-border bg-surface px-3 font-ui text-body-md text-foreground",
        "placeholder:text-subtle-foreground",
        "transition-colors duration-fast ease-standard",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:bg-background-sunken disabled:opacity-60",
        "aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 font-ui text-body-md text-foreground",
        "placeholder:text-subtle-foreground",
        "transition-colors duration-fast ease-standard",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:bg-background-sunken disabled:opacity-60",
        "aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ children, id }: { children?: React.ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-body-sm text-danger">
      {children}
    </p>
  );
}

export function FieldHelper({ children, id }: { children?: React.ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="text-body-sm text-muted-foreground">
      {children}
    </p>
  );
}
