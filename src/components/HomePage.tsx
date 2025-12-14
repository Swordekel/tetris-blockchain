import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Gamepad2, ShoppingBag, Trophy, User, Sparkles, Zap, Crown, Gem, Star } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
  username?: string;
}

export function HomePage({ onNavigate, username }: HomePageProps) {
  return (
    <div className="space-y-12 animate-slide-up">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-20 relative">
        {/* Glow Effect Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-cyan-600/20 rounded-3xl blur-3xl animate-pulse" />
        
        <div className="relative">
          {/* Decorative Elements */}
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
            <Crown className="h-12 w-12 text-yellow-400 animate-bounce-subtle" />
          </div>

          <div className="flex items-center justify-center gap-4 mb-8">
            <Sparkles className="h-10 w-10 text-yellow-400 animate-pulse" />
            <h1 className="text-8xl bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient text-shadow-glow">
              Tetris Arena
            </h1>
            <Sparkles className="h-10 w-10 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            <p className="text-3xl text-white/90 leading-relaxed">
              The Ultimate <span className="text-purple-400">Tetris</span> Experience
            </p>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Collect <span className="text-yellow-400 font-semibold">exclusive skins</span>, compete on the{' '}
              <span className="text-cyan-400 font-semibold">global leaderboard</span>, and master the classic game!
            </p>
          </div>

          {username && (
            <div className="mt-8 inline-block">
              <div className="glass-card px-8 py-4 rounded-full border-2 border-white/20 glow-purple">
                <p className="text-xl">
                  <span className="text-white/70">Welcome back,</span>{' '}
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
                    {username}
                  </span>{' '}
                  <span className="text-2xl">👋</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <Card 
          className="group glass-card-hover border-purple-500/50 relative overflow-hidden cursor-pointer" 
          onClick={() => onNavigate('game')}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />
          
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl group-hover:scale-110 transition-transform shadow-2xl glow-purple">
                <Gamepad2 className="h-10 w-10" />
              </div>
              <div>
                <CardTitle className="text-3xl mb-2">Play Game</CardTitle>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span className="text-base text-yellow-400 font-semibold">Earn 1 coin per 100 points</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <CardDescription className="text-lg text-white/80">
              Jump into the action! Use <span className="text-purple-400">arrow keys</span> to control pieces and compete for the highest score on the leaderboard.
            </CardDescription>
          </CardContent>
        </Card>

        <Card 
          className="group glass-card-hover border-yellow-500/50 relative overflow-hidden cursor-pointer" 
          onClick={() => onNavigate('shop')}
        >
          <div className="absolute inset-0 animate-shimmer pointer-events-none" style={{ animationDelay: '1s' }} />
          
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-5 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl group-hover:scale-110 transition-transform shadow-2xl glow-pink">
                <ShoppingBag className="h-10 w-10 text-black" />
              </div>
              <div>
                <CardTitle className="text-3xl mb-2">Shop</CardTitle>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <span className="text-base text-yellow-400 font-semibold">7 Skins + Gacha System</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <CardDescription className="text-lg text-white/80">
              Unlock <span className="text-yellow-400">amazing skins</span> and profile borders! Try your luck with the <span className="text-pink-400">gacha system</span> for rare exclusive items!
            </CardDescription>
          </CardContent>
        </Card>

        <Card 
          className="group glass-card-hover border-cyan-500/50 relative overflow-hidden cursor-pointer" 
          onClick={() => onNavigate('leaderboard')}
        >
          <div className="absolute inset-0 animate-shimmer pointer-events-none" style={{ animationDelay: '2s' }} />
          
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl group-hover:scale-110 transition-transform shadow-2xl glow-cyan">
                <Trophy className="h-10 w-10 text-black" />
              </div>
              <div>
                <CardTitle className="text-3xl mb-2">Leaderboard</CardTitle>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <span className="text-base text-yellow-400 font-semibold">Top 100 Players</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <CardDescription className="text-lg text-white/80">
              Compete with <span className="text-cyan-400">players worldwide</span> and climb to the top! Showcase your skills and earn bragging rights.
            </CardDescription>
          </CardContent>
        </Card>

        <Card 
          className="group glass-card-hover border-pink-500/50 relative overflow-hidden cursor-pointer" 
          onClick={() => onNavigate('profile')}
        >
          <div className="absolute inset-0 animate-shimmer pointer-events-none" style={{ animationDelay: '3s' }} />
          
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-5 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl group-hover:scale-110 transition-transform shadow-2xl glow-pink">
                <User className="h-10 w-10" />
              </div>
              <div>
                <CardTitle className="text-3xl mb-2">Profile</CardTitle>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-pink-400" />
                  <span className="text-base text-pink-400 font-semibold">Customize & Stats</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <CardDescription className="text-lg text-white/80">
              View your <span className="text-pink-400">stats</span>, showcase your <span className="text-purple-400">collection</span>, and customize your profile appearance.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="text-center space-y-8 py-12">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-full blur-2xl opacity-60 animate-pulse" />
          <Button 
            size="lg" 
            onClick={() => onNavigate('game')} 
            className="relative px-20 py-8 text-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 shadow-2xl border-2 border-white/20 glow-purple"
          >
            <Gamepad2 className="h-6 w-6 mr-3" />
            Start Playing Now
            <Sparkles className="h-6 w-6 ml-3" />
          </Button>
        </div>
        
        <div className="flex items-center justify-center gap-8 text-white/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live Leaderboard</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span>Real-time Scoring</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-purple-400 fill-purple-400" />
            <span>Exclusive Skins</span>
          </div>
        </div>
      </div>
    </div>
  );
}