import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════
// ORACLE PROTOCOL — Working Demo with Live Hyperliquid Testnet Data
// Calls real HL APIs at api.hyperliquid-testnet.xyz
// ═══════════════════════════════════════════════════════════════════

const HL_API = "https://api.hyperliquid-testnet.xyz";
const HL_WS = "wss://api.hyperliquid-testnet.xyz/ws";

const C = {
  bg: "#060a10", s1: "#0b1120", s2: "#111b2e", b: "#1a2744", bh: "#2563eb",
  t: "#e8ecf4", tm: "#7b8db5", td: "#4a5d84",
  a: "#3b82f6", ag: "rgba(59,130,246,0.12)",
  g: "#22c55e", gg: "rgba(34,197,94,0.1)",
  r: "#ef4444", rg: "rgba(239,68,68,0.1)",
  y: "#eab308", p: "#a855f7", c: "#06b6d4",
};

const mono = "'JetBrains Mono',ui-monospace,monospace";
const sans = "'Space Grotesk',-apple-system,sans-serif";

// ── Hyperliquid API Client (real testnet calls) ──
async function hlPost(body) {
  const res = await fetch(`${HL_API}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HL API ${res.status}`);
  return res.json();
}

async function fetchMeta() { return hlPost({ type: "meta" }); }
async function fetchMetaAndCtx() { return hlPost({ type: "metaAndAssetCtxs" }); }
async function fetchAllMids() { return hlPost({ type: "allMids" }); }
async function fetchL2Book(coin) { return hlPost({ type: "l2Book", coin }); }
async function fetchRecentTrades(coin) { return hlPost({ type: "recentTrades", coin }); }
async function fetchCandles(coin, interval = "1h") {
  const now = Date.now();
  return hlPost({
    type: "candleSnapshot",
    req: { coin, interval, startTime: now - 7 * 86400000, endTime: now }
  });
}

// ── Format helpers ──
const fmt = (n, d = 2) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(d)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(d)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(d)}K`;
  return `$${n.toFixed(d)}`;
};

const pct = (n) => `${(n * 100).toFixed(1)}%`;

// ── Animated pulse dot ──
function Pulse({ color = C.g, size = 6 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%", background: color,
        animation: "pulse 2s infinite",
      }} />
      <span style={{
        position: "absolute", inset: -2, borderRadius: "50%", border: `1px solid ${color}`,
        animation: "pulsering 2s infinite", opacity: 0.4,
      }} />
    </span>
  );
}

// ── Stat badge ──
function Stat({ label, value, sub, color = C.a }) {
  return (
    <div style={{
      padding: "14px 18px", borderRadius: 10, background: C.s1,
      border: `1px solid ${C.b}`, flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 10, color: C.td, fontFamily: mono, letterSpacing: "0.1em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: mono }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.tm, fontFamily: mono, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Mini sparkline ──
function Spark({ data, color, w = 80, h = 24 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Asset card ──
function AssetCard({ asset, ctx, mid, onClick, selected }) {
  const price = parseFloat(mid || ctx?.midPx || "0");
  const prevDay = parseFloat(ctx?.prevDayPx || "0");
  const change = prevDay > 0 ? ((price - prevDay) / prevDay) : 0;
  const vol = parseFloat(ctx?.dayNtlVlm || "0");
  const oi = parseFloat(ctx?.openInterest || "0");
  const isUp = change >= 0;

  return (
    <div onClick={() => onClick(asset.name)} style={{
      padding: 16, borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
      background: selected ? `${C.a}11` : C.s1,
      border: `1px solid ${selected ? C.bh : C.b}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.t, fontFamily: sans }}>{asset.name}</span>
          <span style={{
            fontSize: 9, marginLeft: 6, padding: "1px 5px", borderRadius: 3,
            background: "rgba(168,85,247,0.12)", color: C.p, fontFamily: mono, fontWeight: 600,
          }}>PERP</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, color: isUp ? C.g : C.r, fontFamily: mono,
        }}>{isUp ? "▲" : "▼"} {(Math.abs(change) * 100).toFixed(2)}%</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.t, fontFamily: mono, marginBottom: 6 }}>
        {price > 1 ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : price.toFixed(6)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.td, fontFamily: mono }}>
        <span>Vol: {fmt(vol, 1)}</span>
        <span>OI: {fmt(oi, 1)}</span>
      </div>
    </div>
  );
}

