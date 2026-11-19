import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const base = "/Relationship-Candlestick-Lab/";

/** Separate client-only bundle: this never changes or clears the Vinext dist directory. */
export default defineConfig({
  root: fromRoot("./static-pages"),
  publicDir: fromRoot("./public"),
  base,
  plugins: [react()],
  define: {
    __RCL_ASSET_BASE__: JSON.stringify(base),
    __RCL_ANALYZE_URL__: JSON.stringify("https://relationship-candlestick-lab-joruno.perfectcube2.chatgpt.site/api/analyze"),
  },
  build: {
    outDir: fromRoot("./dist-pages"),
    emptyOutDir: true,
    sourcemap: false,
  },
});
