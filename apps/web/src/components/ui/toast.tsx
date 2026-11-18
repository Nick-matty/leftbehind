import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

type ToastVariant = "default" | "success" | "error";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastItem = ToastInput & { id: string };

type ToastApi = { toast: (input: ToastInput) => void };

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Toast — docs/design-system.md §6.
 * Top-right on desktop, bottom on mobile, 4s auto-dismiss, announced politely.
 * Not for errors that need a decision: those belong in a dialog or inline summary.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    setItems((current) => [
      ...current,
      { ...input, id: crypto.randomUUID() },
    ]);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider duration={4000} swipeDirection="right">
        {children}
        {items.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            onOpenChange={(open) => {
              if (!open) dismiss(item.id);
            }}
            className={cn(
              "flex w-full items-start gap-3 rounded-md border border-border bg-surface p-4 shadow-md",
              "data-[state=open]:animate-toast-in",
            )}
          >
            <span aria-hidden className="mt-0.5 shrink-0">
              {item.variant === "success" ? (
                <CheckCircle2 className="size-5 text-success" />
              ) : item.variant === "error" ? (
                <Info className="size-5 text-danger" />
              ) : (
                <Info className="size-5 text-primary" />
              )}
            </span>
            <div className="flex-1">
              <ToastPrimitive.Title className="font-ui text-label font-semibold text-foreground">
                {item.title}
              </ToastPrimitive.Title>
              {item.description ? (
                <ToastPrimitive.Description className="mt-1 text-body-sm text-muted-foreground">
                  {item.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss notification"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-subtle-foreground hover:text-foreground"
            >
              <X aria-hidden className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport
          className={cn(
            "fixed inset-x-4 bottom-4 z-toast flex flex-col gap-2",
            "sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:w-96",
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
