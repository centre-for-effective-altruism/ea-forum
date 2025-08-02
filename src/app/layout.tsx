import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";

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
      <body
        className={`
          ${geistSans.variable} antialiased min-h-screen flex flex-col
        `}
      >
        <header>
          <nav>
            Nav
          </nav>
        </header>
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
