"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet, truncateAddress } from "@/hooks/use-wallet";
import { WalletModal } from "./wallet-modal";

const navItems = [
  { href: "/", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Header({
  status,
  assetCount,
}: {
  status: "connected" | "connecting" | "error";
  assetCount: number;
}) {
  const pathname = usePathname();
  const wallet = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const statusColor =
    status === "connected"
      ? "bg-oracle-green"
      : status === "connecting"
        ? "bg-oracle-yellow"
        : "bg-oracle-red";

  return (
    <>
      <header className="sticky top-0 z-50 h-14 px-6 flex items-center border-b border-oracle-border bg-oracle-bg/90 backdrop-blur-xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-8">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-oracle-accent to-oracle-purple text-white text-sm font-black shadow-[0_0_16px_rgba(59,130,246,0.3)]">
            O
          </div>
          <span className="text-sm font-extrabold font-mono tracking-wide">
            ORACLE
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-oracle-yellow/15 text-oracle-yellow font-bold tracking-widest font-mono">
            TESTNET
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-colors ${
                  active
                    ? "bg-oracle-accent/10 text-oracle-accent"
                    : "text-oracle-text-dim hover:text-oracle-text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-oracle-surface1 border border-oracle-border text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-pulse-dot absolute inset-0 rounded-full ${statusColor}`}
              />
              <span
                className={`animate-pulse-ring absolute -inset-0.5 rounded-full border ${statusColor.replace("bg-", "border-")} opacity-40`}
              />
            </span>
            <span
              className={`font-semibold uppercase tracking-wide text-[10px] ${
                status === "connected"
                  ? "text-oracle-green"
                  : status === "connecting"
                    ? "text-oracle-yellow"
                    : "text-oracle-red"
              }`}
            >
              {status}
            </span>
            {assetCount > 0 && (
              <>
                <span className="text-oracle-text-dim">·</span>
                <span className="text-oracle-text-muted">
                  {assetCount} markets
                </span>
              </>
            )}
          </div>

          {/* Wallet */}
          {wallet.isConnected ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-oracle-accent/10 border border-oracle-accent/20 text-xs font-mono font-semibold text-oracle-accent hover:bg-oracle-accent/15 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-oracle-green" />
                {truncateAddress(wallet.address!)}
              </button>
              {showDropdown && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-oracle-surface1 border border-oracle-border shadow-xl p-1 z-50">
                  <div className="px-3 py-2 text-[10px] text-oracle-text-dim font-mono break-all">
                    {wallet.address}
                  </div>
                  <div className="h-px bg-oracle-border my-1" />
                  <button
                    onClick={() => {
                      wallet.disconnect();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-oracle-red hover:bg-oracle-red/10 rounded-md transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-1.5 rounded-lg bg-oracle-accent text-white text-xs font-bold font-mono hover:brightness-110 transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {showModal && <WalletModal onClose={() => setShowModal(false)} />}
    </>
  );
}
