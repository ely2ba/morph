import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Washing machines | Hearth & Home",
  description:
    "A conventional washer catalogue that can become the decision interface this shopper needs.",
  metadataBase: new URL(
    process.env.SITE_URL ?? "https://you-shaped-web.carry-protocol.workers.dev",
  ),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hearth & Home | The You-Shaped Web",
    description:
      "From a 28-product grid to the decision tool this shopper needs.",
    url: "/",
    siteName: "The You-Shaped Web",
    images: [
      {
        url: "/submission/hearth-home-decision-workspace.png",
        width: 1280,
        height: 720,
        alt: "A composed Hearth & Home washer decision workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hearth & Home | The You-Shaped Web",
    description:
      "From a 28-product grid to the decision tool this shopper needs.",
    images: ["/submission/hearth-home-decision-workspace.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
