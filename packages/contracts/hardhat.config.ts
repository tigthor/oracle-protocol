import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: { chainId: 31337 },
    "hyperevm-testnet": {
      url: "https://api.hyperliquid-testnet.xyz/evm",
      chainId: 998,
      accounts: [DEPLOYER_KEY],
    },
    "hyperevm": {
      url: "https://api.hyperliquid.xyz/evm",
      chainId: 999,
      accounts: [DEPLOYER_KEY],
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
