import { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Gamepad2, Home, ShoppingBag, Trophy, User, LogOut, Menu, X, Coins, Gem, Shield } from 'lucide-react';
import { toast, Toaster } from 'sonner@2.0.3';
import { AnimatedBackground } from './components/AnimatedBackground';
import { AuthForm } from './components/AuthForm';
import { HomePage } from './components/HomePage';
import { TetrisGame } from './components/TetrisGame';
import { Game } from './components/Game';
import { Shop } from './components/Shop';
import { Leaderboard } from './components/Leaderboard';
import { Profile } from './components/Profile';
import { TopUpSimple } from './components/TopUpSimple';
import { AdminPanel } from './components/AdminPanel';
import { AudioControl } from './components/AudioControl';
import { FloatingShapes } from './components/FloatingShapes';
import { projectId } from './utils/supabase/info';
import { getSupabaseClient } from './utils/supabase/client';

// Initialize Supabase client once outside component
const supabase = getSupabaseClient();

interface UserData {
  id: string;
  username: string;
  email: string;
  currency: number;
  ruby: number;
  selectedSkin: string;
  selectedBorder: string;
  ownedSkins: string[];
  ownedBorders: string[];
  highScore: number;
}

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'home' | 'game' | 'shop' | 'topup' | 'leaderboard' | 'profile'>('home');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (accessToken) {
      loadUserData();
    }
  }, [accessToken]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setCheckingSession(false);
    }
  };

  const loadUserData = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/profile`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserData(data.user);
        
        // Check if the user is an admin
        checkAdminStatus(data.user.id);
      }
    } catch (error) {
      console.error('Load user data error:', error);
    }
  };

  const checkAdminStatus = async (userId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/check-admin`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
        if (data.isAdmin) {
          console.log('🛡️ Admin access granted');
        }
      }
    } catch (error) {
      console.error('Check admin error:', error);
    }
  };

  const handleLogin = (token: string) => {
    setAccessToken(token);
    toast.success('Welcome back!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAccessToken(null);
    setUserData(null);
    setCurrentPage('home');
    toast.info('Logged out successfully');
  };

  const handleGameOver = async (score: number) => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/score/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ score }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Game Over! Earned ${data.coinsEarned} coins${data.newHighScore ? ' 🏆 New High Score!' : ''}`,
          { duration: 5000 }
        );
        loadUserData();
      }
    } catch (error) {
      console.error('Submit score error:', error);
      toast.error('Failed to submit score');
    }
  };

  const renderNavigation = () => {
    const navItems = [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'game', label: 'Play', icon: Gamepad2 },
      { id: 'shop', label: 'Shop', icon: ShoppingBag },
      { id: 'topup', label: 'Top Up', icon: Gem },
      { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
      { id: 'profile', label: 'Profile', icon: User },
    ];

    return (
      <>
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={currentPage === id ? 'default' : 'ghost'}
              onClick={() => {
                setCurrentPage(id as any);
                setMobileMenuOpen(false);
              }}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
          <Button variant="outline" onClick={handleLogout} className="gap-2 ml-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/10 p-4 md:hidden z-50">
            <div className="flex flex-col gap-2">
              {navItems.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={currentPage === id ? 'default' : 'ghost'}
                  onClick={() => {
                    setCurrentPage(id as any);
                    setMobileMenuOpen(false);
                  }}
                  className="gap-2 justify-start"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
              <Button variant="outline" onClick={handleLogout} className="gap-2 justify-start">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderPage = () => {
    if (!accessToken) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-5xl mb-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
                Tetris Arena
              </h1>
              <p className="text-white/60">
                Login or create an account to start playing!
              </p>
            </div>
            <AuthForm onSuccess={handleLogin} />
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} username={userData?.username} />;
      case 'game':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl">Play Tetris</h2>
            <TetrisGame
              selectedSkin={userData?.selectedSkin || 'default'}
              onGameOver={handleGameOver}
            />
          </div>
        );
      case 'shop':
        return <Shop accessToken={accessToken} onUpdate={loadUserData} />;
      case 'topup':
        return <TopUpSimple accessToken={accessToken} userId={userData?.id || ''} onUpdate={loadUserData} />;
      case 'leaderboard':
        return <Leaderboard accessToken={accessToken} />;
      case 'profile':
        return <Profile accessToken={accessToken} onUpdate={loadUserData} />;
      default:
        return <HomePage onNavigate={setCurrentPage} username={userData?.username} />;
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 dark">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white dark relative overflow-hidden">
      <AnimatedBackground />
      <FloatingShapes />
      <AudioControl />
      <Toaster position="top-center" richColors />
      
      {accessToken && (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/50 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-6 w-6 text-purple-500" />
                <h1 className="text-xl">Tetris Arena</h1>
              </div>
              {userData && (
                <>
                  <span className="hidden sm:inline text-sm text-white/60">
                    • {userData.username}
                  </span>
                  {/* Currency Display */}
                  <div className="hidden lg:flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-yellow-500/20 px-3 py-1.5 rounded-lg border border-yellow-500/30">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-500">{userData.currency?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-pink-500/20 px-3 py-1.5 rounded-lg border border-pink-500/30">
                      <Gem className="h-4 w-4 text-pink-500" />
                      <span className="text-sm text-pink-500">{userData.ruby?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAdminPanel(true)}
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  title="Admin Panel"
                >
                  <Shield className="h-4 w-4" />
                </Button>
              )}
              {renderNavigation()}
            </div>
          </div>
        </header>
      )}

      <main className="container mx-auto px-4 py-8 relative z-10">
        {renderPage()}
      </main>

      <footer className="mt-auto py-4 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-white/20">
            Tetris Arena © {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* Admin Panel */}
      {isAdmin && showAdminPanel && (
        <AdminPanel accessToken={accessToken || ''} onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}