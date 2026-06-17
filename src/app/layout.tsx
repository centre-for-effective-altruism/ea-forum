import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Newsreader } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import { getSiteUrl } from "@/lib/routeHelpers";
import {
  getSiteLogoUrl,
  getSiteOgImageUrl,
} from "@/lib/cloudinary/cloudinaryHelpers";
import clsx from "clsx";
import Providers from "@/components/Providers";
import Header from "@/components/Header/Header";
import MobileNav from "@/components/Nav/MobileNav";
import IntercomButton from "@/components/Intercom/IntercomButton";
import DynamicCookieBanner from "@/components/Cookies/DynamicCookieBanner";
import OnboardingFlow from "@/components/Onboarding/OnboardingFlow";
import SiteToggle from "@/components/Admin/SiteToggle";
import "./globals.css";

const inter = localFont({
  src: "../../public/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const newsreader = Newsreader({
  weight: "variable",
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
  preload: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  return {
    metadataBase: getSiteUrl(),
    title: {
      template: "%s — EA Forum",
      default: "Effective Altruism Forum",
    },
    description:
      "The EA Forum hosts research, discussion, and updates on the world's most pressing problems. Including global health and development, animal welfare, AI safety, and biosecurity.",
    applicationName: "Effective Altruism Forum",
    robots: process.env.NEXT_PUBLIC_IS_BOT_SITE ? "noindex" : undefined,
    alternates: {
      types: {
        "application/rss+xml": "/feed.xml",
      },
    },
    icons: {
      icon: getSiteLogoUrl(96),
      shortcut: getSiteLogoUrl(50),
      apple: getSiteLogoUrl(180),
    },
    manifest: "/site.webmanifest",
    openGraph: {
      type: "website",
      url: getSiteUrl(),
      title: "Effective Altruism Forum",
      images: getSiteOgImageUrl(),
    },
    twitter: {
      card: userAgent.startsWith("Slackbot-LinkExpanding")
        ? "summary_large_image"
        : "summary",
      images: getSiteOgImageUrl(),
    },
    bookmarks: "/saved",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="delegate-ch"
          content="sec-ch-dpr https://res.cloudinary.com;"
        />
      </head>
      <body
        className={clsx(
          "antialiased text-size-adjust-none w-full min-h-screen flex flex-col",
          "bg-background text-foreground font-sans",
          inter.variable,
          newsreader.variable,
        )}
      >
        <Providers>
          <div id="tooltip-target" />
          <Header />
          <MobileNav />
          <main className="grow bg-background text-foreground font-sans">
            {children}
          </main>
          <OnboardingFlow />
          <IntercomButton />
          <SiteToggle />
          <DynamicCookieBanner />
          <Toaster
            position="bottom-center"
            toastOptions={{
              className: "bg-gray-200! text-foreground! font-sans!",
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
