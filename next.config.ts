import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
      {
        source: '/dashboard/profile',
        destination: '/profile',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
