"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { StatCard } from "@/components/stat-card";
import { OrderBookView } from "@/components/order-book";
import { RecentTradesView } from "@/components/recent-trades";
import { CandleChart } from "@/components/candle-chart";
import { TradingPanel } from "@/components/trading-panel";
import { ResolutionBadge } from "@/components/resolution-badge";
import { ResolutionDetail } from "@/components/resolution-detail";
import { useMarketDetail } from "@/hooks/use-markets";
import { usePrices } from "@/hooks/use-prices";
import { fmtUsd, fmtPct, fmtPrice, fmtDate, timeUntil } from "@/lib/format";

const categoryColors: Record<string, string> = {
  crypto: "bg-oracle-accent/10 text-oracle-accent",
  macro: "bg-oracle-yellow/10 text-oracle-yellow",
  sports: "bg-oracle-green/10 text-oracle-green",
  tech: "bg-oracle-purple/10 text-oracle-purple",
  politics: "bg-oracle-red/10 text-oracle-red",
  custom: "bg-oracle-cyan/10 text-oracle-cyan",
};

type Tab = "book" | "trades" | "info";

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { market, orderBook, trades, candles, loading } = useMarketDetail(id);
  const prices = usePrices();
  const [tab, setTab] = useState<Tab>("book");

  const status = loading && !market ? "connecting" : "connected";
  const coin = market?.outcomeAssetId || "";
  const livePrice = coin && prices[coin] ? parseFloat(prices[coin]) : null;

  return (
    <div className="min-h-screen bg-oracle-bg">
      <Header status={status} assetCount={0} />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2 mb-4 text-xs font-mono">
          <Link href="/" className="text-oracle-text-dim hover:text-oracle-accent transition-colors">Markets</Link>
          <span className="text-oracle-text-dim">/</span>
          <span className="text-oracle-text-muted">{id}</span>
        </div>

        {loading && !market ? (
          <div className="py-20 text-center text-oracle-text-dim font-mono">Loading market...</div>
        ) : !market ? (
          // Show not found state for unknown market IDs
          <div className="py-20 text-center text-oracle-text-dim font-mono">Market not found</div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono tracking-wide uppercase ${categoryColors[market.category] || categoryColors.custom}`}>
                  {market.category}
                </span>
                <ResolutionBadge market={market} />
                {coin && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-oracle-cyan/10 text-oracle-cyan font-bold font-mono">
                    HyperCore CLOB
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-oracle-text mb-1">{market.question}</h1>
              <p className="text-sm text-oracle-text-muted">{market.description}</p>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-oracle-surface1 border border-oracle-border">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <div className="text-[10px] text-oracle-text-dim font-mono tracking-widest mb-1">YES PROBABILITY</div>
                  <div className="text-3xl font-black font-mono text-oracle-green">{fmtPct(market.yesPrice)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-oracle-text-dim font-mono tracking-widest mb-1">NO PROBABILITY</div>
                  <div className="text-3xl font-black font-mono text-oracle-red">{fmtPct(market.noPrice)}</div>
                </div>
              </div>
              <div className="h-3 rounded-full bg-oracle-red/30 overflow-hidden">
                <div className="h-full rounded-full bg-oracle-green transition-all duration-500" style={{ width: `${Math.round(market.yesPrice * 100)}%` }} />
              </div>
            </div>

            <div className="flex gap-3 mb-6 flex-wrap">
              {livePrice !== null && (
                <StatCard label="LIVE PRICE" value={fmtPrice(livePrice)} sub="via Hyperliquid WS" color="text-oracle-text" />
              )}
              <StatCard label="24H VOLUME" value={fmtUsd(market.volume24h)} color="text-oracle-accent" />
              <StatCard label="TOTAL VOLUME" value={fmtUsd(market.totalVolume)} color="text-oracle-purple" />
              <StatCard label="LIQUIDITY" value={fmtUsd(market.liquidity)} color="text-oracle-cyan" />
              <StatCard label="EXPIRES" value={timeUntil(market.expiresAt)} sub={fmtDate(market.expiresAt)} color="text-oracle-yellow" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              <div>
                <div className="mb-6">
                  <CandleChart candles={candles} label={`${coin || market.id} · 1H CANDLES · LIVE FROM HYPERCORE`} />
                </div>

                <div>
                  <div className="flex gap-1 mb-4">
                    {([{ id: "book", label: "Order Book" }, { id: "trades", label: "Recent Trades" }, { id: "info", label: "Market Info" }] as const).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-3.5 py-1.5 rounded-md text-xs font-semibold font-mono transition-colors ${tab === t.id ? "bg-oracle-accent/10 text-oracle-accent" : "text-oracle-text-dim hover:text-oracle-text-muted"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="bg-oracle-surface1 rounded-xl p-4 border border-oracle-border min-h-[300px]">
                    {tab === "book" && <OrderBookView book={orderBook} loading={loading} />}
                    {tab === "trades" && <RecentTradesView trades={trades} loading={loading} />}
                    {tab === "info" && (
                      <div className="text-xs font-mono text-oracle-text-muted leading-8">
                        <div><span className="text-oracle-text-dim">Market ID:</span> <span className="text-oracle-text font-semibold">{market.id}</span></div>
                        <div><span className="text-oracle-text-dim">Outcome Asset:</span> {market.outcomeAssetId || "—"}</div>
                        <div><span className="text-oracle-text-dim">Category:</span> {market.category}</div>
                        <div><span className="text-oracle-text-dim">Status:</span> {market.status}</div>
                        <div><span className="text-oracle-text-dim">Resolution Source:</span> {market.resolutionSource}</div>
                        <div><span className="text-oracle-text-dim">Created:</span> {fmtDate(market.createdAt)}</div>
                        <div><span className="text-oracle-text-dim">Expires:</span> {fmtDate(market.expiresAt)}</div>
                        <div><span className="text-oracle-text-dim">Resolution:</span> {market.resolution === null ? "Pending" : market.resolution === 1 ? "YES" : "NO"}</div>
                        <div><span className="text-oracle-text-dim">Tags:</span> {market.tags.join(", ") || "—"}</div>
                        <div><span className="text-oracle-text-dim">Network:</span> <span className="text-oracle-yellow">Hyperliquid Testnet</span></div>
                        <ResolutionDetail market={market} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:sticky lg:top-20 lg:self-start">
                <TradingPanel market={market} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
