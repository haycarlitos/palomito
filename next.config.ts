import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.namespace.ninja',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'metadata.namespace.ninja',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
