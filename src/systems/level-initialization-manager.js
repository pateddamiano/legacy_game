// ========================================
// LEVEL INITIALIZATION MANAGER
// ========================================
// Coordinates level loading, initialization, and parallax background creation

class LevelInitializationManager {
    constructor(scene, worldManager, levelManager, environmentManager, inputManager, eventManager, audioManager) {
        this.scene = scene;
        this.worldManager = worldManager;
        this.levelManager = levelManager;
        this.environmentManager = environmentManager;
        this.inputManager = inputManager;
        this.eventManager = eventManager;
        this.audioManager = audioManager;
        
        // State
        this.parallaxBackground = null;
        this.selectedLevelId = 1;
        this.currentLevelJson = null; // Store the current level JSON config
        
        console.log('🎮 LevelInitializationManager initialized');
    }
    
    // ========================================
    // LEVEL INITIALIZATION
    // ========================================
    
    async initializeLevel(levelId, onComplete) {
        this.selectedLevelId = levelId;
        console.log('🎮 Initializing unified level system...');
        
        // Try JSON-based level system first
        if (window.LevelRegistry && window.LevelAssetLoader && window.WorldFactory) {
            const registry = window.LevelRegistry.getInstance();
            const levelJson = await registry.ensureLevelLoaded(this.scene, levelId);
            if (levelJson) {
                console.log('🎮 JSON level detected:', levelJson.name);
                await this.loadLevelFromJSON(levelJson);
                if (onComplete) {
                    onComplete();
                }
                return;
            }
            // Fallback to config-based system
            this.loadLevelFromConfig();
            if (onComplete) {
                onComplete();
            }
            return;
        }
        
        // Use config-based level system
        this.loadLevelFromConfig();
        if (onComplete) {
            onComplete();
        }
    }
    
    onLevelInitializationComplete(characterManager, animationSetupManager, updateLevelDisplay) {
        console.log('🎯 Level initialization complete, creating characters and finalizing setup...');
        
        // Apply level-specific environment adjustments
        this.environmentManager.applyLevelSpecificBounds();
        
        // Update street bounds after level-specific adjustments
        const updatedStreetBounds = this.environmentManager.getStreetBounds();
        const streetTopLimit = updatedStreetBounds.top;
        const streetBottomLimit = updatedStreetBounds.bottom;
        this.inputManager.setStreetBounds(streetTopLimit, streetBottomLimit);
        console.log(`🎯 GameScene: Updated street bounds for level ${this.selectedLevelId}: ${streetTopLimit} - ${streetBottomLimit}`);
        
        // Create parallax background AFTER world is initialized (so we have correct bounds)
        this.createParallaxBackgroundFromConfig();
        
        // Set camera background to transparent so parallax shows through
        this.scene.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
        
        // Create both character sprites (only active one will be visible)
        // This now happens AFTER the world and spawn point are properly set up
        characterManager.createCharacters();
        console.log(`🎯 Both characters created, active: ${characterManager.getActiveCharacterName()}`);
        
        // Update camera bounds to match the loaded world (use actual physics world bounds)
        if (this.scene.physics && this.scene.physics.world && this.scene.physics.world.bounds) {
            const worldBounds = this.scene.physics.world.bounds;
            this.scene.cameras.main.setBounds(worldBounds.x, worldBounds.y, worldBounds.width, worldBounds.height);
            console.log(`🎯 Camera bounds set to match physics world: x=${worldBounds.x}, y=${worldBounds.y}, width=${worldBounds.width}, height=${worldBounds.height}`);
        } else {
            // Fallback if physics world bounds not available
            const worldWidth = 1200;
            const worldHeight = 720;
            this.scene.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        }
        
        return { streetTopLimit, streetBottomLimit };
    }
    
