"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/header";
import { MarketCard } from "@/components/market-card";
import { StatCard } from "@/components/stat-card";
import { useMarkets } from "@/hooks/use-markets";
import { usePrices } from "@/hooks/use-prices";
import { fmtUsd } from "@/lib/format";

const categories = [
  { id: "", label: "All" },
  { id: "crypto", label: "Crypto" },
  { id: "macro", label: "Macro" },
  { id: "sports", label: "Sports" },
  { id: "tech", label: "Tech" },
  { id: "politics", label: "Politics" },
];

const sortOptions = [
  { id: "volume", label: "Volume" },
  { id: "newest", label: "Newest" },
  { id: "expiring", label: "Expiring Soon" },
];

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("volume");
  const { markets, total, loading, error } = useMarkets({
    category: category || undefined,
    search: search || undefined,
    sortBy,
  });
  const prices = usePrices();
  const priceCount = Object.keys(prices).length;

  const status = error ? "error" : loading ? "connecting" : "connected";

  const stats = useMemo(() => {
    const totalVol24 = markets.reduce((s, m) => s + m.volume24h, 0);
    const totalLiq = markets.reduce((s, m) => s + m.liquidity, 0);
    const totalVol = markets.reduce((s, m) => s + m.totalVolume, 0);
    return { totalVol24, totalLiq, totalVol };
  }, [markets]);

  return (
    <div className="min-h-screen bg-oracle-bg">
      <Header status={status} assetCount={total} />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-3 mb-6 flex-wrap">
          <StatCard label="ACTIVE MARKETS" value={String(total)} color="text-oracle-text" />
          <StatCard label="24H VOLUME" value={fmtUsd(stats.totalVol24)} color="text-oracle-accent" />
          <StatCard label="TOTAL LIQUIDITY" value={fmtUsd(stats.totalLiq)} color="text-oracle-purple" />
          <StatCard label="ALL-TIME VOLUME" value={fmtUsd(stats.totalVol)} color="text-oracle-cyan" />
          <StatCard label="LIVE PRICES" value={String(priceCount)} sub="via Hyperliquid WS" color="text-oracle-green" />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="px-3 py-2 rounded-lg border border-oracle-border bg-oracle-surface1 text-oracle-text text-xs font-mono w-60 focus:border-oracle-border-hover focus:outline-none"
          />

          <div className="flex gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold font-mono transition-colors ${
                  category === cat.id
                    ? "bg-oracle-accent/10 text-oracle-accent"
                    : "text-oracle-text-dim hover:text-oracle-text-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px] text-oracle-text-dim font-mono mr-1">Sort:</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
                  sortBy === opt.id
                    ? "bg-oracle-accent/10 text-oracle-accent"
                    : "text-oracle-text-dim hover:text-oracle-text-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-oracle-yellow/10 border border-oracle-yellow/20 text-xs text-oracle-yellow font-mono flex items-center gap-2">
            <span className="animate-pulse">◉</span>
            {error}
          </div>
        )}

        {loading && !markets.length ? (
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

        {!loading && markets.length === 0 && (
          <div className="py-20 text-center text-oracle-text-dim font-mono text-sm">
            No markets found
          </div>
        )}
      </main>
    </div>
  );
}
