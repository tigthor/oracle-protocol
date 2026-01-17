import { z } from "zod";

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
