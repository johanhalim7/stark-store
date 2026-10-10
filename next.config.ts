import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Stark Store butuh perilaku dinamis klasik (DB per-request):
     cacheComponents tidak kompatibel dengan `export const dynamic = "force-dynamic"`. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
