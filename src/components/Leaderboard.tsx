import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Trophy, User, Calendar, Zap, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { PublicProfile } from './PublicProfile';
import { projectId } from '../utils/supabase/info';
import { ProfileBorder } from './ProfileBorder';
import nickBorder from 'figma:asset/e530821da8a1eb636f54cc61be69d3821588e01c.png';
import judyBorder from 'figma:asset/61ae9b6237566f56e2192a2e864ba7036e9290b8.png';
import steampunkBorder from 'figma:asset/0fb0a9153307f4a65c9edf1f3e75a7f14da843de.png';

interface LeaderboardEntry {
  userId: string;
  username: string;
  highScore: number;
  selectedBorder: string;
  profilePicture?: string;
}

interface LeaderboardProps {
  accessToken: string;
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

export function Leaderboard({ accessToken }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'weekly' | 'season'>('all');

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/leaderboard?type=${activeTab}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Load leaderboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) {
      return (
        <div className="relative">
          <Crown className="h-16 w-16 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,1)] animate-bounce-subtle" />
          <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 animate-pulse" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="relative">
          <Trophy className="h-14 w-14 text-gray-300 fill-gray-300 drop-shadow-[0_0_12px_rgba(209,213,219,1)]" />
          <div className="absolute inset-0 bg-gray-300 blur-lg opacity-40 animate-pulse" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="relative">
          <Trophy className="h-12 w-12 text-orange-600 fill-orange-600 drop-shadow-[0_0_10px_rgba(234,88,12,1)]" />
          <div className="absolute inset-0 bg-orange-600 blur-lg opacity-40 animate-pulse" />
        </div>
      );
    }
    return null;
  };

  const getRankBg = (index: number) => {
    if (activeTab === 'daily') {
      if (index === 0) return 'bg-gradient-to-r from-yellow-900/40 via-yellow-800/30 to-yellow-900/40 border-yellow-500/50';
      if (index === 1) return 'bg-gradient-to-r from-orange-900/30 via-orange-800/20 to-orange-900/30 border-orange-500/40';
      if (index === 2) return 'bg-gradient-to-r from-purple-900/30 via-purple-800/20 to-purple-900/30 border-purple-500/40';
    } else if (activeTab === 'weekly') {
      if (index === 0) return 'bg-gradient-to-r from-emerald-900/40 via-emerald-800/30 to-emerald-900/40 border-emerald-500/50';
      if (index === 1) return 'bg-gradient-to-r from-blue-900/30 via-blue-800/20 to-blue-900/30 border-blue-500/40';
      if (index === 2) return 'bg-gradient-to-r from-cyan-900/30 via-cyan-800/20 to-cyan-900/30 border-cyan-500/40';
    } else if (activeTab === 'season') {
      if (index === 0) return 'bg-gradient-to-r from-purple-900/50 via-pink-900/40 to-indigo-900/50 border-purple-500/60 shadow-2xl';
      if (index === 1) return 'bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-teal-900/40 border-blue-500/50 shadow-xl';
      if (index === 2) return 'bg-gradient-to-r from-pink-900/40 via-rose-900/30 to-red-900/40 border-pink-500/50 shadow-lg';
    } else {
      if (index === 0) return 'bg-gradient-to-r from-yellow-900/40 via-yellow-800/30 to-yellow-900/40 border-yellow-500/50';
      if (index === 1) return 'bg-gradient-to-r from-gray-700/30 via-gray-600/20 to-gray-700/30 border-gray-400/40';
      if (index === 2) return 'bg-gradient-to-r from-orange-900/30 via-orange-800/20 to-orange-900/30 border-orange-600/40';
    }
    return 'bg-white/5 border-white/10';
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'all': return <Trophy className="h-5 w-5" />;
      case 'daily': return <Calendar className="h-5 w-5" />;
      case 'weekly': return <Zap className="h-5 w-5" />;
      case 'season': return <Crown className="h-5 w-5" />;
      default: return <Trophy className="h-5 w-5" />;
    }
  };

  const getTabColor = (tab: string) => {
    switch (tab) {
      case 'daily': return 'from-yellow-500 to-orange-500';
      case 'weekly': return 'from-emerald-500 to-cyan-500';
      case 'season': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getResetInfo = () => {
    switch (activeTab) {
      case 'daily':
        return { text: 'Resets daily at 00:00 UTC', reward: '🏆 Top 3 win exclusive Daily Borders + Coins!' };
      case 'weekly':
        return { text: 'Resets every Monday at 00:00 UTC', reward: '👑 Top 3 win exclusive Weekly Borders + Coins!' };
      case 'season':
        return { text: 'Resets on 1st of each month at 00:00 UTC', reward: '🌌 Top 3 win exclusive Season Borders + Coins!' };
      default:
        return { text: 'All-time best scores', reward: 'Eternal glory for the best players!' };
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-4 justify-center">
        <div className="p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-2xl glow-pink">
          <Trophy className="h-10 w-10 text-black" />
        </div>
        <div className="text-center">
          <h2 className="text-4xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
            Global Leaderboard
          </h2>
          <p className="text-base text-white/60 mt-1">Compete for the top spots 🌍</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 justify-center">
        {(['all', 'daily', 'weekly', 'season'] as const).map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-6 text-lg gap-2 transition-all ${
              activeTab === tab
                ? `bg-gradient-to-r ${getTabColor(tab)} shadow-2xl scale-105 glow-purple`
                : 'bg-white/5 hover:bg-white/10 border border-white/20'
            }`}
          >
            {getTabIcon(tab)}
            {tab === 'all' ? 'All-Time' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {/* Reset Info */}
      <div className="glass-card border-white/20 rounded-xl p-5 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <p className="text-base text-white/80">{getResetInfo().text}</p>
          <p className="text-lg bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent font-semibold">
            {getResetInfo().reward}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-lg text-white/60">Loading leaderboard...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <Card className="glass-card border-white/20">
          <CardContent className="py-16 text-center text-white/60">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-white/20" />
            <p className="text-xl">No scores yet. Be the first to play!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-w-4xl mx-auto">
          {leaderboard.map((entry, index) => (
            <Card 
              key={index} 
              className={`${getRankBg(index)} border glass-card-hover relative overflow-hidden cursor-pointer`}
              onClick={() => setSelectedUserId(entry.userId)}
            >
              {/* Shimmer Effect for Top 3 */}
              {index < 3 && <div className="absolute inset-0 animate-shimmer pointer-events-none" />}
              
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className="flex items-center justify-center w-16 h-16">
                    {getRankIcon(index) || (
                      <div className="text-2xl text-white/60 font-bold">#{index + 1}</div>
                    )}
                  </div>

                  {/* Profile Picture with Border */}
                  <div className="relative w-16 h-16 z-20">
                    <ProfileBorder borderId={entry.selectedBorder} size={64}>
                      <div
                        className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundImage: entry.profilePicture ? `url(${entry.profilePicture})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {!entry.profilePicture && (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <User className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                    </ProfileBorder>
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="text-xl font-semibold flex items-center gap-2">
                      {entry.username}
                      {index === 0 && <Crown className="h-5 w-5 text-yellow-400 fill-yellow-400 animate-pulse" />}
                    </div>
                    <div className="text-sm text-white/60">
                      Rank #{index + 1} {index < 3 && '🏆'}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent' :
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text text-transparent' :
                      index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent' :
                      'text-white'
                    }`}>
                      {entry.highScore.toLocaleString()}
                    </div>
                    <div className="text-sm text-white/60">points</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedUserId && (
        <PublicProfile 
          userId={selectedUserId} 
          onClose={() => setSelectedUserId(null)} 
        />
      )}
    </div>
  );
}