// Music Configuration File
// Add your custom songs here!

export interface Song {
  id: string;
  name: string;
  artist?: string;
  file: string; // Path to audio file in /public folder
  icon: string; // Emoji icon
  fallbackSynthesized?: boolean; // Use synthesized version if file not found
}

export const MUSIC_CONFIG: Song[] = [
  // Built-in Tetris Theme (Synthesized - always available)
  {
    id: 'tetris',
    name: 'Tetris Theme',
    artist: 'Korobeiniki',
    file: '', // No file needed, uses synthesized version
    icon: '🎮',
    fallbackSynthesized: true,
  },
  
  // Zootopia - ZOO by Shakira
  // To enable: Download the song and save as /public/music/zootopia-zoo.mp3
  {
    id: 'zootopia',
    name: 'ZOO',
    artist: 'Shakira (Zootopia 2)',
    file: '/music/zootopia-zoo.mp3',
    icon: '🦊',
    fallbackSynthesized: true, // Falls back to synthesized version if file not found
  },

  // === ADD YOUR CUSTOM SONGS BELOW ===
  
  // Example 1: Electronic/Gaming Music
  // {
  //   id: 'epic-gaming',
  //   name: 'Epic Gaming Music',
  //   artist: 'Your Favorite Artist',
  //   file: '/music/epic-gaming.mp3',
  //   icon: '⚡',
  //   fallbackSynthesized: false,
  // },

  // Example 2: Lo-fi/Chill Music
  // {
  //   id: 'lofi-chill',
  //   name: 'Lofi Chill Beats',
  //   artist: 'Chill Artist',
  //   file: '/music/lofi-chill.mp3',
  //   icon: '🌙',
  //   fallbackSynthesized: false,
  // },

  // Example 3: Classical Music
  // {
  //   id: 'classical',
  //   name: 'Classical Masterpiece',
  //   artist: 'Mozart',
  //   file: '/music/classical.mp3',
  //   icon: '🎻',
  //   fallbackSynthesized: false,
  // },

  // Example 4: Pop Music
  // {
  //   id: 'pop-hits',
  //   name: 'Pop Hits',
  //   artist: 'Pop Star',
  //   file: '/music/pop-hits.mp3',
  //   icon: '🎤',
  //   fallbackSynthesized: false,
  // },

  // Example 5: Rock Music
  // {
  //   id: 'rock-anthem',
  //   name: 'Rock Anthem',
  //   artist: 'Rock Band',
  //   file: '/music/rock-anthem.mp3',
  //   icon: '🎸',
  //   fallbackSynthesized: false,
  // },
];

// Default song to play on app start
export const DEFAULT_SONG_ID = 'tetris';

// Music player settings
export const MUSIC_SETTINGS = {
  defaultVolume: 0.3, // 0.0 to 1.0
  fadeInDuration: 500, // milliseconds
  fadeOutDuration: 300, // milliseconds
  enableCrossfade: true,
  preloadAll: false, // Set to true to preload all songs on app start
};

// Helper function to get song by ID
export const getSongById = (id: string): Song | undefined => {
  return MUSIC_CONFIG.find(song => song.id === id);
};

// Helper function to get all available songs
export const getAllSongs = (): Song[] => {
  return MUSIC_CONFIG;
};

// Helper function to get next song (for shuffle/next features)
export const getNextSong = (currentId: string): Song => {
  const currentIndex = MUSIC_CONFIG.findIndex(song => song.id === currentId);
  const nextIndex = (currentIndex + 1) % MUSIC_CONFIG.length;
  return MUSIC_CONFIG[nextIndex];
};

// Helper function to get previous song
export const getPreviousSong = (currentId: string): Song => {
  const currentIndex = MUSIC_CONFIG.findIndex(song => song.id === currentId);
  const previousIndex = currentIndex === 0 ? MUSIC_CONFIG.length - 1 : currentIndex - 1;
  return MUSIC_CONFIG[previousIndex];
};
