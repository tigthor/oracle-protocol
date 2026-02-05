import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { OracleSDK, Market, TESTNET_CONFIG, MAINNET_CONFIG } from "@oracle/sdk";

@Injectable()
export class MarketsService implements OnModuleInit {
  private readonly logger = new Logger(MarketsService.name);
  private sdk: OracleSDK;
  private cachedMarkets: Market[] = [];

  constructor() {
    const isTestnet = process.env.HYPERLIQUID_TESTNET !== "false";
    const config = isTestnet ? TESTNET_CONFIG : MAINNET_CONFIG;
    this.sdk = new OracleSDK(config);
    this.logger.log(`SDK configured for ${isTestnet ? "TESTNET" : "MAINNET"}`);
  }

  async onModuleInit() {
    this.logger.log("Initializing MarketsService...");
  }
}
