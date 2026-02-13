import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ORACLE Protocol — Prediction Markets on Hyperliquid",
  description:
    "Institutional-grade prediction markets on Hyperliquid HIP-4. Sub-100ms execution, zero gas, full CLOB composability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-oracle-bg text-oracle-text font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
