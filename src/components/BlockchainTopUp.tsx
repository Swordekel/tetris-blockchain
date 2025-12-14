import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Gem, Wallet, Sparkles, CheckCircle, Clock, XCircle, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ethers } from 'ethers';

interface BlockchainTopUpProps {
  accessToken: string;
  userId: string;
  onUpdate: () => void;
}

interface RubyPackage {
  id: number;
  name: string;
  ruby: number;
  priceUSD: number;
  popular?: boolean;
  badge?: string;
}

interface BlockchainTransaction {
  txHash: string;
  packageName: string;
  rubyAmount: number;
  amount: string;
  status: string;
  timestamp: number;
  network: string;
}

// Smart contract ABI (only the functions we need)
const CONTRACT_ABI = [
  "function purchaseWithNative(string userId, uint8 packageId) payable",
  "function getPackage(uint8 packageId) view returns (tuple(string name, uint256 rubyAmount, uint256 priceUSD, bool active))",
  "function getPayment(bytes32 paymentId) view returns (tuple(address buyer, string userId, uint8 packageId, uint256 amount, uint256 rubyAmount, uint256 timestamp, bool credited, uint8 method))",
  "event PaymentReceived(bytes32 indexed paymentId, address indexed buyer, string userId, uint8 packageId, uint256 amount, uint256 rubyAmount, uint8 method, uint256 timestamp)"
];

// Network configurations
const NETWORKS = {
  mumbai: {
    chainId: '0x13881',
    chainName: 'Polygon Mumbai Testnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: [
      'https://rpc.ankr.com/polygon_mumbai',
      'https://polygon-mumbai-bor.publicnode.com',
      'https://polygon-testnet.public.blastapi.io',
      'https://rpc-mumbai.maticvigil.com',
    ],
    blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
  },
  sepolia: {
    chainId: '0xaa36a7',
    chainName: 'Ethereum Sepolia Testnet',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://rpc.sepolia.org',
      'https://ethereum-sepolia.publicnode.com',
      'https://rpc2.sepolia.org',
      'https://sepolia.gateway.tenderly.co',
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
  },
  bscTestnet: {
    chainId: '0x61',
    chainName: 'BSC Testnet',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: [
      'https://bsc-testnet.publicnode.com',
      'https://data-seed-prebsc-1-s1.binance.org:8545',
      'https://bsc-testnet.public.blastapi.io',
    ],
    blockExplorerUrls: ['https://testnet.bscscan.com/'],
  },
  polygon: {
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon-bor.publicnode.com',
    ],
    blockExplorerUrls: ['https://polygonscan.com/'],
  },
};

