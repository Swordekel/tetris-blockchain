import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Users, Gift, BarChart3, Settings, Search, Plus, Trash2,
  Edit, Eye, Coins, Gem, Calendar, TrendingUp, Activity,
  Shield, Package, Code, Clock, CheckCircle, XCircle, Music,
  Ban, UserX, Palette, Frame, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { MusicManager } from './MusicManager';
import { UserActionsModal } from './UserActionsModal';

interface AdminPanelProps {
  accessToken: string;
  onClose: () => void;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalCurrency: number;
  totalRuby: number;
  totalRedeemCodes: number;
  activeRedeemCodes: number;
  totalRedeems: number;
  recentRedeems: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  currency: number;
  ruby: number;
  highScore: number;
  lastActive: number;
  createdAt: number;
}

interface RedeemCode {
  code: string;
  rewards: {
    currency: number;
    ruby: number;
    items: string[];
  };
  maxUses: number | null;
  usedCount: number;
  expiresAt: number | null;
  description: string;
  active: boolean;
  createdAt: number;
}

export function AdminPanel({ accessToken, onClose }: AdminPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // New Redeem Code Form
  const [newCode, setNewCode] = useState({
    code: '',
    description: '',
    currency: 0,
    ruby: 0,
    items: '',
    maxUses: '',
    expiresAt: '',
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'redeem') {
      loadRedeemCodes();
    }
  }, [activeTab]);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/dashboard/stats`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to load stats');
      }
    } catch (error) {
      console.error('Load stats error:', error);
      toast.error('Failed to load dashboard stats');
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/users?search=${searchTerm}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Load users error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadRedeemCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/redeem-codes`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRedeemCodes(data.codes);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to load redeem codes');
      }
    } catch (error) {
      console.error('Load redeem codes error:', error);
      toast.error('Failed to load redeem codes');
    } finally {
      setLoading(false);
    }
  };

  const createRedeemCode = async () => {
    if (!newCode.code.trim()) {
      toast.error('Code is required');
      return;
    }

    const items = newCode.items
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const payload = {
      code: newCode.code.trim().toUpperCase(),
      description: newCode.description,
      rewards: {
        currency: parseInt(newCode.currency.toString()) || 0,
        ruby: parseInt(newCode.ruby.toString()) || 0,
        items,
      },
      maxUses: newCode.maxUses ? parseInt(newCode.maxUses) : null,
      expiresAt: newCode.expiresAt ? new Date(newCode.expiresAt).getTime() : null,
    };

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/redeem-codes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        toast.success('Redeem code created successfully!');
        setNewCode({
          code: '',
          description: '',
          currency: 0,
          ruby: 0,
          items: '',
          maxUses: '',
          expiresAt: '',
        });
        loadRedeemCodes();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create redeem code');
      }
    } catch (error) {
      console.error('Create redeem code error:', error);
      toast.error('Failed to create redeem code');
    } finally {
      setLoading(false);
    }
  };

  const deleteRedeemCode = async (code: string) => {
    if (!confirm(`Are you sure you want to delete code "${code}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/redeem-codes/${code}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Redeem code deleted');
        loadRedeemCodes();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete code');
      }
    } catch (error) {
      console.error('Delete code error:', error);
      toast.error('Failed to delete code');
    }
  };

  const adjustUserCurrency = async (userId: string, amount: number, reason: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/users/${userId}/currency`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ amount, reason }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to adjust currency');
      }
    } catch (error) {
      console.error('Adjust currency error:', error);
      toast.error('Failed to adjust currency');
    }
  };

  const adjustUserRuby = async (userId: string, amount: number, reason: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/users/${userId}/ruby`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ amount, reason }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to adjust ruby');
      }
    } catch (error) {
      console.error('Adjust ruby error:', error);
      toast.error('Failed to adjust ruby');
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCodeStatus = (code: RedeemCode) => {
    if (!code.active) return { label: 'Inactive', color: 'text-gray-400' };
    if (code.expiresAt && code.expiresAt < Date.now()) {
      return { label: 'Expired', color: 'text-red-400' };
    }
    if (code.maxUses && code.usedCount >= code.maxUses) {
      return { label: 'Used Up', color: 'text-orange-400' };
    }
    return { label: 'Active', color: 'text-green-400' };
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-2xl">Admin Control Panel</h2>
              <p className="text-sm text-gray-400">Manage your game system</p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose} className="border-white/10">
            Close
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start border-b border-white/10 rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger value="dashboard" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-purple-500">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-purple-500">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="redeem" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-purple-500">
              <Gift className="h-4 w-4 mr-2" />
              Redeem Codes
            </TabsTrigger>
            <TabsTrigger value="music" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-purple-500">
              <Music className="h-4 w-4 mr-2" />
              Music
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-6">
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-blue-500/30 bg-blue-500/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      Total Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl">{stats?.totalUsers || 0}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {stats?.activeUsers || 0} active (7d)
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-yellow-500/30 bg-yellow-500/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Coins className="h-4 w-4 text-yellow-400" />
                      Total Coins
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl">{stats?.totalCurrency || 0}</div>
                    <div className="text-xs text-gray-400 mt-1">In circulation</div>
                  </CardContent>
                </Card>

                <Card className="border-pink-500/30 bg-pink-500/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gem className="h-4 w-4 text-pink-400" />
                      Total Ruby
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl">{stats?.totalRuby || 0}</div>
                    <div className="text-xs text-gray-400 mt-1">Premium currency</div>
                  </CardContent>
                </Card>

                <Card className="border-purple-500/30 bg-purple-500/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gift className="h-4 w-4 text-purple-400" />
                      Redeem Codes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl">{stats?.activeRedeemCodes || 0}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {stats?.totalRedeems || 0} total redeems
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-white/10">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>System overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Active Users (7 days)</span>
                    <span className="text-2xl">{stats?.activeUsers || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Recent Redeems (24h)</span>
                    <span className="text-2xl">{stats?.recentRedeems || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Redeem Codes</span>
                    <span className="text-2xl">{stats?.totalRedeemCodes || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-0 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-black/20 border-white/10"
                  />
                </div>
                <Button onClick={loadUsers} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                  {loading ? 'Loading...' : 'Search'}
                </Button>
              </div>

              <Card className="border-white/10">
                <CardHeader>
                  <CardTitle>Users ({users.length})</CardTitle>
                  <CardDescription>Manage user accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No users found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div>{user.username}</div>
                              <div className="text-sm text-gray-400">{user.email}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-400">High Score</div>
                              <div className="text-xl">{user.highScore}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4 text-yellow-400" />
                              <span>{user.currency} Coins</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Gem className="h-4 w-4 text-pink-400" />
                              <span>{user.ruby} Ruby</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const amount = prompt('Enter coins to add (negative to remove):');
                                if (amount) {
                                  const reason = prompt('Reason:') || 'Admin adjustment';
                                  adjustUserCurrency(user.id, parseInt(amount), reason);
                                }
                              }}
                              className="border-yellow-500/30 text-yellow-400"
                            >
                              <Coins className="h-3 w-3 mr-1" />
                              Coins
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const amount = prompt('Enter Ruby to add (negative to remove):');
                                if (amount) {
                                  const reason = prompt('Reason:') || 'Admin adjustment';
                                  adjustUserRuby(user.id, parseInt(amount), reason);
                                }
                              }}
                              className="border-pink-500/30 text-pink-400"
                            >
                              <Gem className="h-3 w-3 mr-1" />
                              Ruby
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(user)}
                              className="border-purple-500/30 text-purple-400"
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Redeem Codes Tab */}
            <TabsContent value="redeem" className="mt-0 space-y-4">
              {/* Create New Code */}
              <Card className="border-purple-500/30 bg-purple-500/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create New Redeem Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Code *</label>
                      <Input
                        placeholder="WELCOME2024"
                        value={newCode.code}
                        onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                        className="bg-black/20 border-white/10 uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Description</label>
                      <Input
                        placeholder="Welcome bonus"
                        value={newCode.description}
                        onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400 flex items-center gap-1">
                        <Coins className="h-3 w-3" /> Coins
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newCode.currency}
                        onChange={(e) => setNewCode({ ...newCode, currency: parseInt(e.target.value) || 0 })}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400 flex items-center gap-1">
                        <Gem className="h-3 w-3" /> Ruby
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newCode.ruby}
                        onChange={(e) => setNewCode({ ...newCode, ruby: parseInt(e.target.value) || 0 })}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400 flex items-center gap-1">
                        <Package className="h-3 w-3" /> Max Uses
                      </label>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        value={newCode.maxUses}
                        onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Items (comma separated)</label>
                      <Input
                        placeholder="skin:neon, border:gold"
                        value={newCode.items}
                        onChange={(e) => setNewCode({ ...newCode, items: e.target.value })}
                        className="bg-black/20 border-white/10"
                      />
                      <p className="text-xs text-gray-500">Format: type:id (e.g., skin:neon, border:gold)</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Expires At
                      </label>
                      <Input
                        type="datetime-local"
                        value={newCode.expiresAt}
                        onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={createRedeemCode}
                    disabled={loading || !newCode.code.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : 'Create Redeem Code'}
                  </Button>
                </CardContent>
              </Card>

              {/* Codes List */}
              <Card className="border-white/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Redeem Codes ({redeemCodes.length})</CardTitle>
                    <CardDescription>Manage active and expired codes</CardDescription>
                  </div>
                  <Button onClick={loadRedeemCodes} disabled={loading} size="sm" variant="outline" className="border-white/10">
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {redeemCodes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No redeem codes yet</p>
                      <p className="text-sm">Create your first code above!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {redeemCodes.map((code) => {
                        const status = getCodeStatus(code);
                        return (
                          <div
                            key={code.code}
                            className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="font-mono bg-purple-500/20 text-purple-400 px-3 py-1 rounded text-lg">
                                  {code.code}
                                </span>
                                <span className={`text-sm ${status.color}`}>{status.label}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteRedeemCode(code.code)}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>

                            {code.description && (
                              <p className="text-sm text-gray-400">{code.description}</p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              {code.rewards.currency > 0 && (
                                <div className="flex items-center gap-2">
                                  <Coins className="h-4 w-4 text-yellow-400" />
                                  <span>{code.rewards.currency} Coins</span>
                                </div>
                              )}
                              {code.rewards.ruby > 0 && (
                                <div className="flex items-center gap-2">
                                  <Gem className="h-4 w-4 text-pink-400" />
                                  <span>{code.rewards.ruby} Ruby</span>
                                </div>
                              )}
                              {code.rewards.items && code.rewards.items.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-purple-400" />
                                  <span>{code.rewards.items.length} Item(s)</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Used: {code.usedCount}/{code.maxUses || '∞'}</span>
                              {code.expiresAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Expires: {formatDate(code.expiresAt)}
                                </span>
                              )}
                              <span>Created: {formatDate(code.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Music Tab */}
            <TabsContent value="music" className="mt-0 space-y-4">
              <MusicManager accessToken={accessToken} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* User Actions Modal */}
      {selectedUser && (
        <UserActionsModal
          user={selectedUser}
          accessToken={accessToken}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            loadUsers();
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}