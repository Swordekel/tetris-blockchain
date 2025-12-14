import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Gem, CreditCard, Wallet, Sparkles, CheckCircle, Clock, XCircle, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { MidtransConfig } from './MidtransConfig';
import { BlockchainTopUp } from './BlockchainTopUp';

interface TopUpProps {
  accessToken: string;
  userId: string;
  onUpdate: () => void;
}

interface RubyPackage {
  id: string;
  name: string;
  ruby: number;
  bonus: number;
  price: number;
  popular?: boolean;
  badge?: string;
}

interface Transaction {
  order_id: string;
  package_name: string;
  ruby_amount: number;
  price: number;
  status: string;
  created_at: string;
  payment_type?: string;
}

// Declare Midtrans Snap global type
declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

export function TopUp({ accessToken, userId, onUpdate }: TopUpProps) {
  const [activeTab, setActiveTab] = useState<'midtrans' | 'blockchain'>('midtrans');
  const [loading, setLoading] = useState(false);
  const [ruby, setRuby] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [snapLoaded, setSnapLoaded] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState<string | null>(null);
  const [midtransConfig, setMidtransConfig] = useState<any>(null);

  useEffect(() => {
    loadMidtransConfig();
    loadUserData();
  }, [accessToken]);

  const loadMidtransConfig = async () => {
    try {
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/topup/config-check`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      console.log('🔧 Midtrans Configuration loaded:', data);
      setMidtransConfig(data);
      
      // Load Snap script with correct environment
      if (data.client_key_set && data.client_key) {
        loadSnapScript(data.environment === 'PRODUCTION', data.client_key);
      } else {
        console.error('❌ Client key not available from backend');
        toast.error('Payment system configuration incomplete. Please contact administrator.');
      }
    } catch (error) {
      console.error('Failed to load Midtrans config:', error);
      toast.error('Failed to load payment configuration. Please refresh the page.');
    }
  };

  const loadSnapScript = (isProduction: boolean, clientKey: string) => {
    // Prevent loading script multiple times
    if (snapLoaded) return;
    
    // Remove existing script if any
    const existingScript = document.querySelector('script[src*="snap.js"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    
    // Use configuration from backend
    const snapUrl = isProduction 
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    
    script.src = snapUrl;
    script.setAttribute('data-client-key', clientKey);
    
    script.onload = () => {
      console.log('✅ Midtrans Snap loaded');
      console.log('🔧 Environment:', isProduction ? 'PRODUCTION' : 'SANDBOX');
      console.log('🔧 Snap URL:', snapUrl);
      console.log('🔑 Using client key:', clientKey.substring(0, 20) + '...');
      setSnapLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Failed to load Midtrans Snap');
      console.error('❌ Snap URL:', snapUrl);
      toast.error('Failed to load payment system. Please check your internet connection.');
    };
    document.body.appendChild(script);
  };

  const loadUserData = async () => {
    try {
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/topup/data`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Load data failed:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ TopUp data loaded:', data);
      setRuby(data.ruby || 0);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Load user data error:', error);
      toast.error('Failed to load top-up data. Please refresh the page.');
    }
  };

  const purchasePackage = async (pkg: RubyPackage) => {
    if (!snapLoaded) {
      toast.error('Payment system not ready. Please refresh the page.');
      return;
    }

    setLoading(true);
    try {
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/topup/create-transaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            package_id: pkg.id,
            package_name: pkg.name,
            ruby_amount: pkg.ruby + pkg.bonus,
            price: pkg.price,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create transaction');
        setLoading(false);
        return;
      }

      console.log('💳 Transaction created:', data.order_id);
      console.log('🎫 Snap token:', data.snap_token);

      // Open Midtrans Snap popup
      if (window.snap) {
        window.snap.pay(data.snap_token, {
          onSuccess: async (result) => {
            console.log('✅ Payment success:', result);
            toast.success(`Successfully purchased ${pkg.name}!`);
            await loadUserData();
            onUpdate();
          },
          onPending: (result) => {
            console.log('⏳ Payment pending:', result);
            toast.info('Payment is being processed...');
            loadUserData();
          },
          onError: (result) => {
            console.error('❌ Payment error:', result);
            toast.error('Payment failed. Please try again.');
          },
          onClose: () => {
            console.log('🚪 Payment popup closed');
            setLoading(false);
            loadUserData();
          },
        });
      } else {
        toast.error('Payment system not available');
        setLoading(false);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process purchase');
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'settlement':
      case 'capture':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'settlement':
      case 'capture':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  const simulatePayment = async (orderId: string) => {
    setSimulatingPayment(orderId);
    try {
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/topup/simulate-payment/${orderId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to simulate payment');
        return;
      }

      console.log('✅ Payment simulated:', data);
      toast.success(`💎 ${data.ruby_credited} Ruby credited instantly!`);
      await loadUserData();
      onUpdate();
    } catch (error) {
      console.error('Simulate payment error:', error);
      toast.error('Failed to simulate payment');
    } finally {
      setSimulatingPayment(null);
    }
  };

  const rubyPackages: RubyPackage[] = [
    {
      id: 'starter',
      name: 'Starter Pack',
      ruby: 100,
      bonus: 0,
      price: 10000,
    },
    {
      id: 'popular',
      name: 'Popular Pack',
      ruby: 300,
      bonus: 50,
      price: 25000,
      popular: true,
      badge: '🔥 Most Popular',
    },
    {
      id: 'value',
      name: 'Best Value',
      ruby: 600,
      bonus: 150,
      price: 50000,
      badge: '💎 Best Value',
    },
    {
      id: 'mega',
      name: 'Mega Pack',
      ruby: 1500,
      bonus: 500,
      price: 100000,
      badge: '⭐ Premium',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl">Top Up Ruby</h2>
        <div className="flex items-center gap-2 bg-pink-500/20 px-4 py-2 rounded-lg border border-pink-500/30">
          <Gem className="h-5 w-5 text-pink-500" />
          <span className="text-xl">{ruby} 💎</span>
        </div>
      </div>

      {/* Environment Mode Indicator - Check from backend config */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              ℹ️
            </div>
            <div className="flex-1">
              <div className="font-semibold mb-1">💳 Payment System Status</div>
              <div className="text-sm text-gray-300">
                Using <strong>Midtrans Payment Gateway</strong>. 
                Current mode will be displayed in the configuration check below.
                {' '}For production setup with real payments, follow the instructions in 
                <code className="text-pink-400 mx-1">MIDTRANS_PRODUCTION_SETUP.md</code>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                💡 Tip: Scroll down to <strong>"Midtrans Configuration Check"</strong> to verify your current environment (Sandbox/Production)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex items-center gap-4">
        <Button
          size="lg"
          onClick={() => setActiveTab('midtrans')}
          className={`${
            activeTab === 'midtrans'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              : 'bg-white/5 border border-white/10 text-gray-400'
          }`}
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Midtrans Payment
        </Button>
        <Button
          size="lg"
          onClick={() => setActiveTab('blockchain')}
          className={`${
            activeTab === 'blockchain'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
              : 'bg-white/5 border border-white/10 text-gray-400'
          }`}
        >
          <Wallet className="h-5 w-5 mr-2" />
          Blockchain / Crypto
        </Button>
      </div>

      {/* Midtrans Tab */}
      {activeTab === 'midtrans' && (
        <>
          {/* Ruby Packages */}
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
                      {/* Ruby Amount Display */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl text-pink-400">{pkg.ruby}</span>
                          <Gem className="h-4 w-4 text-pink-400" />
                        </div>
                        {pkg.bonus > 0 && (
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-yellow-400" />
                            <span className="text-sm text-yellow-400">+{pkg.bonus} Bonus!</span>
                          </div>
                        )}
                      </div>

                      {/* Price Display */}
                      <div className="text-center py-2">
                        <div className="text-2xl">{formatPrice(pkg.price)}</div>
                        {pkg.bonus > 0 && (
                          <div className="text-sm text-gray-400">
                            Total: {pkg.ruby + pkg.bonus} Ruby
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => purchasePackage(pkg)}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Payment Methods Info */}
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {[
                  { icon: '💳', label: 'Credit/Debit Card', id: 'card' },
                  { icon: '🏦', label: 'Bank Transfer', id: 'bank' },
                  { icon: '📱', label: 'GoPay, OVO, Dana', id: 'ewallet' },
                  { icon: '📲', label: 'QRIS', id: 'qris' },
                ].map((method) => (
                  <div key={method.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-3xl mb-2">{method.icon}</div>
                    <div className="text-sm">{method.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Blockchain Tab */}
      {activeTab === 'blockchain' && (
        <BlockchainTopUp accessToken={accessToken} userId={userId} onUpdate={onUpdate} />
      )}

      {/* Transaction History - Common for both tabs */}
      {transactions.length > 0 && (
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest top-up history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.order_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(tx.status)}
                    <div>
                      <div className="font-medium">{tx.package_name}</div>
                      <div className="text-sm text-gray-400">
                        {formatDate(tx.created_at)}
                        {tx.payment_type ? ` • ${tx.payment_type}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Gem className="h-4 w-4 text-pink-500" />
                        <span className="font-medium text-pink-400">{tx.ruby_amount}</span>
                      </div>
                      <div className="text-sm text-gray-400">{formatPrice(tx.price)}</div>
                    </div>
                    <Badge className={`${getStatusColor(tx.status)} border`}>
                      {tx.status}
                    </Badge>
                    {/* Sandbox only: Simulate payment button */}
                    {tx.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => simulatePayment(tx.order_id)}
                        disabled={simulatingPayment === tx.order_id}
                        className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                      >
                        {simulatingPayment === tx.order_id ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          <span>🧪 Simulate</span>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Midtrans Configuration Check - For admin/debugging */}
      <MidtransConfig accessToken={accessToken} />
    </div>
  );
}