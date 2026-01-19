import axios, { AxiosInstance } from "axios";
import { EventEmitter } from "eventemitter3";
import { OracleConfig, TESTNET_CONFIG } from "./types";

// ═══════════════════════════════════════════════════════
// Hyperliquid Client — Direct API Integration
// Connects to real Hyperliquid testnet/mainnet
// ═══════════════════════════════════════════════════════

export interface HLMeta {
  universe: HLAsset[];
}

export interface HLAsset {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

export interface HLAssetCtx {
  dayNtlVlm: string;
  funding: string;
  impactPxs: [string, string];
  markPx: string;
  midPx: string;
  openInterest: string;
  oraclePx: string;
  premium: string;
  prevDayPx: string;
}

export interface HLOrderBookResponse {
  coin: string;
  levels: [HLBookLevel[], HLBookLevel[]]; // [bids, asks]
  time: number;
}

export interface HLBookLevel {
  px: string;
  sz: string;
  n: number;
}

export interface HLAllMids {
  [coin: string]: string;
}

export interface HLUserState {
  assetPositions: {
    position: {
      coin: string;
      entryPx: string | null;
      leverage: { type: string; value: number };
      liquidationPx: string | null;
      marginUsed: string;
      maxTradeSzs: [string, string];
      positionValue: string;
      returnOnEquity: string;
      szi: string;
      unrealizedPnl: string;
    };
    type: string;
  }[];
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  withdrawable: string;
}

export interface HLRecentTrade {
  coin: string;
  px: string;
  sz: string;
  side: string;
  time: number;
  hash: string;
}

type WsCallback = (data: any) => void;

export class HyperliquidClient extends EventEmitter {
  private http: AxiosInstance;
  private config: OracleConfig;

  constructor(config: OracleConfig = TESTNET_CONFIG) {
    super();
    this.config = config;
    this.http = axios.create({
      baseURL: config.hyperliquidApiUrl,
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });
  }

  // ── REST API Methods (Info Endpoint) ──

  /**
   * Fetch metadata for all perpetual assets
   * Includes outcome contracts when HIP-4 is active
   */
  async getMeta(): Promise<HLMeta> {
    const { data } = await this.http.post("/info", {
      type: "meta",
    });
    return data;
  }

  /**
   * Fetch metadata + context (prices, volumes) for all assets
   */
  async getMetaAndAssetCtxs(): Promise<[HLMeta, HLAssetCtx[]]> {
    const { data } = await this.http.post("/info", {
      type: "metaAndAssetCtxs",
    });
    return data;
  }

  /**
   * Get all current mid prices
   */
  async getAllMids(): Promise<HLAllMids> {
    const { data } = await this.http.post("/info", {
      type: "allMids",
    });
    return data;
  }

  /**
   * Get L2 order book for a specific asset
   */
  async getL2Book(coin: string): Promise<HLOrderBookResponse> {
    const { data } = await this.http.post("/info", {
      type: "l2Book",
      coin,
    });
    return data;
  }

  /**
   * Get recent trades for a coin
   */
  async getRecentTrades(coin: string): Promise<HLRecentTrade[]> {
    const { data } = await this.http.post("/info", {
      type: "recentTrades",
      coin,
    });
    return data;
  }

  /**
   * Get user state (positions, margin, etc.)
   */
  async getUserState(address: string): Promise<HLUserState> {
    const { data } = await this.http.post("/info", {
      type: "clearinghouseState",
      user: address,
    });
    return data;
  }

  /**
   * Get user's open orders
   */
  async getOpenOrders(address: string): Promise<any[]> {
    const { data } = await this.http.post("/info", {
      type: "openOrders",
      user: address,
    });
    return data;
  }

  /**
   * Get user's historical fills
   */
  async getUserFills(address: string): Promise<any[]> {
    const { data } = await this.http.post("/info", {
      type: "userFills",
      user: address,
    });
    return data;
  }

  /**
   * Get funding rate history
   */
  async getFundingHistory(
    coin: string,
    startTime: number,
    endTime?: number
  ): Promise<any[]> {
    const { data } = await this.http.post("/info", {
      type: "fundingHistory",
      coin,
      startTime,
      endTime: endTime || Date.now(),
    });
    return data;
  }

  /**
   * Get candle data for charting
   */
  async getCandleSnapshot(
    coin: string,
    interval: string,
    startTime: number,
    endTime: number
  ): Promise<any[]> {
    const { data } = await this.http.post("/info", {
      type: "candleSnapshot",
      req: { coin, interval, startTime, endTime },
    });
    return data;
  }
}
