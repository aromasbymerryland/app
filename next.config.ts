import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/products/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "41mb",
    },
  },
};

export default nextConfig;
