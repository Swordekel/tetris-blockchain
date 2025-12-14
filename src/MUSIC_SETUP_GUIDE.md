# 🎵 Music Setup Guide - Custom Songs for Tetris Game

Welcome to the **Custom Music System**! This guide will help you add your own songs to the Tetris game.

---

## 📂 Quick Setup (3 Easy Steps)

### Step 1: Create Music Folder

Create a folder called `music` inside your `/public` directory:

```
your-project/
├── public/
│   └── music/          ← Create this folder
├── src/
├── components/
└── config/
    └── music.config.ts
```

### Step 2: Add Your Music Files

Place your MP3/OGG files in the `/public/music/` folder:

```
public/
└── music/
    ├── zootopia-zoo.mp3
    ├── epic-gaming.mp3
    ├── lofi-chill.mp3
    └── your-song.mp3
```

**Supported formats:**
- ✅ MP3 (recommended)
- ✅ OGG
- ✅ WAV
- ✅ M4A (most browsers)

### Step 3: Configure Your Songs

Edit `/config/music.config.ts` and add your songs:

```typescript
export const MUSIC_CONFIG: Song[] = [
  // Built-in Tetris Theme (always available)
  {
    id: 'tetris',
    name: 'Tetris Theme',
    artist: 'Korobeiniki',
    file: '',
    icon: '🎮',
    fallbackSynthesized: true,
  },
  
  // Your custom song
  {
    id: 'my-song',                      // Unique ID
    name: 'My Awesome Song',            // Display name
    artist: 'Artist Name',              // Artist (optional)
    file: '/music/my-song.mp3',         // Path to file
    icon: '🎸',                         // Emoji icon
    fallbackSynthesized: false,         // No fallback
  },
];
```

**Done!** Refresh your app and select your song from the music menu! 🎉

---

## 🎨 Full Configuration Guide

### Song Object Properties

```typescript
{
  id: string;                    // Unique identifier (required)
  name: string;                  // Display name (required)
  artist?: string;               // Artist name (optional)
  file: string;                  // File path from /public (required)
  icon: string;                  // Emoji icon (required)
  fallbackSynthesized?: boolean; // Use synthesized if file fails (optional)
}
```

### Configuration Examples

#### Example 1: Electronic/Gaming Music

```typescript
{
  id: 'epic-gaming',
  name: 'Epic Gaming Music',
  artist: 'NoCopyrightSounds',
  file: '/music/epic-gaming.mp3',
  icon: '⚡',
  fallbackSynthesized: false,
}
```

#### Example 2: Lo-fi/Chill Music

```typescript
{
  id: 'lofi-chill',
  name: 'Lofi Study Beats',
  artist: 'ChilledCow',
  file: '/music/lofi-chill.mp3',
  icon: '🌙',
  fallbackSynthesized: false,
}
```

#### Example 3: Classical Music

```typescript
{
  id: 'classical',
  name: 'Moonlight Sonata',
  artist: 'Beethoven',
  file: '/music/moonlight-sonata.mp3',
  icon: '🎻',
  fallbackSynthesized: false,
}
```

#### Example 4: Movie Soundtrack

```typescript
{
  id: 'zootopia',
  name: 'ZOO',
  artist: 'Shakira (Zootopia 2)',
  file: '/music/zootopia-zoo.mp3',
  icon: '🦊',
  fallbackSynthesized: true, // Falls back to synthesized if file missing
}
```

#### Example 5: Multiple Songs

```typescript
export const MUSIC_CONFIG: Song[] = [
  {
    id: 'tetris',
    name: 'Tetris Theme',
    file: '',
    icon: '🎮',
    fallbackSynthesized: true,
  },
  {
    id: 'song1',
    name: 'Energetic Beat',
    artist: 'DJ Cool',
    file: '/music/energetic-beat.mp3',
    icon: '⚡',
  },
  {
    id: 'song2',
    name: 'Chill Vibes',
    artist: 'Relaxation',
    file: '/music/chill-vibes.mp3',
    icon: '🌙',
  },
  {
    id: 'song3',
    name: 'Epic Adventure',
    artist: 'Orchestra',
    file: '/music/epic-adventure.mp3',
    icon: '🎺',
  },
];
```

---

## ⚙️ Settings Configuration

Edit `MUSIC_SETTINGS` in `/config/music.config.ts`:

```typescript
export const MUSIC_SETTINGS = {
  defaultVolume: 0.3,        // 0.0 to 1.0 (30% volume)
  fadeInDuration: 500,       // Fade in time in milliseconds
  fadeOutDuration: 300,      // Fade out time in milliseconds
  enableCrossfade: true,     // Smooth transition between songs
  preloadAll: false,         // Preload all songs on startup
};
```

