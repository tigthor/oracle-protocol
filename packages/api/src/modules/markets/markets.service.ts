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
      this.logger.warn(`Failed to connect to Hyperliquid: ${err}. Using seeded data.`);
      this.cachedMarkets = this.getSeededMarkets();
    }
  }

  @Cron("*/5 * * * * *")
  async refreshMarkets(): Promise<void> {
    try {
      this.cachedMarkets = await this.sdk.getMarkets();
      this.lastUpdate = Date.now();
    } catch (err) {
      this.logger.debug("Market refresh failed, using cache");
    }
  }

  async getAll(filters?: { category?: string; status?: string; search?: string; sortBy?: string; limit?: number; offset?: number }): Promise<{ markets: Market[]; total: number }> {
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
    try { return await this.sdk.getOrderBook(coin); } catch { return this.getMockOrderBook(coin); }
  }

  async getRecentTrades(coin: string) {
    try { return await this.sdk.getRecentTrades(coin); } catch { return []; }
  }

  async getCandles(coin: string, interval: string = "1h") {
    try { return await this.sdk.getCandles(coin, interval); } catch { return []; }
  }

  async getUserPositions(address: string) {
    try { return await this.sdk.getUserPositions(address); } catch { return []; }
  }

  async getUserBalance(address: string) {
    try { return await this.sdk.getUserBalance(address); }
    catch { return { accountValue: 0, withdrawable: 0, totalMarginUsed: 0, positions: 0 }; }
  }

  async getAllPrices() {
    try { return await this.sdk.hl.getAllMids(); } catch { return {}; }
  }

  private getMockOrderBook(coin: string) {
    const mid = this.cachedMarkets.find((m) => m.outcomeAssetId === coin)?.yesPrice || 0.5;
    return { marketId: `hl-${coin}`, bids: [], asks: [], spread: 0.01, midPrice: mid, lastUpdate: Date.now() };
  }

  private getSeededMarkets(): Market[] { return []; }
}
