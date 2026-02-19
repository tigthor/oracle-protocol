"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { useMarketDetail } from "@/hooks/use-markets";

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { market, loading } = useMarketDetail(id);

  return (
    <div className="min-h-screen bg-oracle-bg">
      <Header status={loading && !market ? "connecting" : "connected"} assetCount={0} />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2 mb-4 text-xs font-mono">
          <Link href="/" className="text-oracle-text-dim hover:text-oracle-accent transition-colors">Markets</Link>
          <span className="text-oracle-text-dim">/</span>
          <span className="text-oracle-text-muted">{id}</span>
        </div>

        {loading && !market ? (
          <div className="py-20 text-center text-oracle-text-dim font-mono">Loading market...</div>
        ) : !market ? (
          <div className="py-20 text-center text-oracle-text-dim font-mono">Market not found</div>
        ) : (
          <div>
            <h1 className="text-2xl font-black text-oracle-text mb-2">{market.question}</h1>
            <p className="text-sm text-oracle-text-muted">{market.description}</p>
            <div className="mt-6 text-oracle-text-dim font-mono text-sm">Loading trading components...</div>
          </div>
        )}
      </main>
    </div>
  );
}
