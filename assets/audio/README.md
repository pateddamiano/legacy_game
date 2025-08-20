# 🎵 Audio System Guide

## 📁 Folder Structure

```
assets/audio/
├── music/          # Background music tracks (.mp3, .ogg, .wav)
├── sfx/           # Sound effects (.wav, .mp3)
└── README.md      # This guide
```

## 🎮 How to Add Audio

### 1. **Background Music**
- Place music files in `assets/audio/music/`
- Supported formats: MP3, OGG, WAV
- Recommended: OGG for web compatibility

**Example files to add:**
- `background_theme.ogg` - Main game background music
- `combat_music.ogg` - Intense combat theme
- `menu_music.ogg` - Menu/title screen music

### 2. **Sound Effects**
- Place SFX files in `assets/audio/sfx/`
- Keep files short and lightweight
- Recommended format: WAV for crisp quality

**Example files to add:**
- `playerAttack.wav` - Player attack sounds
- `playerHit.wav` - Player taking damage
- `enemyHit.wav` - Enemy taking damage
- `enemySpawn.wav` - Enemy spawn sound
- `enemyDeath.wav` - Enemy death sound

## 🎛️ Game Implementation

### Adding Audio to the Game

1. **Place audio files** in the appropriate folders
2. **Load in preload()** method in `game-scene.js`:

```javascript
// In preload() method:
this.load.audio('backgroundMusic', 'assets/audio/music/background_theme.ogg');
this.load.audio('playerAttack', 'assets/audio/sfx/playerAttack.wav');
this.load.audio('playerHit', 'assets/audio/sfx/playerHit.wav');
```

3. **Play music** in the game:
```javascript
// Start background music
this.playBackgroundMusic('backgroundMusic');
```

4. **Sound effects** are already integrated:
- Player attacks automatically play `playerAttack` SFX
- Player damage automatically plays `playerHit` SFX

## ⌨️ Controls

- **M Key**: Toggle background music on/off
- **N Key**: Toggle sound effects on/off

## 🎚️ Volume Control

The music system includes configurable volume controls:

- **Background Music**: 30% volume by default
- **Sound Effects**: 50% volume by default
- **Individual SFX**: Can have custom volumes per sound

## 🎭 Music States

- **Fade In**: 2-second fade when starting music
- **Fade Out**: 1-second fade when stopping music
- **Loop**: Background music loops automatically
- **Mute States**: Music and SFX can be muted independently

## 🎯 Usage Examples

```javascript
// Play background music with fade-in
this.playBackgroundMusic('backgroundMusic', true);

// Play sound effect
this.playSoundEffect('playerAttack');

// Play sound effect with custom volume
this.playSoundEffect('enemyHit', 0.8);

// Stop music with fade-out
this.stopBackgroundMusic(true);

// Adjust volumes
this.setMusicVolume(0.5);  // 50% music volume
this.setSFXVolume(0.7);    // 70% SFX volume
```

## 🔧 Technical Notes

- Uses Phaser 3 Audio API
- Supports multiple audio formats for cross-browser compatibility
- Memory efficient - sounds are loaded once and reused
- Non-blocking - missing audio files won't crash the game
- Console logging for debugging audio issues

---

🎮 **Ready to add some epic audio to your beat 'em up game!** 🎵