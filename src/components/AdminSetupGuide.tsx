import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Shield, 
  Users, 
  Gift, 
  BarChart3, 
  Key, 
  Mail, 
  Lock,
  CheckCircle,
  AlertCircle,
  Code,
  Terminal,
  BookOpen
} from 'lucide-react';

export function AdminSetupGuide() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Shield className="h-12 w-12 text-purple-500" />
          <h1 className="text-4xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Admin Setup Guide
          </h1>
        </div>
        <p className="text-white/60">Complete guide to setting up and managing admin accounts</p>
      </div>

      {/* Default Admin Account */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            Default Admin Account (Pre-configured)
          </CardTitle>
          <CardDescription>Ready-to-use admin credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-black/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="font-mono">admin12345@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Password</p>
                <p className="font-mono">admin12345</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-300">
                <p className="font-semibold mb-1">How to use:</p>
                <ol className="space-y-1 text-xs list-decimal list-inside">
                  <li>Click "Login" button</li>
                  <li>Enter email: admin12345@gmail.com</li>
                  <li>Enter password: admin12345</li>
                  <li>Click "Sign In"</li>
                  <li>Shield icon (🛡️) will appear in navbar</li>
                  <li>Click shield to open Admin Panel</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promote User Method */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-cyan-400" />
            Promote Existing User to Admin
          </CardTitle>
          <CardDescription>Turn any registered user into an admin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Method 1: Console */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-purple-400" />
              Method 1: Browser Console
            </h3>
            <div className="space-y-3">
              <div className="bg-black/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-400">Step 1: Open DevTools</p>
                <p className="text-xs text-white/60">Press F12 or Right-click → Inspect → Console tab</p>
              </div>
              
              <div className="bg-black/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-400">Step 2: Run this code</p>
                <div className="bg-black rounded p-3 overflow-x-auto">
                  <code className="text-xs text-green-400 font-mono whitespace-pre">{`const response = await fetch(
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-7fcff8d3/promote-admin',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@email.com',
      secretKey: 'TETRIS_ADMIN_SECRET_2024'
    })
  }
);
const data = await response.json();
console.log(data);`}</code>
                </div>
              </div>

              <div className="bg-black/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Step 3: Replace values</p>
                <ul className="text-xs text-white/60 space-y-1 mt-2">
                  <li>• <code className="bg-white/10 px-1 rounded">YOUR_PROJECT_ID</code> → Your Supabase project ID</li>
                  <li>• <code className="bg-white/10 px-1 rounded">user@email.com</code> → Email to promote</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Method 2: API */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-400" />
              Method 2: API Request (Postman/Thunder Client)
            </h3>
            <div className="space-y-3">
              <div className="bg-black/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Endpoint</p>
                <div className="bg-black rounded p-3">
                  <code className="text-xs text-blue-400 font-mono">
                    POST /make-server-7fcff8d3/promote-admin
                  </code>
                </div>
              </div>
              
              <div className="bg-black/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Request Body (JSON)</p>
                <div className="bg-black rounded p-3">
                  <code className="text-xs text-yellow-400 font-mono whitespace-pre">{`{
  "email": "user@email.com",
  "secretKey": "TETRIS_ADMIN_SECRET_2024"
}`}</code>
                </div>
              </div>

              <div className="bg-black/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Success Response</p>
                <div className="bg-black rounded p-3">
                  <code className="text-xs text-green-400 font-mono whitespace-pre">{`{
  "success": true,
  "message": "User promoted to admin successfully",
  "userId": "..."
}`}</code>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Panel Features */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-orange-400" />
            Admin Panel Features
          </CardTitle>
          <CardDescription>What you can do with admin access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Dashboard */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
              <BarChart3 className="h-8 w-8 text-blue-400 mb-3" />
              <h3 className="font-semibold mb-2">Dashboard</h3>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• Total Users</li>
                <li>• Total Coins & Ruby</li>
                <li>• Active Players</li>
                <li>• Real-time statistics</li>
              </ul>
            </div>

            {/* User Management */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
              <Users className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="font-semibold mb-2">User Management</h3>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• Search users</li>
                <li>• View user details</li>
                <li>• Adjust currency</li>
                <li>• Add/remove Coins & Ruby</li>
              </ul>
            </div>

            {/* Redeem Codes */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
              <Gift className="h-8 w-8 text-yellow-400 mb-3" />
              <h3 className="font-semibold mb-2">Redeem Codes</h3>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• Create codes</li>
                <li>• Set expiry dates</li>
                <li>• Limit usage</li>
                <li>• Delete codes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notes */}
      <Card className="border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-400" />
            Security & Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Key className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Change default password:</strong> After first login, go to Profile → Edit Profile → Change password
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Keep secret key private:</strong> Never share <code className="bg-white/10 px-1 rounded">TETRIS_ADMIN_SECRET_2024</code> publicly
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Limit admin accounts:</strong> Only promote trusted users to admin role
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Monitor activity:</strong> Check admin panel regularly for suspicious activities
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-green-400" />
            Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-purple-400">Default Credentials</h3>
              <div className="bg-black/30 rounded p-3 space-y-1 text-xs font-mono">
                <div>Email: admin12345@gmail.com</div>
                <div>Password: admin12345</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-purple-400">Secret Key</h3>
              <div className="bg-black/30 rounded p-3 text-xs font-mono">
                TETRIS_ADMIN_SECRET_2024
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-purple-400">API Endpoint</h3>
              <div className="bg-black/30 rounded p-3 text-xs font-mono break-all">
                /make-server-7fcff8d3/promote-admin
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-purple-400">Access Admin Panel</h3>
              <div className="bg-black/30 rounded p-3 text-xs">
                Click Shield icon (🛡️) in navbar
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
