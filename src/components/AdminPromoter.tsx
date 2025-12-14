import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Shield, UserPlus, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

interface AdminPromoterProps {
  onClose: () => void;
}

export function AdminPromoter({ onClose }: AdminPromoterProps) {
  const [email, setEmail] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);

  const promoteToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !secretKey) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/promote-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            secretKey,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote user');
      }

      toast.success(
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <div className="font-semibold">User Promoted Successfully! 🎉</div>
            <div className="text-sm text-gray-400">
              {email} is now an admin
            </div>
          </div>
        </div>,
        {
          duration: 5000,
        }
      );

      // Clear form
      setEmail('');
      setSecretKey('');

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        // Refresh page to show admin features
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Promote admin error:', error);
      toast.error(error.message || 'Failed to promote user to admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full border-purple-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-purple-500" />
              <CardTitle>Promote User to Admin</CardTitle>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Promote a user account to admin with full control panel access
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={promoteToAdmin} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-white/5 border-white/10"
              />
              <p className="text-xs text-gray-400">
                Email of the user account to promote
              </p>
            </div>

            {/* Secret Key Input */}
            <div className="space-y-2">
              <Label htmlFor="secretKey">Admin Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Enter secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                disabled={loading}
                className="bg-white/5 border-white/10"
              />
              <p className="text-xs text-gray-400">
                Default: <code className="bg-white/10 px-1 rounded">TETRIS_ADMIN_SECRET_2024</code>
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-1">Important:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• User account must already be registered</li>
                    <li>• Admin will have full control panel access</li>
                    <li>• Page will refresh after promotion</li>
                    <li>• Keep secret key secure and private</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Shield className="h-4 w-4 mr-2 animate-spin" />
                    Promoting...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Promote to Admin
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Quick Guide */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-400" />
              Default Admin Account
            </h4>
            <div className="bg-white/5 rounded p-3 space-y-1 text-xs">
              <p className="text-gray-400">Pre-configured admin credentials:</p>
              <p className="text-white">
                <span className="text-gray-400">Email:</span> admin12345@gmail.com
              </p>
              <p className="text-white">
                <span className="text-gray-400">Password:</span> admin12345
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
