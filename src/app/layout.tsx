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
  metadataBase: new URL("https://saliw.vercel.app"),
  title: {
    default: "Saliw",
    template: "%s | Saliw",
  },
  description:
    "Professional web portal for worship leaders and musicians. Dynamic chord transposition, song library, and setlist management.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Saliw",
    description:
      "Professional web portal for worship leaders and musicians. Dynamic chord transposition, song library, and setlist management.",
    url: "https://saliw.vercel.app",
    siteName: "Saliw",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Saliw — Worship Music Portal",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Saliw",
    description:
      "Professional web portal for worship leaders and musicians. Dynamic chord transposition, song library, and setlist management.",
    images: ["/og-image.png"],
  },
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
