// ========================================
// WORLD MANAGER SYSTEM
// ========================================
// Reusable system for managing game worlds, backgrounds, and level environments

class WorldManager {
    constructor(scene) {
        this.scene = scene;
        this.currentWorld = null;
        this.worlds = new Map();
        this.activeLayers = new Map();
        
        // Configuration
        this.gameWidth = 1200;
        this.gameHeight = 720;
        this.loadDistance = 5000; // Load segments within this distance (increased for Level 1)
        this.unloadDistance = 7000; // Unload segments beyond this distance
        
        console.log('🌍 World Manager initialized');
    }

    /**
     * Register a world configuration
     * @param {string} worldId - Unique world identifier
     * @param {Object} config - World configuration
     */
    registerWorld(worldId, config) {
        console.log(`🌍 Registering world: ${worldId}`);
        
        this.worlds.set(worldId, {
            id: worldId,
            config: config,
            segments: new Map(),
            layers: new Map(),
            loaded: false,
            active: false
        });
        
        console.log(`🌍 World ${worldId} registered with ${config.segments?.length || 0} segments`);
    }

    /**
     * Load world assets
     * @param {string} worldId - World identifier
     */
    loadWorld(worldId) {
        const world = this.worlds.get(worldId);
        if (!world) {
            console.error(`🌍 World ${worldId} not registered!`);
            return;
        }

        console.log(`🌍 Loading world: ${worldId}`);
        
        const config = world.config;
        
        // Load background segments
        if (config.segments) {
            config.segments.forEach(segment => {
                const segmentKey = `${worldId}_segment_${segment.index.toString().padStart(3, '0')}`;
                const segmentPath = `assets/backgrounds/${worldId}_segments/${segment.filename}`;
                
                this.scene.load.image(segmentKey, segmentPath);
                console.log(`🌍 Loading segment: ${segmentKey}`);
            });
        }
        
        // Load metadata if available
        if (config.metadataPath) {
            this.scene.load.json(`${worldId}_metadata`, config.metadataPath);
        }
        
        // Load additional assets
        if (config.assets) {
            config.assets.forEach(asset => {
                if (asset.type === 'image') {
                    this.scene.load.image(asset.key, asset.path);
                } else if (asset.type === 'spritesheet') {
                    this.scene.load.spritesheet(asset.key, asset.path, asset.frameConfig);
                } else if (asset.type === 'audio') {
                    this.scene.load.audio(asset.key, asset.path);
                }
                console.log(`🌍 Loading asset: ${asset.key}`);
            });
        }
    }

    /**
     * Create world environment
     * @param {string} worldId - World identifier
     */
    createWorld(worldId) {
        const world = this.worlds.get(worldId);
        if (!world) {
            console.error(`🌍 World ${worldId} not registered!`);
            return;
        }

        console.log(`🌍 Creating world: ${worldId}`);
        
        const config = world.config;
        
        // Create background segments
        if (config.segments) {
            this.createBackgroundSegments(worldId, config.segments);
        }
        
        // Create additional layers
        if (config.layers) {
            config.layers.forEach(layer => {
                this.createLayer(worldId, layer);
            });
        }
        
        // Set world bounds
        this.setWorldBounds(worldId, config);
        
        // Set spawn point
        this.setSpawnPoint(worldId, config);
        
        world.loaded = true;
        world.active = true;
        this.currentWorld = worldId;
        
        console.log(`🌍 World ${worldId} created successfully`);
    }

    /**
     * Create background segments
     * @param {string} worldId - World identifier
     * @param {Array} segments - Segment configurations
     */
    createBackgroundSegments(worldId, segments) {
        console.log(`🌍 Creating ${segments.length} background segments for ${worldId}`);
        
        const world = this.worlds.get(worldId);
        if (!world) {
            console.error(`🌍 World ${worldId} not found!`);
            return;
        }
        
        segments.forEach(segment => {
            const segmentKey = `${worldId}_segment_${segment.index.toString().padStart(3, '0')}`;
            
            // Check if texture exists before creating sprite
            if (!this.scene.textures.exists(segmentKey)) {
                console.error(`🌍 Texture ${segmentKey} not found! Skipping segment ${segment.index}`);
                return;
            }
            
            const segmentSprite = this.scene.add.image(
                segment.x_position,
                360, // Center vertically
                segmentKey
            );
            
            segmentSprite.setOrigin(0, 0.5);
            segmentSprite.setDepth(-100);
            segmentSprite.setScrollFactor(1.0);
            segmentSprite.setVisible(true); // Ensure visible on creation
            
            // Store reference
            world.segments.set(segment.index, segmentSprite);
            
            console.log(`🌍 ✅ Created segment ${segment.index} at x: ${segment.x_position}, width: ${segment.width}`);
        });
        
        console.log(`🌍 Created ${world.segments.size} of ${segments.length} segments for ${worldId}`);
    }

