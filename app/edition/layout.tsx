import type { Metadata } from "next";
import "./edition.css";

export const metadata: Metadata = {
  title: "The Current | A finite, source-preserving edition",
  description:
    "Thirty fictional reports become a transparent edition built from verified, site-owned facts.",
  alternates: { canonical: "/edition" },
  openGraph: {
    title: "The Current | The You-Shaped Web",
    description:
      "From an endless feed to finite editions, event timelines, and source maps.",
    url: "/edition",
    siteName: "The You-Shaped Web",
    images: [
      {
        url: "/submission/the-current-finite-edition.png",
        width: 1280,
        height: 720,
        alt: "A finite, source-preserving edition from The Current",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Current | The You-Shaped Web",
    description:
      "From an endless feed to finite editions, event timelines, and source maps.",
    images: ["/submission/the-current-finite-edition.png"],
  },
};

export default function EditionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
