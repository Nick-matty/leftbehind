import "@leftbehind/design-tokens/tokens.css";
import "@/styles/globals.css";

import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "@/app/router";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

// The root Theme puts data-astryx-theme="neutral" on <html>, so Astryx's
// scoped CSS also reaches portals. It does not set data-theme in system mode:
// light/dark keeps coming from prefers-color-scheme, which the tokens.css
// palette and Astryx's light-dark() tokens both follow.
createRoot(root).render(
  <StrictMode>
    <Theme theme={neutralTheme} mode="system">
      <RouterProvider router={router} />
    </Theme>
  </StrictMode>,
);
