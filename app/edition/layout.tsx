import type { Metadata } from 'next';
import './edition.css';

export const metadata: Metadata = {
  title: 'The Current | A finite, source-preserving edition',
  description: 'Thirty fictional reports become a transparent edition built from verified, site-owned facts.',
  openGraph: {
    title: 'The Current — your finite edition',
    description: 'A live WebMCP proof that collapses repeated coverage while preserving original reporting and provenance.',
    images: [],
  },
  twitter: {
    title: 'The Current — your finite edition',
    description: 'A live WebMCP proof that collapses repeated coverage while preserving original reporting and provenance.',
    images: [],
  },
};

export default function EditionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
