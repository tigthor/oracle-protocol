"use client";

import type { Market } from "@/lib/api";

export function ResolutionBadge({ market }: { market: Market }) {
  const now = Date.now();
  const timeToExpiry = market.expiresAt - now;
  const isExpired = timeToExpiry <= 0;
  const isNearExpiry = timeToExpiry > 0 && timeToExpiry < 24 * 60 * 60 * 1000;

  if (market.resolution !== null) {
    const isYes = market.resolution === 1;
    return (
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
          isYes
            ? "bg-oracle-green/10 text-oracle-green"
            : "bg-oracle-red/10 text-oracle-red"
        }`}
      >
        RESOLVED: {isYes ? "YES" : "NO"}
      </span>
    );
  }

  if (market.status === "disputed") {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-oracle-red/10 text-oracle-red font-bold font-mono">
        DISPUTED
      </span>
    );
  }

  if (market.status === "paused") {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-oracle-yellow/10 text-oracle-yellow font-bold font-mono">
        PAUSED
      </span>
    );
  }

  if (isExpired) {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-bold font-mono animate-pulse">
        RESOLVING
      </span>
    );
  }

  if (isNearExpiry) {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-oracle-yellow/10 text-oracle-yellow font-bold font-mono">
        RESOLVING SOON
      </span>
    );
  }

  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-oracle-green/10 text-oracle-green font-bold font-mono">
      TRADING
    </span>
  );
}
