import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blocknate — Professional Crypto Trading Signals",
  description: "Automated crypto trading signals powered by technical analysis. Live charts, market tools, Fear & Greed index, news and education for serious traders.",
  keywords: "crypto signals, trading signals, bitcoin, ethereum, technical analysis, fear greed index, crypto trading",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Blocknate — Professional Crypto Trading Signals",
    description: "Automated crypto trading signals powered by technical analysis. Live charts, market tools, news and education.",
    url: "https://blocknate.vercel.app",
    siteName: "Blocknate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blocknate — Professional Crypto Trading Signals",
    description: "Automated crypto trading signals powered by technical analysis.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
