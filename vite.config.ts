import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves project repositories at /<repository>/, not the domain root.
// Vite uses this prefix for generated JS, CSS, and asset URLs.
export default defineConfig({
  plugins: [react()],
  base: "/market-terminal/",
});
