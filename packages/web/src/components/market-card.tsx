"use client";

import Link from "next/link";
import type { Market } from "@/lib/api";
import { fmtUsd, fmtPct, timeUntil } from "@/lib/format";
import { ResolutionBadge } from "./resolution-badge";

const categoryColors: Record<string, string> = {
  crypto: "bg-oracle-accent/10 text-oracle-accent",
  macro: "bg-oracle-yellow/10 text-oracle-yellow",
  sports: "bg-oracle-green/10 text-oracle-green",
  tech: "bg-oracle-purple/10 text-oracle-purple",
  politics: "bg-oracle-red/10 text-oracle-red",
  custom: "bg-oracle-cyan/10 text-oracle-cyan",
};

export function MarketCard({ market }: { market: Market }) {
  const yesW = Math.round(market.yesPrice * 100);

  return (
    <Link
      href={`/market/${market.id}`}
      className="block p-4 rounded-xl bg-oracle-surface1 border border-oracle-border hover:border-oracle-border-hover transition-all group"
    >
      {/* Top row: category + expiry */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono tracking-wide uppercase ${
            categoryColors[market.category] || categoryColors.custom
          }`}
        >
          {market.category}
        </span>
        <ResolutionBadge market={market} />
      </div>

      {/* Question */}
      <h3 className="text-sm font-bold text-oracle-text mb-3 leading-snug group-hover:text-oracle-accent transition-colors line-clamp-2">
        {market.question}
      </h3>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-mono font-bold mb-1">
          <span className="text-oracle-green">YES {fmtPct(market.yesPrice)}</span>
          <span className="text-oracle-red">NO {fmtPct(market.noPrice)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-oracle-red/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-oracle-green transition-all"
            style={{ width: `${yesW}%` }}
          />
        </div>
      </div>

      {/* Bottom stats */}
      <div className="flex justify-between text-[10px] text-oracle-text-dim font-mono">
        <span>Vol: {fmtUsd(market.volume24h, 1)}</span>
        <span>Liq: {fmtUsd(market.liquidity, 1)}</span>
        <span>Total: {fmtUsd(market.totalVolume, 1)}</span>
      </div>
    </Link>
  );
}
