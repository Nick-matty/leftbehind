import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/cn";

/** Badge — 24px tall pill. Colour is never the only carrier: the label says what it is. */
const badgeVariants = cva(
  "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 font-ui text-label font-medium",
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface text-muted-foreground",
        brand: "border-brand-200 bg-brand-50 text-brand-700",
        accent: "border-clay-300 bg-clay-100 text-clay-700",
        success: "border-brand-200 bg-brand-50 text-success",
        warning: "border-border-strong bg-background-sunken text-warning",
        danger: "border-border-strong bg-background-sunken text-danger",
        info: "border-border-strong bg-background-sunken text-info",
        outline: "border-border-strong bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