### Setting Descriptions:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `defaultVolume` | number | 0.3 | Default music volume (0.0 = silent, 1.0 = max) |
| `fadeInDuration` | number | 500 | How long fade-in takes (ms) |
| `fadeOutDuration` | number | 300 | How long fade-out takes (ms) |
| `enableCrossfade` | boolean | true | Smooth transitions between songs |
| `preloadAll` | boolean | false | Load all songs at app start (faster switching) |

---

## 🎮 How to Use

### In-Game Usage:

1. **Look for music controls** in the bottom-right corner
2. **Click the yellow button** (🔽) to open song menu
3. **Select a song** from the list
4. **Click the purple button** (🔊) to mute/unmute

### Song Menu:

```
┌────────────────────────────┐
│ 🎵 🎮 Tetris Theme      ✓ │
│    Korobeiniki             │
├────────────────────────────┤
│ 🎵 🦊 ZOO                  │
│    Shakira (Zootopia 2)    │
├────────────────────────────┤
│ 🎵 ⚡ Epic Gaming Music    │
│    NoCopyrightSounds       │
└────────────────────────────┘
```

---

## 🔧 Advanced Features

### 1. Synthesized Fallback

If a music file fails to load, the system can use a synthesized version:

```typescript
{
  id: 'zootopia',
  name: 'ZOO',
  file: '/music/zootopia-zoo.mp3',
  fallbackSynthesized: true,  // ← Enables fallback
}
```

**How it works:**
1. Try to load `/music/zootopia-zoo.mp3`
2. If file not found → play synthesized version
3. No errors shown to user

### 2. Change Default Song

Set which song plays on app start:

```typescript
export const DEFAULT_SONG_ID = 'tetris'; // Change to any song ID
```

### 3. Helper Functions

Use these functions in your code:

```typescript
import { getSongById, getAllSongs, getNextSong } from '../config/music.config';

// Get specific song
const song = getSongById('tetris');

// Get all available songs
const allSongs = getAllSongs();

// Get next song in list
const nextSong = getNextSong('tetris');
```

---

## 📥 Where to Get Music

### ✅ Legal & Free Sources:

1. **YouTube Audio Library**
   - https://www.youtube.com/audiolibrary
   - Free, no attribution required

2. **Free Music Archive**
   - https://freemusicarchive.org
   - Various licenses, check each song

3. **Incompetech**
   - https://incompetech.com/music
   - Free with attribution

4. **NoCopyrightSounds (NCS)**
   - https://ncs.io
   - Free for content creation

5. **Bensound**
   - https://www.bensound.com
   - Free with attribution

6. **Purple Planet**
   - https://www.purple-planet.com
   - Free for non-commercial use

### 💰 Paid Sources (High Quality):

1. **Epidemic Sound** - Premium music library
2. **AudioJungle** - Individual track purchases
3. **Artlist** - Subscription service
4. **Splice** - Music and samples

### ⚠️ Important Legal Notes:

- **Always check the license** before using any music
- **Give attribution** if required
- **Don't use copyrighted music** without permission
- **Commercial use** may require special licenses

---

## 🐛 Troubleshooting

### Problem: Song doesn't appear in menu

**Solutions:**
1. Check file is in `/public/music/` folder
2. Verify file name matches config
3. Make sure song ID is unique
4. Refresh browser (Ctrl+Shift+R)

### Problem: Song doesn't play

**Solutions:**
1. Check browser console for errors (F12)
2. Verify file format is supported (MP3 recommended)
3. Try playing file in media player to check it's not corrupted
4. Check file size (>50MB may be slow to load)
5. Enable `fallbackSynthesized: true` for backup

### Problem: Music is too loud/quiet

**Solutions:**
1. Adjust in config: `defaultVolume: 0.3` (0.0 to 1.0)
2. Use audio editing software to normalize volume
3. Recommended: -3dB to -6dB peak level

### Problem: Song cuts off at the end

**Solutions:**
1. Check if file has proper ending (not truncated)
2. Add a second of silence at end of audio file
3. Set `loop: true` in audio element

### Problem: "NotSupportedError" or "No supported sources"

**Solutions:**
1. Convert file to MP3 format
2. Check file is not corrupted
3. Verify file encoding is standard (not protected)
4. Try different browser

---

## 💡 Pro Tips

### 1. File Size Optimization

