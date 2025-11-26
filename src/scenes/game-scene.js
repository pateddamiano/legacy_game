// ========================================
// MAIN GAME SCENE
// ========================================
// This file contains the primary game logic, player controls, and scene management

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.currentCharacterIndex = 0;
        this.currentCharacterConfig = ALL_CHARACTERS[this.currentCharacterIndex];
        this.autoSwitchThreshold = 40; // Auto-switch when health drops below 40%
    }

    init(data) {
        // Clear persistent state from previous runs to prevent stale references
        this.player = null;
        this.enemies = [];
        this.bosses = [];
        this.eventPlayerBounds = null;
        this.touchControlsOverlay = null;
        
        // Check for debug mode and direct level loading
        if (window.DIRECT_LEVEL_LOAD && (window.TEST_LEVEL_ID !== undefined)) {
            // Load requested level directly
            this.selectedCharacter = data?.character || 'tireek';
            this.selectedLevelId = window.TEST_LEVEL_ID;
            console.log('%c🧪 DEBUG MODE: Loading level directly', 'color: #00ff00; font-weight: bold;', this.selectedLevelId);
        } else {
            // Receive data from scene manager (character and level info)
            this.selectedCharacter = data?.character || 'tireek';
            this.selectedLevelId = data?.levelId || 1;
        }
        
        console.log(`🎯 GameScene initialized with starting character: ${this.selectedCharacter}, level: ${this.selectedLevelId}`);
        
        // Set current character based on selection
        this.currentCharacterConfig = ALL_CHARACTERS.find(char => char.name === this.selectedCharacter) || ALL_CHARACTERS[0];
        this.currentCharacterIndex = ALL_CHARACTERS.findIndex(char => char.name === this.selectedCharacter);
        
        // Update game state
        window.gameState.currentGame.character = this.selectedCharacter;
        window.gameState.currentGame.levelId = this.selectedLevelId;
        
        // Apply preserved score if passed (from Game Over restart)
        if (data && data.preservedScore !== undefined) {
            this.playerScore = data.preservedScore;
            console.log(`🔄 Restored score from Game Over: ${this.playerScore}`);
        } else {
            this.playerScore = 0;
        }

        // Store the score at the start of the level to restore it on Game Over
        // If startOfLevelScore is passed (from previous restart), keep it. Otherwise, use current (0 or carried over).
        this.startOfLevelScore = (data && data.startOfLevelScore !== undefined) ? data.startOfLevelScore : this.playerScore;
        console.log(`💾 Level start score recorded: ${this.startOfLevelScore}`);
        
        // Check if this is a Game Over restart
        this.isGameOverRestart = data?.isGameOverRestart || false;
        if (this.isGameOverRestart) {
            console.log('🔄 Game Over restart detected - will skip event auto-triggers');
        }
        
        // Initialize debug/testing mode
        this.isTestMode = window.DEBUG_MODE || this.selectedLevelId === 'test' || window.LEVEL_TEST_MODE === true;
        this.coordinateRecordingEnabled = this.isTestMode || window.DEBUG_MODE;
        this.debugOverlayVisible = this.isTestMode;
        
        // Store initialization data for CharacterManager (initialized in create())
        this._characterInitData = {
            selectedCharacter: this.selectedCharacter,
            selectedLevelId: this.selectedLevelId
        };
    }

    preload() {
        // Assets are now loaded in PreloadScene, so this is minimal
        console.log('🎯 GameScene: Assets already loaded, initializing systems...');

        // Initialize weapon system (needs scene reference)
        // uiScene will be set later in create(), so pass null for now
        this.weaponManager = new WeaponManager(this, null);
        
        // Initialize effect system (needs scene reference for loading)
        this.effectSystem = new EffectSystem(this);
        this.effectSystem.loadEffectAssets();
    }
    
    // Old loading methods removed - assets now loaded in PreloadScene
    
    // ========================================
    // MANAGER INITIALIZATION
    // ========================================
    
    initializeManagers() {
        console.log('🎮 Initializing all managers...');
        
        // Core managers
        this.gameStateManager = new GameStateManager(this);
        this.environmentManager = new EnvironmentManager(this);
        this.audioManager = new AudioManager(this);
        
        // NOTE: UIManager initialization moved to create() method after uiScene is launched
        // to ensure uiScene is available before initializing UIManager
        
        // Create UnifiedInputController before InputManager
        this.unifiedInputController = new UnifiedInputController();
        
        // Initialize InputManager with UnifiedInputController
        this.inputManager = new InputManager(this, this.unifiedInputController);
        
        // World and level management
        this.worldManager = new WorldManager(this);
        this.levelManager = new LevelManager(this);
        
        // Gameplay systems
        // DialogueManager will be initialized after uiScene is available
        this.sceneElementManager = new SceneElementManager(this);
        this.itemPickupManager = new ItemPickupManager(this);
        this.eventManager = new EventManager(this);
        this.extrasManager = new ExtrasManager(this);
        
        // Initialize enemy arrays before EnemySpawnManager
        this.enemies = [];
        this.bosses = [];
        
        // Initialize EnemySpawnManager (needs enemies array and weapon/item managers)
        this.enemySpawnManager = new EnemySpawnManager(this, this.enemies, this.weaponManager, this.itemPickupManager);
        
        // NEW: Refactored managers
        this.characterManager = new CharacterManager(this);
        this.animationSetupManager = new AnimationSetupManager(this);
        
        // Initialize checkpoint and lives systems
        this.checkpointManager = new CheckpointManager(this);
        this.livesManager = new LivesManager(this);
        // Note: effectSystem initialized in preload() for asset loading
        this.levelInitializationManager = new LevelInitializationManager(
            this,
            this.worldManager,
            this.levelManager,
            this.environmentManager,
            this.inputManager,
            this.eventManager,
            this.audioManager
        );
        
        // Initialize level transition manager (needs all other managers)
        this.levelTransitionManager = new LevelTransitionManager(this);
        this.levelTransitionManager.initialize({
            livesManager: this.livesManager,
            characterManager: this.characterManager,
            enemySpawnManager: this.enemySpawnManager,
            weaponManager: this.weaponManager,
            itemPickupManager: this.itemPickupManager,
            eventManager: this.eventManager,
            audioManager: this.audioManager,
            levelInitializationManager: this.levelInitializationManager,
            worldManager: this.worldManager,
            uiManager: this.uiManager
        });
        
        console.log('🎮 All managers initialized');
    }

    async create() {
        console.log(`🎯 GameScene: Creating level ${this.selectedLevelId} with ${this.selectedCharacter}`);
        
        // Launch and get reference to UI Scene
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        this.uiScene = this.scene.get('UIScene');
        
        // Launch touch controls scene that renders overlay UI above everything
        if (!this.scene.isActive('TouchControlsScene')) {
            this.scene.launch('TouchControlsScene');
        }
        this.touchControlsScene = this.scene.get('TouchControlsScene');
        
        // Ensure ordering: GameScene < UIScene < TouchControlsScene
        this.scene.bringToTop('UIScene');
        this.scene.bringToTop('TouchControlsScene');
        
        // Apply responsive layout with fixed virtual dimensions
        this.virtualWidth = 1200;
        this.virtualHeight = 720;
        LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
        
        // Handle window resizing
        this.scale.on('resize', (gameSize) => {
            console.log('📏 Resizing GameScene...');
            LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
        });
        
        // No loading needed - assets already loaded in PreloadScene
        this.isLoading = false;
        
        // Initialize all managers (except UIManager, which needs uiScene)
        this.initializeManagers();
        
        // Initialize UI Manager AFTER uiScene is available
        this.uiManager = new UIManager(this, this.uiScene);
        
        // Initialize DialogueManager AFTER uiScene is available (needs uiScene for positioning)
        this.dialogueManager = new DialogueManager(this, this.uiScene);
        
        // Initialize TouchControlsOverlay AFTER uiScene is available
        if (window.TouchControlsOverlay && this.unifiedInputController) {
            // Destroy existing overlay if it exists (cleanup from previous run)
            if (this.touchControlsOverlay) {
                console.log('📱 Cleaning up existing touch controls overlay...');
                this.touchControlsOverlay.destroy();
                this.touchControlsOverlay = null;
            }
            
            this.touchControlsOverlay = new TouchControlsOverlay(
                this,
                this.uiScene,
                this.unifiedInputController,
                this.touchControlsScene
            );
            this.touchControlsOverlay.create();
            
            // Set visibility based on DeviceManager
            if (window.DeviceManager) {
                const shouldShow = window.DeviceManager.shouldShowTouchControls();
                this.touchControlsOverlay.setVisible(shouldShow);
                console.log(`📱 Touch controls overlay ${shouldShow ? 'shown' : 'hidden'}`);
            }
        }
        
        // Update WeaponManager with uiScene reference (created in preload before uiScene was available)
        if (this.weaponManager) {
            this.weaponManager.uiScene = this.uiScene;
        }
        
        // Initialize CharacterManager with selected character
        this.characterManager.initialize(
            this._characterInitData.selectedCharacter,
            this._characterInitData.selectedLevelId,
            {
                uiManager: this.uiManager,
                audioManager: this.audioManager,
                worldManager: this.worldManager
            }
        );
        
        // Initialize environment (sets up world bounds and backgrounds)
        this.environmentManager.initializeWorld();
        
        // Get street limits from environment manager
        const streetBounds = this.environmentManager.getStreetBounds();
        this.streetTopLimit = streetBounds.top;
        this.streetBottomLimit = streetBounds.bottom;
        
        // Pass street bounds to input manager for vertical movement limits
        this.inputManager.setStreetBounds(this.streetTopLimit, this.streetBottomLimit);
        if (this.extrasManager) {
            this.extrasManager.setStreetBounds(this.streetTopLimit, this.streetBottomLimit);
        }
        console.log(`🎯 GameScene: Street bounds configured: ${this.streetTopLimit} - ${this.streetBottomLimit}`);
        
        // Initialize level system FIRST (loads world and sets spawn point)
        // Character creation now happens after level initialization completes
        await this.levelInitializationManager.initializeLevel(
            this.selectedLevelId,
            () => this.onLevelInitializationComplete()
        );
        
        // Set up camera properties
        this.cameras.main.roundPixels = true;

        // Input is now handled by InputManager

        // Create animations for all characters and enemies with a small delay to ensure assets are loaded
        this.time.delayedCall(100, () => {
            console.log('Creating animations...');
            // Create animations for all characters
            ALL_CHARACTERS.forEach(characterConfig => {
                this.animationSetupManager.createCharacterAnimations(characterConfig);
            });

            // Create animations for enemies
            ALL_ENEMY_TYPES.forEach(enemyConfig => {
                this.animationSetupManager.createCharacterAnimations(enemyConfig);
            });

            // Effect animations already created earlier (in onLevelInitializationComplete)

            // Start player idle animation
            this.player.anims.play(`${this.currentCharacterConfig.name}_idle`, true);
        });

        // Animation manager will be initialized after character creation
        
        // Initialize enemy system (using centralized config)
        // Note: enemySpawnManager is already initialized in initializeManagers()
        this.enemySpawnManager.initialize({
            maxEnemies: ENEMY_CONFIG.maxEnemiesOnScreen,
            spawnInterval: ENEMY_CONFIG.spawnInterval,
            isTestMode: this.isTestMode,
            isLoading: this.isLoading
        });
        
        // Initialize jump tracking
        this.isJumping = false;
        
        // Initialize player health system
        this.playerMaxHealth = 100;
        this.playerCurrentHealth = this.playerMaxHealth;
        
        // Initialize player score system
        this.playerScore = 0;
        
        // Initialize UI system  
        this.uiManager.initializeUI();
        
        // Initialize DebugManager if in test mode or debug mode
        // Always initialize for checkpoint navigation (developer feature)
        if (this.isTestMode || window.DEBUG_MODE) {
            console.log('🔍 [GameScene] Creating DebugManager (test/debug mode)');
            this.debugManager = new DebugManager(this);
            this.debugManager.initialize(this.isTestMode, this.coordinateRecordingEnabled, this.debugOverlayVisible);
            // Create debug graphics for hitbox visualization
            this.debugGraphics = this.add.graphics();
            this.debugManager.setDebugGraphics(this.debugGraphics);
        } else {
            // Still create debug manager for checkpoint navigation even if not in debug mode
            console.log('🔍 [GameScene] Creating DebugManager for checkpoint navigation (developer feature)');
            this.debugManager = new DebugManager(this);
            this.debugManager.initialize(false, false, false); // Not in test mode, but still get checkpoint nav
        }
        
        // Initialize health bar with full health (fix: bar wasn't showing initially)
        const activeChar = this.characterManager.getActiveCharacterData();
        this.uiManager.updateHealthBar(activeChar.health, activeChar.maxHealth);
        
        // Initialize dual character health display
        this.uiManager.updateDualCharacterHealth(
            this.characterManager.characters.tireek.health, 
            this.characterManager.characters.tryston.health, 
            this.characterManager.getActiveCharacterName()
        );
        
        // Remove the duplicate health bar creation since UI manager handles it
        // this.createHealthBar(); // Commented out - UI manager handles health bar
        
        // Initialize score display
        this.uiManager.updateScoreDisplay(this.playerScore);
        
        // Initialize lives system
        this.livesManager.initialize();
        this.uiManager.updateLivesDisplay(this.livesManager.getLives());
        
        // Initialize weapon system
        this.weaponManager.createWeaponAnimations();
        this.weaponManager.initializeWeapons();
        this.weaponManager.createWeaponUI();
        
        // Initialize item pickup system
        this.itemPickupManager.createParticleEffect();
        
        // Note: Level system and Level 1 world already initialized before createBothCharacters()
        
        // Start background music only for Level 1 here; other levels use LevelManager
        if (this.selectedLevelId === 1) {
            console.log('🎵 Starting background music for Level 1...');
            this.audioManager.playBackgroundMusic('fadeMusic');
        }
        
        // Start street ambiance for level 1
        console.log('🔊 Starting street ambiance...');
        this.audioManager.startAmbiance('streetAmbiance', 0.15);
        
        // Set up automatic fullscreen on first interaction (if not already requested)
        this.setupAutoFullscreen();
        
        // Fade in from black
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        console.log('🎬 Fading in to gameplay...');
    }
    
    setupAutoFullscreen() {
        // Request fullscreen on first user interaction (click or touch)
        // Only if not already requested and if auto-request is enabled
        if (window.FullscreenManager && 
            window.FullscreenManager.shouldAutoRequest && 
            !window.FullscreenManager.hasRequestedFullscreen) {
            
            // Listen to first input event
            const requestFullscreen = (pointer) => {
                if (window.FullscreenManager) {
                    window.FullscreenManager.requestFullscreenOnInteraction(pointer);
                }
                // Remove listeners after first request
                this.input.off('pointerdown', requestFullscreen);
                if (this.input.keyboard) {
                    this.input.keyboard.off('keydown', requestFullscreen);
                }
            };
            
            this.input.once('pointerdown', requestFullscreen);
            if (this.input.keyboard) {
                this.input.keyboard.once('keydown', requestFullscreen);
            }
            
            console.log('📱 GameScene: Auto-fullscreen trigger set up');
        }
    }

    initializeLevel1World() {
        console.log('🌍 Initializing Level 1 world...');
        
        // Load metadata
        const metadata = this.cache.json.get('level_1_metadata');
        if (!metadata) {
            console.error('🌍 Level 1 metadata not found!');
            return;
        }
        
        console.log('🌍 📊 Metadata loaded:', metadata);
        console.log('🌍 📊 Number of segments:', metadata.segments.length);
        metadata.segments.forEach((seg, i) => {
            console.log(`🌍 📊 Segment ${i}: x=${seg.x_position}, width=${seg.width}, filename=${seg.filename}`);
        });
        
        // Calculate spawn point (customized for Level 1 intro scene)
        const spawnX = 185;
        const spawnY = 512;
        console.log(`🌍 📊 Calculated spawn point: x=${spawnX}, y=${spawnY}`);
        
        // Register Level 1 world configuration
        const worldConfig = {
            segments: metadata.segments,
            metadataPath: 'assets/backgrounds/level_1_segments/metadata.json',
            spawnPoint: {
                x: spawnX,
                y: spawnY
            },
            bounds: {
                x: metadata.segments[0].x_position,
                y: 0,
                width: metadata.segments[metadata.segments.length - 1].x_position + 
                      metadata.segments[metadata.segments.length - 1].width - 
                      metadata.segments[0].x_position,
                height: 720
            }
        };
        
        console.log('🌍 📊 World config:', worldConfig);
        
        // Register and create the world
        this.worldManager.registerWorld('level_1', worldConfig);
        this.worldManager.createWorld('level_1');
        
        console.log('🌍 Level 1 world initialized successfully');
    }
    
    createParallaxBackground() {
        console.log('🌍 Creating parallax background...');

        // Check if texture exists
        if (!this.textures.exists('parallax_background')) {
            console.error('🌍 Parallax background texture not found!');
            console.log('🌍 Available textures:', Object.keys(this.textures.list).slice(0, 20));
            return;
        }

        const texture = this.textures.get('parallax_background');
        const textureWidth = texture.source[0].width;
        const textureHeight = texture.source[0].height;

        console.log(`🌍 Parallax texture dimensions: ${textureWidth}x${textureHeight}`);

        // Get world width from world bounds
        const worldWidth = (this.physics && this.physics.world && this.physics.world.bounds) ? this.physics.world.bounds.width : 1200;
        console.log(`🌍 World width: ${worldWidth}px`);

        // Create a tileSprite that will repeat the texture
        const tileSprite = this.add.tileSprite(
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

    // ========================================
    // DEPRECATED METHODS REMOVED
    // ========================================
    // The following methods have been moved to dedicated managers:
    // - Character management -> CharacterManager
    // - Combat system -> CombatManager
    // - Player physics -> PlayerPhysicsManager
    // - Enemy spawning -> EnemySpawnManager
    // - Animation setup -> AnimationSetupManager
    // - Debug features -> DebugManager
    // - Level initialization -> LevelInitializationManager
    
    playerTakeDamage(damage) {
        // Use CombatManager
        if (!this.combatManager) {
            console.error('CombatManager not initialized!');
            return;
        }

        this.combatManager.playerTakeDamage(
            damage,
            () => this.handleCharacterDown(),
            (forceSwitch) => {
                if (this.characterManager) {
                    const result = this.characterManager.switchCharacter(forceSwitch, this.animationManager, this.isJumping, this.eventCameraLocked || false);
                    if (result && result.success) {
                        this.player = result.newPlayer;
                        this.selectedCharacter = result.newCharacter;
                        this.currentCharacterConfig = this.characterManager.currentCharacterConfig;

                        // Ensure player sprite has characterConfig set (safety check)
                        if (!this.player.characterConfig) {
                            this.player.characterConfig = this.currentCharacterConfig;
                        }

                        // Reset jumping state (new character always starts on ground)
                        this.isJumping = false;
                        
                        // Update all managers with new player
                        this.animationManager = new AnimationStateManager(this.player);
                        this.animationSetupManager.setupAnimationEvents(this.currentCharacterConfig, this.player, this.animationManager, this.isJumping);
                        if (this.playerPhysicsManager) {
                            this.playerPhysicsManager.player = this.player;
                            this.playerPhysicsManager.animationManager = this.animationManager;
                            this.playerPhysicsManager.setIsJumping(false); // Reset jumping state in physics manager
                        }
                        if (this.combatManager) {
                            this.combatManager.player = this.player;
                            this.combatManager.animationManager = this.animationManager;
                        }
                        if (!this.eventCameraLocked) {
                            this.cameras.main.startFollow(this.player, true, 0.1, 0);
                        }
                    }
                }
            }
        );
    }
    
    handleCharacterDown() {
        // Use CharacterManager
        if (!this.characterManager) {
            console.error('CharacterManager not initialized!');
            return;
        }
        
        this.characterManager.handleCharacterDown(
            this.animationManager,
            this.isJumping,
            this.eventCameraLocked || false,
            () => {
                // Game over callback - handleGameOver is already called by handleCharacterDown
                // Just do any cleanup here if needed
                console.log("Game over handled - characters respawned");
            }
        );
        
        // Update player reference if character was switched
        this.player = this.characterManager.getActiveCharacter();
        this.selectedCharacter = this.characterManager.getActiveCharacterName();
        this.currentCharacterConfig = this.characterManager.currentCharacterConfig;
        
        // Update managers with new player if switched
        if (this.animationManager && this.player) {
            // Reset jumping state (new character always starts on ground)
            this.isJumping = false;
            
            // Ensure player sprite has characterConfig set (safety check)
            if (!this.player.characterConfig) {
                this.player.characterConfig = this.currentCharacterConfig;
                console.log('⚠️ Set characterConfig on player sprite after handleCharacterDown');
            }
            
            this.animationManager = new AnimationStateManager(this.player);
            if (this.animationSetupManager) {
                this.animationSetupManager.setupAnimationEvents(this.currentCharacterConfig, this.player, this.animationManager, this.isJumping);
            }
            if (this.playerPhysicsManager) {
                this.playerPhysicsManager.player = this.player;
                this.playerPhysicsManager.animationManager = this.animationManager;
                this.playerPhysicsManager.setIsJumping(false); // Reset jumping state in physics manager
            }
            if (this.combatManager) {
                this.combatManager.player = this.player;
                this.combatManager.animationManager = this.animationManager;
            }
        }
    }
    
    handlePlayerDeath() {
        // Legacy method - now handled by handleCharacterDown
        console.log("⚠️ handlePlayerDeath called - use handleCharacterDown instead");
        this.handleCharacterDown();
    }
    
    update(time, delta) {
        // Update character regeneration
        if (this.characterManager) {
            this.characterManager.update(delta);
        }
        
        // Update world manager (skip during level transitions)
        if (this.worldManager && this.player && !this.levelTransitionManager?.isTransitioning) {
            this.worldManager.updateWorld(this.player.x);
        }
        
        // Update animation state manager (only if initialized)
        if (this.animationManager) {
            this.animationManager.update(delta);
        }

        // Update touch controls overlay FIRST (sets button states)
        if (this.touchControlsOverlay) {
            this.touchControlsOverlay.update();
        }
        
        // Update dialogue manager (check for touch input)
        if (this.dialogueManager) {
            this.dialogueManager.update();
        }
        
        // Update input state (only if input manager is ready, not loading, and not disabled)
        if (this.inputManager && !this.isLoading && !this.inputManager.disabled) {
            this.inputManager.updateInputState();
            
            // Handle input and movement using managers
            this.handleInput();
            
            // Use PlayerPhysicsManager for movement, jumping, and animations
            // Skip if disabled (e.g., during level transitions)
            if (this.playerPhysicsManager && !this.playerPhysicsManager.disabled) {
                this.playerPhysicsManager.update(delta);
                // Update isJumping reference
                this.isJumping = this.playerPhysicsManager.getIsJumping();
            }
        }
        
        // Reset unified input controller "just pressed" flags AFTER handling input
        // This ensures button presses persist for the full frame cycle
        if (this.unifiedInputController) {
            this.unifiedInputController.update();
        }

        // Handle perspective scaling for player when not jumping
        if (!this.isJumping && this.playerPhysicsManager) {
            this.playerPhysicsManager.updatePerspective();
        }
        
        // Update perspective scaling for extras
        if (this.extrasManager) {
            this.extrasManager.updatePerspective();
        }
        
        // Update enemy system using EnemySpawnManager
        if (this.enemySpawnManager) {
            this.enemySpawnManager.update(time, delta);
            // Update player health reference for dynamic spawn rate
            const activeChar = this.characterManager ? this.characterManager.getActiveCharacterData() : null;
            if (activeChar) {
                this.playerCurrentHealth = activeChar.health;
                this.enemySpawnManager.setReferences(
                    this.player,
                    this.streetTopLimit,
                    this.streetBottomLimit,
                    this.eventCameraLocked || false,
                    this.playerCurrentHealth,
                    this.playerMaxHealth,
                    this.levelManager
                );
            }
        }
        
        // Update perspective scaling for all enemies (enemies handle their own perspective in update method)
        // NOTE: Removed duplicate environmentManager.updatePerspective() call - enemies already scale themselves
        // This was causing enemies to be scaled twice (once by enemy.updatePerspective, once by environmentManager)
        // which made them 2-3x larger than intended
        
        // Update weapon system
        this.weaponManager.update();
        
        // Update effect system (for moving effects like tornado)
        if (this.effectSystem) {
            this.effectSystem.update();
        }
        
        // Update item pickup system (only when not loading)
        if (!this.isLoading) {
            this.itemPickupManager.update(time, delta, this.player);
        }
        
        // Update scene element manager
        if (this.sceneElementManager) {
            this.sceneElementManager.update(time, delta);
        }
        
        // Update event manager (check for triggers)
        if (this.eventManager && this.player && this.physics && this.physics.world && this.physics.world.bounds) {
            const worldBounds = this.physics.world.bounds;
            this.eventManager.update(this.player.x, {
                x: worldBounds.x,
                width: worldBounds.width
            }, this.cameras.main);
        }
        
        // Update checkpoint progress
        if (this.checkpointManager && this.player && this.physics && this.physics.world && this.physics.world.bounds) {
            const worldBounds = this.physics.world.bounds;
            this.checkpointManager.checkProgress(this.player.x, worldBounds);
        }
        
        // Enforce player bounds if set by event system (skip during level transitions)
        if (this.eventPlayerBounds && this.player && !this.levelTransitionManager?.isTransitioning) {
            const bounds = this.eventPlayerBounds;
            const playerX = this.player.x;
            const playerY = this.player.y;

            // Log current bounds and player position
            // console.log('[bounds-playerpos] Checking player bounds:', bounds);
            // console.log(`[bounds-playerpos] Player position before clamp: x=${playerX}, y=${playerY}`);

            // Clamp X position
            if (bounds.minX !== null && playerX < bounds.minX) {
                // console.log(`[bounds-playerpos] Player x (${playerX}) < minX (${bounds.minX}) - clamping`);
                this.player.x = bounds.minX;
                if (this.player.body) {
                    this.player.body.setVelocityX(0);
                    // console.log('[bounds-playerpos] setVelocityX(0)');
                }
            }
            if (bounds.maxX !== null && playerX > bounds.maxX) {
                // console.log(`[bounds-playerpos] Player x (${playerX}) > maxX (${bounds.maxX}) - clamping`);
                this.player.x = bounds.maxX;
                if (this.player.body) {
                    this.player.body.setVelocityX(0);
                    // console.log('[bounds-playerpos] setVelocityX(0)');
                }
            }

            // Clamp Y position
            if (bounds.minY !== null && playerY < bounds.minY) {
                // console.log(`[bounds-playerpos] Player y (${playerY}) < minY (${bounds.minY}) - clamping`);
                this.player.y = bounds.minY;
                if (this.player.body) {
                    this.player.body.setVelocityY(0);
                    // console.log('[bounds-playerpos] setVelocityY(0)');
                }
            }
            if (bounds.maxY !== null && playerY > bounds.maxY) {
                // console.log(`[bounds-playerpos] Player y (${playerY}) > maxY (${bounds.maxY}) - clamping`);
                this.player.y = bounds.maxY;
                if (this.player.body) {
                    this.player.body.setVelocityY(0);
                    // console.log('[bounds-playerpos] setVelocityY(0)');
                }
            }

            // Log new player position after clamp
            // console.log(`[bounds-playerpos] Player position after clamp: x=${this.player.x}, y=${this.player.y}`);
        }
        
        // Check combat interactions using CombatManager
        if (this.combatManager) {
            // Ensure CombatManager has correct references (critical for level transitions/character switches)
            if (this.player && this.combatManager.player !== this.player) {
                console.log('🔄 Updating CombatManager player reference in update loop');
                this.combatManager.player = this.player;
            }
            if (this.animationManager && this.combatManager.animationManager !== this.animationManager) {
                console.log('🔄 Updating CombatManager animationManager reference in update loop');
                this.combatManager.animationManager = this.animationManager;
            }

            // SYNC ENEMIES: Ensure everyone is looking at the same enemies array
            // EnemySpawnManager is the source of truth as it manages the update loop
            if (this.enemySpawnManager) {
                const spawnManagerEnemies = this.enemySpawnManager.enemies;
                const sceneEnemies = this.enemies;
                const combatEnemies = this.combatManager.enemies;
                
                // Debug: Log array states periodically (every 60 frames to avoid spam)
                if (!this._enemySyncDebugCounter) this._enemySyncDebugCounter = 0;
                this._enemySyncDebugCounter++;
                if (this._enemySyncDebugCounter % 60 === 0) {
                    console.log(`🔍 Enemy array sync check: scene=${sceneEnemies?.length || 0}, spawn=${spawnManagerEnemies?.length || 0}, combat=${combatEnemies?.length || 0}, sameRef=${sceneEnemies === spawnManagerEnemies}, combatSameRef=${combatEnemies === spawnManagerEnemies}`);
                }
                
                if (spawnManagerEnemies) {
                    // If GameScene's enemies array got desynced from EnemySpawnManager
                    if (sceneEnemies !== spawnManagerEnemies) {
                        console.log(`🔄 Re-syncing GameScene.enemies (${sceneEnemies?.length || 0}) with EnemySpawnManager.enemies (${spawnManagerEnemies.length})`);
                        this.enemies = spawnManagerEnemies;
                    }
                    
                    // If CombatManager's enemies array got desynced
                    if (combatEnemies !== spawnManagerEnemies) {
                        console.log(`🔄 Re-syncing CombatManager.enemies (${combatEnemies?.length || 0}) with EnemySpawnManager.enemies (${spawnManagerEnemies.length})`);
                        this.combatManager.enemies = spawnManagerEnemies;
                    }
                } else {
                    // EnemySpawnManager.enemies is null/undefined - this is a problem!
                    if (this._enemySyncDebugCounter % 60 === 0) {
                        console.warn(`⚠️ EnemySpawnManager.enemies is ${spawnManagerEnemies} - this should not happen!`);
                    }
                }
            } else {
                if (!this._enemySyncDebugCounter) this._enemySyncDebugCounter = 0;
                this._enemySyncDebugCounter++;
                if (this._enemySyncDebugCounter % 60 === 0) {
                    console.warn(`⚠️ EnemySpawnManager is null!`);
                }
            }

            this.combatManager.update();
            this.combatManager.checkCharacterCollisions();
        }
        
        // Check weapon projectile collisions with enemies
        this.weaponManager.checkProjectileCollisions(this.enemies);
        
        // Check boss projectile collisions with player (rating weapons)
        if (this.player && this.weaponManager.checkBossProjectileCollisions) {
            this.weaponManager.checkBossProjectileCollisions(this.player);
        }
        
        // Update UI and debug visuals using managers
        this.updateUIAndDebugVisuals();
        
        // Update boss health bar if there's an active boss
        if (this.bosses && this.bosses.length > 0 && this.uiManager) {
            const activeBoss = this.bosses.find(boss => boss && boss.isBoss && boss.health > 0 && boss.sprite && boss.sprite.active);
            if (activeBoss) {
                this.uiManager.updateBossHealthBar(activeBoss.health, activeBoss.maxHealth);
            }
        }
        
        // Update debug manager
        if (this.debugManager) {
            this.debugManager.update();
        }
    }
    
    updateUIAndDebugVisuals() {
        // Update debug display if in debug mode
        if (this.uiManager.debugMode) {
            // Prepare debug data
            const activeChar = this.characterManager ? this.characterManager.getActiveCharacterData() : null;
            const debugData = {
                state: this.animationManager.currentState,
                locked: this.animationManager.animationLocked,
                timer: Math.round(this.animationManager.lockTimer),
                velX: Math.round(this.player.body.velocity.x),
                charName: this.currentCharacterConfig.name,
                health: activeChar.health,
                maxHealth: activeChar.maxHealth,
                enemies: this.enemies.length,
                maxEnemies: this.enemySpawnManager ? this.enemySpawnManager.maxEnemies : this.maxEnemies,
                playerX: this.player.x,
                playerY: this.player.y,
                tireekHealth: this.characterManager ? this.characterManager.characters.tireek.health : 0,
                trystonHealth: this.characterManager ? this.characterManager.characters.tryston.health : 0
            };
            
            // Update debug display using UIManager
            this.uiManager.updateDebugDisplay(debugData);
            
            // Update attack indicator using UIManager
            this.uiManager.updateAttackIndicator(this.animationManager);
            
            // Update debug visuals using DebugManager if available
            if (this.debugManager) {
                this.debugManager.updateVisuals(debugData);
            } else {
                // Fallback: Prepare debug visual data for hitboxes and collision circles
            const debugVisualData = {
                player: this.player,
                enemies: this.enemies,
                streetTopLimit: this.streetTopLimit,
                streetBottomLimit: this.streetBottomLimit,
                    playerAttackHitbox: this.combatManager ? this.combatManager.getPlayerAttackHitbox() : null,
                camera: this.cameras.main
            };
            
            // Update debug visuals using UIManager
            this.uiManager.updateDebugVisuals(debugVisualData);
            }
        }
    }

    handleInput() {
        if (!this.inputManager || !this.player) return;
        
        // Handle system input using InputManager
        this.inputManager.handleSystemInput({
            onDebugToggle: () => this.uiManager.toggleDebugMode(),
            onMusicToggle: () => this.audioManager.toggleBackgroundMusic(),
            onSfxToggle: () => this.audioManager.toggleSoundEffects(),
            onClearEnemies: () => {
                if (this.enemySpawnManager) {
                    this.enemySpawnManager.clearAll();
                }
            },
            onHeal: () => {
                // Heal both characters to full health
                if (this.characterManager) {
                    this.characterManager.heal('tireek', 1000); // Large amount to ensure full heal
                    this.characterManager.heal('tryston', 1000);
                }
                console.log("Both characters healed to full health!");
            },
            onSwitchCharacter: (forceSwitch = false) => {
                if (this.characterManager) {
                    const result = this.characterManager.switchCharacter(forceSwitch, this.animationManager, this.isJumping, this.eventCameraLocked || false);
                    
                    // Handle both object return {success: true/false} and direct false return
                    const switchSucceeded = result && (result.success === true || result === true);
                    
                    if (switchSucceeded && result.newPlayer) {
                        // Update references
                        this.player = result.newPlayer;
                        this.selectedCharacter = result.newCharacter;
                        this.currentCharacterConfig = this.characterManager.currentCharacterConfig;
                        
                        // Ensure player sprite has characterConfig set (safety check)
                        if (!this.player.characterConfig) {
                            this.player.characterConfig = this.currentCharacterConfig;
                        }
                        
                        // Reset animation manager with new character
                        this.animationManager = new AnimationStateManager(this.player);
                        
                        // Set up animation events for new character
                        this.animationSetupManager.setupAnimationEvents(
                            this.currentCharacterConfig,
                            this.player,
                            this.animationManager,
                            this.isJumping
                        );
                        
                        // Update physics manager with new player and animation manager
                        if (this.playerPhysicsManager) {
                            this.playerPhysicsManager.player = this.player;
                            this.playerPhysicsManager.animationManager = this.animationManager;
                            // CRITICAL: Ensure physics manager is enabled after switch
                            this.playerPhysicsManager.disabled = false;
                        }
                        
                        // Update combat manager with new player and animation manager
                        if (this.combatManager) {
                            this.combatManager.player = this.player;
                            this.combatManager.animationManager = this.animationManager;
                        }
                        
                        // CRITICAL: Ensure input manager is enabled after switch
                        if (this.inputManager) {
                            this.inputManager.disabled = false;
                        }
                        
                        // Re-setup camera follow ONLY if camera is not locked by event system
                        if (!this.eventCameraLocked) {
                            this.cameras.main.startFollow(this.player, true, 0.1, 0);
                        }
                        
                        return true; // Switch successful, skip other input
                    }
                }
                return false; // Switch failed or not attempted
            },
            onWeaponUse: () => {
                // Check if weapon can be used (cooldown, etc.)
                if (this.weaponManager.canUseWeapon()) {
                    // Play throwing animation
                    this.inputManager.handleWeaponInput(this.player, this.animationManager, this.audioManager);
                    
                    // Fire the weapon projectile
                    const direction = this.player.flipX ? -1 : 1; // Get player facing direction
                    this.weaponManager.useWeapon(this.player, direction);
                }
            },
            onTouchControlsToggle: () => {
                // Toggle touch controls (T key for testing)
                if (window.DeviceManager) {
                    window.DeviceManager.toggleTouchControls();
                    if (this.touchControlsOverlay) {
                        const shouldShow = window.DeviceManager.shouldShowTouchControls();
                        this.touchControlsOverlay.setVisible(shouldShow);
                        console.log(`📱 Touch controls toggled: ${shouldShow ? 'ON' : 'OFF'}`);
                    }
                }
            }
        });
        
        // Handle attack input using InputManager
        const attackStarted = this.inputManager.handleAttackInput(
            this.player, 
            this.animationManager, 
            this.isJumping, 
            this.audioManager
        );
        
        // Reset hit detection for all enemies when a new attack starts
        if (attackStarted) {
            this.enemies.forEach(enemy => {
                enemy.hitByCurrentAttack = false;
            });
        }
        
        // Handle jump input using InputManager (restored original logic)
        if (!this.isJumping) {
            const jumpRequested = this.inputManager.handleJumping(this.player, this.animationManager);
            if (jumpRequested) {
                // Use PlayerPhysicsManager if available
                if (this.playerPhysicsManager) {
                    this.playerPhysicsManager.startJump();
                    this.isJumping = this.playerPhysicsManager.getIsJumping();
                }
            }
        }
    }

    // ========================================
    // DEPRECATED METHODS REMOVED
    // ========================================
    // The following methods have been moved to dedicated managers:
    // - handleMovement, handleJumping, handleAnimations -> PlayerPhysicsManager
    // - startJump, landPlayer, updatePerspective -> PlayerPhysicsManager
    // - updateHealthRegeneration -> CharacterManager
    // - getActiveCharacterName -> CharacterManager
    // - destroyAllEnemies -> EnemySpawnManager
    // - setupCoordinateRecording, updateCoordinateRecording, recordPosition, showPositionMarker -> DebugManager
    // - createDebugOverlay, updateDebugOverlay, updateGridOverlay -> DebugManager
    // - createParallaxBackground, createParallaxBackgroundFromConfig -> LevelInitializationManager
    // - loadLevelFromJSON, loadLevelFromConfig, setupTestLevel, initializeUnifiedLevelSystem -> LevelInitializationManager

    resetPlayerState() {
        // Get spawn point from world manager
        const spawnPoint = this.worldManager.getSpawnPoint();

        // Reset camera first - stop follow and position at spawn point
        this.cameras.main.stopFollow();
        const cameraTargetX = Math.max(0, spawnPoint.x - this.cameras.main.width / 2);
        this.cameras.main.setScroll(cameraTargetX, 0);

        // Update camera bounds to match current world bounds
        if (this.physics && this.physics.world && this.physics.world.bounds) {
            const worldBounds = this.physics.world.bounds;
            this.cameras.main.setBounds(worldBounds.x, worldBounds.y, worldBounds.width, worldBounds.height);
        }

        // Reset both character sprites to spawn point using CharacterManager
        if (this.characterManager) {
            const tireekSprite = this.characterManager.characters.tireek.sprite;
            const trystonSprite = this.characterManager.characters.tryston.sprite;
            
            if (tireekSprite) {
                tireekSprite.setPosition(spawnPoint.x, spawnPoint.y);
                tireekSprite.setVelocity(0, 0);
                tireekSprite.body.reset(spawnPoint.x, spawnPoint.y);
            }
            if (trystonSprite) {
                trystonSprite.setPosition(spawnPoint.x, spawnPoint.y);
                trystonSprite.setVelocity(0, 0);
                trystonSprite.body.reset(spawnPoint.x, spawnPoint.y);
            }
        }

        // Reset player reference
        this.player.setPosition(spawnPoint.x, spawnPoint.y);
        this.player.setVelocity(0, 0);
        this.player.body.reset(spawnPoint.x, spawnPoint.y);

        // Restart camera follow
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Reset player state
        this.isJumping = false;
        this.canDoubleJump = true;
        this.doubleJumpUsed = false;
        this.isFacingRight = true;

        // Partially restore health (75% of max) using CharacterManager
        if (this.characterManager) {
            this.characterManager.heal('tireek', this.characterManager.characters.tireek.maxHealth * 0.75);
            this.characterManager.heal('tryston', this.characterManager.characters.tryston.maxHealth * 0.75);
        }

        // Update UI
        if (this.uiManager && this.characterManager) {
            const activeChar = this.characterManager.getActiveCharacterData();
            this.uiManager.updateHealthBar(activeChar.health, activeChar.maxHealth);
            this.uiManager.updateDualCharacterHealth(
                this.characterManager.characters.tireek.health,
                this.characterManager.characters.tryston.health,
                this.characterManager.getActiveCharacterName()
            );
        }

        // Resume gameplay
        this.isLoading = false;

        console.log(`🎯 RESET COMPLETE: Player at (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`);
    }
    
    // ========================================
    // LEVEL LIFECYCLE METHODS
    // ========================================
    
    shutdown() {
        console.log('🎮 GameScene: Shutdown - Cleaning up all resources...');
        
        // Destroy touch controls overlay to prevent duplicate rendering
        if (this.touchControlsOverlay) {
            console.log('📱 Destroying touch controls overlay...');
            this.touchControlsOverlay.destroy();
            this.touchControlsOverlay = null;
        }
        
        // Cleanup UI manager
        if (this.uiManager) {
            this.uiManager.destroy();
        }
        
        // Remove resize listener to prevent memory leaks
        this.scale.off('resize');
        
        console.log('🎮 GameScene: Shutdown complete');
    }
    
    onLevelCleanup() {
        console.log('🎮 GameScene: Cleaning up level...');
        
        // Remove resize listener to prevent memory leaks
        this.scale.off('resize');
        
        // Clear events
        if (this.eventManager) {
            this.eventManager.clearEvents();
        }
        
        // Destroy all enemies using EnemySpawnManager
        if (this.enemySpawnManager) {
            this.enemySpawnManager.destroyAll();
        }
        
        // Clear all projectiles
        if (this.weaponManager) {
            this.weaponManager.clearAllProjectiles();
        }
        
        // Clear item pickups
        if (this.itemPickupManager) {
            this.itemPickupManager.clearAllPickups();
        }
        
        // Stop enemy spawning
        this.isLoading = true; // Stops enemy spawning in update loop
    }
    
    // ========================================
    // LEVEL INITIALIZATION (delegated to LevelInitializationManager)
    // ========================================
    
    onLevelInitializationComplete() {
        console.log('🎯 Level initialization complete, creating characters and finalizing setup...');
        
        // Use LevelInitializationManager to complete initialization
        const bounds = this.levelInitializationManager.onLevelInitializationComplete(
            this.characterManager,
            this.animationSetupManager,
            () => this.updateLevelDisplay && this.updateLevelDisplay()
        );
        
        // Update street bounds
        this.streetTopLimit = bounds.streetTopLimit;
        this.streetBottomLimit = bounds.streetBottomLimit;
        this.inputManager.setStreetBounds(this.streetTopLimit, this.streetBottomLimit);
        if (this.extrasManager) {
            this.extrasManager.setStreetBounds(this.streetTopLimit, this.streetBottomLimit);
        }
        
        // CRITICAL: Update player reference FIRST before any position checks or camera operations
        // This ensures we're working with the correct player sprite from the new level
        // Get the new player from character manager (characters were just created)
        const newPlayer = this.characterManager.getActiveCharacter();
        if (!newPlayer) {
            console.error('🎯 ERROR: No active character found after character creation!');
            return;
        }
        
        // CRITICAL: Verify this is actually a new player sprite, not the old one
        // Check if player reference changed or if we need to update it
        if (this.player && this.player === newPlayer) {
            console.log(`🎯 Player reference unchanged, but verifying it's the correct sprite...`);
        } else {
            console.log(`🎯 Updating player reference from ${this.player ? 'old' : 'null'} to new sprite`);
        }
        
        this.player = newPlayer;
        this.currentCharacterConfig = this.characterManager.currentCharacterConfig;
        this.selectedCharacter = this.characterManager.getActiveCharacterName();
        console.log(`🎯 Player reference updated: ${this.selectedCharacter}`);
        console.log(`🎯 New player sprite position: (${this.player.x}, ${this.player.y})`);
        console.log(`🎯 New player sprite active: ${this.player.active}, visible: ${this.player.visible}`);
        
        // CRITICAL: Get spawn point and reset player position BEFORE any camera operations
        // This prevents the old camera scroll position from affecting player positioning
        const spawnPoint = this.worldManager.getSpawnPoint();
        console.log(`🎯 Spawn point for new level: (${spawnPoint.x}, ${spawnPoint.y})`);
        console.log(`🎯 Player position vs spawn: player at (${this.player.x}, ${this.player.y}), spawn at (${spawnPoint.x}, ${spawnPoint.y})`);
        
        // Stop camera follow immediately to prevent interference
        this.cameras.main.stopFollow();
        
        // Log player position (characters were just created at spawn point)
        console.log(`🎯 Player position after character creation: (${this.player.x}, ${this.player.y})`);
        console.log(`🎯 Spawn point: (${spawnPoint.x}, ${spawnPoint.y})`);
        if (this.player.body) {
            console.log(`🎯 Player body position: (${this.player.body.x}, ${this.player.body.y})`);
        }
        
        // CRITICAL: Reset camera scroll position to spawn point BEFORE any other camera operations
        // This prevents the old camera position from affecting the new level
        const worldBounds = this.physics && this.physics.world && this.physics.world.bounds 
            ? this.physics.world.bounds 
            : { x: 0, width: 1200 };
        // camera.width is in screen pixels, but we need world coordinates
        // World width visible = screen width / zoom, or use virtualWidth directly
        const virtualWidth = this.virtualWidth || 1200;
        const cameraWorldWidth = virtualWidth; // This is the world width the camera can see
        const minCameraX = worldBounds.x;
        const maxCameraX = worldBounds.x + worldBounds.width - cameraWorldWidth;
        const cameraTargetX = Math.max(minCameraX, Math.min(maxCameraX, spawnPoint.x - cameraWorldWidth / 2));
        
        console.log(`🎯 Camera positioning: spawn at (${spawnPoint.x}, ${spawnPoint.y}), screen width=${this.cameras.main.width}, zoom=${this.cameras.main.zoom}, world width=${cameraWorldWidth}, targetX=${cameraTargetX}`);
        
        console.log(`🎯 Resetting camera scroll from (${this.cameras.main.scrollX}, ${this.cameras.main.scrollY}) to (${cameraTargetX}, 0)`);
        this.cameras.main.setScroll(cameraTargetX, 0);
        console.log(`🎯 Camera positioned at spawn: scrollX=${cameraTargetX}, player at (${spawnPoint.x}, ${spawnPoint.y}), world bounds: x=${worldBounds.x}, width=${worldBounds.width}`);
        
        // Initialize checkpoint system with level config and world bounds
        if (this.checkpointManager && this.physics && this.physics.world && this.physics.world.bounds) {
            const levelConfig = this.levelManager?.currentLevelConfig || this.selectedLevelConfig;
            const worldBounds = this.physics.world.bounds;
            this.checkpointManager.initialize(levelConfig, worldBounds);
            console.log('📍 Checkpoint system initialized');
        }
        
        // Update score display if we have a preserved score (from Game Over restart)
        if (this.uiManager && this.playerScore > 0) {
            this.uiManager.updateScoreDisplay(this.playerScore);
            console.log(`🔄 Score display updated: ${this.playerScore}`);
        }
        
        // Initialize animation state manager now that player exists
        this.animationManager = new AnimationStateManager(this.player);
        console.log('🎯 Animation manager initialized');
        
        // Log player position before starting camera follow
        const finalSpawnCheck = this.worldManager.getSpawnPoint();
        console.log(`🎯 Before camera follow: player at (${this.player?.x || 'N/A'}, ${this.player?.y || 'N/A'}), spawn at (${finalSpawnCheck.x}, ${finalSpawnCheck.y})`);
        
        // Start camera following player LAST (only if not locked by event system AND not in transition)
        // During transitions, the transition manager will handle camera positioning
        // This ensures player position is correct before camera starts following
        if (!this.eventCameraLocked && !this.levelTransitionManager?.isTransitioning) {
            console.log(`🎯 Starting camera follow on player at (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`);
            this.cameras.main.startFollow(this.player, true, 0.1, 0);
            console.log(`🎯 Camera follow started. Camera scroll: (${this.cameras.main.scrollX}, ${this.cameras.main.scrollY})`);
        } else {
            if (this.levelTransitionManager?.isTransitioning) {
                console.log(`🎯 Camera follow skipped (level transition in progress - transition manager will handle)`);
            } else {
                console.log(`🎯 Camera follow skipped (event camera locked)`);
            }
        }
        
        // Check if any events should trigger immediately (player already past trigger)
        // Skip during level transitions - transition manager will handle this
        // Skip during Game Over restarts - we want to start fresh from level beginning
        if (this.eventManager && this.player && !this.levelTransitionManager?.isTransitioning && !this.isGameOverRestart) {
            this.eventManager.checkInitialTriggers();
        } else if (this.isGameOverRestart) {
            console.log('🔄 Skipping event auto-triggers due to Game Over restart');
            // Clear the flag after use
            this.isGameOverRestart = false;
        }
        
        // Update debug manager references if it exists
        if (this.debugManager) {
            this.debugManager.setReferences(
                this.player,
                this.enemies,
                this.streetTopLimit,
                this.streetBottomLimit,
                () => this.combatManager?.getPlayerAttackHitbox?.() || null
            );
        }

        // Create effect animations immediately (before character switch can happen)
        if (this.effectSystem) {
            this.effectSystem.createEffectAnimations();
            
            // Ensure crisp pixel-art filtering for effect spritesheets
            try {
                if (this.textures.exists('tornado')) {
                    const tex = this.textures.get('tornado');
                    if (tex && tex.setFilter) {
                        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
                    }
                }
            } catch (e) {
                console.warn('Could not set pixel filter for tornado spritesheet:', e);
            }
        }
        
        // Set up animation complete listeners for current character
        this.animationSetupManager.setupAnimationEvents(
            this.currentCharacterConfig,
            this.player,
            this.animationManager,
            this.isJumping
        );
        
        // SYNC FIX: Ensure we use the active enemies array from spawn manager before creating CombatManager
        if (this.enemySpawnManager && this.enemySpawnManager.enemies) {
            if (this.enemies !== this.enemySpawnManager.enemies) {
                console.log('🔄 Re-syncing enemies array before CombatManager init');
                this.enemies = this.enemySpawnManager.enemies;
            }
        }

        // Initialize CombatManager
        this.combatManager = new CombatManager(this, this.characterManager, this.enemies, this.levelManager);
        this.combatManager.initialize(
            this.player,
            this.animationManager,
            this.uiManager,
            this.audioManager,
            this.streetTopLimit,
            this.streetBottomLimit,
            this.autoSwitchThreshold
        );
        
        // Initialize PlayerPhysicsManager
        this.playerPhysicsManager = new PlayerPhysicsManager(
            this,
            this.player,
            this.animationManager,
            this.environmentManager,
            this.inputManager
        );
        this.playerPhysicsManager.initialize(
            this.streetTopLimit,
            this.streetBottomLimit,
            this.audioManager
        );
        
        // CRITICAL: If we're in a level transition, keep physics manager disabled
        // This prevents the player from moving during the settle delay
        if (this.levelTransitionManager?.isTransitioning) {
            this.playerPhysicsManager.disabled = true;
            console.log('🔧 PlayerPhysicsManager disabled during level transition');
        }
        
        // Initialize EnemySpawnManager references
        this.enemySpawnManager.setReferences(
            this.player,
            this.streetTopLimit,
            this.streetBottomLimit,
            this.eventCameraLocked || false,
            this.playerCurrentHealth,
            this.playerMaxHealth,
            this.levelManager
        );
        
        // Initialize DebugManager references if it exists
        if (this.debugManager) {
            this.debugManager.setReferences(
                this.player,
                this.enemies,
                this.streetTopLimit,
                this.streetBottomLimit,
                () => this.combatManager.getPlayerAttackHitbox()
            );
        }
        
        // Start player idle animation
        this.player.anims.play(`${this.currentCharacterConfig.name}_idle`, true);
    }
    
    updateLevelDisplay() {
        // Update level info in UI
        if (this.uiManager) {
            this.uiManager.updateLevelDisplay(
                this.levelManager.currentLevel,
                (this.levelManager.getCurrentLevelConfig() && this.levelManager.getCurrentLevelConfig().name) || 'Unknown Level'
            );
        }
    }
}
