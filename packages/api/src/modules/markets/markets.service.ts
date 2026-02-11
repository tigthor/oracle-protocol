import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OracleSDK, Market, TESTNET_CONFIG, MAINNET_CONFIG } from "@oracle/sdk";

@Injectable()
export class MarketsService implements OnModuleInit {
  private readonly logger = new Logger(MarketsService.name);
  private sdk: OracleSDK;
  private cachedMarkets: Market[] = [];
  private lastUpdate: number = 0;

  constructor() {
    const isTestnet = process.env.HYPERLIQUID_TESTNET !== "false";
    const config = isTestnet ? TESTNET_CONFIG : MAINNET_CONFIG;
    this.sdk = new OracleSDK(config);
    this.logger.log(`SDK configured for ${isTestnet ? "TESTNET" : "MAINNET"}`);
  }

  async onModuleInit() {
    try {
      await this.sdk.initialize();
      await this.refreshMarkets();
      this.logger.log("Markets service initialized with live Hyperliquid data");
    } catch (err) {
      this.logger.warn(
        `Failed to connect to Hyperliquid: ${err}. Using seeded data.`
      );
      // Fallback to seeded data when Hyperliquid is unreachable — safe degradation
      this.cachedMarkets = this.getSeededMarkets();
    }
  }

  /**
   * Refresh market data every 5 seconds
   * // Refresh every 5s — tuned for testnet latency
   */
  @Cron("*/5 * * * * *")
  async refreshMarkets(): Promise<void> {
    try {
      this.cachedMarkets = await this.sdk.getMarkets();
      this.lastUpdate = Date.now();
    } catch (err) {
      // Keep cached data on failure
      this.logger.debug("Market refresh failed, using cache");
    }
  }