    /**
     * Create additional layers (parallax, foreground, etc.)
     * @param {string} worldId - World identifier
     * @param {Object} layer - Layer configuration
     */
    createLayer(worldId, layer) {
        console.log(`🌍 Creating layer: ${layer.name} for ${worldId}`);
        
        const layerGroup = this.scene.add.group();
        
        if (layer.type === 'parallax') {
            this.createParallaxLayer(worldId, layer, layerGroup);
        } else if (layer.type === 'foreground') {
            this.createForegroundLayer(worldId, layer, layerGroup);
        } else if (layer.type === 'decoration') {
            this.createDecorationLayer(worldId, layer, layerGroup);
        }
        
        this.activeLayers.set(`${worldId}_${layer.name}`, layerGroup);
    }

    /**
     * Create parallax layer
     * @param {string} worldId - World identifier
     * @param {Object} layer - Layer configuration
     * @param {Phaser.GameObjects.Group} layerGroup - Layer group
     */
    createParallaxLayer(worldId, layer, layerGroup) {
        const texture = this.scene.textures.get(layer.texture);
        const textureWidth = texture.source[0].width;
        const textureHeight = texture.source[0].height;
        
        const scale = this.gameHeight / textureHeight;
        const scaledWidth = textureWidth * scale;
        
        const numCopies = Math.ceil(3600 / scaledWidth) + 2;
        
        for (let i = 0; i < numCopies; i++) {
            const bg = this.scene.add.image(i * scaledWidth, layer.y || 150, layer.texture);
            bg.setOrigin(0.5, 0.5);
            bg.setScale(scale);
            bg.setDepth(layer.depth || -200);
            bg.setScrollFactor(layer.scrollFactor || 0.3);
            layerGroup.add(bg);
        }
        
        console.log(`🌍 Created parallax layer: ${layer.name} with ${numCopies} copies`);
    }

    /**
     * Create foreground layer
     * @param {string} worldId - World identifier
     * @param {Object} layer - Layer configuration
     * @param {Phaser.GameObjects.Group} layerGroup - Layer group
     */
    createForegroundLayer(worldId, layer, layerGroup) {
        // Implementation for foreground elements
        console.log(`🌍 Created foreground layer: ${layer.name}`);
    }

    /**
     * Create decoration layer
     * @param {string} worldId - World identifier
     * @param {Object} layer - Layer configuration
     * @param {Phaser.GameObjects.Group} layerGroup - Layer group
     */
    createDecorationLayer(worldId, layer, layerGroup) {
        // Implementation for decorative elements
        console.log(`🌍 Created decoration layer: ${layer.name}`);
    }

    /**
     * Set world bounds
     * @param {string} worldId - World identifier
     * @param {Object} config - World configuration
     */
    setWorldBounds(worldId, config) {
        if (config.segments && config.segments.length > 0) {
            const leftBound = config.segments[0].x_position;
            const rightBound = config.segments[config.segments.length - 1].x_position + 
                              config.segments[config.segments.length - 1].width;
            
            this.scene.physics.world.setBounds(
                leftBound,
                0,
                rightBound - leftBound,
                this.gameHeight
            );
            
            console.log(`🌍 World bounds set: ${leftBound} to ${rightBound} (${rightBound - leftBound}x${this.gameHeight})`);
        } else if (config.bounds) {
            this.scene.physics.world.setBounds(
                config.bounds.x,
                config.bounds.y,
                config.bounds.width,
                config.bounds.height
            );
            
            console.log(`🌍 World bounds set: ${config.bounds.x},${config.bounds.y} ${config.bounds.width}x${config.bounds.height}`);
        }
    }

