import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Palette, Frame, Ban, UserX, AlertTriangle, 
  Plus, Trash2, Clock, CheckCircle 
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  username: string;
  email: string;
  currency: number;
  ruby: number;
  highScore: number;
  unlockedSkins?: string[];
  unlockedBorders?: string[];
  isBanned?: boolean;
  bannedUntil?: number;
  banReason?: string;
}

interface UserActionsModalProps {
  user: User;
  accessToken: string;
  onClose: () => void;
  onUpdate: () => void;
}

// List of available skins and borders (you can fetch from backend or config)
const AVAILABLE_SKINS = [
  'default', 'neon', 'retro', 'galaxy', 'ocean', 'sunset', 
  'matrix', 'candy', 'fire', 'ice', 'gold', 'rainbow'
];

const AVAILABLE_BORDERS = [
  'default', 'gold', 'silver', 'bronze', 'diamond', 'platinum',
  'fire', 'ice', 'neon', 'rainbow', 'cosmic', 'steampunk',
  'nick-wilde', 'judy-hopps', 'zootopia-steampunk',
  'daily-champion', 'weekly-champion', 'season-champion'
];

export function UserActionsModal({ user, accessToken, onClose, onUpdate }: UserActionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'skins' | 'borders' | 'ban' | 'delete'>('skins');

  // Skin/Border management
  const [selectedSkin, setSelectedSkin] = useState('');
  const [selectedBorder, setSelectedBorder] = useState('');

  // Ban management
  const [banDuration, setBanDuration] = useState('');
  const [banReason, setBanReason] = useState('');

  // Delete management
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleAdjustSkin = async (action: 'add' | 'remove') => {
    if (!selectedSkin) {
      toast.error('Please select a skin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/users/${user.id}/skins`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            skinId: selectedSkin,
            action,
            reason: `Admin ${action} skin: ${selectedSkin}`,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setSelectedSkin('');
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to adjust skin');
      }
    } catch (error) {
      console.error('Adjust skin error:', error);
      toast.error('Failed to adjust skin');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBorder = async (action: 'add' | 'remove') => {
    if (!selectedBorder) {
      toast.error('Please select a border');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/users/${user.id}/borders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            borderId: selectedBorder,
            action,
            reason: `Admin ${action} border: ${selectedBorder}`,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setSelectedBorder('');
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to adjust border');
      }
    } catch (error) {
      console.error('Adjust border error:', error);
      toast.error('Failed to adjust border');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      toast.error('Please provide a ban reason');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/users/${user.id}/ban`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action: 'ban',
            reason: banReason,
            duration: banDuration ? parseInt(banDuration) : null,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setBanReason('');
        setBanDuration('');
        onUpdate();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Ban user error:', error);
      toast.error('Failed to ban user');
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/users/${user.id}/ban`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action: 'unban',
            reason: 'Admin unbanned',
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        onUpdate();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to unban user');
      }
    } catch (error) {
      console.error('Unban user error:', error);
      toast.error('Failed to unban user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    if (!deleteReason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/admin/users/${user.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            confirm: 'DELETE',
            reason: deleteReason,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        onUpdate();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold mb-1">User Management</h3>
          <p className="text-sm text-gray-400">
            {user.username} ({user.email})
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveSection('skins')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'skins'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Palette className="h-4 w-4 inline mr-2" />
            Skins
          </button>
          <button
            onClick={() => setActiveSection('borders')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'borders'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Frame className="h-4 w-4 inline mr-2" />
            Borders
          </button>
          <button
            onClick={() => setActiveSection('ban')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'ban'
                ? 'border-b-2 border-orange-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Ban className="h-4 w-4 inline mr-2" />
            Ban
          </button>
          <button
            onClick={() => setActiveSection('delete')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'delete'
                ? 'border-b-2 border-red-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserX className="h-4 w-4 inline mr-2" />
            Delete
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Skins Section */}
          {activeSection === 'skins' && (
            <>
              <div className="space-y-3">
                <Label>Current Unlocked Skins</Label>
                <div className="flex flex-wrap gap-2">
                  {(user.unlockedSkins || ['default']).map((skin) => (
                    <span
                      key={skin}
                      className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-sm"
                    >
                      {skin}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Skin</Label>
                <select
                  value={selectedSkin}
                  onChange={(e) => setSelectedSkin(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
                  disabled={loading}
                >
                  <option value="">-- Select Skin --</option>
                  {AVAILABLE_SKINS.map((skin) => (
                    <option key={skin} value={skin}>
                      {skin}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleAdjustSkin('add')}
                  disabled={!selectedSkin || loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skin
                </Button>
                <Button
                  onClick={() => handleAdjustSkin('remove')}
                  disabled={!selectedSkin || loading}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Skin
                </Button>
              </div>
            </>
          )}

          {/* Borders Section */}
          {activeSection === 'borders' && (
            <>
              <div className="space-y-3">
                <Label>Current Unlocked Borders</Label>
                <div className="flex flex-wrap gap-2">
                  {(user.unlockedBorders || ['default']).map((border) => (
                    <span
                      key={border}
                      className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-sm"
                    >
                      {border}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Border</Label>
                <select
                  value={selectedBorder}
                  onChange={(e) => setSelectedBorder(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
                  disabled={loading}
                >
                  <option value="">-- Select Border --</option>
                  {AVAILABLE_BORDERS.map((border) => (
                    <option key={border} value={border}>
                      {border}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleAdjustBorder('add')}
                  disabled={!selectedBorder || loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Border
                </Button>
                <Button
                  onClick={() => handleAdjustBorder('remove')}
                  disabled={!selectedBorder || loading}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Border
                </Button>
              </div>
            </>
          )}

          {/* Ban Section */}
          {activeSection === 'ban' && (
            <>
              {user.isBanned ? (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">User is currently banned</span>
                  </div>
                  {user.banReason && (
                    <p className="text-sm text-gray-300">
                      <strong>Reason:</strong> {user.banReason}
                    </p>
                  )}
                  {user.bannedUntil && (
                    <p className="text-sm text-gray-300">
                      <strong>Until:</strong> {new Date(user.bannedUntil).toLocaleString()}
                    </p>
                  )}
                  <Button
                    onClick={handleUnbanUser}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Unban User
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Ban Reason *</Label>
                    <Input
                      placeholder="Reason for banning..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number"
                      placeholder="Leave empty for permanent ban"
                      value={banDuration}
                      onChange={(e) => setBanDuration(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">
                      Leave empty for permanent ban, or enter hours (e.g., 24, 168)
                    </p>
                  </div>

                  <Button
                    onClick={handleBanUser}
                    disabled={!banReason.trim() || loading}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    {banDuration ? `Ban for ${banDuration} hours` : 'Ban Permanently'}
                  </Button>
                </>
              )}
            </>
          )}

          {/* Delete Section */}
          {activeSection === 'delete' && (
            <>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Danger Zone</span>
                </div>
                <p className="text-sm text-gray-300">
                  This action cannot be undone. This will permanently delete the user account,
                  remove all associated data, and log them out immediately.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Reason for Deletion *</Label>
                <Input
                  placeholder="Why are you deleting this account?"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Type DELETE to confirm *</Label>
                <Input
                  placeholder="DELETE"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  disabled={loading}
                  className="font-mono uppercase"
                />
              </div>

              <Button
                onClick={handleDeleteUser}
                disabled={deleteConfirm !== 'DELETE' || !deleteReason.trim() || loading}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <UserX className="h-4 w-4 mr-2" />
                Delete Account Permanently
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end gap-2">
          <Button onClick={onClose} variant="outline" disabled={loading}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
