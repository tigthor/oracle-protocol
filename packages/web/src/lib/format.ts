export function fmtUsd(n: number, decimals = 2): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(decimals)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(decimals)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(decimals)}K`;
  return `$${n.toFixed(decimals)}`;
}

export function fmtPrice(n: number): string {
  if (n >= 100) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hrs}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}
