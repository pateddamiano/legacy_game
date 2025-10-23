# Background System Documentation

## Overview
The Legacy Game uses a modular background system that chops large background images into segments for efficient loading and rendering.

## Background Segmenter (`background_segmenter.py`)

### Purpose
Automatically segments large background images into smaller chunks that can be loaded efficiently by the game.

### Usage
```bash
python scripts/background_segmenter.py
```

### Configuration
- **Input**: `assets/level_1_pieces/level1_background_street.png`
- **Output**: `assets/backgrounds/level_1_segments/`
- **Segment Width**: 1200px (game width)
- **Game Height**: 720px

### Output
- `segment_000.png` through `segment_004.png` - Individual background segments
- `metadata.json` - Contains positioning and dimension information

## Background Loader (`src/systems/background-loader.js`)

### Features
- **Modular Design**: Can load any level's background segments
- **Efficient Loading**: Only loads visible segments
- **Dynamic Management**: Shows/hides segments based on camera position
- **Reusable**: Works for any level with segmented backgrounds

### Usage
```javascript
// Initialize
this.backgroundLoader = new BackgroundLoader(this);

// Load level background
this.backgroundLoader.loadLevelBackground('level_1', metadata);

// Create background
this.backgroundLoader.createLevelBackground('level_1');

// Update based on camera
this.backgroundLoader.updateBackground(cameraX);
```

## Level 1 Implementation

### Current Setup
- **Background**: `level1_background_street.png` (30965x2400px)
- **Scaled**: 9289x720px (fits game height)
- **Segments**: 8 segments (7 full + 1 partial)
- **World Bounds**: 9289px wide

### Integration
- Loaded in `AudioBootScene.loadAllEnvironmentAssets()`
- Created in `GameScene.createLevel1Background()`
- World bounds set automatically based on background dimensions

## Adding New Levels

### 1. Prepare Background Image
- Create a large background image for your level
- Place it in `assets/level_X_pieces/`

### 2. Segment the Background
```bash
# Modify background_segmenter.py for your level
python scripts/background_segmenter.py
```

### 3. Update AudioBootScene
Add loading code for your level's segments:
```javascript
loadLevelXBackground() {
    for (let i = 0; i < numSegments; i++) {
        const segmentKey = `level_X_segment_${i.toString().padStart(3, '0')}`;
        const segmentPath = `assets/backgrounds/level_X_segments/segment_${i.toString().padStart(3, '0')}.png`;
        this.load.image(segmentKey, segmentPath);
    }
    this.load.json('level_X_metadata', 'assets/backgrounds/level_X_segments/metadata.json');
}
```

### 4. Update GameScene
Add creation method for your level:
```javascript
createLevelXBackground() {
    const metadata = this.cache.json.get('level_X_metadata');
    // Create segments based on metadata
    // Set world bounds
}
```

### 5. Update Level Config
Add your level to `LEVEL_CONFIGS` in `src/config/level-config.js`

## Performance Benefits

### Memory Efficiency
- Only loads visible segments
- Unloads segments outside camera range
- Reduces memory usage for large backgrounds

### Loading Speed
- Smaller files load faster
- Parallel loading of segments
- Progressive background rendering

### Scalability
- Works with backgrounds of any size
- Automatic scaling to fit game dimensions
- Consistent segment width for all levels

## File Structure
```
assets/
├── level_1_pieces/
│   └── level1_background_street.png
├── backgrounds/
│   └── level_1_segments/
│       ├── segment_000.png
│       ├── segment_001.png
│       ├── segment_002.png
│       ├── segment_003.png
│       ├── segment_004.png
│       ├── segment_005.png
│       ├── segment_006.png
│       ├── segment_007.png
│       └── metadata.json
scripts/
├── background_segmenter.py
└── README.md
src/systems/
└── background-loader.js
```

## Future Enhancements

### Planned Features
- **Parallax Layers**: Multiple background layers with different scroll speeds
- **Dynamic Loading**: Load/unload segments based on player movement
- **Compression**: Optimize segment file sizes
- **Caching**: Cache frequently used segments
- **Level Transitions**: Smooth transitions between level backgrounds
