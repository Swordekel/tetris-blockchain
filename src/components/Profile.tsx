import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Coins, Trophy, Edit2, Save, X, Upload, User, Gift, Sparkles } from 'lucide-react';
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

interface ProfileProps {
  accessToken: string;
  onUpdate: () => void;
}

// Helper function to compress and resize image
const compressImage = async (file: File, maxSizeMB: number = 1): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions (max 1200px width or height for better compression)
        const maxDimension = 1200;
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Start with quality 0.7 and reduce if needed
        let quality = 0.7;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const sizeMB = blob.size / (1024 * 1024);
              
              console.log(`Compressed to ${sizeMB.toFixed(2)}MB with quality ${quality}`);
              
              // If size is good or quality is too low, resolve
              if (sizeMB <= maxSizeMB || quality <= 0.2) {
                resolve(blob);
              } else {
                // Try again with lower quality
                quality -= 0.1;
                tryCompress();
              }
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

// Tetris block colors for each skin
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
  // Regular borders don't have images
  default: null,
  bronze: null,
  silver: null,
  gold: null,
  diamond: null,
  fire: null,
  // Leaderboard borders
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

// Friendly border names
const borderNames: Record<string, string> = {
  default: 'Default',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
  fire: 'Fire',
  zootopia_nick: 'Nick Wilde',
  zootopia_judy: 'Judy Hopps',
  zootopia_steampunk: 'Steampunk',
  daily_champion: 'Daily Champion',
  daily_master: 'Daily Master',
  daily_elite: 'Daily Elite',
  weekly_champion: 'Weekly Champion',
  weekly_master: 'Weekly Master',
  weekly_elite: 'Weekly Elite',
  season_champion: 'Season Champion',
  season_master: 'Season Master',
  season_elite: 'Season Elite',
};

// Friendly skin names
const skinNames: Record<string, string> = {
  default: 'Default',
  neon: 'Neon',
  candy: 'Candy',
  galaxy: 'Galaxy',
  rainbow: 'Rainbow',
  gold: 'Gold',
  zootopia: 'Zootopia',
  crystal: 'Crystal',
  fire: 'Fire',
  ocean: 'Ocean',
  sunset: 'Sunset',
  aurora: 'Aurora',
  cosmic: 'Cosmic',
};

// Helper function to render border preview
const BorderPreview: React.FC<{ borderId: string; size?: number }> = ({ borderId, size = 48 }) => {
  const borderImage = borderImages[borderId];
  
  if (borderImage) {
    // Zootopia borders with images
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <img
          src={borderImage}
          alt={borderNames[borderId] || borderId}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }
  
  // Regular borders - show colored circle
  const borderColors: Record<string, string> = {
    default: 'bg-gray-500',
    bronze: 'bg-orange-700',
    silver: 'bg-gray-300',
    gold: 'bg-yellow-500',
    diamond: 'bg-cyan-400',
    fire: 'bg-red-500',
    daily_champion: 'bg-yellow-400',
    daily_master: 'bg-orange-400',
    daily_elite: 'bg-purple-400',
    weekly_champion: 'bg-emerald-400',
    weekly_master: 'bg-blue-400',
    weekly_elite: 'bg-cyan-400',
    season_champion: 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600',
    season_master: 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600',
    season_elite: 'bg-gradient-to-r from-pink-600 via-rose-600 to-red-600',
  };
  
  return (
    <div 
      className={`rounded-full ${borderColors[borderId] || 'bg-gray-500'}`} 
      style={{ width: size, height: size }}
    />
  );
};

