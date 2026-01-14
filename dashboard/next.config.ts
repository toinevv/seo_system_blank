import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Cloudflare Pages compatibility
  // Images need to use Cloudflare's image optimization or external URLs
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
