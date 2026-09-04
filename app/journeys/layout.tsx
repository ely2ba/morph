import type { Metadata } from "next";
import "./journeys.css";

export const metadata: Metadata = {
  title: "London to Amsterdam journeys | Wayline",
  description:
    "Compare fictional travel results, then turn them into a transparent door-to-door decision tool.",
  alternates: { canonical: "/journeys" },
  openGraph: {
    title: "Wayline | Morph",
    description:
      "From advertised durations to timelines, stress tests, and complete journeys.",
    url: "/journeys",
    siteName: "Morph",
    images: [
      {
        url: "/submission/wayline-complete-journey.png",
        width: 1280,
        height: 720,
        alt: "A complete-journey Wayline decision interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wayline | Morph",
    description:
      "From advertised durations to timelines, stress tests, and complete journeys.",
    images: ["/submission/wayline-complete-journey.png"],
  },
};

export default function JourneysLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
