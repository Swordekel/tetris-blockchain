import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Music, Upload, Trash2, Play, Pause, Download, FileAudio,
  Volume2, Clock, Calendar, Tag, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

interface MusicItem {
  id: string;
  name: string;
  displayName: string;
  size: number;
  mimeType: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    displayName?: string;
    category?: string;
    originalName?: string;
    uploadedAt?: number;
  };
}

interface MusicManagerProps {
  accessToken: string;
}

export function MusicManager({ accessToken }: MusicManagerProps) {
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDisplayName, setUploadDisplayName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('background');

  useEffect(() => {
    loadMusicList();
  }, []);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadMusicList = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/music/admin/music`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMusicList(data.music || []);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to load music list');
      }
    } catch (error) {
      console.error('Load music error:', error);
      toast.error('Failed to load music list');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Only MP3, WAV, OGG, and WEBM are allowed.');
        return;
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File too large. Maximum size is 50MB.');
        return;
      }

      setUploadFile(file);
      // Auto-fill display name from filename
      if (!uploadDisplayName) {
        const name = file.name.replace(/\.(mp3|wav|ogg|webm)$/i, '').replace(/_/g, ' ');
        setUploadDisplayName(name);
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    try {
      console.log('📤 Starting upload...', {
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        fileType: uploadFile.type,
        displayName: uploadDisplayName,
        category: uploadCategory
      });

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('displayName', uploadDisplayName || uploadFile.name);
      formData.append('category', uploadCategory);

      console.log('🌐 Sending request to server...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/music/admin/music/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      console.log('📥 Response received:', response.status, response.statusText);

      const data = await response.json();
      console.log('📊 Response data:', data);

      if (response.ok) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <div className="font-semibold">Music Uploaded! 🎵</div>
              <div className="text-sm text-gray-400">{data.music.displayName}</div>
            </div>
          </div>
        );
        
        // Reset form
        setUploadFile(null);
        setUploadDisplayName('');
        setUploadCategory('background');

        // Reload list
        loadMusicList();
      } else {
        console.error('❌ Upload failed:', data);
        toast.error(
          <div>
            <div className="font-semibold">Upload Failed</div>
            <div className="text-sm">{data.error || 'Unknown error'}</div>
          </div>
        );
      }
    } catch (error) {
      console.error('Upload music error:', error);
      toast.error(
        <div>
          <div className="font-semibold">Upload Error</div>
          <div className="text-sm">{error instanceof Error ? error.message : 'Network error occurred'}</div>
        </div>
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileName: string, displayName: string) => {
    if (!confirm(`Delete "${displayName}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/music/admin/music/${encodeURIComponent(fileName)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        toast.success(`Deleted: ${displayName}`);
        
        // Stop playing if this music is currently playing
        if (playingId === fileName) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          setPlayingId(null);
        }

        // Reload list
        loadMusicList();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete music');
      }
    } catch (error) {
      console.error('Delete music error:', error);
      toast.error('Failed to delete music');
    }
  };

  const handlePlayPause = (music: MusicItem) => {
    if (playingId === music.name) {
      // Pause current
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      // Stop previous and play new
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(music.url);
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.error('Play error:', error);
        toast.error('Failed to play music');
      });

      audio.onended = () => {
        setPlayingId(null);
      };

      audioRef.current = audio;
      setPlayingId(music.name);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      background: { label: 'Background', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      sfx: { label: 'Sound Effect', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      ambient: { label: 'Ambient', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      general: { label: 'General', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    };

    const badge = badges[category] || badges.general;
    return (
      <span className={`px-2 py-0.5 rounded text-xs border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-purple-400" />
            Upload New Music
          </CardTitle>
          <CardDescription>
            Upload MP3, WAV, OGG, or WEBM files (max 50MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="music-file">Audio File</Label>
            <div className="flex gap-2">
              <Input
                id="music-file"
                type="file"
                accept=".mp3,.wav,.ogg,.webm,audio/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="flex-1"
              />
              <Button
                onClick={() => document.getElementById('music-file')?.click()}
                variant="outline"
                disabled={uploading}
              >
                <FileAudio className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
            {uploadFile && (
              <p className="text-sm text-green-400">
                ✓ Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
              </p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={uploadDisplayName}
              onChange={(e) => setUploadDisplayName(e.target.value)}
              placeholder="Enter display name..."
              disabled={uploading}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              disabled={uploading}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            >
              <option value="background">Background Music</option>
              <option value="sfx">Sound Effect</option>
              <option value="ambient">Ambient</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Music
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Music List */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-cyan-400" />
              Uploaded Music ({musicList.length})
            </div>
            <Button
              onClick={loadMusicList}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading music...
            </div>
          ) : musicList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No music uploaded yet</p>
              <p className="text-sm mt-1">Upload your first music file above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {musicList.map((music) => (
                <div
                  key={music.name}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold truncate">{music.displayName}</h3>
                        {music.metadata?.category && getCategoryBadge(music.metadata.category)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <FileAudio className="h-3 w-3" />
                          {formatFileSize(music.size)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {music.mimeType.split('/')[1].toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(music.createdAt)}
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Volume2 className="h-3 w-3" />
                          {music.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handlePlayPause(music)}
                        variant="outline"
                        size="sm"
                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        {playingId === music.name ? (
                          <>
                            <Pause className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <a
                        href={music.url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>

                      <Button
                        onClick={() => handleDelete(music.name, music.displayName)}
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-500/30 bg-blue-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Music className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-semibold text-blue-300">How to use uploaded music:</p>
              <ul className="space-y-1 text-gray-300 list-disc list-inside">
                <li>Music files are stored in Supabase Storage (public bucket)</li>
                <li>You can play/preview music directly from this panel</li>
                <li>Download music files using the download button</li>
                <li>To use in game, update the music config with the public URL</li>
                <li>Supported formats: MP3, WAV, OGG, WEBM (max 50MB)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}