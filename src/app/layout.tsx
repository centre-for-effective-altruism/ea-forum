import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Charis_SIL, Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { getFaviconUrl } from "@/lib/cloudinary/cloudinaryHelpers";
import clsx from "clsx";
import Providers from "@/components/Providers";
import Header from "@/components/Header/Header";
import MobileNav from "@/components/Nav/MobileNav";
import IntercomButton from "@/components/Intercom/IntercomButton";
import DynamicCookieBanner from "@/components/Cookies/DynamicCookieBanner";
import OnboardingFlow from "@/components/Onboarding/OnboardingFlow";
import SiteToggle from "@/components/Admin/SiteToggle";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const charis = Charis_SIL({
  weight: ["400", "700"],
  variable: "--font-charis",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    template: "%s — EA Forum",
    default: "Effective Altruism Forum",
  },
  description:
    "The EA Forum hosts research, discussion, and updates on the world's most pressing problems. Including global health and development, animal welfare, AI safety, and biosecurity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href={getFaviconUrl(96)} sizes="96x96" />
        <link rel="apple-touch-icon" href={getFaviconUrl(180)} sizes="180x180" />
        <link rel="shortcut icon" href={getFaviconUrl(50)} />
        <meta name="apple-mobile-web-app-title" content="EA Forum" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={clsx(
          "antialiased text-size-adjust-none w-full min-h-screen flex flex-col",
          "bg-background text-foreground font-sans",
          inter.variable,
          charis.variable,
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
