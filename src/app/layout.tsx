import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Inter({
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EA Forum",
  description: "The EA Forum hosts research, discussion, and updates on the world's most pressing problems. Including global health and development, animal welfare, AI safety, and biosecurity.",
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
        className={`
          ${geistSans.variable} antialiased w-screen min-h-screen flex flex-col
        `}
      >
        <Nav />
        <main className="grow">
          {children}
        </main>
        <footer>
          Footer
        </footer>
      </body>
    </html>
  );
}
