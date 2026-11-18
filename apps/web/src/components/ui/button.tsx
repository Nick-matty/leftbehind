import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Button — docs/design-system.md §6.
 * Web control height 44px, radius 10px, label type, 2px focus ring.
 * Pressed state uses brand.700; disabled is 40% opacity.
 */
const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "font-ui text-label font-medium transition-colors duration-fast ease-standard",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:size-5 [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed",
        secondary:
          "border border-border-strong bg-surface text-foreground hover:bg-background-sunken",
        ghost: "text-primary hover:bg-brand-50",
        destructive:
          "border border-danger bg-surface text-danger hover:bg-ink-100 active:bg-ink-200",
        link: "h-auto rounded-xs px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-control-sm px-3",
        md: "h-control px-4",
        lg: "h-control-mobile px-5",
        icon: "size-control",
      },
    },
    compoundVariants: [{ variant: "link", class: "h-auto" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          <span>{children}</span>
          <span className="sr-only">Loading</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { buttonVariants };
