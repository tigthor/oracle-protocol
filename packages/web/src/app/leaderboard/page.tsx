"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { StatCard } from "@/components/stat-card";
import { getLeaderboard } from "@/lib/api";
import { fmtUsd } from "@/lib/format";
import type { LeaderboardEntry } from "@/lib/api";

const periods = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "all", label: "All Time" },
];

const rankColors: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-gray-300",
  3: "text-orange-400",
};

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function LeaderboardPage() {
  // Period selector state — candidate for useLeaderboard hook
  const [period, setPeriod] = useState("7d");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard(period);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const totalTraders = entries.length;
  const totalVolume = entries.reduce(
    (s, e) => s + Math.abs(e.totalPnl) * 2,
    0
  );
  const biggestWin = Math.max(...entries.map((e) => e.bestTrade), 0);
  const topPnl = entries.length > 0 ? entries[0].totalPnl : 0;

  return (
    <div className="min-h-screen bg-oracle-bg">
      <Header status="connected" assetCount={0} />

      <main className="max-w-5xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-black text-oracle-text mb-6">
          Leaderboard
        </h1>

        {/* Stats */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <StatCard
            label="TRADERS"
            value={String(totalTraders)}
            color="text-oracle-text"
          />
          <StatCard
            label="TOTAL VOLUME"
            value={fmtUsd(totalVolume)}
            color="text-oracle-accent"
          />
          <StatCard
            label="BIGGEST WIN"
            value={fmtUsd(biggestWin)}
            color="text-oracle-green"
          />
          <StatCard
            label="TOP P&L"
            value={`+${fmtUsd(topPnl)}`}
            color="text-oracle-purple"
          />
        </div>

        {/* Period filter */}
        <div className="flex gap-1 mb-6">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold font-mono transition-colors ${
                period === p.id
                  ? "bg-oracle-accent/10 text-oracle-accent"
                  : "text-oracle-text-dim hover:text-oracle-text-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-oracle-surface1 rounded-xl border border-oracle-border overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-oracle-text-dim font-mono text-sm">
              Loading leaderboard...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[10px] text-oracle-text-dim tracking-wide">
                    <th className="text-left px-4 py-3">RANK</th>
                    <th className="text-left px-4 py-3">TRADER</th>
                    <th className="text-right px-4 py-3">WINS</th>
                    <th className="text-right px-4 py-3">LOSSES</th>
                    <th className="text-right px-4 py-3">WIN RATE</th>
                    <th className="text-right px-4 py-3">TOTAL P&L</th>
                    <th className="text-right px-4 py-3">BEST TRADE</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const pnlPos = e.totalPnl >= 0;
                    return (
                      <tr
                        key={e.address}
                        className="border-t border-oracle-border/50 hover:bg-oracle-surface2/50 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-sm font-black ${
                              rankColors[e.rank] || "text-oracle-text-muted"
                            }`}
                          >
                            #{e.rank}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-oracle-text font-semibold">
                          {truncAddr(e.address)}
                        </td>
                        <td className="text-right px-4 py-2.5 text-oracle-green">
                          {e.wins}
                        </td>
                        <td className="text-right px-4 py-2.5 text-oracle-red">
                          {e.losses}
                        </td>
                        <td className="text-right px-4 py-2.5 text-oracle-text-muted">
                          {(e.winRate * 100).toFixed(1)}%
                        </td>
                        <td
                          className={`text-right px-4 py-2.5 font-bold ${
                            pnlPos
                              ? "text-oracle-green"
                              : "text-oracle-red"
                          }`}
                        >
                          {pnlPos ? "+" : ""}
                          {fmtUsd(e.totalPnl)}
                        </td>
                        <td className="text-right px-4 py-2.5 text-oracle-purple">
                          {fmtUsd(e.bestTrade)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
