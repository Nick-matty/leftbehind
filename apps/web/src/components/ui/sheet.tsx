import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Sheet — edge-anchored dialog used for the mobile navigation drawer.
 * Opaque surface with a hairline border; no blur, no translucency.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "right" | "left" | "bottom";
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-ink-900/50 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-sheet flex flex-col bg-surface shadow-lg",
          side === "right" &&
            "inset-y-0 right-0 h-full w-[min(20rem,85vw)] animate-sheet-in border-l border-border",
          side === "left" &&
            "inset-y-0 left-0 h-full w-[min(20rem,85vw)] border-r border-border",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t border-border",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close menu"
          className={cn(
            "absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground",
            "transition-colors duration-fast hover:bg-background-sunken hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <X aria-hidden className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
