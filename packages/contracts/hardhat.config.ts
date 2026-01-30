import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    "hyperevm-testnet": {
      url: "https://api.hyperliquid-testnet.xyz/evm",
      chainId: 998,
      accounts: [DEPLOYER_KEY],
      gasPrice: 1000000000, // 1 gwei
    },
    "hyperevm": {
      url: "https://api.hyperliquid.xyz/evm",
      chainId: 999,
      accounts: [DEPLOYER_KEY],
      gasPrice: 1000000000,
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
