"use client";

import type { Candle } from "@/lib/api";

export function CandleChart({
  candles,
  label,
}: {
  candles: Candle[];
  label?: string;
}) {
  if (!candles || candles.length < 2) {
    return (
      <div className="h-56 flex items-center justify-center text-oracle-text-dim font-mono text-xs">
        Loading chart...
      </div>
    );
  }

  const W = 700;
  const H = 220;
  const PAD = 40;
  const data = candles.slice(-60);

  const allPx = data.flatMap((c) => [c.high, c.low]);
  const mn = Math.min(...allPx);
  const mx = Math.max(...allPx);
  const rng = mx - mn || 1;
  const barW = Math.max(2, (W - PAD * 2) / data.length - 1);

  const toY = (px: number) => PAD + (1 - (px - mn) / rng) * (H - PAD * 2);

  const last = data[data.length - 1];
  const lastClose = last.close;
  const lastIsUp = last.close >= last.open;

  return (
    <div>
      {label && (
        <div className="text-xs font-bold text-oracle-text-muted font-mono mb-2">
          {label}
        </div>
      )}
      <div className="bg-oracle-surface1 rounded-xl p-3 border border-oracle-border">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block">
          {/* Grid */}
          {[0.25, 0.5, 0.75].map((p) => {
            const px = mn + rng * p;
            const y = toY(px);
            return (
              <g key={p}>
                <line
                  x1={PAD}
                  y1={y}
                  x2={W - PAD}
                  y2={y}
                  stroke="#1a2744"
                  strokeWidth="0.5"
                  strokeDasharray="4,4"
                />
                <text
                  x={PAD - 4}
                  y={y + 3}
                  fill="#4a5d84"
                  fontSize="8"
                  fontFamily="'JetBrains Mono',monospace"
                  textAnchor="end"
                >
                  {px > 100 ? Math.round(px).toLocaleString() : px.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Candles */}
          {data.map((c, i) => {
            const x = PAD + (i / data.length) * (W - PAD * 2);
            const isGreen = c.close >= c.open;
            const color = isGreen ? "#22c55e" : "#ef4444";
            const bodyTop = toY(Math.max(c.open, c.close));
            const bodyBot = toY(Math.min(c.open, c.close));
            const bodyH = Math.max(1, bodyBot - bodyTop);

            return (
              <g key={i}>
                <line
                  x1={x + barW / 2}
                  y1={toY(c.high)}
                  x2={x + barW / 2}
                  y2={toY(c.low)}
                  stroke={color}
                  strokeWidth="1"
                />
                <rect
                  x={x}
                  y={bodyTop}
                  width={barW}
                  height={bodyH}
                  fill={color}
                  rx="0.5"
                  opacity="0.9"
                />
              </g>
            );
          })}

          {/* Current price line */}
          {(() => {
            const y = toY(lastClose);
            const color = lastIsUp ? "#22c55e" : "#ef4444";
            return (
              <g>
                <line
                  x1={PAD}
                  y1={y}
                  x2={W - PAD}
                  y2={y}
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.6"
                />
                <rect
                  x={W - PAD + 2}
                  y={y - 8}
                  width={50}
                  height={16}
                  rx="3"
                  fill={color}
                  opacity="0.9"
                />
                <text
                  x={W - PAD + 27}
                  y={y + 3}
                  fill="#fff"
                  fontSize="9"
                  fontFamily="'JetBrains Mono',monospace"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {lastClose > 100
                    ? Math.round(lastClose).toLocaleString()
                    : lastClose.toFixed(4)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
