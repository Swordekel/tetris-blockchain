import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Volume2, VolumeX, Music, ChevronDown } from 'lucide-react';
import { getAudioManager } from '../utils/audio';

export function AudioControl() {
  const [isMuted, setIsMuted] = useState(false);
  const [currentSongId, setCurrentSongId] = useState('tetris');
  const [showMenu, setShowMenu] = useState(false);
  const [availableSongs, setAvailableSongs] = useState<any[]>([]);

  useEffect(() => {
    // Get initial muted state from audio manager
    const audio = getAudioManager();
    const currentMutedState = audio.isMusicMuted();
    const currentSongState = audio.getCurrentSongId();
    const songs = audio.getAllSongs();
    
    setIsMuted(currentMutedState);
    setCurrentSongId(currentSongState);
    setAvailableSongs(songs);
    
    console.log('🎵 AudioControl mounted. Songs available:', songs.length);
    
    // Start background music if not muted
    if (!currentMutedState) {
      audio.playBackgroundMusic();
    }
  }, []);

  const toggleMute = () => {
    const audio = getAudioManager();
    const newMutedState = audio.toggleMute();
    setIsMuted(newMutedState);
    
    // Don't play click sound if we're muting (it would be confusing)
    if (!newMutedState) {
      audio.playClickSound();
    }
  };

  const switchSong = (songId: string) => {
    const audio = getAudioManager();
    audio.switchSong(songId);
    setCurrentSongId(songId);
    setShowMenu(false);
    audio.playClickSound();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Song Selection Menu */}
      {showMenu && (
        <div className="glass-card border-2 border-white/20 rounded-lg p-2 shadow-2xl animate-in slide-in-from-bottom-2 duration-200 max-h-[400px] overflow-y-auto">
          <div className="flex flex-col gap-1 min-w-[220px]">
            {availableSongs.map((song) => (
              <Button
                key={song.id}
                variant="ghost"
                size="sm"
                onClick={() => switchSong(song.id)}
                className={`justify-start ${
                  currentSongId === song.id 
                    ? 'bg-purple-500/30 text-purple-300' 
                    : 'hover:bg-white/10'
                }`}
              >
                <Music className="h-4 w-4 mr-2" />
                <span className="mr-1">{song.icon}</span>
                <div className="flex flex-col items-start flex-1">
                  <span className="text-sm">{song.name}</span>
                  {song.artist && (
                    <span className="text-xs text-white/50">{song.artist}</span>
                  )}
                </div>
                {currentSongId === song.id && <span className="ml-auto">✓</span>}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Main Audio Control Button */}
      <div className="flex gap-2">
        {/* Song Selector Button */}
        {!isMuted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
            className="glass-card border-2 border-yellow-400/40 hover:border-yellow-400/60 rounded-full h-12 w-12 shadow-xl group transition-all duration-300 bg-yellow-950/20 hover:bg-yellow-900/30"
            title="Change Song"
          >
            <ChevronDown className={`h-5 w-5 text-yellow-400 group-hover:scale-110 transition-all ${showMenu ? 'rotate-180' : ''}`} />
          </Button>
        )}

        {/* Mute/Unmute Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className={`glass-card border-2 hover:border-white/40 rounded-full h-16 w-16 shadow-2xl group transition-all duration-300 ${
            isMuted 
              ? 'border-red-400/40 bg-red-950/20 hover:bg-red-900/30' 
              : 'border-purple-400/40 bg-purple-950/20 hover:bg-purple-900/30 glow-purple'
          }`}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? (
            <div className="relative">
              <VolumeX className="h-7 w-7 text-red-400 group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
          ) : (
            <div className="relative">
              <Volume2 className="h-7 w-7 text-purple-400 group-hover:scale-110 transition-transform" />
              <Music className="h-3 w-3 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}