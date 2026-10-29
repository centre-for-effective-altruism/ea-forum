import { Suspense, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import { getSiteUrl } from "@/lib/routeHelpers";
import { isNoIndexSite } from "@/lib/environment";
import { themeClasses, themeScript } from "@/lib/themes";
import {
  getSiteLogoUrl,
  getSiteOgImageUrl,
} from "@/lib/cloudinary/cloudinaryHelpers";
import clsx from "clsx";
import ForumMagnumBundlePreload from "@/components/ForumMagnumBundlePreload";
import DynamicCookieBanner from "@/components/Cookies/DynamicCookieBanner";
import PostHogConsent from "@/components/Cookies/PostHogConsent";
import OnboardingFlow from "@/components/Onboarding/OnboardingFlow";
import IntercomButton from "@/components/Intercom/IntercomButton";
import PageLoadListener from "@/components/PageLoadListener";
import PageAnalytics from "@/components/PageAnalytics";
import DynamicSiteToggle from "@/components/Admin/DynamicSiteToggle";
import MobileNav from "@/components/Nav/MobileNav";
import Header from "@/components/Header/Header";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = localFont({
  src: "../fonts/InterVariable.woff2",
  // Declare the full variable weight range so browsers (notably iOS Safari) use
  // the font's own weight axis instead of synthesising bold, which made 600/700
  // text look extra-bolded.
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const newsreader = localFont({
  src: [
    {
      path: "../fonts/Newsreader[opsz,wght].woff2",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../fonts/Newsreader-Italic[opsz,wght].woff2",
      style: "italic",
      weight: "100 900",
    },
  ],
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
    robots: isNoIndexSite ? "noindex" : undefined,
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

const clientIdScript = `(() => {
let rid=()=>{
  let cs="abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTWXYZ23456789"
  let id=[]
  for(let i=0;i<17;i++)id.push(cs[Math.floor(Math.random()*cs.length)])
  return id.join("")
}
if (!document.cookie.split(";").map(c=>c.trim()).find(c=>c.startsWith("clientId=")))
  document.cookie=\`clientId=\${rid()}; path=/; max-age=315360000; SameSite=Lax\`
if (!window.tabId)
  window.tabId=rid()
})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={themeClasses.auto} suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="delegate-ch"
          content="sec-ch-dpr https://res.cloudinary.com;"
        />
        <Script
          id="client-id-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: clientIdScript }}
        />
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
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
        <Suspense>
          <ForumMagnumBundlePreload />
        </Suspense>
        <Providers>
          <Suspense>
            <PageLoadListener />
          </Suspense>
          <PageAnalytics />
          <div id="tooltip-target" />
          <Header />
          <Suspense>
            <MobileNav />
          </Suspense>
          <main className="grow bg-background text-foreground font-sans max-w-full">
            {children}
          </main>
          <Suspense>
            <OnboardingFlow />
          </Suspense>
          <Suspense>
            <IntercomButton />
          </Suspense>
          <Suspense>
            <DynamicSiteToggle />
          </Suspense>
          <DynamicCookieBanner />
          <PostHogConsent />
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