    async loadLevelFromJSON(levelJson) {
        console.log(`🎯 LEVEL ${levelJson.id} LOADING:`, levelJson.name);
        
        // Store the current level JSON config for parallax background access
        this.currentLevelJson = levelJson;
        
        // Load assets for this level
        await window.LevelAssetLoader.ensureLoaded(this.scene, levelJson);
        
        // Create world
        await window.WorldFactory.create(this.scene, levelJson);
        
        // World and spawn point are now set up
        // Character creation will happen in onLevelInitializationComplete()
        console.log(`🎯 Level ${levelJson.id} world created successfully`);
        
        // Register events
        if (this.eventManager && Array.isArray(levelJson.events)) {
            this.eventManager.registerEvents(levelJson.events);
        }
        
        // Start music
        if (this.audioManager && levelJson.audio && levelJson.audio.music) {
            const musicVolume = levelJson.audio.musicVolume !== undefined ? 
                levelJson.audio.musicVolume : null; // null = use default
            this.audioManager.playBackgroundMusic(levelJson.audio.music, true, musicVolume);
        }
        
        console.log(`🎯 LEVEL ${levelJson.id} LOADED SUCCESSFULLY`);
    }
    
    loadLevelFromConfig() {
        console.log('🎮 Loading level from config (fallback)...');
        
        // Check if we have any configs
        if (!window.LEVEL_CONFIGS || window.LEVEL_CONFIGS.length === 0) {
            console.error('🎮 No level configs available! JSON system should be handling levels.');
            console.error('🎮 Check that LevelRegistry, LevelAssetLoader, and WorldFactory are loaded.');
            return;
        }
        
        // Find level config
        const levelIndex = window.LEVEL_CONFIGS.findIndex(l => l.id === this.selectedLevelId);
        console.log(`🎮 📊 Loading level with id=${this.selectedLevelId}, found at index=${levelIndex}`);
        
        if (levelIndex < 0) {
            console.error(`🎮 Level with id ${this.selectedLevelId} not found in fallback configs!`);
            console.error('🎮 JSON level system should handle all level loading.');
            return;
        }
        
        const levelConfig = window.LEVEL_CONFIGS[levelIndex];
        
        // Load level through LevelManager (handles world, enemies, etc.)
        if (this.levelManager.loadLevel(levelIndex)) {
            console.log(`🎮 Level ${levelConfig.name} loaded successfully`);
            
            // Register events from config
            if (this.eventManager && levelConfig.events) {
                this.eventManager.registerEvents(levelConfig.events);
            }
        } else {
            console.error(`🎮 Failed to load level ${levelConfig.name}`);
        }
    }
    
    // ========================================
    // PARALLAX BACKGROUND
    // ========================================
    
    createParallaxBackground() {
        console.log('🌍 Creating parallax background...');
        
        // Check if texture exists
        if (!this.scene.textures.exists('parallax_background')) {
            console.error('🌍 Parallax background texture not found!');
            console.log('🌍 Available textures:', Object.keys(this.scene.textures.list).slice(0, 20));
            return;
        }
        
        const texture = this.scene.textures.get('parallax_background');
        const textureWidth = texture.source[0].width;
        const textureHeight = texture.source[0].height;
        
        console.log(`🌍 Parallax texture dimensions: ${textureWidth}x${textureHeight}`);
        
        // Get world width from world bounds
        const worldWidth = (this.scene.physics && this.scene.physics.world && this.scene.physics.world.bounds) ? this.scene.physics.world.bounds.width : 1200;
        console.log(`🌍 World width: ${worldWidth}px`);
        
        // Create a tileSprite that will repeat the texture
        const tileSprite = this.scene.add.tileSprite(
            0,                    // x
            -360,                 // y (raised up by 50% of 720 = 360px)
            worldWidth * 2,       // width (make it wider than world)
            720,                  // height
            'parallax_background' // texture key
        );
        
        tileSprite.setOrigin(0, 0);
        tileSprite.setDepth(-200); // Behind segments (-100)
        tileSprite.setScrollFactor(0.2);
        tileSprite.setAlpha(0.8); // Slight transparency for blending
        
        console.log(`🌍 TileSprite properties:`, {
            x: tileSprite.x,
            y: tileSprite.y,
            width: tileSprite.width,
            height: tileSprite.height,
            depth: tileSprite.depth,
            visible: tileSprite.visible,
            alpha: tileSprite.alpha,
            scrollFactorX: tileSprite.scrollFactorX,
            scrollFactorY: tileSprite.scrollFactorY
        });
        
        // Store reference for potential animation
        this.parallaxBackground = tileSprite;
        
        console.log('🌍 Parallax tileSprite created successfully!');
    }
    
