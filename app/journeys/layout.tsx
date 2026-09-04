import type { Metadata } from 'next';
import './journeys.css';

export const metadata: Metadata = {
  title: 'London to Amsterdam journeys | Wayline',
  description: 'Compare credible fictional travel results, then let WebMCP turn them into a transparent door-to-door decision tool.',
  openGraph: {
    title: 'Wayline — the whole journey, not just the flight',
    description: 'A live WebMCP journey decision tool with inspectable time and reliability calculations.',
    images: [],
  },
  twitter: {
    title: 'Wayline — the whole journey, not just the flight',
    description: 'A live WebMCP journey decision tool with inspectable time and reliability calculations.',
    images: [],
  },
};

export default function JourneysLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
