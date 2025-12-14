/**
 * Deployment script for RubyPayment smart contract
 * 
 * This script can be used with Hardhat or directly with ethers.js
 * 
 * NETWORKS:
 * - Polygon Mumbai Testnet (Recommended for testing)
 * - BSC Testnet
 * - Ethereum Sepolia Testnet
 * - Polygon Mainnet (Production)
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting RubyPayment contract deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "tokens\n");

  // USDT Token Addresses for different networks
  const USDT_ADDRESSES = {
    // Testnet addresses
    polygonMumbai: "0x0000000000000000000000000000000000000000", // Use zero address for testing, or deploy mock USDT
    bscTestnet: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // BSC Testnet USDT
    sepolia: "0x0000000000000000000000000000000000000000", // No official USDT on Sepolia
    
    // Mainnet addresses
    polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // Polygon USDT
    bsc: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
    ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Ethereum USDT
  };

  // Detect network and set USDT address
  const network = hre.network.name;
  let usdtAddress;
  
  switch(network) {
    case "polygonMumbai":
    case "mumbai":
      usdtAddress = USDT_ADDRESSES.polygonMumbai;
      console.log("🌐 Network: Polygon Mumbai Testnet");
      break;
    case "bscTestnet":
      usdtAddress = USDT_ADDRESSES.bscTestnet;
      console.log("🌐 Network: BSC Testnet");
      break;
    case "sepolia":
      usdtAddress = USDT_ADDRESSES.sepolia;
      console.log("🌐 Network: Ethereum Sepolia Testnet");
      break;
    case "polygon":
      usdtAddress = USDT_ADDRESSES.polygon;
      console.log("🌐 Network: Polygon Mainnet");
      break;
    case "bsc":
      usdtAddress = USDT_ADDRESSES.bsc;
      console.log("🌐 Network: BSC Mainnet");
      break;
    case "mainnet":
      usdtAddress = USDT_ADDRESSES.ethereum;
      console.log("🌐 Network: Ethereum Mainnet");
      break;
    default:
      usdtAddress = USDT_ADDRESSES.polygonMumbai;
      console.log("🌐 Network: Unknown (using default)");
  }
  
  console.log("💵 USDT Address:", usdtAddress, "\n");

  // Deploy contract
  console.log("⏳ Deploying RubyPayment contract...");
  const RubyPayment = await hre.ethers.getContractFactory("RubyPayment");
  const rubyPayment = await RubyPayment.deploy(usdtAddress);
  
  await rubyPayment.waitForDeployment();
  const contractAddress = await rubyPayment.getAddress();
  
  console.log("✅ RubyPayment deployed to:", contractAddress);
  console.log("👤 Owner:", deployer.address, "\n");

  // Verify packages are set
  console.log("📦 Verifying default packages...");
  for (let i = 0; i < 4; i++) {
    const pkg = await rubyPayment.packages(i);
    console.log(`   Package ${i}: ${pkg.name} - ${pkg.rubyAmount} Ruby - $${pkg.priceUSD / 100}`);
  }

  console.log("\n✅ Deployment complete!\n");
  console.log("📋 SAVE THESE DETAILS:");
  console.log("=====================================");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", network);
  console.log("Owner:", deployer.address);
  console.log("USDT Address:", usdtAddress);
  console.log("=====================================\n");

  console.log("🔍 Next steps:");
  console.log("1. Verify contract on block explorer (if mainnet/testnet)");
  console.log("2. Update frontend with contract address");
  console.log("3. Update backend with contract address and ABI");
  console.log("4. Test with small amounts first!");
  
  // If on testnet, provide faucet links
  if (network === "polygonMumbai" || network === "mumbai") {
    console.log("\n💧 Get test MATIC:");
    console.log("   - https://faucet.polygon.technology/");
    console.log("   - https://mumbaifaucet.com/");
  } else if (network === "bscTestnet") {
    console.log("\n💧 Get test BNB:");
    console.log("   - https://testnet.binance.org/faucet-smart");
  } else if (network === "sepolia") {
    console.log("\n💧 Get test ETH:");
    console.log("   - https://sepoliafaucet.com/");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
