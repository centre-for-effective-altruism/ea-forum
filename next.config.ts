import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
  rewrites: async () => {
    return [
      {
        source: "/about",
        destination: "/posts/ht2dScQTpeBXB6uMb/how-to-use-the-forum-intro",
      },
    ];
  },
};

export default nextConfig;