// ── Order Book Display ──
function OrderBookView({ book, loading }) {
  if (loading) return <div style={{ padding: 20, textAlign: "center", color: C.td, fontFamily: mono, fontSize: 12 }}>Loading order book...</div>;
  if (!book?.levels) return <div style={{ padding: 20, textAlign: "center", color: C.td, fontFamily: mono, fontSize: 12 }}>No order book data</div>;

  const bids = (book.levels[0] || []).slice(0, 12);
  const asks = (book.levels[1] || []).slice(0, 12);
  const maxBidSz = Math.max(...bids.map(b => parseFloat(b.sz)), 1);
  const maxAskSz = Math.max(...asks.map(a => parseFloat(a.sz)), 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px 8px", fontSize: 10, color: C.td, fontFamily: mono, letterSpacing: "0.05em" }}>
        <span>PRICE</span><span>SIZE</span><span>ORDERS</span>
      </div>
      {/* Asks (reversed) */}
      {[...asks].reverse().map((a, i) => {
        const pctW = (parseFloat(a.sz) / maxAskSz) * 100;
        return (
          <div key={`a${i}`} style={{ position: "relative", padding: "3px 8px", marginBottom: 1 }}>
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${pctW}%`, background: C.rg, borderRadius: 2 }} />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: mono }}>
              <span style={{ color: C.r, fontWeight: 600 }}>{parseFloat(a.px).toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
              <span style={{ color: C.tm }}>{parseFloat(a.sz).toFixed(4)}</span>
              <span style={{ color: C.td, fontSize: 10 }}>{a.n}</span>
            </div>
          </div>
        );
      })}
      {/* Spread */}
      {bids.length > 0 && asks.length > 0 && (
        <div style={{ padding: "6px 8px", textAlign: "center", fontSize: 10, color: C.y, fontFamily: mono, borderTop: `1px solid ${C.b}`, borderBottom: `1px solid ${C.b}`, margin: "4px 0" }}>
          Spread: {(parseFloat(asks[0]?.px || "0") - parseFloat(bids[0]?.px || "0")).toFixed(2)}
        </div>
      )}
      {/* Bids */}
      {bids.map((b, i) => {
        const pctW = (parseFloat(b.sz) / maxBidSz) * 100;
        return (
          <div key={`b${i}`} style={{ position: "relative", padding: "3px 8px", marginBottom: 1 }}>
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${pctW}%`, background: C.gg, borderRadius: 2 }} />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: mono }}>
              <span style={{ color: C.g, fontWeight: 600 }}>{parseFloat(b.px).toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
              <span style={{ color: C.tm }}>{parseFloat(b.sz).toFixed(4)}</span>
              <span style={{ color: C.td, fontSize: 10 }}>{b.n}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Recent Trades ──
function RecentTradesView({ trades, loading }) {
  if (loading) return <div style={{ padding: 20, textAlign: "center", color: C.td, fontFamily: mono, fontSize: 12 }}>Loading trades...</div>;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px 8px", fontSize: 10, color: C.td, fontFamily: mono }}>
        <span>PRICE</span><span>SIZE</span><span>TIME</span>
      </div>
      {(trades || []).slice(0, 20).map((t, i) => {
        const isBuy = t.side === "B";
        const time = new Date(t.time).toLocaleTimeString();
        return (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", padding: "3px 8px",
            fontSize: 11, fontFamily: mono, marginBottom: 1,
          }}>
            <span style={{ color: isBuy ? C.g : C.r, fontWeight: 600 }}>{parseFloat(t.px).toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
            <span style={{ color: C.tm }}>{parseFloat(t.sz).toFixed(4)}</span>
            <span style={{ color: C.td, fontSize: 10 }}>{time}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Candle Chart ──
function CandleChart({ candles, coin }) {
  if (!candles || candles.length < 2) {
    return <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.td, fontFamily: mono, fontSize: 12 }}>Loading chart...</div>;
  }

  const W = 700, H = 220, PAD = 40;
  const data = candles.slice(-60);
  const allPx = data.flatMap(c => [parseFloat(c.h), parseFloat(c.l)]);
  const mn = Math.min(...allPx), mx = Math.max(...allPx);
  const rng = mx - mn || 1;
  const barW = Math.max(2, (W - PAD * 2) / data.length - 1);

  const toY = (px) => PAD + (1 - (px - mn) / rng) * (H - PAD * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(p => {
        const px = mn + rng * p;
        const y = toY(px);
        return (
          <g key={p}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={C.b} strokeWidth="0.5" strokeDasharray="4,4" />
            <text x={PAD - 4} y={y + 3} fill={C.td} fontSize="8" fontFamily={mono} textAnchor="end">
              {px > 100 ? Math.round(px).toLocaleString() : px.toFixed(2)}
            </text>
          </g>
        );
      })}
      {/* Candles */}
      {data.map((c, i) => {
        const o = parseFloat(c.o), h = parseFloat(c.h), l = parseFloat(c.l), cl = parseFloat(c.c);
        const x = PAD + (i / data.length) * (W - PAD * 2);
        const isGreen = cl >= o;
        const color = isGreen ? C.g : C.r;
        const bodyTop = toY(Math.max(o, cl));
        const bodyBot = toY(Math.min(o, cl));
        const bodyH = Math.max(1, bodyBot - bodyTop);

        return (
          <g key={i}>
            <line x1={x + barW / 2} y1={toY(h)} x2={x + barW / 2} y2={toY(l)} stroke={color} strokeWidth="1" />
            <rect x={x} y={bodyTop} width={barW} height={bodyH} fill={color} rx="0.5" opacity="0.9" />
          </g>
        );
      })}
      {/* Current price line */}
      {data.length > 0 && (() => {
        const last = parseFloat(data[data.length - 1].c);
        const y = toY(last);
        const isUp = parseFloat(data[data.length - 1].c) >= parseFloat(data[data.length - 1].o);
        return (
          <g>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={isUp ? C.g : C.r} strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
            <rect x={W - PAD + 2} y={y - 8} width={50} height={16} rx="3" fill={isUp ? C.g : C.r} opacity="0.9" />
            <text x={W - PAD + 27} y={y + 3} fill="#fff" fontSize="9" fontFamily={mono} textAnchor="middle" fontWeight="700">
              {last > 100 ? Math.round(last).toLocaleString() : last.toFixed(4)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ── Connection Status Indicator ──
function ConnectionStatus({ status, assetCount, latency }) {
  const colors = { connected: C.g, connecting: C.y, error: C.r, disconnected: C.td };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "6px 14px",
      borderRadius: 8, background: C.s1, border: `1px solid ${C.b}`, fontSize: 11, fontFamily: mono,
    }}>
      <Pulse color={colors[status] || C.td} />
      <span style={{ color: colors[status], fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em" }}>
        {status}
      </span>
      {assetCount > 0 && <span style={{ color: C.td }}>·</span>}
      {assetCount > 0 && <span style={{ color: C.tm }}>{assetCount} assets</span>}
      {latency && <span style={{ color: C.td }}>·</span>}
      {latency && <span style={{ color: C.c }}>{latency}ms</span>}
    </div>
  );
}

// ═══ MAIN APP ═══
export default function OracleLiveDemo() {
  const [status, setStatus] = useState("connecting");
  const [assets, setAssets] = useState([]);
  const [assetCtxs, setAssetCtxs] = useState([]);
  const [mids, setMids] = useState({});
  const [selected, setSelected] = useState(null);
  const [book, setBook] = useState(null);
  const [trades, setTrades] = useState([]);
  const [candles, setCandles] = useState([]);
  const [latency, setLatency] = useState(null);
  const [loading, setLoading] = useState({ book: false, trades: false });
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("book");
  const [searchTerm, setSearchTerm] = useState("");
  const wsRef = useRef(null);
  const refreshRef = useRef(null);

  // ── Initial data load from real HL testnet ──
  const loadData = useCallback(async () => {
    try {
      const t0 = Date.now();
      const [metaAndCtx, allMids] = await Promise.all([fetchMetaAndCtx(), fetchAllMids()]);
      const lat = Date.now() - t0;
      setLatency(lat);

      const [meta, ctx] = metaAndCtx;
      setAssets(meta.universe || []);
      setAssetCtxs(ctx || []);
      setMids(allMids || {});
      setStatus("connected");
      setError(null);

      if (!selected && meta.universe?.length > 0) {
        const btc = meta.universe.find(a => a.name === "BTC");
        setSelected(btc ? "BTC" : meta.universe[0].name);
      }
    } catch (err) {
      console.error("HL API Error:", err);
      setStatus("error");
      setError(err.message);
    }
  }, [selected]);

  // ── Load asset-specific data ──
  const loadAssetData = useCallback(async (coin) => {
    if (!coin) return;
    setLoading({ book: true, trades: true });
    try {
      const [bookData, tradeData, candleData] = await Promise.allSettled([
        fetchL2Book(coin),
        fetchRecentTrades(coin),
        fetchCandles(coin),
      ]);
      if (bookData.status === "fulfilled") setBook(bookData.value);
      if (tradeData.status === "fulfilled") setTrades(tradeData.value);
      if (candleData.status === "fulfilled") setCandles(candleData.value);
    } catch (err) {
      console.warn("Asset data load error:", err);
    } finally {
      setLoading({ book: false, trades: false });
    }
  }, []);

  // ── WebSocket connection for real-time prices ──
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(HL_WS);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.channel === "allMids" && msg.data?.mids) {
            setMids(msg.data.mids);
          }
        } catch {}
      };

      ws.onclose = () => { wsRef.current = null; };
    } catch {}

    return () => { if (ws) ws.close(); };
  }, []);

  // ── Initial load + polling ──
  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    refreshRef.current = setInterval(loadData, 8000);
    return () => clearInterval(refreshRef.current);
  }, [loadData]);

  useEffect(() => { loadAssetData(selected); }, [selected, loadAssetData]);

  // ── Auto-refresh book ──
  useEffect(() => {
    if (!selected) return;
    const iv = setInterval(() => loadAssetData(selected), 5000);
    return () => clearInterval(iv);
  }, [selected, loadAssetData]);

  const handleSelect = (coin) => {
    setSelected(coin);
    setBook(null);
    setTrades([]);
    setCandles([]);
  };

  const filtered = assets.filter(a => 
    !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selIdx = assets.findIndex(a => a.name === selected);
  const selCtx = selIdx >= 0 ? assetCtxs[selIdx] : null;
  const selPrice = selected ? parseFloat(mids[selected] || selCtx?.midPx || "0") : 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t, fontFamily: sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.b}; border-radius:3px; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes pulsering { 0% { transform:scale(1); opacity:0.4; } 100% { transform:scale(2.5); opacity:0; } }
        button:hover { filter:brightness(1.15); }
        input:focus { outline:none; border-color:${C.bh} !important; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        padding: "0 24px", height: 56, display: "flex", alignItems: "center",
        borderBottom: `1px solid ${C.b}`, background: "rgba(6,10,16,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${C.a}, ${C.p})`,
            fontSize: 13, fontWeight: 900, color: "#fff",
            boxShadow: `0 0 16px rgba(59,130,246,0.3)`,
          }}>O</div>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.t, fontFamily: mono, letterSpacing: "0.04em" }}>ORACLE</span>
          <span style={{
            fontSize: 8, padding: "2px 5px", borderRadius: 3,
            background: "rgba(234,179,8,0.15)", color: C.y,
            fontWeight: 700, letterSpacing: "0.1em", fontFamily: mono,
          }}>LIVE TESTNET</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <ConnectionStatus status={status} assetCount={assets.length} latency={latency} />
        </div>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          padding: "10px 24px", background: C.rg, borderBottom: `1px solid ${C.r}33`,
          fontSize: 12, color: C.r, fontFamily: mono, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>⚠</span>
          <span>API Error: {error}. Retrying...</span>
          <button onClick={loadData} style={{
            marginLeft: "auto", padding: "4px 12px", borderRadius: 4, border: `1px solid ${C.r}44`,
            background: "transparent", color: C.r, cursor: "pointer", fontSize: 11, fontFamily: mono,
          }}>Retry Now</button>
        </div>
      )}

      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
        {/* ── Left Sidebar: Asset List ── */}
        <div style={{
          width: 300, borderRight: `1px solid ${C.b}`, overflow: "auto",
          flexShrink: 0, background: C.bg,
        }}>
          <div style={{ padding: 12 }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assets..."
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.b}`,
                background: C.s1, color: C.t, fontSize: 12, fontFamily: mono,
              }}
            />
          </div>
          <div style={{ padding: "0 8px 8px" }}>
            <div style={{ fontSize: 10, color: C.td, fontFamily: mono, padding: "4px 8px", letterSpacing: "0.1em" }}>
              {filtered.length} ASSETS ON HYPERLIQUID TESTNET
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {filtered.slice(0, 30).map((asset, idx) => (
                <AssetCard
                  key={asset.name}
                  asset={asset}
                  ctx={assetCtxs[assets.indexOf(asset)]}
                  mid={mids[asset.name]}
                  onClick={handleSelect}
                  selected={selected === asset.name}
                />
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: C.td, fontFamily: mono, fontSize: 12 }}>
                  {status === "connecting" ? "Loading from Hyperliquid..." : "No assets found"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {selected ? (
            <>
              {/* Top stats */}
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.b}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, fontFamily: sans }}>{selected}</span>
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.ag, color: C.a, fontFamily: mono, fontWeight: 600 }}>
                    PERPETUAL
                  </span>
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "rgba(6,182,212,0.12)", color: C.c, fontFamily: mono, fontWeight: 600 }}>
                    HyperCore CLOB
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Stat label="MARK PRICE" value={selPrice > 100 ? `$${selPrice.toLocaleString(undefined, {maximumFractionDigits: 2})}` : `$${selPrice.toFixed(6)}`} color={C.t} />
                  <Stat label="24H VOLUME" value={fmt(parseFloat(selCtx?.dayNtlVlm || "0"))} color={C.a} />
                  <Stat label="OPEN INTEREST" value={fmt(parseFloat(selCtx?.openInterest || "0"))} color={C.p} />
                  <Stat label="FUNDING RATE" value={selCtx ? `${(parseFloat(selCtx.funding || "0") * 100).toFixed(4)}%` : "—"} color={C.y} sub="per 8h" />
                  <Stat label="ORACLE PRICE" value={selCtx ? `$${parseFloat(selCtx.oraclePx || "0").toLocaleString(undefined, {maximumFractionDigits: 2})}` : "—"} color={C.c} />
                </div>
              </div>

              {/* Chart */}
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.b}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.tm, fontFamily: mono, marginBottom: 8 }}>
                  {selected} · 1H CANDLES · LIVE FROM HYPERCORE
                </div>
                <div style={{ background: C.s1, borderRadius: 10, padding: 12, border: `1px solid ${C.b}` }}>
                  <CandleChart candles={candles} coin={selected} />
                </div>
              </div>

              {/* Book / Trades tabs */}
              <div style={{ padding: "12px 20px" }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                  {[
                    { id: "book", label: "Order Book" },
                    { id: "trades", label: "Recent Trades" },
                    { id: "info", label: "Market Info" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                      padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                      background: tab === t.id ? C.ag : "transparent",
                      color: tab === t.id ? C.a : C.td,
                      fontSize: 12, fontWeight: 600, fontFamily: mono, transition: "all 0.15s",
                    }}>{t.label}</button>
                  ))}
                </div>

                <div style={{ background: C.s1, borderRadius: 10, padding: 16, border: `1px solid ${C.b}`, minHeight: 300 }}>
                  {tab === "book" && <OrderBookView book={book} loading={loading.book} />}
                  {tab === "trades" && <RecentTradesView trades={trades} loading={loading.trades} />}
                  {tab === "info" && (
                    <div style={{ fontSize: 12, fontFamily: mono, color: C.tm, lineHeight: 2 }}>
                      <div><span style={{ color: C.td }}>Asset:</span> <span style={{ color: C.t, fontWeight: 600 }}>{selected}</span></div>
                      <div><span style={{ color: C.td }}>Type:</span> Perpetual Future (HyperCore)</div>
                      <div><span style={{ color: C.td }}>Max Leverage:</span> {assets.find(a => a.name === selected)?.maxLeverage}x</div>
                      <div><span style={{ color: C.td }}>Size Decimals:</span> {assets.find(a => a.name === selected)?.szDecimals}</div>
                      <div><span style={{ color: C.td }}>Mark Price:</span> <span style={{ color: C.t, fontWeight: 700 }}>${selPrice.toLocaleString()}</span></div>
                      <div><span style={{ color: C.td }}>Oracle Price:</span> ${parseFloat(selCtx?.oraclePx || "0").toLocaleString()}</div>
                      <div><span style={{ color: C.td }}>Impact Bid/Ask:</span> {selCtx?.impactPxs?.[0]} / {selCtx?.impactPxs?.[1]}</div>
                      <div><span style={{ color: C.td }}>Premium:</span> {selCtx?.premium || "—"}</div>
                      <div><span style={{ color: C.td }}>Network:</span> <span style={{ color: C.y }}>Hyperliquid Testnet</span></div>
                      <div><span style={{ color: C.td }}>API:</span> <span style={{ color: C.c }}>{HL_API}</span></div>
                      <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: 6, border: `1px solid ${C.b}` }}>
                        <div style={{ color: C.a, fontWeight: 700, marginBottom: 4 }}>💡 HIP-4 Outcome Trading</div>
                        <div style={{ color: C.td, fontSize: 11, lineHeight: 1.6 }}>
                          This demo shows live data from Hyperliquid's testnet CLOB. In the full ORACLE Protocol,
                          each market maps to a HIP-4 outcome contract where price = probability (0-1).
                          Contracts are fully collateralized, zero leverage, zero gas, and settle in USDH.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.td, fontFamily: mono }}>
              {status === "connecting" ? "Connecting to Hyperliquid testnet..." : "Select an asset from the sidebar"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
