import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import { PublicLayout } from "@/layouts/public-layout";
import { NotFoundPage } from "@/pages/not-found";
import { PlannedPage } from "@/pages/planned";

// Pages are loaded per route: the public shell (and the preview proxy) should
// not have to fetch the whole catalogue, globe and design-system bundles before
// the first screen renders.
const HomePage = lazy(() =>
  import("@/pages/home").then((module) => ({ default: module.HomePage })),
);
const GlobePage = lazy(() =>
  import("@/pages/globe").then((module) => ({ default: module.GlobePage })),
);
const ExplorePage = lazy(() =>
  import("@/pages/explore").then((module) => ({ default: module.ExplorePage })),
);
const PlaceDetailPage = lazy(() =>
  import("@/pages/place-detail").then((module) => ({ default: module.PlaceDetailPage })),
);
const DesignSystemPage = lazy(() =>
  import("@/pages/design-system").then((module) => ({ default: module.DesignSystemPage })),
);

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "map", element: <GlobePage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "place/:slug", element: <PlaceDetailPage /> },
      {
        path: "saved",
        element: (
          <PlannedPage
            title="Saved places"
            phase={6}
            description="Saved places and collections are per-account records protected by row-level security. They ship in Phase 6, after authentication."
          />
        ),
      },
      {
        path: "profile",
        element: (
          <PlannedPage
            title="Profile"
            phase={3}
            description="Accounts, sign-in and profile settings start in Phase 3. This app has no authentication yet, so nothing here is hidden behind a fake session."
          />
        ),
      },
      { path: "design", element: <DesignSystemPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
