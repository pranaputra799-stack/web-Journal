import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose. Every route here is scoped to the
  // signed-in user, so there is no static shell worth pre-rendering and the
  // "wrap every runtime read in Suspense" rule only adds ceremony. Turn it back
  // on if you add a public landing page or other anonymous surface.
  cacheComponents: false,
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