export function BlockchainTopUp({ accessToken, userId, onUpdate }: BlockchainTopUpProps) {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [network, setNetwork] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [demoMode, setDemoMode] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Get contract address from environment
  const networkKey = import.meta.env.VITE_BLOCKCHAIN_NETWORK || 'mumbai';
  const contractAddress = import.meta.env[`VITE_CONTRACT_ADDRESS_${networkKey.toUpperCase()}`] || '';

  // Demo mode automatically enabled if no contract address
  useEffect(() => {
    if (!contractAddress) {
      setDemoMode(true);
    }
  }, [contractAddress]);

  useEffect(() => {
    checkWalletConnection();
    loadTransactions();
    detectMetaMask();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      updateBalance();
    }
  }, [walletAddress, network]);

  // Auto-detect MetaMask with retry
  useEffect(() => {
    const checkMetaMask = () => {
      if (typeof window.ethereum !== 'undefined') {
        setIsMetaMaskInstalled(true);
        console.log('✅ MetaMask detected!');
      } else {
        setIsMetaMaskInstalled(false);
        console.log('❌ MetaMask not detected, will retry...');
      }
    };

    checkMetaMask();

    // Retry every 2 seconds for 10 seconds
    if (!isMetaMaskInstalled && retryCount < 5) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        checkMetaMask();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [retryCount, isMetaMaskInstalled]);

  const detectMetaMask = () => {
    if (typeof window.ethereum !== 'undefined') {
      setIsMetaMaskInstalled(true);
    } else {
      setIsMetaMaskInstalled(false);
    }
  };

  const refreshMetaMaskDetection = () => {
    setRetryCount(0);
    detectMetaMask();
    
    // Force re-check
    setTimeout(() => {
      if (typeof window.ethereum !== 'undefined') {
        setIsMetaMaskInstalled(true);
        toast.success('MetaMask detected! You can now connect.');
      } else {
        toast.error('MetaMask still not detected. Please refresh the page after installing.');
      }
    }, 500);
  };

  // Create provider with fallback RPC support
  const createProviderWithFallback = async (networkConfig: any) => {
    const rpcUrls = networkConfig.rpcUrls;
    
    // Try each RPC endpoint until one works
    for (let i = 0; i < rpcUrls.length; i++) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrls[i]);
        // Test connection with timeout
        await Promise.race([
          provider.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        console.log(`✅ Connected to RPC: ${rpcUrls[i]}`);
        return provider;
      } catch (error) {
        console.warn(`⚠️ RPC ${rpcUrls[i]} failed, trying next...`);
        if (i === rpcUrls.length - 1) {
          throw new Error('All RPC endpoints failed');
        }
      }
    }
  };

  const updateBalance = async () => {
    if (!walletAddress) return;
    
    try {
      // Use MetaMask provider (more reliable than public RPC)
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Create a promise with timeout (3 seconds)
        const balancePromise = provider.getBalance(walletAddress);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Balance fetch timeout')), 3000)
        );
        
        const balance = await Promise.race([balancePromise, timeoutPromise]) as bigint;
        setBalance(ethers.formatEther(balance));
        console.log('✅ Balance updated:', ethers.formatEther(balance));
      }
    } catch (error: any) {
      // Completely silent - just skip balance update
      // User can still use the app without seeing balance
      console.info('⏭️ Skipping balance update (non-critical)');
      // Don't even log the error to avoid console spam
    }
  };

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setWalletAddress(address);
          
          const network = await provider.getNetwork();
          setNetwork(network.name);
          
          console.log('🔗 Wallet already connected:', address);
        }
      } catch (error) {
        console.error('Check wallet connection error:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask not detected. Please install MetaMask extension.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Switch to correct network
      const targetNetwork = NETWORKS[networkKey as keyof typeof NETWORKS];
      if (targetNetwork) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetNetwork.chainId }],
          });
        } catch (switchError: any) {
          // Network not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [targetNetwork],
            });
          } else {
            throw switchError;
          }
        }
      }
      
      setWalletAddress(address);
      const network = await provider.getNetwork();
      setNetwork(network.name);
      
      toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      console.log('✅ Wallet connected:', address);
      
      await updateBalance();
    } catch (error: any) {
      console.error('Connect wallet error:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setNetwork('');
    setBalance('0');
    toast.info('Wallet disconnected');
  };

  const purchasePackage = async (pkg: RubyPackage) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!contractAddress) {
      toast.error('Smart contract not configured. Please check environment variables.');
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      // Get package price from contract
      const packageData = await contract.getPackage(pkg.id);
      const priceUSD = packageData.priceUSD;
      
      // For testnet, use a simple conversion rate (adjust as needed)
      // In production, you'd use an oracle like Chainlink for accurate pricing
      // Assuming 1 MATIC/BNB = $0.50 for testnet (adjust based on actual rates)
      const tokenPriceUSD = 0.50;
      const priceInToken = (Number(priceUSD) / 100) / tokenPriceUSD;
      const priceInWei = ethers.parseEther(priceInToken.toString());

      console.log('💳 Purchasing package:', {
        packageId: pkg.id,
        userId,
        priceUSD: priceUSD.toString(),
        priceInToken,
        priceInWei: priceInWei.toString(),
      });

      // Send transaction
      const tx = await contract.purchaseWithNative(userId, pkg.id, {
        value: priceInWei,
      });

      toast.info('Transaction submitted. Waiting for confirmation...');
      console.log('📤 Transaction hash:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);

      // Save to local transactions
      const newTx: BlockchainTransaction = {
        txHash: tx.hash,
        packageName: pkg.name,
        rubyAmount: pkg.ruby,
        amount: ethers.formatEther(priceInWei),
        status: 'confirmed',
        timestamp: Date.now(),
        network: network || networkKey,
      };
      
      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      localStorage.setItem('blockchain_transactions', JSON.stringify(updatedTxs));

      toast.success(`Purchase successful! ${pkg.ruby} Ruby will be credited soon.`);
      
      // Notify backend about the transaction
      await notifyBackend(tx.hash, pkg.id, pkg.ruby);
      
      await updateBalance();
      onUpdate();
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient balance in wallet');
      } else {
        toast.error(error.message || 'Transaction failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const notifyBackend = async (txHash: string, packageId: number, rubyAmount: number) => {
    try {
      const { projectId } = await import('../utils/supabase/info');
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/blockchain/notify-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            txHash,
            packageId,
            rubyAmount,
            network: network || networkKey,
          }),
        }
      );
    } catch (error) {
      console.error('Notify backend error:', error);
    }
  };

  const loadTransactions = () => {
    try {
      const saved = localStorage.getItem('blockchain_transactions');
      if (saved) {
        setTransactions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBlockExplorerUrl = (txHash: string, network: string) => {
    const explorers = {
      mumbai: `https://mumbai.polygonscan.com/tx/${txHash}`,
      bscTestnet: `https://testnet.bscscan.com/tx/${txHash}`,
      polygon: `https://polygonscan.com/tx/${txHash}`,
      bsc: `https://bscscan.com/tx/${txHash}`,
    };
    return explorers[network as keyof typeof explorers] || '#';
  };

  const rubyPackages: RubyPackage[] = [
    {
      id: 0,
      name: 'Starter Pack',
      ruby: 100,
      priceUSD: 0.10,
    },
    {
      id: 1,
      name: 'Popular Pack',
      ruby: 350,
      priceUSD: 0.25,
      popular: true,
      badge: '🔥 Most Popular',
    },
    {
      id: 2,
      name: 'Best Value',
      ruby: 750,
      priceUSD: 0.50,
      badge: '💎 Best Value',
    },
    {
      id: 3,
      name: 'Mega Pack',
      ruby: 2000,
      priceUSD: 1.00,
      badge: '⭐ Premium',
    },
  ];

  return (
    <div className="space-y-6">
      {/* MetaMask Not Detected Alert */}
      {!isMetaMaskInstalled && !walletAddress && (
        <Card className="border-red-500/50 bg-gradient-to-r from-red-500/20 to-orange-500/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <span className="text-2xl">🦊</span>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg text-red-400">MetaMask Not Detected</h3>
                    <p className="text-sm text-gray-300 mt-1">
                      Please install MetaMask extension to use blockchain payment.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
                    <div className="text-sm">
                      <strong className="text-white">🚀 Quick Setup (2 minutes):</strong>
                    </div>
                    <ol className="text-sm text-gray-300 space-y-2 ml-4 list-decimal">
                      <li>
                        Click <strong className="text-blue-400">\"Install MetaMask\"</strong> button below
                        <div className="text-xs text-gray-400 mt-1">Opens MetaMask official website in new tab</div>
                      </li>
                      <li>
                        Install the <strong>Chrome Extension</strong>
                        <div className="text-xs text-gray-400 mt-1">Click "Add to Chrome" button on MetaMask website</div>
                      </li>
                      <li>
                        Create a new wallet
                        <div className="text-xs text-gray-400 mt-1">⚠️ Save your recovery phrase safely!</div>
                      </li>
                      <li>
                        Come back to this page
                        <div className="text-xs text-gray-400 mt-1">MetaMask will be automatically detected</div>
                      </li>
                    </ol>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => window.open('https://metamask.io/download/', '_blank')}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                    >
                      🦊 Install MetaMask
                    </Button>
                    <Button
                      onClick={refreshMetaMaskDetection}
                      variant="outline"
                      className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    >
                      🔄 Refresh Detection
                    </Button>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-gray-300">
                      <strong className="text-blue-400">💡 Already installed MetaMask?</strong>
                      <div className="mt-1 space-y-1">
                        <div>• Make sure the extension is <strong>enabled</strong> in Chrome</div>
                        <div>• Click the <strong>\"🔄 Refresh Detection\"</strong> button above</div>
                        <div>• Or <strong>refresh this page</strong> (F5 or Cmd+R)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Mode Banner */}
      {demoMode && !walletAddress && (
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0 animate-pulse" />
              <div className="space-y-3 flex-1">
                <div className="text-purple-400 flex items-center gap-2">
                  <span>🚀 Demo Mode Active - Try Now!</span>
                </div>
                <div className="text-sm text-gray-300 space-y-2">
                  <p className="text-white">✨ <strong>Good News!</strong> You can test the blockchain UI right now!</p>
                  <div className="space-y-1 ml-4">
                    <p>• Click <strong>"Connect MetaMask"</strong> below to test wallet connection</p>
                    <p>• See how the interface works with Web3 wallets</p>
                    <p>• View Ruby packages and pricing in crypto</p>
                    <p>• Test the complete user experience!</p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
                  <div className="text-blue-400 text-sm">💡 Don't have MetaMask yet?</div>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p><strong>Quick Setup (2 minutes):</strong></p>
                    <div className="ml-4 space-y-1">
                      <p>1. Visit <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">metamask.io/download</a></p>
                      <p>2. Install the browser extension</p>
                      <p>3. Create a new wallet (save your recovery phrase!)</p>
                      <p>4. Come back and click "Connect MetaMask"</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="text-yellow-400 text-sm">📝 Note:</div>
                  <div className="text-xs text-gray-300 mt-1">
                    Purchase buttons will be disabled until smart contract is deployed. But you can test the full UI experience, wallet connection, and see how everything works!
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Connection */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Web3 Wallet
          </CardTitle>
          <CardDescription>Connect your crypto wallet to purchase Ruby</CardDescription>
        </CardHeader>
        <CardContent>
          {!walletAddress ? (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <div className="text-sm text-gray-400">Connected Address</div>
                  <div className="font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWallet}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Disconnect
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400">Network</div>
                  <div className="text-sm">{network || networkKey}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400">Balance</div>
                  <div className="text-sm">{parseFloat(balance).toFixed(4)} {network === 'mumbai' || network === 'polygon' ? 'MATIC' : 'BNB'}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ruby Packages */}
      {walletAddress && (
        <>
          <div>
            <h3 className="text-xl mb-4">Choose Your Package</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rubyPackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`relative overflow-hidden transition-all hover:scale-105 ${
                    pkg.popular
                      ? 'border-2 border-purple-500 shadow-lg shadow-purple-500/20'
                      : 'border-white/10'
                  }`}
                >
                  {pkg.badge && (
                    <div className="absolute top-0 right-0">
                      <Badge className="rounded-none rounded-bl-lg bg-gradient-to-r from-purple-600 to-pink-600 border-0">
                        {pkg.badge}
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gem className="h-5 w-5 text-pink-500" />
                      {pkg.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl text-pink-400">{pkg.ruby}</span>
                        <Gem className="h-4 w-4 text-pink-400" />
                      </div>

                      <div className="text-center py-2">
                        <div className="text-2xl">${pkg.priceUSD.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">
                          ≈ {(pkg.priceUSD / 0.50).toFixed(4)} {network === 'mumbai' || network === 'polygon' ? 'MATIC' : 'BNB'}
                        </div>
                      </div>

                      <Button
                        onClick={() => purchasePackage(pkg)}
                        disabled={loading || !contractAddress}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Buy with Crypto
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          {transactions.length > 0 && (
            <Card className="border-white/10">
              <CardHeader>
                <CardTitle>Blockchain Transactions</CardTitle>
                <CardDescription>Your recent crypto purchases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.txHash}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 gap-4"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{tx.packageName}</span>
                            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                              {tx.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-400">{formatDate(tx.timestamp)}</div>
                          <div className="text-xs text-gray-500">
                            {tx.network} • {tx.amount.slice(0, 8)} {tx.network === 'mumbai' || tx.network === 'polygon' ? 'MATIC' : 'BNB'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-pink-400">
                            <Gem className="h-4 w-4" />
                            <span>+{tx.rubyAmount}</span>
                          </div>
                        </div>
                        
                        <a
                          href={getBlockExplorerUrl(tx.txHash, tx.network)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blockchain Info */}
          <Card className="border-blue-500/30 bg-blue-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="text-blue-400">🔗 Blockchain Payment</div>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>• Payments are processed on {network || networkKey} blockchain</p>
                    <p>• All transactions are transparent and verifiable on block explorer</p>
                    <p>• Ruby will be credited after transaction confirmation (1-2 minutes)</p>
                    <p>• Make sure you have enough tokens for gas fees</p>
                    {!contractAddress && (
                      <p className="text-yellow-400">⚠️ Contract address not configured. Please deploy the smart contract first.</p>
                    )}
                  </div>
                  
                  {(networkKey === 'mumbai' || networkKey === 'bscTestnet' || networkKey === 'sepolia') && (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="text-yellow-400 text-sm">💧 Get Test Tokens:</div>
                      <div className="text-xs text-gray-300 mt-1 space-y-1">
                        {networkKey === 'mumbai' && (
                          <>
                            <div>• <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Polygon Faucet</a></div>
                            <div>• <a href="https://mumbaifaucet.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Mumbai Faucet</a></div>
                          </>
                        )}
                        {networkKey === 'sepolia' && (
                          <>
                            <div>• <a href="https://www.alchemy.com/faucets/ethereum-sepolia" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Alchemy Sepolia Faucet</a> (Recommended)</div>
                            <div>• <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Sepolia Faucet</a></div>
                            <div>• <a href="https://faucet.quicknode.com/ethereum/sepolia" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">QuickNode Faucet</a></div>
                          </>
                        )}
                        {networkKey === 'bscTestnet' && (
                          <div>• <a href="https://testnet.binance.org/faucet-smart" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">BSC Testnet Faucet</a></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}