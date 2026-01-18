import { z } from "zod";

// ═══════════════════════════════════════════════════════
// ORACLE PROTOCOL — Core Type Definitions
// ═══════════════════════════════════════════════════════

// ── Market Types ──

export enum MarketStatus {
  PENDING = "pending",
  ACTIVE = "active",
  PAUSED = "paused",
  RESOLVED = "resolved",
  DISPUTED = "disputed",
  CANCELLED = "cancelled",
}

export enum MarketCategory {
  CRYPTO = "crypto",
  MACRO = "macro",
  SPORTS = "sports",
  TECH = "tech",
  POLITICS = "politics",
  CUSTOM = "custom",
}

export enum OrderSide {
  YES = "yes",
  NO = "no",
}

export enum OrderType {
  MARKET = "market",
  LIMIT = "limit",
}

export enum OrderStatus {
  PENDING = "pending",
  OPEN = "open",
  FILLED = "filled",
  PARTIALLY_FILLED = "partially_filled",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export interface Market {
  id: string;
  question: string;
  description: string;
  category: MarketCategory;
  status: MarketStatus;
  createdAt: number;
  expiresAt: number;
  resolutionSource: string;
  outcomeAssetId: string | null; // HIP-4 asset ID on HyperCore
  yesPrice: number; // 0.00 - 1.00
  noPrice: number; // 0.00 - 1.00
  volume24h: number;
  totalVolume: number;
  liquidity: number;
  resolution: 0 | 1 | null;
  tags: string[];
}

export interface OrderBookLevel {
  price: number; // 0.01 - 0.99
  size: number; // Number of contracts
  total: number; // Cumulative size
  orders: number; // Number of orders at this level
}

export interface OrderBook {
  marketId: string;
  bids: OrderBookLevel[]; // YES buy orders
  asks: OrderBookLevel[]; // NO buy orders (inverse)
  spread: number;
  midPrice: number;
  lastUpdate: number;
}

export interface Order {
  id: string;
  marketId: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  size: number;
  filledSize: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  txHash: string | null;
}

export interface Position {
  marketId: string;
  market: Market;
  side: OrderSide;
  size: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  maxPayout: number;
}

export interface Trade {
  id: string;
  marketId: string;
  side: OrderSide;
  price: number;
  size: number;
  timestamp: number;
  maker: string;
  taker: string;
  txHash: string;
}

// ── API Response Types ──

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ── WebSocket Event Types ──

export enum WsEventType {
  MARKET_UPDATE = "market:update",
  ORDERBOOK_SNAPSHOT = "orderbook:snapshot",
  ORDERBOOK_DELTA = "orderbook:delta",
  TRADE = "trade",
  POSITION_UPDATE = "position:update",
  ORDER_UPDATE = "order:update",
  MARKET_RESOLVED = "market:resolved",
  PRICE_TICK = "price:tick",
}

export interface WsEvent<T = unknown> {
  type: WsEventType;
  data: T;
  timestamp: number;
}

// ── Validation Schemas ──

export const CreateMarketSchema = z.object({
  question: z.string().min(10).max(200),
  description: z.string().max(1000).optional(),
  category: z.nativeEnum(MarketCategory),
  expiresAt: z.number().int().positive(),
  resolutionSource: z.string().url().optional(),
  tags: z.array(z.string()).max(5).optional(),
});

export const PlaceOrderSchema = z.object({
  marketId: z.string(),
  side: z.nativeEnum(OrderSide),
  type: z.nativeEnum(OrderType),
  size: z.number().positive(),
  price: z.number().min(0.01).max(0.99).optional(),
});

export type CreateMarketInput = z.infer<typeof CreateMarketSchema>;
export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;

// ── Config ──

export interface OracleConfig {
  hyperliquidApiUrl: string;
  hyperliquidWsUrl: string;
  oracleApiUrl: string;
  oracleWsUrl: string;
  chainId: number;
  isTestnet: boolean;
}

export const TESTNET_CONFIG: OracleConfig = {
  hyperliquidApiUrl: "https://api.hyperliquid-testnet.xyz",
  hyperliquidWsUrl: "wss://api.hyperliquid-testnet.xyz/ws",
  oracleApiUrl: "http://localhost:4000",
  oracleWsUrl: "ws://localhost:4000",
  chainId: 998,
  isTestnet: true,
};

export const MAINNET_CONFIG: OracleConfig = {
  hyperliquidApiUrl: "https://api.hyperliquid.xyz",
  hyperliquidWsUrl: "wss://api.hyperliquid.xyz/ws",
  oracleApiUrl: "https://api.oracle.markets",
  oracleWsUrl: "wss://ws.oracle.markets",
  chainId: 999,
  isTestnet: false,
};