**Recommended settings:**
- **Bitrate**: 128-192 kbps (good quality, small size)
- **Sample Rate**: 44.1 kHz
- **Channels**: Stereo
- **Format**: MP3

**Tools for optimization:**
- Audacity (free)
- FFmpeg (command line)
- Online converters (CloudConvert, Online-Convert)

### 2. Seamless Looping

For perfect loops:
1. Edit audio to start/end at same point in waveform
2. Add 0.5-1 second fade in/out at ends
3. Use audio editing software (Audacity, Adobe Audition)

### 3. Multiple Playlists

Create themed configs:

```typescript
// Gaming playlist
export const GAMING_PLAYLIST = [
  { id: 'game1', name: 'Epic Battle', ... },
  { id: 'game2', name: 'Boss Fight', ... },
];

// Chill playlist
export const CHILL_PLAYLIST = [
  { id: 'chill1', name: 'Relaxing', ... },
  { id: 'chill2', name: 'Study', ... },
];

// Combine
export const MUSIC_CONFIG = [
  ...GAMING_PLAYLIST,
  ...CHILL_PLAYLIST,
];
```

### 4. Dynamic Volume

Adjust music volume based on game state:

```typescript
const audio = getAudioManager();

// Quiet during important moments
audio.setMusicVolume(0.1);

// Normal during gameplay
audio.setMusicVolume(0.3);

// Loud for celebration
audio.setMusicVolume(0.5);
```

---

## 📊 File Structure Reference

```
your-tetris-project/
├── public/
│   └── music/                     ← Put music files here
│       ├── zootopia-zoo.mp3
│       ├── epic-gaming.mp3
│       ├── lofi-chill.mp3
│       └── ...
├── config/
│   └── music.config.ts            ← Configure songs here
├── utils/
│   └── audio.ts                   ← Audio manager (don't edit)
├── components/
│   └── AudioControl.tsx           ← Music UI (don't edit)
└── README.md
```

---

## 🎯 Quick Reference

### Add a Song (3 Steps):

```typescript
// 1. Add file to /public/music/your-song.mp3

// 2. Add to config:
{
  id: 'your-song',
  name: 'Your Song Name',
  artist: 'Artist Name',
  file: '/music/your-song.mp3',
  icon: '🎵',
}

// 3. Refresh app and enjoy!
```

### Remove a Song:

```typescript
// Just delete the song object from MUSIC_CONFIG array
// Then delete the file from /public/music/
```

### Change Default Song:

```typescript
export const DEFAULT_SONG_ID = 'your-song-id';
```

---

## 🌟 Example Complete Config

Here's a complete example with 5 songs:

```typescript
export const MUSIC_CONFIG: Song[] = [
  {
    id: 'tetris',
    name: 'Tetris Theme',
    artist: 'Korobeiniki',
    file: '',
    icon: '🎮',
    fallbackSynthesized: true,
  },
  {
    id: 'zootopia',
    name: 'ZOO',
    artist: 'Shakira (Zootopia 2)',
    file: '/music/zootopia-zoo.mp3',
    icon: '🦊',
    fallbackSynthesized: true,
  },
  {
    id: 'epic',
    name: 'Epic Battle',
    artist: 'NCS',
    file: '/music/epic-battle.mp3',
    icon: '⚔️',
    fallbackSynthesized: false,
  },
  {
    id: 'chill',
    name: 'Lofi Beats',
    artist: 'ChillHop',
    file: '/music/lofi-beats.mp3',
    icon: '🌙',
    fallbackSynthesized: false,
  },
  {
    id: 'classical',
    name: 'Für Elise',
    artist: 'Beethoven',
    file: '/music/fur-elise.mp3',
    icon: '🎹',
    fallbackSynthesized: false,
  },
];

export const DEFAULT_SONG_ID = 'tetris';

export const MUSIC_SETTINGS = {
  defaultVolume: 0.3,
  fadeInDuration: 500,
  fadeOutDuration: 300,
  enableCrossfade: true,
  preloadAll: false,
};
```

---

## 🎉 You're All Set!

Now you can:
- ✅ Add unlimited custom songs
- ✅ Configure song metadata
- ✅ Switch songs in-game
- ✅ Adjust volume and settings
- ✅ Use synthesized fallbacks
- ✅ Create themed playlists

**Enjoy your personalized Tetris game with awesome music!** 🎮🎵✨

---

## 📞 Need Help?

If you encounter issues:
1. Check browser console (F12) for error messages
2. Verify file paths and names are correct
3. Test audio file in media player first
4. Check this guide's troubleshooting section
5. Make sure browser allows audio autoplay

**Happy Gaming! 🎮**
