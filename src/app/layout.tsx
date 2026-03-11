import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blocknate — Professional Crypto Signals & Live Market Data",
  description: "Real-time cryptocurrency signals, live market data, Fear & Greed index, and professional trading tools for serious traders.",
  keywords: "crypto signals, bitcoin, trading, market analysis, fear greed index",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
