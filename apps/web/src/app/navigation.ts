import { Bookmark, Compass, Home, Map, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Shown when the destination is not built yet. */
  phase?: number;
};

/** Web and mobile share these five destinations (design-system §6). */
export const primaryNav: NavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "Explore", to: "/explore", icon: Compass, phase: 4 },
  { label: "Globe", to: "/map", icon: Map },
  { label: "Saved", to: "/saved", icon: Bookmark, phase: 6 },
  { label: "Profile", to: "/profile", icon: User, phase: 3 },
];
