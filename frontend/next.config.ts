import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack config (Next.js 16+)
  turbopack: {
    resolveAlias: {
      // Suppress Node.js-only modules in browser
      fs: { browser: "./lib/empty.js" },
      net: { browser: "./lib/empty.js" },
      tls: { browser: "./lib/empty.js" },
    },
  },
  // Webpack fallback (for non-Turbopack builds)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        buffer: false,
        path: false,
        os: false,
      };
    }
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
