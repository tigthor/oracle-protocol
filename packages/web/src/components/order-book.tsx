"use client";

import type { OrderBook } from "@/lib/api";

export function OrderBookView({
  book,
  loading,
}: {
  book: OrderBook | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="py-8 text-center text-oracle-text-dim font-mono text-xs">
        Loading order book...
      </div>
    );
  }

  if (!book || (!book.bids?.length && !book.asks?.length)) {
    return (
      <div className="py-8 text-center text-oracle-text-dim font-mono text-xs">
        No order book data
      </div>
    );
  }

  const bids = (book.bids || []).slice(0, 12);
  const asks = (book.asks || []).slice(0, 12);
  const maxBidSz = Math.max(...bids.map((b) => b.size), 1);
  const maxAskSz = Math.max(...asks.map((a) => a.size), 1);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between px-2 pb-2 text-[10px] text-oracle-text-dim font-mono tracking-wide">
        <span>PRICE</span>
        <span>SIZE</span>
        <span>TOTAL</span>
      </div>

      {/* Asks (reversed so lowest ask near spread) */}
      {[...asks].reverse().map((a, i) => {
        const pctW = (a.size / maxAskSz) * 100;
        return (
          <div key={`a${i}`} className="relative px-2 py-0.5 mb-px">
            <div
              className="absolute right-0 top-0 bottom-0 bg-oracle-red/10 rounded-sm"
              style={{ width: `${pctW}%` }}
            />
            <div className="relative flex justify-between text-[11px] font-mono">
              <span className="text-oracle-red font-semibold">
                {a.price.toFixed(4)}
              </span>
              <span className="text-oracle-text-muted">
                {a.size.toFixed(4)}
              </span>
              <span className="text-oracle-text-dim text-[10px]">
                {a.total.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Spread */}
      {bids.length > 0 && asks.length > 0 && (
        <div className="py-1.5 text-center text-[10px] text-oracle-yellow font-mono border-y border-oracle-border my-1">
          Spread: {book.spread.toFixed(4)} · Mid: {book.midPrice.toFixed(4)}
        </div>
      )}

      {/* Bids */}
      {bids.map((b, i) => {
        const pctW = (b.size / maxBidSz) * 100;
        return (
          <div key={`b${i}`} className="relative px-2 py-0.5 mb-px">
            <div
              className="absolute right-0 top-0 bottom-0 bg-oracle-green/10 rounded-sm"
              style={{ width: `${pctW}%` }}
            />
            <div className="relative flex justify-between text-[11px] font-mono">
              <span className="text-oracle-green font-semibold">
                {b.price.toFixed(4)}
              </span>
              <span className="text-oracle-text-muted">
                {b.size.toFixed(4)}
              </span>
              <span className="text-oracle-text-dim text-[10px]">
                {b.total.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
