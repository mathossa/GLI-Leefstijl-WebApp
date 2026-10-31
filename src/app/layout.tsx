import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mijn Leefstijl", template: "%s | Mijn Leefstijl" },
  description: "Kleine stappen, groot verschil. Jouw doelen, acties en reflecties op één plek.",
  applicationName: "Mijn Leefstijl",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/app-icon-approved-v5-32.png", sizes: "32x32", type: "image/png" }, { url: "/brand/app-icon-approved-v5-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/brand/app-icon-approved-v5-32.png",
    apple: [{ url: "/brand/app-icon-approved-v5-180.png", sizes: "180x180", type: "image/png" }],
  },
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
