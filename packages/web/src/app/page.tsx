"use client";

import { Header } from "@/components/header";
import { MarketCard } from "@/components/market-card";
import { useMarkets } from "@/hooks/use-markets";

export default function MarketsPage() {
  const { markets, loading } = useMarkets();

  return (
    <div className="min-h-screen bg-oracle-bg">
      <Header status={loading ? "connecting" : "connected"} assetCount={markets.length} />
      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="py-20 text-center text-oracle-text-dim font-mono text-sm">
            Loading markets from ORACLE API...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
