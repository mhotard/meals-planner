import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM and must stay outside the bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
