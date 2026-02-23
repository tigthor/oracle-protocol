"use client";

import type { PaperOrder } from "@/hooks/use-paper-trading";

export function OrderToast({ order }: { order: PaperOrder }) {
  const isYes = order.side === "yes";

  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-[slideUp_0.3s_ease-out]">
      <div
        className={`px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl ${
          isYes
            ? "bg-oracle-green/10 border-oracle-green/30"
            : "bg-oracle-red/10 border-oracle-red/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
              isYes
                ? "bg-oracle-green/20 text-oracle-green"
                : "bg-oracle-red/20 text-oracle-red"
            }`}
          >
            {isYes ? "Y" : "N"}
          </div>
          <div>
            <div className="text-xs font-bold text-oracle-text font-mono">
              Order Filled
            </div>
            <div className="text-[11px] text-oracle-text-muted font-mono">
              {order.size} {order.side.toUpperCase()} @ ${order.price.toFixed(2)}
            </div>
          </div>
          <div className="text-right ml-4">
            <div className="text-[10px] text-oracle-text-dim font-mono">
              Cost
            </div>
            <div
              className={`text-sm font-bold font-mono ${
                isYes ? "text-oracle-green" : "text-oracle-red"
              }`}
            >
              $
              {(
                order.size *
                (isYes ? order.price : 1 - order.price)
              ).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
