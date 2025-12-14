import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Gem, CreditCard, Wallet, Sparkles, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BlockchainTopUp } from './BlockchainTopUp';

interface TopUpSimpleProps {
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

export function TopUpSimple({ accessToken, userId, onUpdate }: TopUpSimpleProps) {
  const [loading, setLoading] = useState(false);
  const [ruby, setRuby] = useState(0);
  const [activeTab, setActiveTab] = useState<'midtrans' | 'blockchain'>('midtrans');

  useEffect(() => {
    loadUserRuby();
  }, [accessToken]);

  const loadUserRuby = async () => {
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

      if (response.ok) {
        const data = await response.json();
        setRuby(data.ruby || 0);
      }
    } catch (error) {
      console.error('Load ruby error:', error);
    }
  };

  const purchasePackage = async (pkg: RubyPackage) => {
    setLoading(true);
    
    // Simulate payment processing with animation
    toast.info('Processing payment...', {
      icon: '💳',
    });

    // Simulate delay (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const totalRuby = pkg.ruby + pkg.bonus;
      
      // Directly add Ruby to user (fake payment)
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/profile/add-ruby`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            amount: totalRuby,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add Ruby');
      }

      // Update local state
      setRuby(prev => prev + totalRuby);

      // Success notification with confetti effect
      toast.success(
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <div className="font-semibold">Payment Successful!</div>
            <div className="text-sm text-gray-400">
              +{totalRuby} 💎 Ruby added to your account
            </div>
          </div>
        </div>,
        {
          duration: 5000,
        }
      );

      // Trigger parent update
      onUpdate();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl">Top Up Ruby</h2>
        <div className="flex items-center gap-2 bg-pink-500/20 px-4 py-2 rounded-lg border border-pink-500/30">
          <Gem className="h-5 w-5 text-pink-500" />
          <span className="text-xl">{ruby} 💎</span>
        </div>
      </div>

      {/* Payment Method Tabs */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle>Choose Payment Method</CardTitle>
          <CardDescription>Select your preferred payment option</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => setActiveTab('midtrans')}
              variant={activeTab === 'midtrans' ? 'default' : 'outline'}
              className={`flex-1 ${
                activeTab === 'midtrans'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  : ''
              }`}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Midtrans Payment
            </Button>
            <Button
              onClick={() => setActiveTab('blockchain')}
              variant={activeTab === 'blockchain' ? 'default' : 'outline'}
              className={`flex-1 ${
                activeTab === 'blockchain'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                  : ''
              }`}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Blockchain Payment
            </Button>
          </div>

          {/* Tab Content */}
          {activeTab === 'midtrans' ? (
            <div className="space-y-6">
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
                            {loading ? 'Processing...' : 'Buy Now'}
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
                    Supported Payment Methods
                  </CardTitle>
                  <CardDescription>Multiple payment options available</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {[
                      { icon: '💳', label: 'Credit/Debit Card' },
                      { icon: '🏦', label: 'Bank Transfer' },
                      { icon: '📱', label: 'GoPay, OVO, Dana' },
                      { icon: '📲', label: 'QRIS' },
                    ].map((method, index) => (
                      <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-3xl mb-2">{method.icon}</div>
                        <div className="text-sm">{method.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Success Stories / Social Proof */}
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold mb-1 text-green-400">Safe & Instant</div>
                      <div className="text-sm text-gray-300">
                        All transactions are <strong>100% secure</strong> and Ruby will be added to your account <strong>instantly</strong> after payment confirmation.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div>
              <BlockchainTopUp accessToken={accessToken} userId={userId} onUpdate={onUpdate} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