export function Profile({ accessToken, onUpdate }: ProfileProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editSkin, setEditSkin] = useState('');
  const [editBorder, setEditBorder] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // Redeem code states
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [accessToken]);

  const loadProfile = async () => {
    try {
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/profile`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Load profile error response:', errorData);
        throw new Error(errorData.error || 'Failed to load profile');
      }

      const data = await response.json();
      console.log('Profile data loaded:', data);
      
      if (!data.user) {
        throw new Error('No user data in response');
      }
      
      setUserData(data.user);
      setEditUsername(data.user.username);
      setEditSkin(data.user.selectedSkin);
      setEditBorder(data.user.selectedBorder);
      setProfilePictureUrl(data.user.profilePicture || null);
      setCoverImageUrl(data.user.coverImage || null);
    } catch (error) {
      console.error('Load profile error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const { projectId } = await import('../utils/supabase/info');
      
      // Upload profile picture first if there's a new one
      let uploadedPhotoUrl = profilePictureUrl;
      
      if (profilePicture) {
        const compressedBlob = await compressImage(profilePicture);
        const formData = new FormData();
        formData.append('file', new File([compressedBlob], profilePicture.name, { type: 'image/jpeg' }));
        
        const uploadResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/profile/upload-photo`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );
        
        const uploadData = await uploadResponse.json();
        
        if (!uploadResponse.ok) {
          toast.error(uploadData.error || 'Failed to upload photo');
          return;
        }
        
        uploadedPhotoUrl = uploadData.photoUrl;
      }
      
      // Upload cover image first if there's a new one
      let uploadedCoverUrl = coverImageUrl;
      
      if (coverImage) {
        const compressedBlob = await compressImage(coverImage);
        const formData = new FormData();
        formData.append('file', new File([compressedBlob], coverImage.name, { type: 'image/jpeg' }));
        
        const uploadResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/profile/upload-photo`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );
        
        const uploadData = await uploadResponse.json();
        
        if (!uploadResponse.ok) {
          toast.error(uploadData.error || 'Failed to upload photo');
          return;
        }
        
        uploadedCoverUrl = uploadData.photoUrl;
      }
      
      console.log('💾 Saving profile with border:', editBorder);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/profile/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            username: editUsername,
            selectedSkin: editSkin,
            selectedBorder: editBorder,
            profilePicture: uploadedPhotoUrl,
            coverImage: uploadedCoverUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to update profile');
        return;
      }

      // Sync leaderboard borders if border was changed
      if (editBorder !== userData?.selectedBorder) {
        console.log('🔄 Border changed, syncing leaderboards...');
        const syncResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/sync-leaderboard-borders`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        const syncData = await syncResponse.json();
        if (syncResponse.ok) {
          console.log('✅ Leaderboard sync complete:', syncData.message);
        } else {
          console.warn('⚠️ Leaderboard sync failed:', syncData.error);
        }
      }

      setUserData(data.user);
      setProfilePicture(null);
      setCoverImage(null);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditUsername(userData?.username || '');
    setEditSkin(userData?.selectedSkin || '');
    setEditBorder(userData?.selectedBorder || '');
    setIsEditing(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      setProfilePictureUrl(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverImageUrl(URL.createObjectURL(file));
    }
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) {
      toast.error('Please enter a redeem code');
      return;
    }

    setIsRedeeming(true);

    try {
      const { projectId } = await import('../utils/supabase/info');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/redeem/use`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ code: redeemCode.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to redeem code');
        return;
      }

      // Build success message with rewards
      let successMessage = '🎉 Code redeemed successfully!';
      const rewards = [];
      
      if (data.rewards.coins > 0) {
        rewards.push(`${data.rewards.coins} Coins`);
      }
      if (data.rewards.ruby > 0) {
        rewards.push(`${data.rewards.ruby} Ruby`);
      }
      if (data.rewards.items && data.rewards.items.length > 0) {
        data.rewards.items.forEach((item: any) => {
          rewards.push(`${item.name} (${item.type})`);
        });
      }

      if (rewards.length > 0) {
        successMessage += '\n\nRewards: ' + rewards.join(', ');
      }

      toast.success(successMessage, { duration: 5000 });
      
      // Clear input and reload profile
      setRedeemCode('');
      await loadProfile();
      onUpdate();
    } catch (error) {
      console.error('Redeem code error:', error);
      toast.error('Failed to redeem code');
    } finally {
      setIsRedeeming(false);
    }
  };

  if (loading && !userData) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="mt-4 text-white/60">Loading profile...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-white/60">
          Failed to load profile
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl">Profile</h2>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={saveProfile} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={cancelEdit} variant="outline" disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Profile Card with Cover */}
      <div className="relative">
        {/* Cover Image */}
        <div
          className="w-full h-48 rounded-t-lg bg-gradient-to-r from-purple-500 to-pink-500"
          style={{
            backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Profile Content */}
        <Card className="rounded-t-none">
          <CardContent className="pt-0">
            {/* Avatar overlapping cover */}
            <div className="flex items-center gap-6 -mt-16 mb-6">
              <ProfileBorder borderId={userData.selectedBorder} size={128}>
                <div
                  className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black"
                  style={{
                    backgroundImage: profilePictureUrl ? `url(${profilePictureUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: profilePictureUrl ? '#000' : skinBackgrounds[userData.selectedSkin],
                  }}
                >
                  {!profilePictureUrl && (
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
              <div className="flex-1 mt-16">
                <h3 className="text-2xl mb-2">{userData.username}</h3>
                <Badge variant="secondary">{userData.email}</Badge>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                  <Coins className="h-5 w-5" />
                  <span className="text-sm">Currency</span>
                </div>
                <div className="text-2xl">{userData.currency}</div>
              </div>

              <div className="bg-purple-500/10 p-4 rounded-lg border border-purple-500/30">
                <div className="flex items-center gap-2 text-purple-500 mb-2">
                  <Trophy className="h-5 w-5" />
                  <span className="text-sm">High Score</span>
                </div>
                <div className="text-2xl">{userData.highScore.toLocaleString()}</div>
              </div>

              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <div className="text-sm text-white/60 mb-2">Owned Skins</div>
                <div className="text-2xl">{userData.ownedSkins.length}</div>
              </div>

              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <div className="text-sm text-white/60 mb-2">Owned Borders</div>
                <div className="text-2xl">{userData.ownedBorders.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-2">
              <Label>Selected Skin</Label>
              <div className="grid grid-cols-3 gap-2">
                {userData.ownedSkins.map((skinId) => {
                  const colors = skinBlockColors[skinId] || skinBlockColors.default;
                  const bgColor = skinBackgrounds[skinId] || skinBackgrounds.default;
                  
                  return (
                    <button
                      key={skinId}
                      onClick={() => setEditSkin(skinId)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        editSkin === skinId
                          ? 'border-white scale-105'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      <div
                        className="w-full h-12 rounded flex items-center justify-center"
                        style={{ backgroundColor: bgColor }}
                      >
                        <div className="grid grid-cols-2 gap-0.5">
                          {colors.slice(0, 4).map((color, i) => (
                            <div
                              key={i}
                              className="w-4 h-4"
                              style={{
                                backgroundColor: color,
                                border: '1px solid rgba(0,0,0,0.3)',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-xs mt-2 capitalize">{skinNames[skinId]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Selected Border</Label>
              <div className="grid grid-cols-3 gap-2">
                {userData.ownedBorders.map((borderId) => (
                  <button
                    key={borderId}
                    onClick={() => setEditBorder(borderId)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      editBorder === borderId
                        ? 'border-white scale-105'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-center h-12">
                      <BorderPreview borderId={borderId} />
                    </div>
                    <div className="text-xs mt-2 capitalize">{borderNames[borderId]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/20"
                  style={{
                    backgroundImage: profilePictureUrl
                      ? `url(${profilePictureUrl})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: profilePictureUrl ? '#000' : '#374151',
                  }}
                >
                  {!profilePictureUrl && (
                    <User className="h-10 w-10 text-gray-500" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {profilePictureUrl && (
                    <Button
                      onClick={() => {
                        setProfilePicture(null);
                        setProfilePictureUrl(null);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/20"
                  style={{
                    backgroundImage: coverImageUrl
                      ? `url(${coverImageUrl})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: coverImageUrl ? '#000' : '#374151',
                  }}
                >
                  {!coverImageUrl && (
                    <User className="h-10 w-10 text-gray-500" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={coverInputRef}
                    onChange={handleCoverChange}
                  />
                  <Button
                    onClick={() => coverInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {coverImageUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {coverImageUrl && (
                    <Button
                      onClick={() => {
                        setCoverImage(null);
                        setCoverImageUrl(null);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redeem Code Card - Moved to bottom */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-400" />
            <span>Redeem Code</span>
            <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="Enter your redeem code..."
                  className="bg-white/5 border-white/20 uppercase placeholder:normal-case"
                  disabled={isRedeeming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isRedeeming) {
                      handleRedeemCode();
                    }
                  }}
                />
              </div>
              <Button 
                onClick={handleRedeemCode}
                disabled={isRedeeming || !redeemCode.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isRedeeming ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Redeeming...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Redeem
                  </>
                )}
              </Button>
            </div>
            
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-sm text-white/60 mb-2">💡 How to use:</p>
              <ul className="text-sm text-white/70 space-y-1 list-disc list-inside">
                <li>Enter your redeem code in the field above</li>
                <li>Click "Redeem" or press Enter to claim your rewards</li>
                <li>Rewards may include coins, ruby, skins, or borders</li>
                <li>Each code can only be used once per account</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}