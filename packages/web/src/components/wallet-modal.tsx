"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";

export function WalletModal({ onClose }: { onClose: () => void }) {
  const { connect, connectDemo } = useWallet();
  const [addr, setAddr] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addr.trim();
    if (!trimmed.startsWith("0x") || trimmed.length < 10) {
      setError("Enter a valid 0x address");
      return;
    }
    connect(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl bg-oracle-surface1 border border-oracle-border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-oracle-text">
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-oracle-text-dim hover:text-oracle-text text-lg leading-none"
          >
            x
          </button>
        </div>

        {/* Paste address */}
        <form onSubmit={handleSubmit} className="mb-4">
          <label className="block text-[10px] text-oracle-text-dim font-mono tracking-widest mb-2">
            HYPERLIQUID ADDRESS
          </label>
          <input
            type="text"
            value={addr}
            onChange={(e) => {
              setAddr(e.target.value);
              setError("");
            }}
            placeholder="0x..."
            className="w-full px-4 py-2.5 rounded-lg border border-oracle-border bg-oracle-bg text-oracle-text text-xs font-mono focus:border-oracle-border-hover focus:outline-none mb-2"
          />
          {error && (
            <div className="text-[10px] text-oracle-red font-mono mb-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-oracle-accent text-white text-xs font-bold font-mono hover:brightness-110 transition-all"
          >
            Connect
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-oracle-border" />
          <span className="text-[10px] text-oracle-text-dim font-mono">OR</span>
          <div className="flex-1 h-px bg-oracle-border" />
        </div>

        {/* Demo wallet */}
        <button
          onClick={() => {
            connectDemo();
            onClose();
          }}
          className="w-full py-2.5 rounded-lg border border-oracle-border bg-oracle-surface2 text-oracle-text text-xs font-mono font-semibold hover:border-oracle-border-hover transition-all"
        >
          Use Demo Wallet
          <span className="ml-2 text-[8px] px-1.5 py-0.5 rounded bg-oracle-yellow/15 text-oracle-yellow font-bold tracking-wider">
            TESTNET
          </span>
        </button>

        <p className="mt-4 text-[10px] text-oracle-text-dim font-mono text-center leading-relaxed">
          Paper trading mode — no real funds required.
          <br />
          Works with any Hyperliquid Testnet address.
        </p>
      </div>
    </div>
  );
}
