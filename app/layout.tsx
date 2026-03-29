import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import FontSizeControls from "./components/FontSizeControls";
import CursorTrail from "./components/CursorTrail";

export const metadata: Metadata = {
  title: "Dear Stranger",
  description: "A universe of slow letters",
  applicationName: "Dear Stranger",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dear Stranger",
  },
  icons: {
    icon: "/icon?size=512",
    apple: "/apple-icon",
  },
};

export const viewport: Viewport = {
  themeColor: "#04050f",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Cinzel:wght@300;400&family=IM+Fell+English:ital@0;1&family=Playfair+Display:ital,wght@0,400;1,400&family=Dancing+Script:wght@400&family=Parisienne&family=Allura&family=Sacramento&family=Style+Script&family=Satisfy&family=Pacifico&family=Special+Elite&family=Bellefair&family=Baskervville:ital@0;1&family=Marcellus&family=Courier+Prime:ital@0;1&family=Indie+Flower&family=Roboto+Slab:wght@400&family=Lora:ital,wght@0,400;1,400&family=Quicksand:wght@400&family=Source+Sans+3:wght@400&family=Roboto:wght@400&family=Lato:wght@400&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <CursorTrail />
        {children}
        <FontSizeControls />
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
