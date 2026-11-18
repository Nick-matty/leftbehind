import type * as React from "react";

import { cn } from "@/lib/cn";

/** 1200px content column with 16/24/48 gutters. */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-content px-4 md:px-6 lg:px-12", className)}
      {...props}
    />
  );
}
