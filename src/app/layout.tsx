import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import Navbar from "@/components/client/navbar";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Saliw — Worship Music Portal",
  description:
    "Professional web portal for worship leaders and musicians. Dynamic chord transposition, song library, and setlist management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      {/*
       * Inline background on <body> applies before React hydrates,
       * preventing the white flash on initial load.
       * The CSS variable resolves after stylesheet load; the literal
       * #fdf8f3 fires immediately from the HTML stream.
       */}
      <body style={{ backgroundColor: "#fdf8f3" }}>
        <Navbar />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
