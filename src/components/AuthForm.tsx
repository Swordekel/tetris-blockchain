import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2, Mail, Lock, User as UserIcon, Sparkles } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AuthFormProps {
  onSuccess: (accessToken: string) => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const supabase = getSupabaseClient();

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        if (data.session?.access_token) {
          onSuccess(data.session.access_token);
        }
      } else {
        // Signup
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password, username }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Signup failed');
          setLoading(false);
          return;
        }

        // Auto login after signup
        const supabase = getSupabaseClient();

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          setError(loginError.message);
          setLoading(false);
          return;
        }

        if (loginData.session?.access_token) {
          onSuccess(loginData.session.access_token);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-3xl blur-3xl animate-pulse" />
      
      <Card className="relative w-full max-w-md mx-auto glass-card border-2 border-white/20 shadow-2xl glow-purple overflow-hidden">
        {/* Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500" />
        
        <CardHeader className="text-center space-y-3 pt-8">
          <div className="flex justify-center mb-2">
            <Sparkles className="h-10 w-10 text-yellow-400 animate-pulse" />
          </div>
          <CardTitle className="text-4xl bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
            {isLogin ? 'Welcome Back!' : 'Join Tetris Arena'}
          </CardTitle>
          <CardDescription className="text-lg text-white/70">
            {isLogin ? 'Login to continue your journey' : 'Create an account and start collecting skins'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/90">Username</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                    placeholder="Choose your username"
                    className="pl-11 bg-white/5 border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="pl-11 bg-white/5 border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  minLength={6}
                  className="pl-11 bg-white/5 border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/30 backdrop-blur-sm animate-slide-up">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full py-6 text-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 hover:from-purple-600 hover:via-pink-600 hover:to-cyan-600 shadow-2xl border-2 border-white/20 glow-purple transition-all" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <Lock className="mr-2 h-5 w-5" />
                      Login to Account
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Create Account
                    </>
                  )}
                </>
              )}
            </Button>

            <div className="text-center text-base pt-2">
              <span className="text-white/60">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-purple-400 hover:text-purple-300 hover:underline transition-colors font-semibold"
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}