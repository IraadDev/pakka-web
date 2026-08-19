import type { Metadata, Viewport } from "next";
import { SessionProvider } from "@/lib/session";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "PAKKA — Verified second-hand, protected payments",
  description:
    "Buy and sell used goods in India with verified identities, documented condition and payment held until you confirm delivery.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ececea" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Design system, loaded verbatim. Do not edit these in this repo —
            they are copied from the design-system project. */}
        <link rel="stylesheet" href="/styles/pinlink.css" />
        <link rel="stylesheet" href="/styles/fh-shell.css" />
        <link rel="stylesheet" href="/styles/mam-components.css" />
        <link rel="stylesheet" href="/styles/mam-categories.css" />
        {/* The four components the DS does not have yet (spec A6). */}
        <link rel="stylesheet" href="/styles/pakka-new.css" />
      </head>
      <body>
        <a className="pl-skip" href="#main">Skip to content</a>
        <SessionProvider>
          <Shell>{children}</Shell>
        </SessionProvider>
      </body>
    </html>
  );
}
