// ========================================
// BACKGROUND LOADER SYSTEM
// ========================================
// Modular system for loading and managing level background segments

class BackgroundLoader {
    constructor(scene) {
        this.scene = scene;
        this.loadedLevels = new Map();
        this.activeLevel = null;
        this.backgroundLayers = null;
        this.camera = scene.cameras.main;
        
        // Configuration
        this.segmentWidth = 1200;
        this.gameHeight = 720;
        this.loadDistance = 2400; // Load segments within this distance
        this.unloadDistance = 3600; // Unload segments beyond this distance
    }

    /**
     * Load background segments for a level
     * @param {string} levelId - Level identifier (e.g., 'level_1')
     * @param {Object} metadata - Background metadata
     */
    loadLevelBackground(levelId, metadata) {
        console.log(`🌍 Loading background for level: ${levelId}`);
        
        // Store metadata
        this.loadedLevels.set(levelId, {
            metadata: metadata,
            segments: new Map(),
            loaded: false
        });
        
        // Load all segment images
        metadata.segments.forEach(segment => {
            const segmentKey = `${levelId}_segment_${segment.index}`;
            const segmentPath = `assets/backgrounds/${levelId}_segments/${segment.filename}`;
            
            this.scene.load.image(segmentKey, segmentPath);
            console.log(`🌍 Loading segment: ${segmentKey} from ${segmentPath}`);
        });
    }

    /**
     * Create background layers for a level
     * @param {string} levelId - Level identifier
     */
    createLevelBackground(levelId) {
        const levelData = this.loadedLevels.get(levelId);
        if (!levelData) {
            console.error(`🌍 Level ${levelId} not loaded!`);
            return;
        }

        console.log(`🌍 Creating background for level: ${levelId}`);
        
        // Create background layer group
        if (!this.backgroundLayers) {
            this.backgroundLayers = this.scene.add.group();
        }
        
        const metadata = levelData.metadata;
        
        // Create segments
        metadata.segments.forEach(segment => {
            const segmentKey = `${levelId}_segment_${segment.index}`;
            
            // Create the segment sprite
            const segmentSprite = this.scene.add.image(
                segment.x_position, 
                360, // Center vertically
                segmentKey
            );
            
            segmentSprite.setOrigin(0, 0.5);
            segmentSprite.setDepth(-100);
            segmentSprite.setScrollFactor(1.0);
            
            // Store reference
            levelData.segments.set(segment.index, segmentSprite);
            this.backgroundLayers.add(segmentSprite);
            
            console.log(`🌍 Created segment ${segment.index} at x: ${segment.x_position}`);
        });
        
        levelData.loaded = true;
        this.activeLevel = levelId;
        
        console.log(`🌍 Background created for level: ${levelId} with ${metadata.segments.length} segments`);
    }

    /**
     * Update background based on camera position
     * @param {number} cameraX - Current camera X position
     */
    updateBackground(cameraX) {
        if (!this.activeLevel) return;
        
        const levelData = this.loadedLevels.get(this.activeLevel);
        if (!levelData || !levelData.loaded) return;
        
        const metadata = levelData.metadata;
        
        // Check which segments should be visible
        metadata.segments.forEach(segment => {
            const segmentSprite = levelData.segments.get(segment.index);
            if (!segmentSprite) return;
            
            const segmentLeft = segment.x_position;
            const segmentRight = segmentLeft + segment.width;
            
            // Check if segment is within camera view
            const cameraLeft = cameraX - this.loadDistance;
            const cameraRight = cameraX + this.loadDistance;
            
            const shouldBeVisible = segmentRight > cameraLeft && segmentLeft < cameraRight;
            
            // Show/hide segment based on visibility
            if (shouldBeVisible && !segmentSprite.visible) {
                segmentSprite.setVisible(true);
                console.log(`🌍 Showing segment ${segment.index}`);
            } else if (!shouldBeVisible && segmentSprite.visible) {
                segmentSprite.setVisible(false);
                console.log(`🌍 Hiding segment ${segment.index}`);
            }
        });
    }

    /**
     * Switch to a different level background
     * @param {string} levelId - Level identifier
     */
    switchLevel(levelId) {
        console.log(`🌍 Switching to level: ${levelId}`);
        
        // Hide current level
        if (this.activeLevel) {
            this.hideLevel(this.activeLevel);
        }
        
        // Show new level
        this.showLevel(levelId);
        this.activeLevel = levelId;
    }

    /**
     * Hide all segments for a level
     * @param {string} levelId - Level identifier
     */
    hideLevel(levelId) {
        const levelData = this.loadedLevels.get(levelId);
        if (!levelData || !levelData.loaded) return;
        
        levelData.segments.forEach(segmentSprite => {
            segmentSprite.setVisible(false);
        });
        
        console.log(`🌍 Hidden level: ${levelId}`);
    }

    /**
     * Show all segments for a level
     * @param {string} levelId - Level identifier
     */
    showLevel(levelId) {
        const levelData = this.loadedLevels.get(levelId);
        if (!levelData || !levelData.loaded) return;
        
        levelData.segments.forEach(segmentSprite => {
            segmentSprite.setVisible(true);
        });
        
        console.log(`🌍 Shown level: ${levelId}`);
    }

    /**
     * Get level metadata
     * @param {string} levelId - Level identifier
     * @returns {Object} Level metadata
     */
    getLevelMetadata(levelId) {
        const levelData = this.loadedLevels.get(levelId);
        return levelData ? levelData.metadata : null;
    }

    /**
     * Get active level
     * @returns {string} Active level ID
     */
    getActiveLevel() {
        return this.activeLevel;
    }

    /**
     * Check if level is loaded
     * @param {string} levelId - Level identifier
     * @returns {boolean} True if loaded
     */
    isLevelLoaded(levelId) {
        const levelData = this.loadedLevels.get(levelId);
        return levelData && levelData.loaded;
    }

    /**
     * Destroy all background elements
     */
    destroy() {
        if (this.backgroundLayers) {
            this.backgroundLayers.destroy();
            this.backgroundLayers = null;
        }
        
        this.loadedLevels.clear();
        this.activeLevel = null;
        
        console.log('🌍 Background loader destroyed');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgroundLoader;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.BackgroundLoader = BackgroundLoader;
}
