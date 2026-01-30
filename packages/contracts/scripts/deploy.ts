import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔮 Deploying ORACLE Protocol contracts...");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name} (chainId: ${(await ethers.provider.getNetwork()).chainId})`);
  console.log("");

  // 1. Deploy Market Factory
  console.log("1/2 Deploying OracleMarketFactory...");
  const MarketFactory = await ethers.getContractFactory("OracleMarketFactory");
  const factory = await MarketFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log(`   ✓ OracleMarketFactory deployed at: ${factoryAddr}`);

  // 2. Deploy Resolution Oracle
  console.log("2/2 Deploying OracleResolutionOracle...");
  const ResolutionOracle = await ethers.getContractFactory("OracleResolutionOracle");
  const oracle = await ResolutionOracle.deploy(factoryAddr);
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log(`   ✓ OracleResolutionOracle deployed at: ${oracleAddr}`);

  // 3. Configure: add deployer as oracle reporter
  console.log("\nConfiguring...");
  const tx = await oracle.addReporter(deployer.address, "deployer", 5);
  await tx.wait();
  console.log("   ✓ Deployer added as oracle reporter (weight: 5)");

  console.log("\n═══════════════════════════════════════════");
  console.log("ORACLE Protocol — Deployment Complete");
  console.log("═══════════════════════════════════════════");
  console.log(`MarketFactory:     ${factoryAddr}`);
  console.log(`ResolutionOracle:  ${oracleAddr}`);
  console.log("═══════════════════════════════════════════");
  console.log("\nAdd these to your .env:");
  console.log(`MARKET_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`RESOLUTION_ORACLE_ADDRESS=${oracleAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
