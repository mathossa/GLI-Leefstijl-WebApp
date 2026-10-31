import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mijn Leefstijl", template: "%s | Mijn Leefstijl" },
  description: "Kleine stappen, groot verschil. Jouw doelen, acties en reflecties op één plek.",
  applicationName: "Mijn Leefstijl",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/brand/app-icon-palette-3.svg", type: "image/svg+xml" }], shortcut: "/brand/app-icon-palette-3.svg", apple: "/brand/app-icon-palette-3.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f5d50",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
