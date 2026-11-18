import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import { ToastProvider } from "@/components/ui/toast";
import { SiteFooter } from "@/layouts/site-footer";
import { SiteHeader } from "@/layouts/site-header";

/**
 * Public shell — docs/design-system.md §6 navigation.
 * Keyboard order: skip link → header → search → primary nav → page → footer.
 */
export function PublicLayout() {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-ui focus:text-label focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          <Suspense fallback={<div className="min-h-[50vh]" />}>
            <Outlet />
          </Suspense>
        </main>
        <SiteFooter />
      </div>
    </ToastProvider>
  );
}
