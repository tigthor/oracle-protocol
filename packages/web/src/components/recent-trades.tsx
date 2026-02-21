"use client";

import type { Trade } from "@/lib/api";
import { fmtTime } from "@/lib/format";

export function RecentTradesView({
  trades,
  loading,
}: {
  trades: Trade[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="py-8 text-center text-oracle-text-dim font-mono text-xs">
        Loading trades...
      </div>
    );
  }

  if (!trades?.length) {
    return (
      <div className="py-8 text-center text-oracle-text-dim font-mono text-xs">
        No recent trades
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between px-2 pb-2 text-[10px] text-oracle-text-dim font-mono tracking-wide">
        <span>SIDE</span>
        <span>PRICE</span>
        <span>SIZE</span>
        <span>TIME</span>
      </div>
      {trades.slice(0, 25).map((t, i) => {
        const isYes = t.side === "yes";
        return (
          <div
            key={t.id || i}
            className="flex justify-between px-2 py-0.5 text-[11px] font-mono mb-px"
          >
            <span
              className={`font-semibold w-8 ${isYes ? "text-oracle-green" : "text-oracle-red"}`}
            >
              {isYes ? "YES" : "NO"}
            </span>
            <span
              className={`font-semibold ${isYes ? "text-oracle-green" : "text-oracle-red"}`}
            >
              {t.price.toFixed(4)}
            </span>
            <span className="text-oracle-text-muted">
              {t.size.toFixed(4)}
            </span>
            <span className="text-oracle-text-dim text-[10px]">
              {fmtTime(t.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
