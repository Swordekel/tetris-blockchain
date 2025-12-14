// Audio Manager for Tetris Game
import { MUSIC_CONFIG, getSongById, MUSIC_SETTINGS, DEFAULT_SONG_ID, type Song } from '../config/music.config';

class AudioManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = MUSIC_SETTINGS.defaultVolume;
  private sfxVolume: number = 0.5;
  private currentSongId: string = DEFAULT_SONG_ID;
  private melodyTimeout: number | null = null;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private currentAudioElement: HTMLAudioElement | null = null;
  private customSongs: Song[] = []; // Store dynamically loaded songs

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.preloadSongs();
    }
  }

  private preloadSongs() {
    // Preload all songs if enabled in settings
    if (MUSIC_SETTINGS.preloadAll) {
      MUSIC_CONFIG.forEach(song => {
        if (song.file && !song.fallbackSynthesized) {
          this.createAudioElement(song.id, song.file);
        }
      });
    }
  }

  private createAudioElement(songId: string, filePath: string): HTMLAudioElement {
    if (this.audioElements.has(songId)) {
      return this.audioElements.get(songId)!;
    }

    const audio = new Audio();
    audio.src = filePath;
    audio.loop = true;
    audio.volume = this.musicVolume;
    audio.preload = 'auto';

    // Error handling for missing files
    audio.onerror = () => {
      console.warn(`⚠️ Could not load song: ${songId} from ${filePath}`);
      const song = getSongById(songId);
      if (song?.fallbackSynthesized) {
        console.log(`💡 Using synthesized fallback for: ${song.name}`);
      }
    };

    this.audioElements.set(songId, audio);
    return audio;
  }

  // Play background music
  playBackgroundMusic() {
    if (this.isMuted || !this.audioContext) return;

    // Resume audio context if suspended (required by browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Try to find song from custom songs first, then fall back to built-in
    let song = this.getCustomSongById(this.currentSongId);
    if (!song) {
      song = getSongById(this.currentSongId);
    }
    
    if (!song) return;

    console.log('🎵 Playing song:', song.name, 'File:', song.file);

    // Check if song uses external file or synthesized
    if (song.file && !song.fallbackSynthesized) {
      // Regular audio file (uploaded or built-in without fallback)
      this.playExternalFile(song.id, song.file);
    } else if (song.fallbackSynthesized) {
      // Try external file first, fallback to synthesized
      this.playWithFallback(song.id, song.file);
    } else {
      // Pure synthesized (like Tetris theme)
      this.playSynthesizedMusic(song.id);
    }
  }

  private playExternalFile(songId: string, filePath: string) {
    // IMPORTANT: Stop ALL audio sources first (including synthesized music timeouts)
    this.stopBackgroundMusic();
    
    const audio = this.createAudioElement(songId, filePath);
    
    this.currentAudioElement = audio;
    
    audio.play().catch(error => {
      console.error(`❌ Failed to play ${songId}:`, error);
    });
  }

  private playWithFallback(songId: string, filePath: string) {
    // IMPORTANT: Stop ALL audio sources first (including synthesized music timeouts)
    this.stopBackgroundMusic();
    
    if (filePath) {
      const audio = this.createAudioElement(songId, filePath);
      
      this.currentAudioElement = audio;
      
      audio.play().catch(error => {
        console.warn(`⚠️ External file failed, using synthesized version:`, error);
        this.playSynthesizedMusic(songId);
      });
    } else {
      this.playSynthesizedMusic(songId);
    }
  }

  private playSynthesizedMusic(songId: string) {
    if (songId === 'tetris') {
      this.playTetrisMelody();
    } else if (songId === 'zootopia') {
      this.playZootopiaMusic();
    } else {
      // Default to Tetris if unknown
      this.playTetrisMelody();
    }
  }

  private playTetrisMelody() {
    if (!this.audioContext || this.isMuted || this.currentSongId !== 'tetris') return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Tetris theme notes (simplified)
    const melody = [
      { freq: 659.25, time: 0, duration: 0.4 },
      { freq: 493.88, time: 0.4, duration: 0.2 },
      { freq: 523.25, time: 0.6, duration: 0.2 },
      { freq: 587.33, time: 0.8, duration: 0.4 },
      { freq: 523.25, time: 1.2, duration: 0.2 },
      { freq: 493.88, time: 1.4, duration: 0.2 },
      { freq: 440.00, time: 1.6, duration: 0.4 },
      { freq: 440.00, time: 2.0, duration: 0.2 },
      { freq: 523.25, time: 2.2, duration: 0.2 },
      { freq: 659.25, time: 2.4, duration: 0.4 },
      { freq: 587.33, time: 2.8, duration: 0.2 },
      { freq: 523.25, time: 3.0, duration: 0.2 },
      { freq: 493.88, time: 3.2, duration: 0.6 },
      { freq: 523.25, time: 3.8, duration: 0.2 },
      { freq: 587.33, time: 4.0, duration: 0.4 },
      { freq: 659.25, time: 4.4, duration: 0.4 },
      { freq: 523.25, time: 4.8, duration: 0.4 },
      { freq: 440.00, time: 5.2, duration: 0.4 },
      { freq: 440.00, time: 5.6, duration: 0.4 },
    ];

    melody.forEach(note => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = note.freq;
      oscillator.type = 'square';

      gainNode.gain.setValueAtTime(0, now + note.time);
      gainNode.gain.linearRampToValueAtTime(this.musicVolume * 0.15, now + note.time + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);

      oscillator.start(now + note.time);
      oscillator.stop(now + note.time + note.duration);
    });

    // Loop the melody
    if (!this.isMuted && this.currentSongId === 'tetris') {
      this.melodyTimeout = setTimeout(() => this.playTetrisMelody(), 6000);
    }
  }

  private playZootopiaMusic() {
    if (!this.audioContext || this.isMuted || this.currentSongId !== 'zootopia') return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const zootopiaTheme = [
      { freq: 523.25, time: 0, duration: 0.25, type: 'triangle' as OscillatorType },
      { freq: 587.33, time: 0.25, duration: 0.25, type: 'triangle' as OscillatorType },
      { freq: 659.25, time: 0.5, duration: 0.25, type: 'triangle' as OscillatorType },
      { freq: 783.99, time: 0.75, duration: 0.5, type: 'triangle' as OscillatorType },
      { freq: 659.25, time: 1.25, duration: 0.25, type: 'sawtooth' as OscillatorType },
      { freq: 587.33, time: 1.5, duration: 0.25, type: 'sawtooth' as OscillatorType },
      { freq: 659.25, time: 1.75, duration: 0.5, type: 'sawtooth' as OscillatorType },
      { freq: 783.99, time: 2.25, duration: 0.25, type: 'sawtooth' as OscillatorType },
      { freq: 880.00, time: 2.5, duration: 0.3, type: 'square' as OscillatorType },
      { freq: 783.99, time: 2.8, duration: 0.2, type: 'square' as OscillatorType },
      { freq: 659.25, time: 3.0, duration: 0.3, type: 'square' as OscillatorType },
      { freq: 587.33, time: 3.3, duration: 0.2, type: 'square' as OscillatorType },
      { freq: 523.25, time: 3.5, duration: 0.4, type: 'triangle' as OscillatorType },
      { freq: 659.25, time: 3.9, duration: 0.4, type: 'triangle' as OscillatorType },
      { freq: 783.99, time: 4.3, duration: 0.5, type: 'triangle' as OscillatorType },
      { freq: 880.00, time: 4.8, duration: 0.25, type: 'sawtooth' as OscillatorType },
      { freq: 1046.50, time: 5.05, duration: 0.25, type: 'sawtooth' as OscillatorType },
      { freq: 880.00, time: 5.3, duration: 0.3, type: 'sawtooth' as OscillatorType },
      { freq: 783.99, time: 5.6, duration: 0.4, type: 'sawtooth' as OscillatorType },
    ];

    const bassline = [
      { freq: 130.81, time: 0, duration: 0.5 },
      { freq: 146.83, time: 1, duration: 0.5 },
      { freq: 164.81, time: 2, duration: 0.5 },
      { freq: 196.00, time: 3, duration: 0.5 },
      { freq: 220.00, time: 4, duration: 0.5 },
      { freq: 196.00, time: 5, duration: 0.5 },
    ];

    zootopiaTheme.forEach(note => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = note.freq;
      oscillator.type = note.type;
      gainNode.gain.setValueAtTime(0, now + note.time);
      gainNode.gain.linearRampToValueAtTime(this.musicVolume * 0.2, now + note.time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);
      oscillator.start(now + note.time);
      oscillator.stop(now + note.time + note.duration);
    });

    bassline.forEach(note => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = note.freq;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0, now + note.time);
      gainNode.gain.linearRampToValueAtTime(this.musicVolume * 0.15, now + note.time + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);
      oscillator.start(now + note.time);
      oscillator.stop(now + note.time + note.duration);
    });

    if (!this.isMuted && this.currentSongId === 'zootopia') {
      this.melodyTimeout = setTimeout(() => this.playZootopiaMusic(), 6000);
    }
  }

  stopBackgroundMusic() {
    // Stop all audio elements
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }

    if (this.melodyTimeout) {
      clearTimeout(this.melodyTimeout);
      this.melodyTimeout = null;
    }
  }

  switchSong(songId: string) {
    console.log('🎵 Switching to song:', songId);
    
    // Try to find song from custom songs first, then fall back to built-in
    let song = this.getCustomSongById(songId);
    if (!song) {
      song = getSongById(songId);
    }
    
    if (!song) {
      console.error(`❌ Song not found: ${songId}`);
      return;
    }

    this.currentSongId = songId;
    this.stopBackgroundMusic();
    
    if (!this.isMuted) {
      this.playBackgroundMusic();
    }
  }

  getCurrentSongId(): string {
    return this.currentSongId;
  }

  getAllSongs() {
    return MUSIC_CONFIG;
  }

  // Update song list with dynamically loaded songs
  updateSongList(songs: Song[]) {
    this.customSongs = songs;
    console.log('🎵 Song list updated:', songs.length, 'total songs');
  }

  // Get song by ID from both built-in and custom songs
  private getCustomSongById(songId: string): Song | undefined {
    return this.customSongs.find(song => song.id === songId);
  }

  // Sound Effects
  playRotateSound() {
    if (this.isMuted || !this.audioContext) return;
    this.playTone(400, 0.05, 'sine', this.sfxVolume * 0.2);
  }

  playMoveSound() {
    if (this.isMuted || !this.audioContext) return;
    this.playTone(200, 0.03, 'sine', this.sfxVolume * 0.15);
  }

  playDropSound() {
    if (this.isMuted || !this.audioContext) return;
    this.playTone(150, 0.1, 'square', this.sfxVolume * 0.3);
  }

  playLineClearSound(lines: number) {
    if (this.isMuted || !this.audioContext) return;
    for (let i = 0; i < lines; i++) {
      const freq = 523.25 * Math.pow(2, i / 4);
      setTimeout(() => {
        this.playTone(freq, 0.15, 'square', this.sfxVolume * 0.4);
      }, i * 100);
    }
  }

  playGameOverSound() {
    if (this.isMuted || !this.audioContext) return;
    const notes = [523.25, 493.88, 440.00, 392.00, 349.23];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'triangle', this.sfxVolume * 0.3);
      }, i * 150);
    });
  }

  playLevelUpSound() {
    if (this.isMuted || !this.audioContext) return;
    const notes = [523.25, 587.33, 659.25, 783.99];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'square', this.sfxVolume * 0.3);
      }, i * 80);
    });
  }

  playTetrisSound() {
    if (this.isMuted || !this.audioContext) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'square', this.sfxVolume * 0.5);
      }, i * 100);
    });
  }

  playClickSound() {
    if (this.isMuted || !this.audioContext) return;
    this.playTone(800, 0.05, 'sine', this.sfxVolume * 0.2);
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3
  ) {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
    console.log('🔊 Audio toggled. Muted:', this.isMuted);
    return this.isMuted;
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.audioElements.forEach(audio => {
      audio.volume = this.musicVolume;
    });
    if (this.currentAudioElement) {
      this.currentAudioElement.volume = this.musicVolume;
    }
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  isMusicMuted(): boolean {
    return this.isMuted;
  }
}

// Singleton instance
let audioManager: AudioManager | null = null;

export const getAudioManager = (): AudioManager => {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
};

export default AudioManager;