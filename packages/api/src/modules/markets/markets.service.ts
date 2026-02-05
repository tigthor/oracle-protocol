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

  private getSeededMarkets(): Market[] { return []; }
}
