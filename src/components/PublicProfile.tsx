import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Coins, Trophy, X, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ProfileBorder } from './ProfileBorder';
import nickBorder from 'figma:asset/e530821da8a1eb636f54cc61be69d3821588e01c.png';
import judyBorder from 'figma:asset/61ae9b6237566f56e2192a2e864ba7036e9290b8.png';
import steampunkBorder from 'figma:asset/0fb0a9153307f4a65c9edf1f3e75a7f14da843de.png';

interface UserData {
  id: string;
  username: string;
  email: string;
  currency: number;
  selectedSkin: string;
  selectedBorder: string;
  ownedSkins: string[];
  ownedBorders: string[];
  highScore: number;
  profilePicture?: string;
  coverImage?: string;
}

interface PublicProfileProps {
  userId: string;
  onClose: () => void;
}

const borderStyles: Record<string, string> = {
  default: 'border-4 border-gray-500',
  bronze: 'border-4 border-orange-700',
  silver: 'border-4 border-gray-300',
  gold: 'border-4 border-yellow-500',
  diamond: 'border-4 border-cyan-400',
  fire: 'border-4 border-red-500',
  // DAILY BORDERS
  daily_champion: 'border-[6px] border-double border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.8)]',
  daily_master: 'border-[6px] border-double border-orange-400 shadow-[0_0_25px_rgba(251,146,60,0.7)]',
  daily_elite: 'border-[6px] border-double border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.6)]',
  // WEEKLY BORDERS
  weekly_champion: 'border-[6px] border-double border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)] animate-pulse',
  weekly_master: 'border-[6px] border-double border-blue-400 shadow-[0_0_25px_rgba(96,165,250,0.7)] animate-pulse',
  weekly_elite: 'border-[6px] border-double border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] animate-pulse',
  // SEASON BORDERS
  season_champion: 'border-[8px] border-double bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 shadow-[0_0_40px_rgba(168,85,247,0.9)] animate-gradient',
  season_master: 'border-[8px] border-double bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 shadow-[0_0_35px_rgba(34,211,238,0.8)] animate-gradient',
  season_elite: 'border-[8px] border-double bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 shadow-[0_0_30px_rgba(244,63,94,0.7)] animate-gradient',
};

const skinBlockColors: Record<string, string[]> = {
  default: ['#00F0F0', '#F0F000', '#A000F0', '#F0A000'],
  neon: ['#00FFFF', '#FFFF00', '#FF00FF', '#FF8800'],
  candy: ['#FFB6C1', '#FFE4B5', '#E0BBE4', '#FFA07A'],
  galaxy: ['#4B0082', '#8A2BE2', '#9370DB', '#BA55D3'],
  rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00'],
  gold: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520'],
  zootopia: ['#FF6B35', '#7C9EB2', '#6BCB77', '#4D96FF'],
  // GACHA EXCLUSIVE SKINS
  crystal: ['#E0F7FA', '#80DEEA', '#4DD0E1', '#00BCD4'],
  fire: ['#FF5722', '#FF7043', '#FF8A65', '#FFAB91'],
  ocean: ['#006064', '#00838F', '#0097A7', '#00ACC1'],
  sunset: ['#FF6F00', '#FF8F00', '#FFA000', '#FFB300'],
  aurora: ['#1A237E', '#4A148C', '#6A1B9A', '#9C27B0'],
  cosmic: ['#000000', '#1E3A8A', '#4338CA', '#7C3AED'],
};

const skinBackgrounds: Record<string, string> = {
  default: '#1a1a2e',
  neon: '#0a0a14',
  candy: '#ffe4e9',
  galaxy: '#0d0221',
  rainbow: '#1a1a1a',
  gold: '#1c1810',
  zootopia: 'linear-gradient(135deg, #4DA8DA 0%, #FF8C42 50%, #9D84B7 100%)',
  // GACHA EXCLUSIVE SKINS
  crystal: '#E1F5FE',
  fire: '#BF360C',
  ocean: '#00838F',
  sunset: '#E65100',
  aurora: '#4A148C',
  cosmic: '#0a0a0a',
};

