import type { Config } from "tailwindcss";
import preset from "@leftbehind/design-tokens/tailwind-preset";

/**
 * Every value below comes from packages/design-tokens/tokens.json.
 * Do not add literal colours, sizes or shadows here — add a token instead.
 */
export default {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
} satisfies Config;
