import "@leftbehind/design-tokens/tokens.css";
import "@/styles/globals.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "@/app/router";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

// No Astryx Theme wrapper here on purpose: it only exists to scope Astryx
// components, and the sole route that renders one (/design) mounts it itself.
// Keeping it at the root put the library's JS and CSS on every page load.
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
