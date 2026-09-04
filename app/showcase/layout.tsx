import type { Metadata } from "next";
import "./showcase.css";

export const metadata: Metadata = {
  title: "Morph | The page becomes the interface you need",
  description:
    "Three ordinary websites become useful, persistent interfaces assembled around the person using them.",
  alternates: { canonical: "/showcase" },
  openGraph: {
    title: "Morph",
    description: "The page becomes the interface you need.",
    url: "/showcase",
    siteName: "Morph",
    images: [
      {
        url: "/submission/showcase-hero.png",
        width: 1280,
        height: 720,
        alt: "Morph showcase",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Morph",
    description: "The page becomes the interface you need.",
    images: ["/submission/showcase-hero.png"],
  },
};

export default function ShowcaseLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
