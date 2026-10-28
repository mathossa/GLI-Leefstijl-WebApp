import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mijn Leefstijl", template: "%s | Mijn Leefstijl" },
  description: "Een rustige plek voor persoonlijke leefstijldoelen, gewoontes en reflectie.",
  applicationName: "Mijn Leefstijl",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#234f40",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
