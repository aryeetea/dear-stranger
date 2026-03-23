import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Allura&family=Baskervville:ital@0;1&family=Bellefair&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Cormorant+Unicase:wght@400;500&family=Cinzel:wght@300;400&family=Dancing+Script:wght@400;500&family=IM+Fell+English:ital@0;1&family=Italiana&family=Marcellus&family=Parisienne&family=Petit+Formal+Script&family=Sacramento&family=Special+Elite&family=Style+Script&family=Unna:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
