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
  redirects: async () => [
    {
      source: "/cookiePolicy",
      destination: "/cookie-policy",
      permanent: true,
    },
    {
      source: "/banNotice",
      destination: "/ban-notice",
      permanent: true,
    },
  ],
  rewrites: async () => [
    {
      source: "/about",
      destination: "/posts/ht2dScQTpeBXB6uMb/how-to-use-the-forum-intro",
    },
    {
      source: "/copyright",
      destination: "/posts/KK6AE8HzPkR2KnqSg/new-forum-license-creative-commons",
    },
    {
      source: "/contact",
      destination: "/posts/jpqJKZm9JXgMTwSfg/contact-us",
    },
  ],
};

export default nextConfig;
