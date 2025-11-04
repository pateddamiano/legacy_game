// ========================================
// ENVIRONMENT MANAGER
// ========================================
// Manages all environmental elements: backgrounds, parallax layers, perspective scaling
// Handles world setup, visual depth effects, and scene atmosphere

class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        
        // Environment layers
        this.cityscapeLayer = null;
        this.streetLayer = null;
        
        // World configuration - read from centralized WORLD_CONFIG
        this.worldWidth = WORLD_CONFIG.width;
        this.worldHeight = WORLD_CONFIG.height;
        
        // Street/movement boundaries - read from centralized WORLD_CONFIG
        this.streetTopLimit = WORLD_CONFIG.streetTopLimit;
        this.streetBottomLimit = WORLD_CONFIG.streetBottomLimit;

        // Apply level-specific adjustments
        this.applyLevelSpecificBounds();
        
        // Perspective settings (back to original scale)
        this.perspectiveConfig = {
            minScale: 2.2,      // Scale at top of street (buildings)
            maxScale: 2.8,      // Scale at bottom of street (camera)
            scaleRange: null    // Calculated automatically
        };
        
        this.perspectiveConfig.scaleRange = this.perspectiveConfig.maxScale - this.perspectiveConfig.minScale;
        
        console.log('🌍 EnvironmentManager initialized!');
    }
    
    // ========================================
    // WORLD SETUP
    // ========================================
    
    initializeWorld() {
        // Set world bounds for physics and camera (only if not already set by WorldManager)
        const currentBounds = this.scene.physics.world.bounds;
        if (currentBounds.width <= this.worldWidth) {
            // Bounds haven't been set to level-specific values yet, use defaults
            this.scene.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        } else {
            // Bounds were already set by WorldManager, use those
            console.log(`🌍 Using existing world bounds set by WorldManager: ${currentBounds.width}x${currentBounds.height}`);
        }
        
        // Create all background layers
        this.createParallaxBackgrounds();
        
        console.log(`🌍 World initialized: ${this.worldWidth}x${this.worldHeight}`);
        console.log(`🛣️ Street limits: ${this.streetTopLimit} - ${this.streetBottomLimit}`);
    }

    /**
     * Apply level-specific boundary adjustments
     */
    applyLevelSpecificBounds() {
        // Check if we're in level 2 and adjust bounds
        if (this.scene && this.scene.selectedLevelId === 2) {
            console.log('🌍 Applying level 2 specific street bounds');
            this.streetTopLimit = 350;    // Highest point on screen (let player go higher)
            this.streetBottomLimit = 527; // Lowest point on screen
            console.log(`🛣️ Level 2 street limits: ${this.streetTopLimit} - ${this.streetBottomLimit}`);
        }
    }
    
    // ========================================
    // BACKGROUND SYSTEM
    // ========================================
    
    createParallaxBackgrounds() {
        // DISABLED: Background layers are now created in GameScene
        // This prevents duplicate background systems from interfering
        console.log('🎨 Parallax backgrounds creation skipped (handled by GameScene)');
        return;
        
        // Create background layers in order (back to front)
        this.createCityscapeLayer();
        this.createStreetLayer();
        
        console.log('🎨 Parallax backgrounds created');
    }
    
    createCityscapeLayer() {
        // Get cityscape texture dimensions (restored from original)
        const cityscapeTexture = this.scene.textures.get('cityscape');
        const textureWidth = cityscapeTexture.source[0].width;
        const textureHeight = cityscapeTexture.source[0].height;
        
        // Scale to fit game height (720px) - original logic
        const scale = 720 / textureHeight;
        const scaledWidth = textureWidth * scale;
        
        // Create enough copies for parallax scrolling
        const numCopies = Math.ceil(this.worldWidth / scaledWidth) + 2;
        
        this.cityscapeLayer = this.scene.add.group();
        
        for (let i = 0; i < numCopies; i++) {
            const cityscape = this.scene.add.image(i * scaledWidth, 150, 'cityscape');
            cityscape.setOrigin(0.5, 0.5);
            cityscape.setScale(scale);
            cityscape.setDepth(-200); // Far background
            cityscape.setScrollFactor(0.3, 1);
            
            this.cityscapeLayer.add(cityscape);
        }
        
        console.log(`🏙️ Cityscape: ${textureWidth}x${textureHeight}, Scale: ${scale}, Scaled width: ${scaledWidth}`);
    }
    
    createStreetLayer() {
        // Get street texture dimensions (restored from original)
        const streetTexture = this.scene.textures.get('street');
        const textureWidth = streetTexture.source[0].width;
        const textureHeight = streetTexture.source[0].height;
        
        // Scale to fit game height (720px) - original logic
        const scale = 720 / textureHeight;
        const scaledWidth = textureWidth * scale;
        
        // Create enough copies for seamless scrolling
        const numCopies = Math.ceil(this.worldWidth / scaledWidth) + 1;
        
        this.streetLayer = this.scene.add.group();
        
        for (let i = 0; i < numCopies; i++) {
            const street = this.scene.add.image(i * scaledWidth, 360, 'street');
            street.setOrigin(0.5, 0.5);
            street.setScale(scale);
            street.setDepth(-100); // Foreground background
            street.setScrollFactor(1.0, 1);
            
            this.streetLayer.add(street);
        }
        
        console.log(`🛣️ Street: ${textureWidth}x${textureHeight}, Scale: ${scale}, Scaled width: ${scaledWidth}`);
    }
    
    // ========================================
    // PERSPECTIVE SYSTEM
    // ========================================
    
    updatePerspective(sprite) {
        if (!sprite || !sprite.y) return;
        
        // Calculate scale based on Y position (depth illusion)
        // Characters higher up (lower Y) appear smaller (further away)
        // Characters lower down (higher Y) appear larger (closer)
        
        const yPosition = sprite.y;
        const streetRange = this.streetBottomLimit - this.streetTopLimit;
        
        // Clamp Y position to street boundaries
        const clampedY = Phaser.Math.Clamp(yPosition, this.streetTopLimit, this.streetBottomLimit);
        
        // Calculate progress through the street (0 = top/far, 1 = bottom/near)
        const depthProgress = (clampedY - this.streetTopLimit) / streetRange;
        
        // Calculate scale (linear interpolation)
        const scale = this.perspectiveConfig.minScale + (depthProgress * this.perspectiveConfig.scaleRange);
        
        // Apply scale to sprite
        sprite.setScale(scale);
        
        return scale;
    }
    
    // Batch update perspective for multiple sprites
    updateMultiplePerspectives(sprites) {
        sprites.forEach(sprite => {
            if (sprite && sprite.active) {
                this.updatePerspective(sprite);
            }
        });
    }
    
    // ========================================
    // WORLD BOUNDARIES
    // ========================================
    
    getStreetBounds() {
        return {
            top: this.streetTopLimit,
            bottom: this.streetBottomLimit,
            left: 0,
            right: this.worldWidth
        };
    }
    
    isWithinStreetBounds(x, y) {
        return (
            x >= 0 && 
            x <= this.worldWidth && 
            y >= this.streetTopLimit && 
            y <= this.streetBottomLimit
        );
    }
    
    clampToStreetBounds(x, y) {
        return {
            x: Phaser.Math.Clamp(x, 0, this.worldWidth),
            y: Phaser.Math.Clamp(y, this.streetTopLimit, this.streetBottomLimit)
        };
    }
    
    // ========================================
    // VISUAL EFFECTS
    // ========================================
    
    // Add atmospheric effects (fog, particles, etc.)
    addAtmosphericEffects() {
        // This could be expanded with weather effects, particles, lighting
        console.log('🌫️ Atmospheric effects ready for implementation');
    }
    
    // Dynamic lighting system (future expansion)
    setTimeOfDay(timeOfDay) {
        // Could adjust tints and lighting based on time
        const lightingEffects = {
            dawn: { tint: 0xffaa88, alpha: 0.3 },
            day: { tint: 0xffffff, alpha: 0 },
            dusk: { tint: 0xff8844, alpha: 0.4 },
            night: { tint: 0x4444ff, alpha: 0.6 }
        };
        
        if (lightingEffects[timeOfDay]) {
            console.log(`🌅 Time of day set to: ${timeOfDay}`);
            // Implementation would apply tints to background layers
        }
    }
    
    // ========================================
    // CAMERA INTEGRATION
    // ========================================
    
    setupCameraForEnvironment(camera, targetSprite) {
        console.log(`📷 EnvironmentManager.setupCameraForEnvironment called - worldWidth: ${this.worldWidth}`);
        // Set camera bounds to world size (only if not already set to larger bounds)
        const currentBounds = camera.getBounds();
        console.log(`📷 Current camera bounds: ${currentBounds ? `${currentBounds.x}-${currentBounds.x+currentBounds.width} (${currentBounds.width}px)` : 'none'}`);

        // Only set camera bounds if they haven't been set to a reasonable level-specific size
        // Since levels now define their own bounds in JSON, we should preserve those
        if (!currentBounds || currentBounds.width <= 5000) {  // Only override if bounds are very small (likely default)
            console.log(`📷 OVERRIDE: Setting camera bounds to world size: ${this.worldWidth}x${this.worldHeight} (condition: ${!currentBounds ? 'no bounds' : `${currentBounds.width} <= 5000`})`);
            console.log(`📷 OVERRIDE: Previous bounds were: ${currentBounds ? `${currentBounds.x}-${currentBounds.x+currentBounds.width} (${currentBounds.width}px)` : 'none'}`);
            camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
            const newBounds = camera.getBounds();
            console.log(`📷 OVERRIDE: Camera bounds now set to: ${newBounds.x}-${newBounds.x+newBounds.width} (${newBounds.width}px)`);
        } else {
            console.log(`📷 Preserving existing camera bounds: ${currentBounds.width}x${currentBounds.height} (likely set by level system)`);
        }
        
        // Follow target sprite with smooth camera movement
        if (targetSprite) {
            camera.startFollow(targetSprite, true, 0.1, 0);
        }
        
        console.log('📹 Camera configured for environment');
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    getEnvironmentInfo() {
        return {
            worldSize: { width: this.worldWidth, height: this.worldHeight },
            streetBounds: this.getStreetBounds(),
            perspectiveConfig: { ...this.perspectiveConfig },
            layerCounts: {
                cityscape: this.cityscapeLayer ? this.cityscapeLayer.children.size : 0,
                street: this.streetLayer ? this.streetLayer.children.size : 0
            }
        };
    }
    
    // Performance optimization: cull off-screen background elements
    cullOffscreenElements(camera) {
        const bounds = camera.worldView;
        
        // This could be implemented to hide background elements outside camera view
        // for performance optimization in larger worlds
    }
    
    // Update method called from main game loop
    update(camera) {
        // Any per-frame environment updates would go here
        // For now, most environment is static after creation
        
        // Future: animated background elements, parallax adjustments, etc.
    }
    
    // ========================================
    // CLEANUP
    // ========================================
    
    destroy() {
        if (this.cityscapeLayer) {
            this.cityscapeLayer.destroy(true);
        }
        if (this.streetLayer) {
            this.streetLayer.destroy(true);
        }
        
        console.log('🗑️ EnvironmentManager destroyed');
    }
}

// Make EnvironmentManager available globally
window.EnvironmentManager = EnvironmentManager;