"use client";

import type { Market } from "@/lib/api";
import { fmtDate, timeUntil } from "@/lib/format";

const oracleSources = [
  { name: "HyperCore Mark Price", weight: 3, confidence: 95 },
  { name: "Chainlink Feed", weight: 3, confidence: 90 },
  { name: "Pyth Network", weight: 2, confidence: 85 },
  { name: "CoinGecko API", weight: 1, confidence: 70 },
];

const lifecycleSteps = [
  { label: "Created", status: "pending" },
  { label: "Active", status: "active" },
  { label: "Resolving", status: "resolving" },
  { label: "Resolved", status: "resolved" },
];

function getStepIndex(market: Market): number {
  if (market.resolution !== null) return 3;
  if (market.expiresAt <= Date.now()) return 2;
  if (market.status === "active") return 1;
  return 0;
}

export function ResolutionDetail({ market }: { market: Market }) {
  const currentStep = getStepIndex(market);
  const isExpired = market.expiresAt <= Date.now();
  const disputeEnd = market.expiresAt + 24 * 60 * 60 * 1000;

  return (
    <div className="mt-6 space-y-4">
      {/* Resolution Timeline */}
      <div className="p-3 rounded-lg bg-oracle-bg border border-oracle-border">
        <div className="text-oracle-accent font-bold mb-3 text-xs">
          Resolution Lifecycle
        </div>
        <div className="flex items-center gap-1">
          {lifecycleSteps.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <div key={step.label} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold font-mono mb-1 ${
                    isDone
                      ? "bg-oracle-green/20 text-oracle-green"
                      : isActive
                        ? "bg-oracle-accent/20 text-oracle-accent ring-2 ring-oracle-accent/30"
                        : "bg-oracle-border text-oracle-text-dim"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={`text-[9px] font-mono ${
                    isDone || isActive
                      ? "text-oracle-text-muted"
                      : "text-oracle-text-dim"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Oracle Sources */}
      <div className="p-3 rounded-lg bg-oracle-bg border border-oracle-border">
        <div className="text-oracle-accent font-bold mb-3 text-xs">
          Oracle Sources (Weighted Consensus)
        </div>
        <div className="space-y-2">
          {oracleSources.map((src) => (
            <div key={src.name}>
              <div className="flex justify-between text-[10px] font-mono mb-0.5">
                <span className="text-oracle-text-muted">{src.name}</span>
                <span className="text-oracle-text-dim">
                  Weight: {src.weight} · {src.confidence}% confidence
                </span>
              </div>
              <div className="h-1 rounded-full bg-oracle-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-oracle-accent transition-all"
                  style={{ width: `${src.confidence}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-oracle-text-dim font-mono">
          Quorum: 60% weighted vote required for resolution
        </div>
      </div>

      {/* Settlement Info */}
      <div className="p-3 rounded-lg bg-oracle-bg border border-oracle-border">
        <div className="text-oracle-accent font-bold mb-2 text-xs">
          Settlement Details
        </div>
        <div className="text-[10px] font-mono text-oracle-text-dim space-y-1 leading-relaxed">
          <div>
            <span className="text-oracle-text-muted">Dispute Window:</span>{" "}
            {isExpired
              ? `Ends ${fmtDate(disputeEnd)} (${timeUntil(disputeEnd)})`
              : "24h after resolution (0s on testnet)"}
          </div>
          <div>
            <span className="text-oracle-text-muted">Settlement:</span>{" "}
            Automatic via HIP-4 — YES = $1.00, NO = $0.00
          </div>
          <div>
            <span className="text-oracle-text-muted">Collateral:</span>{" "}
            Fully collateralized, zero leverage, zero liquidation risk
          </div>
          <div>
            <span className="text-oracle-text-muted">Currency:</span>{" "}
            USDH (Hyperliquid native)
          </div>
        </div>
      </div>
    </div>
  );
}