// Border images for Zootopia borders
const borderImages: Record<string, string | null> = {
  zootopia_nick: nickBorder,
  zootopia_judy: judyBorder,
  zootopia_steampunk: steampunkBorder,
  default: null,
  bronze: null,
  silver: null,
  gold: null,
  diamond: null,
  fire: null,
  daily_champion: null,
  daily_master: null,
  daily_elite: null,
  weekly_champion: null,
  weekly_master: null,
  weekly_elite: null,
  season_champion: null,
  season_master: null,
  season_elite: null,
};

// Border preview component for collection
const BorderPreviewSmall: React.FC<{ borderId: string }> = ({ borderId }) => {
  const borderImage = borderImages[borderId];
  
  if (borderImage) {
    // Zootopia borders with images
    return (
      <div className="relative w-8 h-8">
        <img
          src={borderImage}
          alt={borderId}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }
  
  // Regular borders - show colored circle
  return <div className={`w-8 h-8 rounded ${borderStyles[borderId] || borderStyles.default}`} />;
};

export function PublicProfile({ userId, onClose }: PublicProfileProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/profile/public/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setUserData(data.user);
    } catch (error) {
      console.error('Load public profile error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-4 text-white/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-white/60">Failed to load profile</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8">
        <div className="relative">
          {/* Close button */}
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 z-10"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Cover Image */}
          <div
            className="w-full h-48 rounded-t-lg bg-gradient-to-r from-purple-500 to-pink-500"
            style={{
              backgroundImage: userData.coverImage ? `url(${userData.coverImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Profile Content */}
          <Card className="rounded-t-none">
            <CardContent className="pt-0">
              {/* Avatar overlapping cover */}
              <div className="flex flex-col items-center -mt-16 mb-4">
                <ProfileBorder borderId={userData.selectedBorder} size={128}>
                  <div
                    className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black"
                    style={{
                      backgroundImage: userData.profilePicture ? `url(${userData.profilePicture})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: userData.profilePicture ? '#000' : skinBackgrounds[userData.selectedSkin],
                    }}
                  >
                    {!userData.profilePicture && (
                      <div className="grid grid-cols-2 gap-1">
                        {(skinBlockColors[userData.selectedSkin] || skinBlockColors.default).slice(0, 4).map((color, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-sm"
                            style={{
                              backgroundColor: color,
                              border: '1px solid rgba(0,0,0,0.3)',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ProfileBorder>
                <h3 className="text-2xl mt-4">{userData.username}</h3>
                <Badge variant="secondary" className="mt-2">{userData.email}</Badge>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-purple-500/10 p-4 rounded-lg border border-purple-500/30">
                  <div className="flex items-center gap-2 text-purple-500 mb-2">
                    <Trophy className="h-5 w-5" />
                    <span className="text-sm">High Score</span>
                  </div>
                  <div className="text-2xl">{userData.highScore.toLocaleString()}</div>
                </div>

                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="text-sm text-white/60 mb-2">Collection</div>
                  <div className="text-xl">
                    {userData.ownedSkins.length} Skins • {userData.ownedBorders.length} Borders
                  </div>
                </div>
              </div>

              {/* Owned Items Preview */}
              <div className="mt-6 space-y-4">
                <div>
                  <h4 className="text-sm text-white/60 mb-2">Skins Collection</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {userData.ownedSkins.map((skinId) => {
                      const colors = skinBlockColors[skinId] || skinBlockColors.default;
                      const bgColor = skinBackgrounds[skinId] || skinBackgrounds.default;
                      
                      return (
                        <div
                          key={skinId}
                          className="p-2 rounded border border-white/20"
                        >
                          <div
                            className="w-full h-8 rounded flex items-center justify-center"
                            style={{ backgroundColor: bgColor }}
                          >
                            <div className="grid grid-cols-2 gap-0.5">
                              {colors.slice(0, 4).map((color, i) => (
                                <div
                                  key={i}
                                  className="w-2 h-2"
                                  style={{
                                    backgroundColor: color,
                                    border: '1px solid rgba(0,0,0,0.3)',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm text-white/60 mb-2">Borders Collection</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {userData.ownedBorders.map((borderId) => (
                      <div
                        key={borderId}
                        className="p-2 rounded border border-white/20"
                      >
                        <div className="flex items-center justify-center h-8">
                          <BorderPreviewSmall borderId={borderId} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}