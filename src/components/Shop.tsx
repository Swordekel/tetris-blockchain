import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Coins, Sparkles, Lock, Check, Info, X, Star, Gift, Gem } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import zootopiaImage from 'figma:asset/fe937508b052eaf2f4c557563e3b2d29717874bf.png';
import zootopiaBanner from 'figma:asset/2f26a78e5c9ae5a9058e517fc018eb1613aad50a.png';
import nickBorder from 'figma:asset/e530821da8a1eb636f54cc61be69d3821588e01c.png';
import judyBorder from 'figma:asset/61ae9b6237566f56e2192a2e864ba7036e9290b8.png';
import steampunkBorder from 'figma:asset/0fb0a9153307f4a65c9edf1f3e75a7f14da843de.png';

interface ShopItem {
  id: string;
  name: string;
  price: number;
  rarity: string;
  isGachaOnly?: boolean;
  isRewardOnly?: boolean;
}

interface ShopProps {
  accessToken: string;
  onUpdate: () => void;
}

const rarityColors: Record<string, string> = {
  common: 'bg-gray-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500',
};

// LIMITED GACHA EXCLUSIVE SKINS
const gachaSkinBlockColors: Record<string, string[]> = {
  crystal: ['#E0F7FA', '#80DEEA', '#4DD0E1', '#00BCD4'],
  fire: ['#FF5722', '#FF7043', '#FF8A65', '#FFAB91'],
  ocean: ['#006064', '#00838F', '#0097A7', '#00ACC1'],
  sunset: ['#FF6F00', '#FF8F00', '#FFA000', '#FFB300'],
  aurora: ['#1A237E', '#4A148C', '#6A1B9A', '#9C27B0'],
  cosmic: ['#000000', '#1E3A8A', '#4338CA', '#7C3AED'],
};

const gachaSkinBackgrounds: Record<string, string> = {
  crystal: '#E1F5FE',
  fire: '#BF360C',
  ocean: '#00838F',
  sunset: '#E65100',
  aurora: '#4A148C',
  cosmic: '#0a0a0a',
};

// REGULAR SHOP SKINS
const skinBlockColors: Record<string, string[]> = {
  default: ['#00F0F0', '#F0F000', '#A000F0', '#F0A000'],
  neon: ['#00FFFF', '#FFFF00', '#FF00FF', '#FF8800'],
  candy: ['#FFB6C1', '#FFE4B5', '#E0BBE4', '#FFA07A'],
  galaxy: ['#4B0082', '#8A2BE2', '#9370DB', '#BA55D3'],
  rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00'],
  gold: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520'],
  zootopia: ['#FF6B35', '#7C9EB2', '#6BCB77', '#4D96FF'],
};

const skinBackgrounds: Record<string, string> = {
  default: '#1a1a2e',
  neon: '#0a0a14',
  candy: '#ffe4e9',
  galaxy: '#0d0221',
  rainbow: '#1a1a1a',
  gold: '#1c1810',
  zootopia: 'linear-gradient(135deg, #4DA8DA 0%, #FF8C42 50%, #9D84B7 100%)',
};

const borderPreview: Record<string, string> = {
  default: 'border-2 border-gray-500',
  bronze: 'border-4 border-orange-700',
  silver: 'border-4 border-gray-300',
  gold: 'border-4 border-yellow-500',
  diamond: 'border-4 border-cyan-400',
  fire: 'border-4 border-red-500',
};

// Gacha Rates
const gachaRates = [
  { rarity: 'Legendary', chance: '1%', color: 'text-yellow-500' },
  { rarity: 'Epic', chance: '5%', color: 'text-purple-500' },
  { rarity: 'Rare', chance: '20%', color: 'text-blue-500' },
  { rarity: 'Common', chance: '74%', color: 'text-gray-400' },
];

