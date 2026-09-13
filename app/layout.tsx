import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Startup SA — Before everyone knows them",
  description: "Discover what South Africa is building next. Find your favourite emerging startups and give them a little lift.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
