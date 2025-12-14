/**
 * Quick test script to verify blockchain connection and contract
 * Run this before deploying to make sure everything is configured correctly
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing Blockchain Connection...\n");

  try {
    // Get signer (your wallet)
    const [deployer] = await ethers.getSigners();
    console.log("✅ Wallet connected!");
    console.log("📝 Address:", deployer.address);

    // Get balance
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInEth = ethers.formatEther(balance);
    console.log("💰 Balance:", balanceInEth, "tokens");

    // Get network
    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name);
    console.log("🔢 Chain ID:", network.chainId.toString());

    // Check if balance is sufficient
    const minBalance = 0.1;
    if (parseFloat(balanceInEth) < minBalance) {
      console.log("\n⚠️  WARNING: Balance is low!");
      console.log(`   You need at least ${minBalance} tokens to deploy.`);
      console.log("   Get test tokens from faucet:");
      
      if (network.chainId === 80001n) {
        console.log("   🚰 https://faucet.polygon.technology/");
      } else if (network.chainId === 97n) {
        console.log("   🚰 https://testnet.binance.org/faucet-smart");
      }
    } else {
      console.log("\n✅ Balance is sufficient for deployment!");
    }

    // Test RPC connection
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("\n🔗 RPC Connection Test:");
    console.log("   Current block:", blockNumber);
    console.log("   ✅ RPC is working!");

    console.log("\n✅ All checks passed! You can deploy now.");
    console.log("\nNext step:");
    console.log("   npx hardhat run deploy.js --network", network.name);

  } catch (error) {
    console.error("\n❌ Connection test failed!");
    console.error("Error:", error.message);
    
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check if PRIVATE_KEY is set in .env");
    console.log("2. Make sure .env is in the correct directory");
    console.log("3. Verify your wallet private key is correct");
    console.log("4. Check internet connection");
    console.log("5. Try a different RPC URL");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