export function Shop({ accessToken, onUpdate }: ShopProps) {
  const [skins, setSkins] = useState<ShopItem[]>([]);
  const [borders, setBorders] = useState<ShopItem[]>([]);
  const [ownedSkins, setOwnedSkins] = useState<string[]>([]);
  const [ownedBorders, setOwnedBorders] = useState<string[]>([]);
  const [currency, setCurrency] = useState(0);
  const [ruby, setRuby] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [gachaResult, setGachaResult] = useState<{
    id: string;
    name: string;
    rarity: string;
    type: 'skin' | 'border';
    isNew: boolean;
  } | null>(null);
  const [multiGachaResults, setMultiGachaResults] = useState<Array<{
    id: string;
    name: string;
    rarity: string;
    type: 'skin' | 'border';
    isNew: boolean;
  }> | null>(null);

  useEffect(() => {
    loadShopItems();
  }, [accessToken]);

  const loadShopItems = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/shop/items`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shop API error:', response.status, errorText);
        throw new Error(`Failed to load shop items: ${response.status}`);
      }

      const data = await response.json();
      setSkins(data.skins || []);
      setBorders(data.borders || []);
      setOwnedSkins(data.ownedSkins || []);
      setOwnedBorders(data.ownedBorders || []);
      setCurrency(data.currency || 0);
      setRuby(data.ruby || 0);
    } catch (error: any) {
      console.error('Load shop error:', error);
      
      // Don't show error toast - shop will still be usable with default items
      // Just log to console for debugging
      console.warn('⚠️ Shop items loaded with defaults (backend unavailable)');
      
      // Set default empty arrays so UI still works
      setSkins([]);
      setBorders([]);
      setOwnedSkins([]);
      setOwnedBorders([]);
      setCurrency(0);
      setRuby(0);
    }
  };

  const purchaseItem = async (itemId: string, itemType: 'skin' | 'border', price: number) => {
    setLoading(true);
    try {
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/shop/purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ itemId, itemType, price }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Purchase failed');
        return;
      }

      setCurrency(data.currency);
      setOwnedSkins(data.ownedSkins);
      setOwnedBorders(data.ownedBorders);
      toast.success(`Successfully purchased ${itemType}!`);
      onUpdate();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to complete purchase');
    } finally {
      setLoading(false);
    }
  };

  const rollGacha = async () => {
    setLoading(true);

    try {
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/shop/gacha`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Gacha failed');
        setLoading(false);
        return;
      }

      console.log('🎲 Gacha result:', data);

      // Show result immediately in popup
      setGachaResult({
        id: data.item.id,
        name: data.item.name,
        rarity: data.item.rarity,
        type: data.item.type,
        isNew: data.isNew,
      });

      // Update currencies and owned items
      setCurrency(data.currency);
      setRuby(data.ruby);
      setOwnedSkins(data.ownedSkins);
      setOwnedBorders(data.ownedBorders);
      onUpdate();
      
    } catch (error) {
      console.error('Gacha error:', error);
      toast.error('Failed to roll gacha');
      setGachaResult(null);
    } finally {
      setLoading(false);
    }
  };

  const rollMultiGacha = async () => {
    setLoading(true);

    try {
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/shop/gacha-multi`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ count: 10 }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Multi gacha failed');
        setLoading(false);
        return;
      }

      console.log('🎲 Multi Gacha results:', data);

      // Show all results in popup
      setMultiGachaResults(data.items.map((item: any) => ({
        id: item.item.id,
        name: item.item.name,
        rarity: item.item.rarity,
        type: item.item.type,
        isNew: item.isNew,
      })));

      // Update currencies and owned items
      setCurrency(data.currency);
      setRuby(data.ruby);
      setOwnedSkins(data.ownedSkins);
      setOwnedBorders(data.ownedBorders);
      onUpdate();
      
    } catch (error) {
      console.error('Multi Gacha error:', error);
      toast.error('Failed to roll multi gacha');
      setMultiGachaResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Separate gacha-only and regular shop skins
  const gachaOnlySkins = skins.filter(skin => skin.isGachaOnly);
  const regularShopSkins = skins.filter(skin => !skin.isGachaOnly);
  const gachaOnlyBorders = borders.filter(border => border.isGachaOnly);
  const regularShopBorders = borders.filter(border => !border.isGachaOnly && !border.isRewardOnly);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl">Shop</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-lg border border-yellow-500/30">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span className="text-xl">{currency}</span>
          </div>
          <div className="flex items-center gap-2 bg-pink-500/20 px-4 py-2 rounded-lg border border-pink-500/30">
            <Gem className="h-5 w-5 text-pink-500" />
            <span className="text-xl">{ruby}</span>
          </div>
        </div>
      </div>

      {/* Gacha Banner - Zootopia Theme */}
      <div className="relative overflow-hidden rounded-lg border-2 border-purple-500/50 shadow-2xl">
        {/* Background Image & Gradient */}
        <div className="absolute inset-0">
          <img 
            src={zootopiaBanner}
            alt="Welcome to Zootopia Arena"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        </div>
        
        {/* Sparkles Animation */}
        <div className="absolute inset-0">
          <Star className="absolute top-4 left-8 h-4 w-4 text-yellow-300 animate-pulse" />
          <Star className="absolute top-12 right-16 h-6 w-6 text-pink-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <Star className="absolute bottom-8 left-24 h-5 w-5 text-purple-300 animate-pulse" style={{ animationDelay: '1s' }} />
          <Star className="absolute bottom-4 right-8 h-4 w-4 text-orange-300 animate-pulse" style={{ animationDelay: '1.5s' }} />
          <Sparkles className="absolute top-8 right-32 h-8 w-8 text-white animate-pulse" style={{ animationDelay: '0.3s' }} />
          <Sparkles className="absolute bottom-12 left-1/3 h-6 w-6 text-yellow-200 animate-pulse" style={{ animationDelay: '0.8s' }} />
        </div>

        {/* Content */}
        <div className="relative p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <Gift className="h-8 w-8 text-white drop-shadow-lg" />
                <h3 className="text-3xl text-white drop-shadow-lg hidden md:block">Zootopia Arena Gacha</h3>
              </div>
              <p className="text-white drop-shadow-lg mb-4">
                Where Everyone's A Little Bit Wild... And A Whole Lot Cool!
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Badge className="bg-yellow-500 text-black drop-shadow-lg">
                  <Star className="h-3 w-3 mr-1" />
                  Legendary 1%
                </Badge>
                <Badge className="bg-purple-500 drop-shadow-lg">
                  Epic 5%
                </Badge>
                <Badge className="bg-blue-500 drop-shadow-lg">
                  Rare 20%
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button
                  onClick={rollGacha}
                  disabled={loading || ruby < 100}
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 min-w-[140px] shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 animate-spin" />
                      Rolling...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Gem className="h-5 w-5" />
                      1x (100💎)
                    </span>
                  )}
                </Button>
                
                <Button
                  onClick={rollMultiGacha}
                  disabled={loading || ruby < 900}
                  size="lg"
                  className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700 min-w-[140px] shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 animate-spin" />
                      Rolling...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      10x (900💎)
                    </span>
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs text-white/70 bg-white/5 rounded px-3 py-1">
                <Star className="h-3 w-3 text-yellow-400" />
                <span>10x roll saves 100 Ruby!</span>
              </div>
              
              <Button
                onClick={() => setShowRates(true)}
                variant="outline"
                size="sm"
                className="border-white text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <Info className="h-4 w-4 mr-2" />
                View Rates
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Gacha Exclusive Items Preview */}
      {gachaOnlySkins.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h3 className="text-xl">Limited Gacha Exclusive Skins</h3>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-500">
              Gacha Only
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {gachaOnlySkins.slice(0, 6).map((skin) => {
              const owned = (ownedSkins || []).includes(skin.id);
              const colors = gachaSkinBlockColors[skin.id] || skinBlockColors.default;
              const bgColor = gachaSkinBackgrounds[skin.id] || skinBackgrounds.default;
              
              return (
                <div key={skin.id} className="relative">
                  <div
                    className="h-24 w-full rounded-lg flex items-center justify-center p-2 border-2 border-purple-500/30"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="grid grid-cols-2 gap-1">
                      {colors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded"
                          style={{
                            backgroundColor: color,
                            border: '1px solid rgba(0,0,0,0.3)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-1 text-center">
                    <p className="text-xs truncate">{skin.name}</p>
                    <Badge className={`${rarityColors[skin.rarity]} text-xs`}>
                      {skin.rarity}
                    </Badge>
                  </div>
                  {owned && (
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gacha Exclusive Borders Preview */}
      {gachaOnlyBorders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            <h3 className="text-xl">Limited Gacha Exclusive Borders</h3>
            <Badge variant="secondary" className="bg-pink-500/20 text-pink-500">
              Gacha Only
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gachaOnlyBorders.map((border) => {
              const owned = (ownedBorders || []).includes(border.id);
              
              // Get the border frame image
              const borderFrameImage = border.id === 'zootopia_nick' ? nickBorder :
                                      border.id === 'zootopia_judy' ? judyBorder :
                                      border.id === 'zootopia_steampunk' ? steampunkBorder :
                                      null;
              
              return (
                <div key={border.id} className="relative">
                  <div className="h-40 w-full rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50 p-4 border-2 border-pink-500/30">
                    {borderFrameImage ? (
                      <div className="w-28 h-28 relative">
                        <img 
                          src={borderFrameImage} 
                          alt={border.name}
                          className="w-full h-full object-contain"
                          style={{
                            filter: 'drop-shadow(0 0 20px rgba(236, 72, 153, 0.6))',
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/20 relative">
                        <img 
                          src={zootopiaImage} 
                          alt={border.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-center">
                    <p className="text-xs truncate">{border.name}</p>
                    <Badge className={`${rarityColors[border.rarity]} text-xs`}>
                      {border.rarity}
                    </Badge>
                  </div>
                  {owned && (
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Tabs defaultValue="skins" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="skins">Regular Skins</TabsTrigger>
          <TabsTrigger value="borders">Borders</TabsTrigger>
        </TabsList>

        <TabsContent value="skins" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularShopSkins.map((skin) => {
              const owned = (ownedSkins || []).includes(skin.id);
              const colors = skinBlockColors[skin.id] || skinBlockColors.default;
              const bgColor = skinBackgrounds[skin.id] || skinBackgrounds.default;
              
              return (
                <Card key={skin.id} className="overflow-hidden">
                  <div
                    className="h-32 w-full flex items-center justify-center p-4 gap-2"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="grid grid-cols-2 gap-1">
                      {colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded"
                          style={{
                            backgroundColor: color,
                            border: '2px solid rgba(0,0,0,0.3)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{skin.name}</h3>
                        <Badge className={rarityColors[skin.rarity]}>
                          {skin.rarity}
                        </Badge>
                      </div>
                      {owned && <Check className="h-5 w-5 text-green-500" />}
                    </div>
                    <Button
                      onClick={() => purchaseItem(skin.id, 'skin', skin.price)}
                      disabled={loading || owned || currency < skin.price || skin.price === 0}
                      className="w-full mt-2"
                      variant={owned ? 'secondary' : 'default'}
                    >
                      {owned ? (
                        'Owned'
                      ) : skin.price === 0 ? (
                        'Default'
                      ) : (
                        <span className="flex items-center gap-2">
                          {currency < skin.price && <Lock className="h-4 w-4" />}
                          <Coins className="h-4 w-4" />
                          {skin.price}
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="borders" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularShopBorders.map((border) => {
              const owned = (ownedBorders || []).includes(border.id);
              return (
                <Card key={border.id} className="overflow-hidden">
                  <div className="h-32 w-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-4">
                    <div
                      className={`w-24 h-24 rounded-lg ${borderPreview[border.id]}`}
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{border.name}</h3>
                        <Badge className={rarityColors[border.rarity]}>
                          {border.rarity}
                        </Badge>
                      </div>
                      {owned && <Check className="h-5 w-5 text-green-500" />}
                    </div>
                    <Button
                      onClick={() => purchaseItem(border.id, 'border', border.price)}
                      disabled={loading || owned || currency < border.price || border.price === 0}
                      className="w-full mt-2"
                      variant={owned ? 'secondary' : 'default'}
                    >
                      {owned ? (
                        'Owned'
                      ) : border.price === 0 ? (
                        'Default'
                      ) : (
                        <span className="flex items-center gap-2">
                          {currency < border.price && <Lock className="h-4 w-4" />}
                          <Coins className="h-4 w-4" />
                          {border.price}
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Rates Modal */}
      {showRates && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Gacha Drop Rates
                </CardTitle>
                <Button
                  onClick={() => setShowRates(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Probability of getting each rarity tier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gachaRates.map((rate) => (
                <div key={rate.rarity} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className={`h-5 w-5 ${rate.color}`} />
                    <span className={rate.color}>{rate.rarity}</span>
                  </div>
                  <Badge variant="secondary">{rate.chance}</Badge>
                </div>
              ))}
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-white/60">
                  • Duplicate items refund 50 coins
                </p>
                <p className="text-sm text-white/60">
                  • Limited skins are gacha exclusive
                </p>
                <p className="text-sm text-white/60 flex items-center gap-1">
                  • Each roll costs <Gem className="h-3 w-3 inline text-pink-400" /> 100 Ruby
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gacha Result Modal */}
      {gachaResult && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <Card className="max-w-md w-full border-2 shadow-2xl animate-in zoom-in duration-500" style={{
            borderColor: gachaResult.rarity === 'legendary' ? '#FFD700' :
                        gachaResult.rarity === 'epic' ? '#A855F7' :
                        gachaResult.rarity === 'rare' ? '#3B82F6' : '#9CA3AF'
          }}>
            <CardHeader className="relative overflow-hidden">
              {/* Animated background based on rarity */}
              <div className="absolute inset-0 opacity-20">
                {gachaResult.rarity === 'legendary' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 animate-pulse"></div>
                )}
                {gachaResult.rarity === 'epic' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-500 animate-pulse"></div>
                )}
                {gachaResult.rarity === 'rare' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-500 animate-pulse"></div>
                )}
              </div>
              
              <div className="relative flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-6 w-6 animate-bounce" />
                  🎉 Gacha Result!
                </CardTitle>
                <Button
                  onClick={() => setGachaResult(null)}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription className="relative">
                You received a {gachaResult.type}!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              {/* Main Item Display */}
              <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-lg p-6 text-center border-2 relative overflow-hidden" style={{
                borderColor: gachaResult.rarity === 'legendary' ? '#FFD700' :
                            gachaResult.rarity === 'epic' ? '#A855F7' :
                            gachaResult.rarity === 'rare' ? '#3B82F6' : '#9CA3AF'
              }}>
                {/* Sparkle effects for legendary */}
                {gachaResult.rarity === 'legendary' && (
                  <>
                    <Star className="absolute top-2 left-2 h-4 w-4 text-yellow-400 animate-ping" />
                    <Star className="absolute top-2 right-2 h-4 w-4 text-yellow-400 animate-ping" style={{ animationDelay: '0.3s' }} />
                    <Star className="absolute bottom-2 left-2 h-4 w-4 text-yellow-400 animate-ping" style={{ animationDelay: '0.6s' }} />
                    <Star className="absolute bottom-2 right-2 h-4 w-4 text-yellow-400 animate-ping" style={{ animationDelay: '0.9s' }} />
                    <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-16 text-yellow-300 opacity-20 animate-spin" style={{ animationDuration: '3s' }} />
                  </>
                )}
                
                {/* Item Icon */}
                <div className="mb-4 animate-bounce" style={{ animationDuration: '1s', animationIterationCount: '3' }}>
                  {gachaResult.rarity === 'legendary' && <Star className="h-16 w-16 text-yellow-500 mx-auto" />}
                  {gachaResult.rarity === 'epic' && <Star className="h-16 w-16 text-purple-500 mx-auto" />}
                  {gachaResult.rarity === 'rare' && <Star className="h-16 w-16 text-blue-500 mx-auto" />}
                  {gachaResult.rarity === 'common' && <Star className="h-16 w-16 text-gray-500 mx-auto" />}
                </div>
                
                {/* Item Name */}
                <h3 className="text-2xl mb-2 drop-shadow-lg" style={{
                  color: gachaResult.rarity === 'legendary' ? '#FFD700' :
                         gachaResult.rarity === 'epic' ? '#A855F7' :
                         gachaResult.rarity === 'rare' ? '#3B82F6' : '#9CA3AF'
                }}>
                  {gachaResult.name}
                </h3>
                
                {/* Rarity Badge */}
                <Badge 
                  className={`${rarityColors[gachaResult.rarity]} text-sm px-4 py-1 animate-pulse`}
                  style={{ animationDuration: '2s' }}
                >
                  <Star className="h-3 w-3 mr-1 inline" />
                  {gachaResult.rarity.toUpperCase()}
                </Badge>
              </div>
              
              {/* Status Info */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2">
                  {gachaResult.isNew ? (
                    <>
                      <Sparkles className="h-5 w-5 text-green-500 animate-pulse" />
                      <span className="text-green-500">✨ New Item Added to Collection!</span>
                    </>
                  ) : (
                    <>
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-500">Duplicate item! Refunded 50 coins</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Action Button */}
              <Button
                onClick={() => setGachaResult(null)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                size="lg"
              >
                <Check className="h-5 w-5 mr-2" />
                Awesome!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Multi Gacha Results Modal */}
      {multiGachaResults && multiGachaResults.length > 0 && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <Card className="max-w-4xl w-full border-2 border-yellow-500 shadow-2xl animate-in zoom-in duration-500 max-h-[90vh] overflow-y-auto">
            <CardHeader className="relative overflow-hidden bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20">
              <div className="relative flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
                  🎊 10x Gacha Results!
                </CardTitle>
                <Button
                  onClick={() => setMultiGachaResults(null)}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription className="relative">
                You received {multiGachaResults.length} items!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4 border-b border-white/10">
                {['legendary', 'epic', 'rare', 'common'].map((rarity) => {
                  const count = multiGachaResults.filter(r => r.rarity === rarity).length;
                  if (count === 0) return null;
                  
                  return (
                    <div key={rarity} className="bg-white/5 rounded-lg p-3 text-center">
                      <Star className={`h-5 w-5 mx-auto mb-1 ${
                        rarity === 'legendary' ? 'text-yellow-500' :
                        rarity === 'epic' ? 'text-purple-500' :
                        rarity === 'rare' ? 'text-blue-500' : 'text-gray-500'
                      }`} />
                      <div className="text-2xl">{count}x</div>
                      <div className="text-xs text-white/60 capitalize">{rarity}</div>
                    </div>
                  );
                })}
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {multiGachaResults.map((item, index) => (
                  <div 
                    key={`${item.id}-${index}`}
                    className="bg-gradient-to-br from-white/5 to-white/10 rounded-lg p-3 border-2 relative"
                    style={{
                      borderColor: item.rarity === 'legendary' ? '#FFD700' :
                                   item.rarity === 'epic' ? '#A855F7' :
                                   item.rarity === 'rare' ? '#3B82F6' : '#9CA3AF',
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {/* New Badge */}
                    {item.isNew && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                        NEW!
                      </div>
                    )}
                    
                    {/* Item Icon */}
                    <div className="flex items-center justify-center mb-2">
                      {item.rarity === 'legendary' && <Star className="h-10 w-10 text-yellow-500" />}
                      {item.rarity === 'epic' && <Star className="h-10 w-10 text-purple-500" />}
                      {item.rarity === 'rare' && <Star className="h-10 w-10 text-blue-500" />}
                      {item.rarity === 'common' && <Star className="h-10 w-10 text-gray-500" />}
                    </div>
                    
                    {/* Item Name */}
                    <div className="text-center">
                      <p className="text-xs truncate mb-1" style={{
                        color: item.rarity === 'legendary' ? '#FFD700' :
                               item.rarity === 'epic' ? '#A855F7' :
                               item.rarity === 'rare' ? '#3B82F6' : '#9CA3AF'
                      }}>
                        {item.name}
                      </p>
                      <Badge className={`${rarityColors[item.rarity]} text-xs`}>
                        {item.rarity.charAt(0).toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-500" />
                    <span className="text-green-500">
                      {multiGachaResults.filter(r => r.isNew).length} New Items!
                    </span>
                  </div>
                  {multiGachaResults.some(r => !r.isNew) && (
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-500">
                        +{multiGachaResults.filter(r => !r.isNew).length * 50} coins (duplicates)
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Button */}
              <Button
                onClick={() => setMultiGachaResults(null)}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                size="lg"
              >
                <Check className="h-5 w-5 mr-2" />
                Amazing!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}