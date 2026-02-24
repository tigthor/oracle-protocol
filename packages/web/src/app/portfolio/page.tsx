"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { StatCard } from "@/components/stat-card";
import { getUserPositions, getUserBalance } from "@/lib/api";
import { fmtUsd, fmtPct, fmtPrice } from "@/lib/format";
import { useWallet } from "@/hooks/use-wallet";
import type { Position, UserBalance } from "@/lib/api";

export default function PortfolioPage() {
  const wallet = useWallet();
  const [address, setAddress] = useState("");
  const [submittedAddr, setSubmittedAddr] = useState("");

  // Auto-load from wallet connection
  useEffect(() => {
    if (wallet.address && !submittedAddr) {
      setAddress(wallet.address);
      setSubmittedAddr(wallet.address);
    }
  }, [wallet.address]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = async (addr: string) => {
    if (!addr) return;
    setLoading(true);
    setError(null);
    try {
      const [pos, bal] = await Promise.all([
        getUserPositions(addr),
        getUserBalance(addr),
      ]);
      setPositions(pos);
      setBalance(bal);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (submittedAddr) {
      loadPortfolio(submittedAddr);
      const iv = setInterval(() => loadPortfolio(submittedAddr), 10000);
      return () => clearInterval(iv);
    }
  }, [submittedAddr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedAddr(address.trim());
  };

  const totalPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);

  return (
    <div className="min-h-screen bg-oracle-bg">
      <Header status="connected" assetCount={0} />

      <main className="max-w-5xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-black text-oracle-text mb-6">
          Portfolio
        </h1>

        {/* Address input */}
        <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Hyperliquid address (0x...)"
            className="flex-1 px-4 py-2.5 rounded-lg border border-oracle-border bg-oracle-surface1 text-oracle-text text-xs font-mono focus:border-oracle-border-hover focus:outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-oracle-accent text-white text-xs font-bold font-mono hover:brightness-110 transition-all"
          >
            Load Portfolio
          </button>
        </form>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-oracle-red/10 border border-oracle-red/20 text-xs text-oracle-red font-mono">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-12 text-center text-oracle-text-dim font-mono text-sm">
            Loading portfolio...
          </div>
        )}

        {!submittedAddr && !loading && (
          <div className="py-16 text-center">
            <div className="text-oracle-text-dim font-mono text-sm mb-2">
              Enter a Hyperliquid address to view positions and balances
            </div>
            <div className="text-oracle-text-dim/60 font-mono text-xs">
              Supports any address with positions on Hyperliquid Testnet
            </div>
          </div>
        )}

        {submittedAddr && !loading && balance && (
          <>
            {/* Balance stats */}
            <div className="flex gap-3 mb-6 flex-wrap">
              <StatCard
                label="ACCOUNT VALUE"
                value={fmtUsd(balance.accountValue)}
                color="text-oracle-text"
              />
              <StatCard
                label="WITHDRAWABLE"
                value={fmtUsd(balance.withdrawable)}
                color="text-oracle-green"
              />
              <StatCard
                label="MARGIN USED"
                value={fmtUsd(balance.totalMarginUsed)}
                color="text-oracle-yellow"
              />
              <StatCard
                label="POSITIONS"
                value={String(balance.positions)}
                color="text-oracle-accent"
              />
              <StatCard
                label="UNREALIZED PNL"
                value={`${totalPnl >= 0 ? "+" : ""}${fmtUsd(totalPnl)}`}
                color={
                  totalPnl >= 0 ? "text-oracle-green" : "text-oracle-red"
                }
              />
            </div>

            {/* Positions table */}
            <div className="bg-oracle-surface1 rounded-xl border border-oracle-border overflow-hidden">
              <div className="px-4 py-3 border-b border-oracle-border">
                <h2 className="text-sm font-bold text-oracle-text-muted font-mono">
                  OPEN POSITIONS ({positions.length})
                </h2>
              </div>

              {positions.length === 0 ? (
                <div className="py-12 text-center text-oracle-text-dim font-mono text-xs">
                  No open positions
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] text-oracle-text-dim tracking-wide">
                        <th className="text-left px-4 py-2.5">MARKET</th>
                        <th className="text-center px-4 py-2.5">SIDE</th>
                        <th className="text-right px-4 py-2.5">SIZE</th>
                        <th className="text-right px-4 py-2.5">ENTRY</th>
                        <th className="text-right px-4 py-2.5">CURRENT</th>
                        <th className="text-right px-4 py-2.5">PNL</th>
                        <th className="text-right px-4 py-2.5">
                          MAX PAYOUT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p, i) => {
                        const pnlPos = p.unrealizedPnl >= 0;
                        return (
                          <tr
                            key={p.marketId + i}
                            className="border-t border-oracle-border/50 hover:bg-oracle-surface2/50 transition-colors"
                          >
                            <td className="px-4 py-2.5">
                              <Link
                                href={`/market/${p.marketId}`}
                                className="text-oracle-text font-semibold hover:text-oracle-accent transition-colors"
                              >
                                {p.marketId}
                              </Link>
                            </td>
                            <td className="text-center px-4 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.side === "yes"
                                    ? "bg-oracle-green/10 text-oracle-green"
                                    : "bg-oracle-red/10 text-oracle-red"
                                }`}
                              >
                                {p.side.toUpperCase()}
                              </span>
                            </td>
                            <td className="text-right px-4 py-2.5 text-oracle-text-muted">
                              {p.size.toFixed(4)}
                            </td>
                            <td className="text-right px-4 py-2.5 text-oracle-text-muted">
                              {fmtPrice(p.avgEntryPrice)}
                            </td>
                            <td className="text-right px-4 py-2.5 text-oracle-text">
                              {fmtPrice(p.currentPrice)}
                            </td>
                            <td
                              className={`text-right px-4 py-2.5 font-semibold ${
                                pnlPos
                                  ? "text-oracle-green"
                                  : "text-oracle-red"
                              }`}
                            >
                              {pnlPos ? "+" : ""}
                              {fmtUsd(p.unrealizedPnl)}
                            </td>
                            <td className="text-right px-4 py-2.5 text-oracle-purple">
                              {fmtUsd(p.maxPayout)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
