# Folder Reorganization Plan

## Current Issues

1. **Naming Inconsistency**: Mix of `-manager.js` and `-system.js` suffixes
2. **Mixed Concerns**: Entity classes, managers, loaders all in one folder
3. **Large Files**: `event-manager.js` is 72KB/1946 lines
4. **No Logical Grouping**: Related systems aren't grouped together

## Proposed Structure

```
src/
├── core/                          # Core game systems (unchanged)
│   ├── GameState.js
│   ├── GameStateManager.js
│   └── SceneManager.js
│
├── scenes/                        # Phaser scenes (unchanged)
│   ├── AudioBootScene.js
│   ├── BootScene.js
│   ├── CharacterSelectScene.js
│   ├── game-scene.js
│   ├── IntroDialogueScene.js
│   ├── MainMenuScene.js
│   └── PreloadScene.js
│
├── systems/                       # Game systems (reorganized)
│   │
│   ├── entities/                  # Game entity classes
│   │   ├── enemy.js              # Enemy class (from enemy-system.js)
│   │   └── boss.js               # Boss class (from boss-system.js)
│   │
│   ├── combat/                   # Combat-related systems
│   │   ├── combat-manager.js     # Player vs enemy combat
│   │   ├── weapon-manager.js     # Weapon system (rename weapon-system.js)
│   │   └── player-physics-manager.js
│   │
│   ├── characters/               # Character management
│   │   ├── character-manager.js
│   │   └── animation-setup-manager.js
│   │
│   ├── enemies/                  # Enemy management
│   │   ├── enemy-spawn-manager.js
│   │   └── enemy-ai.js           # Enemy AI logic (extract from enemy-system.js)
│   │
│   ├── world/                    # World/level management
│   │   ├── world-manager.js
│   │   ├── level-manager.js
│   │   ├── level-initialization-manager.js
│   │   ├── environment-manager.js
│   │   └── background-loader.js
│   │   └── level/                # Level system (keep subdirectory)
│   │       ├── LevelAssetLoader.js
│   │       ├── LevelRegistry.js
│   │       └── WorldFactory.js
│   │
│   ├── ui/                       # UI systems
│   │   ├── ui-manager.js
│   │   └── debug-manager.js
│   │
│   ├── audio/                    # Audio systems
│   │   └── audio-manager.js
│   │
│   ├── input/                    # Input systems
│   │   └── input-manager.js
│   │
│   ├── gameplay/                 # Gameplay mechanics
│   │   ├── event-manager.js      # (consider splitting this large file)
│   │   ├── dialogue-manager.js
│   │   ├── item-pickup-manager.js # (rename item-pickup-system.js)
│   │   ├── scene-element-manager.js
│   │   └── extras-manager.js
│   │
│   └── animation/                 # Animation systems
│       ├── animation-manager.js
│       └── animation-setup-manager.js  # (move from characters/)
│
├── characters/                   # Character configs (unchanged)
│   └── characters.js
│
└── config/                       # Game configs (unchanged)
    ├── game-config.js
    ├── level-config.js
    └── levels/
```

## Renaming Plan

### Standardize to `-manager.js` suffix:
- `weapon-system.js` → `weapon-manager.js`
- `item-pickup-system.js` → `item-pickup-manager.js`
- `enemy-system.js` → Split into:
  - `entities/enemy.js` (Enemy class)
  - `enemies/enemy-ai.js` (AI logic and configs)
- `boss-system.js` → `entities/boss.js`

## Benefits

1. **Clear Separation**: Entities vs Managers vs Loaders
2. **Logical Grouping**: Related systems grouped by domain
3. **Easier Navigation**: Find systems by what they do
4. **Better Scalability**: Easy to add new systems in appropriate folders
5. **Consistent Naming**: All managers use `-manager.js` suffix

## Migration Steps

1. Create new folder structure
2. Move files to new locations
3. Update all import paths in:
   - `index.html` (script tags)
   - All files that reference these systems
4. Test to ensure everything still works
5. Consider splitting `event-manager.js` if needed

## Alternative: Simpler Structure

If the above is too complex, a simpler option:

```
src/
├── systems/
│   ├── managers/          # All managers
│   ├── entities/          # Entity classes (Enemy, Boss)
│   └── loaders/          # Loader utilities
```

This keeps everything in `systems/` but groups by type rather than domain.

