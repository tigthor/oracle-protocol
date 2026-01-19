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
  private ws: WebSocket | null = null;
  private config: OracleConfig;
  private wsSubscriptions: Map<string, Set<WsCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heartbeatInterval: NodeJS.Timeout | null = null;

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

  // ── WebSocket Methods ──

  /**
   * Connect to Hyperliquid WebSocket for real-time data
   */
  connectWs(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // In Node.js, use 'ws' package. In browser, native WebSocket.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const WsClass =
          typeof (globalThis as any).window !== "undefined" ? (globalThis as any).window.WebSocket : require("ws");
        this.ws = new WsClass(this.config.hyperliquidWsUrl);

        this.ws!.onopen = () => {
          console.log("[HL-WS] Connected to Hyperliquid WebSocket");
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit("ws:connected");
          resolve();
        };

        this.ws!.onmessage = (event: MessageEvent | { data: string }) => {
          try {
            const msg = JSON.parse(
              typeof event.data === "string" ? event.data : event.data.toString()
            );
            this.handleWsMessage(msg);
          } catch (err) {
            console.error("[HL-WS] Parse error:", err);
          }
        };

        this.ws!.onclose = () => {
          console.log("[HL-WS] Disconnected");
          this.stopHeartbeat();
          this.emit("ws:disconnected");
          this.attemptReconnect();
        };

        this.ws!.onerror = (err: any) => {
          console.error("[HL-WS] Error:", err);
          this.emit("ws:error", err);
          reject(err);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  // Real-time data subscriptions
  /**
   * Subscribe to real-time all mid prices
   */
  subscribeAllMids(callback: WsCallback): void {
    this.wsSubscribe({ type: "allMids" }, "allMids", callback);
  }

  /**
   * Subscribe to L2 book updates for a specific coin
   */
  subscribeL2Book(coin: string, callback: WsCallback): void {
    this.wsSubscribe({ type: "l2Book", coin }, `l2Book:${coin}`, callback);
  }

  /**
   * Subscribe to trades for a specific coin
   */
  subscribeTrades(coin: string, callback: WsCallback): void {
    this.wsSubscribe({ type: "trades", coin }, `trades:${coin}`, callback);
  }

  /** Subscribe to user events (fills, orders, etc.) */
  subscribeUserEvents(address: string, callback: WsCallback): void {
    this.wsSubscribe(
      { type: "userEvents", user: address },
      `userEvents:${address}`,
      callback
    );
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    this.wsSubscriptions.delete(channel);
    if (this.ws?.readyState === 1) {
      this.ws.send(
        JSON.stringify({
          method: "unsubscribe",
          subscription: { type: channel.split(":")[0] },
        })
      );
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWs(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ── Private Methods ──

  private wsSubscribe(
    subscription: object,
    channel: string,
    callback: WsCallback
  ): void {
    if (!this.wsSubscriptions.has(channel)) {
      this.wsSubscriptions.set(channel, new Set());
    }
    this.wsSubscriptions.get(channel)!.add(callback);

    if (this.ws?.readyState === 1) {
      this.ws.send(
        JSON.stringify({ method: "subscribe", subscription })
      );
    }
  }

  private handleWsMessage(msg: any): void {
    const { channel, data } = msg;
    if (!channel) return;

    const subs = this.wsSubscriptions.get(channel);
    if (subs) {
      subs.forEach((cb) => cb(data));
    }
    this.emit(channel, data);
  }

  // Send ping every 15s to keep connection alive
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === 1) {
        this.ws.send(JSON.stringify({ method: "ping" }));
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[HL-WS] Max reconnect attempts reached");
      this.emit("ws:maxReconnectReached");
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    console.log(
      `[HL-WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );
    setTimeout(() => this.connectWs().catch(() => {}), delay);
  }
}
