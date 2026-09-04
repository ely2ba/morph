import type { Metadata } from "next";
import "./showcase.css";

export const metadata: Metadata = {
  title: "The You-Shaped Web | The page becomes the interface you need",
  description:
    "Three ordinary websites become useful, persistent interfaces assembled around the person using them.",
  alternates: { canonical: "/showcase" },
  openGraph: {
    title: "The You-Shaped Web",
    description: "The page becomes the interface you need.",
    url: "/showcase",
    siteName: "The You-Shaped Web",
    images: [
      {
        url: "/submission/showcase-hero.png",
        width: 1280,
        height: 720,
        alt: "The You-Shaped Web showcase",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The You-Shaped Web",
    description: "The page becomes the interface you need.",
    images: ["/submission/showcase-hero.png"],
  },
};

export default function ShowcaseLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