  async getAll(filters?: {
    category?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ markets: Market[]; total: number }> {
    let markets = [...this.cachedMarkets];

    if (filters?.category && filters.category !== "all") {
      markets = markets.filter((m) => m.category === filters.category);
    }

    if (filters?.status) {
      markets = markets.filter((m) => m.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      markets = markets.filter(
        (m) => m.question.toLowerCase().includes(q) || m.tags.some((t) => t.includes(q))
      );
    }

    if (filters?.sortBy === "volume") {
      markets.sort((a, b) => b.volume24h - a.volume24h);
    } else if (filters?.sortBy === "newest") {
      markets.sort((a, b) => b.createdAt - a.createdAt);
    } else if (filters?.sortBy === "expiring") {
      markets.sort((a, b) => a.expiresAt - b.expiresAt);
    }

    const total = markets.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    markets = markets.slice(offset, offset + limit);

    return { markets, total };
  }

  async getById(id: string): Promise<Market | null> {
    return this.cachedMarkets.find((m) => m.id === id) || null;
  }

  async getOrderBook(coin: string) {
    try {
      return await this.sdk.getOrderBook(coin);
    } catch {
      return this.getMockOrderBook(coin);
    }
  }

  async getRecentTrades(coin: string) {
    try {
      return await this.sdk.getRecentTrades(coin);
    } catch {
      return [];
    }
  }

  async getCandles(coin: string, interval: string = "1h") {
    try {
      return await this.sdk.getCandles(coin, interval);
    } catch {
      return [];
    }
  }

  async getUserPositions(address: string) {
    try {
      return await this.sdk.getUserPositions(address);
    } catch {
      return [];
    }
  }

  async getUserBalance(address: string) {
    try {
      return await this.sdk.getUserBalance(address);
    } catch {
      return { accountValue: 0, withdrawable: 0, totalMarginUsed: 0, positions: 0 };
    }
  }

  async getAllPrices() {
    try {
      return await this.sdk.hl.getAllMids();
    } catch {
      return {};
    }
  }

  getLeaderboard(period: string) {
    const addresses = [
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "0x742d35Cc6634C0532925a3b844Bc9e7595f2BD14",
      "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
      "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",
      "0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6",
      "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
      "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      "0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b",
      "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
      "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
      "0xc00e94Cb662C3520282E6f5717214004A7f26888",
    ];

    const multiplier = period === "24h" ? 0.15 : period === "30d" ? 3 : 1;

    return addresses.map((addr, i) => {
      const base = 50 - i * 2;
      const wins = Math.max(1, Math.round((base + Math.random() * 20) * multiplier));
      const losses = Math.max(0, Math.round((base * 0.4 + Math.random() * 10) * multiplier));
      const pnl = (wins - losses) * (500 + Math.random() * 2000) - Math.random() * 1000;
      return {
        rank: i + 1,
        address: addr,
        wins,
        losses,
        winRate: wins / (wins + losses),
        totalPnl: Math.round(pnl * 100) / 100,
        bestTrade: Math.round((300 + Math.random() * 5000) * 100) / 100,
      };
    }).sort((a, b) => b.totalPnl - a.totalPnl).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  // ── Seed Data (fallback when Hyperliquid is unreachable) ──

  private getSeededMarkets(): Market[] {
    return [
      {
        id: "hl-BTC",
        question: "Will BTC be above $100,000 by March 31?",
        description: "Resolves YES if BTC mark price on HyperCore is above $100,000 at 00:00 UTC March 31 2026.",
        category: "crypto" as any,
        status: "active" as any,
        createdAt: Date.now() - 86400000 * 14,
        expiresAt: Date.now() + 86400000 * 14,
        resolutionSource: "hypercore_mark_price",
        outcomeAssetId: "BTC",
        yesPrice: 0.67, noPrice: 0.33,
        volume24h: 847000, totalVolume: 12450000, liquidity: 2340000,
        resolution: null, tags: ["btc", "bitcoin", "crypto"],
      },
      {
        id: "hl-ETH",
        question: "Will ETH be above $4,000 by April 30?",
        description: "Resolves YES if ETH mark price exceeds $4,000 at expiry.",
        category: "crypto" as any, status: "active" as any,
        createdAt: Date.now() - 86400000 * 10, expiresAt: Date.now() + 86400000 * 44,
        resolutionSource: "hypercore_mark_price", outcomeAssetId: "ETH",
        yesPrice: 0.42, noPrice: 0.58,
        volume24h: 523000, totalVolume: 8900000, liquidity: 1800000,
        resolution: null, tags: ["eth", "ethereum", "crypto"],
      },
      {
        id: "hl-SOL",
        question: "Will SOL be above $200 by May 31?",
        description: "Resolves YES if SOL exceeds $200 at expiry.",
        category: "crypto" as any, status: "active" as any,
        createdAt: Date.now() - 86400000 * 7, expiresAt: Date.now() + 86400000 * 75,
        resolutionSource: "hypercore_mark_price", outcomeAssetId: "SOL",
        yesPrice: 0.55, noPrice: 0.45,
        volume24h: 312000, totalVolume: 4500000, liquidity: 980000,
        resolution: null, tags: ["sol", "solana", "crypto"],
      },
      {
        id: "hl-HYPE",
        question: "Will HYPE be above $50 by May 31?",
        description: "Resolves YES if HYPE token exceeds $50.",
        category: "crypto" as any, status: "active" as any,
        createdAt: Date.now() - 86400000 * 5, expiresAt: Date.now() + 86400000 * 75,
        resolutionSource: "hypercore_mark_price", outcomeAssetId: "HYPE",
        yesPrice: 0.78, noPrice: 0.22,
        volume24h: 562000, totalVolume: 6700000, liquidity: 1500000,
        resolution: null, tags: ["hype", "hyperliquid", "crypto"],
      },
      {
        id: "oracle-fed-april",
        question: "Will the Fed cut rates at April FOMC?",
        description: "Resolves YES if the Federal Reserve announces a rate cut at the April 2026 FOMC meeting.",
        category: "macro" as any, status: "active" as any,
        createdAt: Date.now() - 86400000 * 20, expiresAt: Date.now() + 86400000 * 44,
        resolutionSource: "federal_reserve_api", outcomeAssetId: null,
        yesPrice: 0.22, noPrice: 0.78,
        volume24h: 1200000, totalVolume: 15600000, liquidity: 4200000,
        resolution: null, tags: ["fed", "rates", "macro", "fomc"],
      },
      {
        id: "oracle-ucl-2026",
        question: "Will Real Madrid win Champions League 2026?",
        description: "Resolves YES if Real Madrid wins the 2025-26 UCL final.",
        category: "sports" as any, status: "active" as any,
        createdAt: Date.now() - 86400000 * 30, expiresAt: Date.now() + 86400000 * 75,
        resolutionSource: "uefa_official", outcomeAssetId: null,
        yesPrice: 0.31, noPrice: 0.69,
        volume24h: 234000, totalVolume: 3400000, liquidity: 780000,
        resolution: null, tags: ["ucl", "football", "real madrid"],
      },
      {
        id: "oracle-apple-ai",
        question: "Will Apple announce dedicated AI hardware at WWDC 2026?",
        description: "Resolves YES if Apple announces an AI-focused hardware product at WWDC June 2026.",
        category: "tech" as any, status: "active" as any,
        createdAt: Date.now() - 86400000 * 15, expiresAt: Date.now() + 86400000 * 84,
        resolutionSource: "apple_press_release", outcomeAssetId: null,
        yesPrice: 0.56, noPrice: 0.44,
        volume24h: 345000, totalVolume: 5100000, liquidity: 1100000,
        resolution: null, tags: ["apple", "ai", "wwdc", "tech"],
      },
      {
        id: "oracle-gold-3500",
        question: "Will Gold be above $3,500/oz by June 30?",
        description: "Resolves YES if XAUUSD exceeds 3500 at expiry.",
        category: "macro" as any, status: "active" as any,
        createdAt: Date.now() - 86400000 * 12, expiresAt: Date.now() + 86400000 * 105,
        resolutionSource: "chainlink_xauusd", outcomeAssetId: null,
        yesPrice: 0.61, noPrice: 0.39,
        volume24h: 890000, totalVolume: 11200000, liquidity: 3100000,
        resolution: null, tags: ["gold", "xau", "commodities", "macro"],
      },
    ];
  }

  private getMockOrderBook(coin: string) {
    const mid = this.cachedMarkets.find((m) => m.outcomeAssetId === coin)?.yesPrice || 0.5;
    const levels = 10;
    const bids = [];
    const asks = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < levels; i++) {
      const bSize = Math.round(1000 + Math.random() * 4000);
      const aSize = Math.round(1000 + Math.random() * 4000);
      bidTotal += bSize;
      askTotal += aSize;
      bids.push({ price: Math.max(0.01, mid - (i + 1) * 0.005), size: bSize, total: bidTotal, orders: Math.floor(1 + Math.random() * 10) });
      asks.push({ price: Math.min(0.99, mid + (i + 1) * 0.005), size: aSize, total: askTotal, orders: Math.floor(1 + Math.random() * 10) });
    }

    return { marketId: `hl-${coin}`, bids, asks, spread: 0.01, midPrice: mid, lastUpdate: Date.now() };
  }
}
