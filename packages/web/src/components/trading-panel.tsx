"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { usePaperTrading } from "@/hooks/use-paper-trading";
import { OrderToast } from "./order-confirmation-toast";
import type { Market } from "@/lib/api";

export function TradingPanel({ market }: { market: Market }) {
  const wallet = useWallet();
  const { orders, toast, placeOrder } = usePaperTrading();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [orderType, setOrderType] = useState<"market" | "limit">("limit");
  const [price, setPrice] = useState(
    side === "yes" ? market.yesPrice : market.noPrice
  );
  const [size, setSize] = useState(100);

  const effectivePrice =
    orderType === "market"
      ? side === "yes"
        ? market.yesPrice
        : market.noPrice
      : price;
  const cost = size * (side === "yes" ? effectivePrice : 1 - effectivePrice);
  const payout = size;
  const profit = payout - cost;

  const marketOrders = orders.filter((o) => o.marketId === market.id);

  const handleSideChange = (newSide: "yes" | "no") => {
    setSide(newSide);
    setPrice(newSide === "yes" ? market.yesPrice : market.noPrice);
  };

  const handleSubmit = () => {
    if (!wallet.isConnected) return;
    if (size <= 0) return;
    if (orderType === "limit" && (price < 0.01 || price > 0.99)) return;

    placeOrder({
      marketId: market.id,
      side,
      type: orderType,
      price: effectivePrice,
      size,
    });
  };

  return (
    <div className="rounded-xl bg-oracle-surface1 border border-oracle-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-oracle-border flex items-center justify-between">
        <span className="text-sm font-bold text-oracle-text font-mono">
          Trade
        </span>
        <span className="text-[8px] px-1.5 py-0.5 rounded bg-oracle-yellow/15 text-oracle-yellow font-bold tracking-wider font-mono">
          PAPER TRADING
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* YES / NO toggle */}
        <div className="flex gap-1 p-0.5 bg-oracle-bg rounded-lg">
          <button
            onClick={() => handleSideChange("yes")}
            className={`flex-1 py-2 rounded-md text-xs font-bold font-mono transition-all ${
              side === "yes"
                ? "bg-oracle-green/15 text-oracle-green shadow-sm"
                : "text-oracle-text-dim hover:text-oracle-text-muted"
            }`}
          >
            YES
          </button>
          <button
            onClick={() => handleSideChange("no")}
            className={`flex-1 py-2 rounded-md text-xs font-bold font-mono transition-all ${
              side === "no"
                ? "bg-oracle-red/15 text-oracle-red shadow-sm"
                : "text-oracle-text-dim hover:text-oracle-text-muted"
            }`}
          >
            NO
          </button>
        </div>

        {/* Order type */}
        <div className="flex gap-1">
          {(["market", "limit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold font-mono transition-colors ${
                orderType === t
                  ? "bg-oracle-accent/10 text-oracle-accent"
                  : "text-oracle-text-dim hover:text-oracle-text-muted"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Price (limit only) */}
        {orderType === "limit" && (
          <div>
            <label className="block text-[10px] text-oracle-text-dim font-mono tracking-widest mb-1.5">
              PRICE (PROBABILITY)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-oracle-text-dim text-xs font-mono">
                $
              </span>
              <input
                type="number"
                min="0.01"
                max="0.99"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-oracle-border bg-oracle-bg text-oracle-text text-xs font-mono focus:border-oracle-border-hover focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Size */}
        <div>
          <label className="block text-[10px] text-oracle-text-dim font-mono tracking-widest mb-1.5">
            CONTRACTS
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2.5 rounded-lg border border-oracle-border bg-oracle-bg text-oracle-text text-xs font-mono focus:border-oracle-border-hover focus:outline-none"
          />
        </div>

        {/* Cost / Payout summary */}
        <div className="space-y-2 p-3 rounded-lg bg-oracle-bg border border-oracle-border">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-oracle-text-dim">Avg Price</span>
            <span className="text-oracle-text font-semibold">
              ${effectivePrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-oracle-text-dim">Cost</span>
            <span className="text-oracle-text font-semibold">
              ${cost.toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-oracle-border" />
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-oracle-text-dim">Potential Payout</span>
            <span className="text-oracle-green font-bold">
              ${payout.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-oracle-text-dim">Potential Profit</span>
            <span className="text-oracle-green font-bold">
              +${profit.toFixed(2)}
              <span className="text-oracle-text-dim ml-1">
                ({((profit / cost) * 100).toFixed(0)}%)
              </span>
            </span>
          </div>
        </div>

        {/* Place Order button */}
        {wallet.isConnected ? (
          <button
            onClick={handleSubmit}
            disabled={size <= 0}
            className={`w-full py-3 rounded-lg text-white text-xs font-bold font-mono transition-all disabled:opacity-50 ${
              side === "yes"
                ? "bg-oracle-green hover:brightness-110"
                : "bg-oracle-red hover:brightness-110"
            }`}
          >
            {side === "yes" ? "Buy YES" : "Buy NO"} — ${cost.toFixed(2)}
          </button>
        ) : (
          <div className="text-center text-[11px] text-oracle-text-dim font-mono py-3">
            Connect wallet to trade
          </div>
        )}
      </div>

      {/* Recent orders for this market */}
      {marketOrders.length > 0 && (
        <div className="border-t border-oracle-border">
          <div className="px-4 py-2 text-[10px] text-oracle-text-dim font-mono tracking-widest">
            YOUR ORDERS ({marketOrders.length})
          </div>
          <div className="max-h-40 overflow-y-auto">
            {marketOrders.slice(0, 10).map((o) => (
              <div
                key={o.id}
                className="px-4 py-1.5 flex items-center justify-between text-[11px] font-mono border-t border-oracle-border/30"
              >
                <span
                  className={`font-semibold ${
                    o.side === "yes"
                      ? "text-oracle-green"
                      : "text-oracle-red"
                  }`}
                >
                  {o.side.toUpperCase()}
                </span>
                <span className="text-oracle-text-muted">
                  {o.size} @ ${o.price.toFixed(2)}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    o.status === "filled"
                      ? "bg-oracle-green/10 text-oracle-green"
                      : o.status === "pending"
                        ? "bg-oracle-yellow/10 text-oracle-yellow"
                        : "bg-oracle-text-dim/10 text-oracle-text-dim"
                  }`}
                >
                  {o.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <OrderToast order={toast} />}
    </div>
  );
}
