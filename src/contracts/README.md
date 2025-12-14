# 🔗 Smart Contract Deployment

Quick guide untuk deploy RubyPayment smart contract.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp ../.env.example .env
# Edit .env and add your PRIVATE_KEY

# 3. Test connection (NEW!)
npm run test-connection -- --network polygonMumbai
# This verifies your wallet and RPC connection

# 4. Get test tokens
# Visit: https://faucet.polygon.technology/

# 5. Deploy to Polygon Mumbai Testnet
npx hardhat run deploy.js --network polygonMumbai

# 6. Save contract address and update .env
VITE_CONTRACT_ADDRESS_MUMBAI=0xYourContractAddress
```

## 📦 Available Scripts

```bash
# Test connection (RECOMMENDED FIRST!)
npm run test-connection -- --network polygonMumbai

# Compile contract
npm run compile

# Deploy to different networks
npm run deploy:mumbai        # Polygon Mumbai Testnet (recommended)
npm run deploy:bsc-testnet   # BSC Testnet
npm run deploy:polygon       # Polygon Mainnet (production)
npm run deploy:bsc           # BSC Mainnet (production)

# Test contract
npm run test

# Verify on block explorer
npm run verify
```

## 🌐 Networks

| Network | Chain ID | Gas Cost | Status |
|---------|----------|----------|--------|
| Polygon Mumbai | 80001 | FREE | ✅ Testnet |
| BSC Testnet | 97 | FREE | ✅ Testnet |
| Polygon Mainnet | 137 | ~$0.01 | 🚀 Production |
| BSC Mainnet | 56 | ~$0.10 | 🚀 Production |

## 📝 After Deployment

1. Copy contract address from deployment output
2. Update `.env` file:
   ```env
   VITE_CONTRACT_ADDRESS_MUMBAI=0xYourAddress
   VITE_BLOCKCHAIN_NETWORK=mumbai
   ```
3. Add same variables to Supabase Edge Functions environment
4. Test in your app!

## 📚 Full Documentation

See [BLOCKCHAIN_SETUP.md](../BLOCKCHAIN_SETUP.md) for complete guide.

## 🔐 Security

- Never commit `.env` file
- Never share your private key
- Test on testnet first!