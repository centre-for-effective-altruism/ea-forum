import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Charis_SIL, Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import clsx from "clsx";
import Providers from "@/components/Providers";
import Header from "@/components/Header/Header";
import MobileNav from "@/components/Nav/MobileNav";
import IntercomButton from "@/components/Intercom/IntercomButton";
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
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="EA Forum" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={clsx(
          "antialiased w-full min-h-screen flex flex-col",
          inter.variable,
          charis.variable,
        )}
      >
        <Providers>
          <div id="tooltip-target" />
          <Header />
          <MobileNav />
          <main className="grow">{children}</main>
          <IntercomButton />
          <Toaster position="bottom-center" />
        </Providers>
      </body>
    </html>
  );
}