    /**
     * Set spawn point
     * @param {string} worldId - World identifier
     * @param {Object} config - World configuration
     */
    setSpawnPoint(worldId, config) {
        console.log(`🌍 📊 setSpawnPoint called for ${worldId}`);
        console.log('🌍 📊 Config:', config);
        
        if (config.spawnPoint) {
            this.spawnPoint = {
                x: config.spawnPoint.x,
                y: config.spawnPoint.y
            };
            console.log(`🌍 📊 Using config spawnPoint: x=${this.spawnPoint.x}, y=${this.spawnPoint.y}`);
        } else if (config.segments && config.segments.length > 0) {
            // Default spawn at beginning of first segment
            this.spawnPoint = {
                x: config.segments[0].x_position + 100,
                y: 600
            };
            console.log(`🌍 📊 Using first segment spawn: x=${this.spawnPoint.x}, y=${this.spawnPoint.y}`);
        } else {
            // Default spawn
            this.spawnPoint = {
                x: 200,
                y: 600
            };
            console.log(`🌍 📊 Using default spawn: x=${this.spawnPoint.x}, y=${this.spawnPoint.y}`);
        }
        
        console.log(`🌍 ✅ Spawn point set: ${this.spawnPoint.x}, ${this.spawnPoint.y}`);
    }

    /**
     * Get spawn point
     * @returns {Object} Spawn point coordinates
     */
    getSpawnPoint() {
        const point = this.spawnPoint || { x: 200, y: 600 };
        console.log(`🌍 📊 getSpawnPoint returning: x=${point.x}, y=${point.y}`);
        return point;
    }

    /**
     * Switch to a different world
     * @param {string} worldId - World identifier
     */
    switchWorld(worldId) {
        console.log(`🌍 Switching to world: ${worldId}`);
        
        // Hide current world
        if (this.currentWorld) {
            this.hideWorld(this.currentWorld);
        }
        
        // Show new world
        this.showWorld(worldId);
        this.currentWorld = worldId;
    }

    /**
     * Hide world
     * @param {string} worldId - World identifier
     */
    hideWorld(worldId) {
        const world = this.worlds.get(worldId);
        if (!world || !world.loaded) return;
        
        world.segments.forEach(segmentSprite => {
            segmentSprite.setVisible(false);
        });
        
        world.active = false;
        console.log(`🌍 Hidden world: ${worldId}`);
    }

    /**
     * Show world
     * @param {string} worldId - World identifier
     */
    showWorld(worldId) {
        const world = this.worlds.get(worldId);
        if (!world || !world.loaded) return;
        
        world.segments.forEach(segmentSprite => {
            segmentSprite.setVisible(true);
        });
        
        world.active = true;
        console.log(`🌍 Shown world: ${worldId}`);
    }

    /**
     * Update world based on camera position
     * @param {number} cameraX - Current camera X position
     */
    updateWorld(cameraX) {
        if (!this.currentWorld) return;
        
        const world = this.worlds.get(this.currentWorld);
        if (!world || !world.loaded) return;
        
        const config = world.config;
        
        // Update segment visibility
        if (config.segments) {
            config.segments.forEach(segment => {
                const segmentSprite = world.segments.get(segment.index);
                if (!segmentSprite) return;
                
                const segmentLeft = segment.x_position;
                const segmentRight = segmentLeft + segment.width;
                
                const cameraLeft = cameraX - this.loadDistance;
                const cameraRight = cameraX + this.loadDistance;
                
                const shouldBeVisible = segmentRight > cameraLeft && segmentLeft < cameraRight;
                
                if (shouldBeVisible && !segmentSprite.visible) {
                    segmentSprite.setVisible(true);
                } else if (!shouldBeVisible && segmentSprite.visible) {
                    segmentSprite.setVisible(false);
                }
            });
        }
    }

    /**
     * Get current world
     * @returns {string} Current world ID
     */
    getCurrentWorld() {
        return this.currentWorld;
    }

    /**
     * Check if world is loaded
     * @param {string} worldId - World identifier
     * @returns {boolean} True if loaded
     */
    isWorldLoaded(worldId) {
        const world = this.worlds.get(worldId);
        return world && world.loaded;
    }

    /**
     * Get world configuration
     * @param {string} worldId - World identifier
     * @returns {Object} World configuration
     */
    getWorldConfig(worldId) {
        const world = this.worlds.get(worldId);
        return world ? world.config : null;
    }

    /**
     * Destroy world manager
     */
    destroy() {
        this.worlds.forEach(world => {
            world.segments.forEach(segmentSprite => {
                segmentSprite.destroy();
            });
        });
        
        this.activeLayers.forEach(layerGroup => {
            layerGroup.destroy();
        });
        
        this.worlds.clear();
        this.activeLayers.clear();
        this.currentWorld = null;
        
        console.log('🌍 World manager destroyed');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorldManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.WorldManager = WorldManager;
}
