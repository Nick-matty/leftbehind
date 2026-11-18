import { useEffect, useState } from "react";

/**
 * The app's light/dark mode is `prefers-color-scheme` (Astryx runs in
 * `mode="system"` and does not write `data-theme`), so anything that cannot use
 * CSS — MapLibre styles and paint colours — has to read the same media query and
 * follow changes at runtime.
 */
export type ColorScheme = "light" | "dark";

const QUERY = "(prefers-color-scheme: dark)";

export function useColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(() =>
    typeof window !== "undefined" && window.matchMedia(QUERY).matches ? "dark" : "light",
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setScheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return scheme;
}
