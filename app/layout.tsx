import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Washing machines | Hearth & Home',
  description: 'One sentence becomes a personalised cost-and-fit comparison across every machine in the store.',
  metadataBase: new URL(
    process.env.SITE_URL ??
      'https://hearth-home-washer-decision.xflingoo.chatgpt.site',
  ),
  openGraph: {
    title: 'A smarter way to choose a washer',
    description: 'Cost, fit and quietness — calculated for your home.',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Three modern washing machines with the words A smarter way to choose a washer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A smarter way to choose a washer',
    description: 'Cost, fit and quietness — calculated for your home.',
    images: ['/og.png'],
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