    createParallaxBackgroundFromConfig() {
        // Clear any existing parallax background first
        if (this.parallaxBackground) {
            console.log('🌍 Clearing existing parallax background...');
            this.parallaxBackground.destroy();
            this.parallaxBackground = null;
        }
        
        // Get current level config - prefer JSON config if available
        let currentLevelConfig = this.currentLevelJson;
        if (!currentLevelConfig) {
            // Fallback to level manager config
            currentLevelConfig = this.levelManager.getCurrentLevelConfig();
        }
        
        if (!currentLevelConfig) {
            console.error('🌍 No current level config found for parallax background!');
            return;
        }
        
        const parallaxTexture = currentLevelConfig.parallaxTexture;
        if (!parallaxTexture) {
            console.log('🌍 No parallax texture specified in level config, skipping...');
            return;
        }
        
        console.log(`🌍 Creating parallax background from config: ${parallaxTexture}`);
        
        // Check if texture exists
        if (!this.scene.textures.exists(parallaxTexture)) {
            console.error(`🌍 Parallax background texture '${parallaxTexture}' not found!`);
            console.log('🌍 Available textures:', Object.keys(this.scene.textures.list).slice(0, 20));
            return;
        }
        
        const texture = this.scene.textures.get(parallaxTexture);
        const textureWidth = texture.source[0].width;
        const textureHeight = texture.source[0].height;
        
        console.log(`🌍 Parallax texture dimensions: ${textureWidth}x${textureHeight}`);
        
        // Get world width from world bounds
        const worldWidth = (this.scene.physics && this.scene.physics.world && this.scene.physics.world.bounds) ? this.scene.physics.world.bounds.width : 1200;
        console.log(`🌍 World width: ${worldWidth}px`);
        
        // Create a tileSprite that will repeat the texture
        const scale = 1.2; // Scale up the background
        const tileSprite = this.scene.add.tileSprite(
            0,                    // x
            -360,                 // y (moved down from -360 to -200)
            worldWidth * 2,       // width (make it wider than world)
            720,                  // height
            parallaxTexture       // texture key from config
        );
        
        tileSprite.setOrigin(0, 0);
        tileSprite.setScale(scale); // Scale up the background
        tileSprite.setDepth(-200); // Behind segments (-100)
        tileSprite.setScrollFactor(0.2);
        tileSprite.setAlpha(0.8); // Slight transparency for blending
        
        console.log(`🌍 TileSprite properties:`, {
            x: tileSprite.x,
            y: tileSprite.y,
            width: tileSprite.width,
            height: tileSprite.height,
            depth: tileSprite.depth,
            visible: tileSprite.visible,
            alpha: tileSprite.alpha,
            scrollFactorX: tileSprite.scrollFactorX,
            scrollFactorY: tileSprite.scrollFactorY
        });
        
        // Store reference for potential animation
        this.parallaxBackground = tileSprite;
        
        console.log('🌍 Parallax tileSprite created successfully!');
    }
    
    // ========================================
    // TEST LEVEL SETUP
    // ========================================
    
    setupTestLevel(enemySpawnManager, debugManager, eventManager) {
        console.log('🧪 Setting up test level...');
        
        // Load test level world (same as level 1)
        // Note: This method would need to be implemented or passed as callback
        // For now, we'll assume it's handled elsewhere
        
        // Disable enemy spawning completely
        if (enemySpawnManager) {
            enemySpawnManager.setMaxEnemies(0);
            enemySpawnManager.setSpawnInterval(999999);
            enemySpawnManager.setIsTestMode(true);
        }
        
        // Register events from test level config
        if (typeof window.TEST_LEVEL_CONFIG !== 'undefined' && window.TEST_LEVEL_CONFIG.events && eventManager) {
            console.log('🧪 Registering test level events...');
            eventManager.registerEvents(window.TEST_LEVEL_CONFIG.events);
        }
        
        // Initialize debug overlay
        if (debugManager) {
            debugManager.createDebugOverlay();
            debugManager.setupCoordinateRecording();
        }
        
        console.log('🧪 Test level setup complete!');
        console.log('🧪 Controls:');
        console.log('  - R: Record current position');
        console.log('  - D: Toggle debug overlay');
        console.log('  - G: Toggle grid overlay');
        console.log('🧪 Event: Move to x=8081 to trigger the critic event');
    }
}

