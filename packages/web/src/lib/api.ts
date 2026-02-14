const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Types mirrored from @oracle/sdk ──

export type MarketCategory =
  | "crypto"
  | "macro"
  | "sports"
  | "tech"
  | "politics"
  | "custom";
export type MarketStatus =
  | "pending"
  | "active"
  | "paused"
  | "resolved"
  | "disputed"
  | "cancelled";

export interface Market {
  id: string;
  question: string;
  description: string;
  category: MarketCategory;
  status: MarketStatus;
  createdAt: number;
  expiresAt: number;
  resolutionSource: string;
  outcomeAssetId: string | null;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  totalVolume: number;
  liquidity: number;
  resolution: 0 | 1 | null;
  tags: string[];
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
  orders: number;
}

export interface OrderBook {
  marketId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midPrice: number;
  lastUpdate: number;
}

export interface Trade {
  id: string;
  marketId: string;
  side: "yes" | "no";
  price: number;
  size: number;
  timestamp: number;
  maker: string;
  taker: string;
  txHash: string;
}

export interface Position {
  marketId: string;
  market: Market;
  side: "yes" | "no";
  size: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  maxPayout: number;
}

export interface UserBalance {
  accountValue: number;
  withdrawable: number;
  totalMarginUsed: number;
  positions: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  timestamp: number;
  error?: string;
}

// ── API methods ──

export async function getMarkets(params?: {
  category?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Market[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  const res = await fetchApi<ApiResponse<Market[]>>(
    `/api/v1/markets${q ? `?${q}` : ""}`
  );
  return { data: res.data, total: res.total || res.data.length };
}

export async function getMarket(id: string): Promise<Market> {
  const res = await fetchApi<ApiResponse<Market>>(`/api/v1/markets/${id}`);
  return res.data;
}

export async function getOrderBook(id: string): Promise<OrderBook> {
  const res = await fetchApi<ApiResponse<OrderBook>>(
    `/api/v1/markets/${id}/orderbook`
  );
  return res.data;
}

export async function getTrades(
  id: string,
  limit = 50
): Promise<Trade[]> {
  const res = await fetchApi<ApiResponse<Trade[]>>(
    `/api/v1/markets/${id}/trades?limit=${limit}`
  );
  return res.data;
}

export async function getCandles(
  id: string,
  interval = "1h"
): Promise<Candle[]> {
  const res = await fetchApi<ApiResponse<Candle[]>>(
    `/api/v1/markets/${id}/candles?interval=${interval}`
  );
  return res.data;
}

export async function getAllPrices(): Promise<Record<string, string>> {
  const res = await fetchApi<ApiResponse<Record<string, string>>>(
    `/api/v1/markets/prices/all`
  );
  return res.data;
}

export async function getUserPositions(
  address: string
): Promise<Position[]> {
  const res = await fetchApi<ApiResponse<Position[]>>(
    `/api/v1/markets/user/${address}/positions`
  );
  return res.data;
}

export async function getUserBalance(
  address: string
): Promise<UserBalance> {
  const res = await fetchApi<ApiResponse<UserBalance>>(
    `/api/v1/markets/user/${address}/balance`
  );
  return res.data;
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  rank: number;
  address: string;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  bestTrade: number;
}

export async function getLeaderboard(
  period = "7d"
): Promise<LeaderboardEntry[]> {
  const res = await fetchApi<ApiResponse<LeaderboardEntry[]>>(
    `/api/v1/markets/leaderboard?period=${period}`
  );
  return res.data;
}
