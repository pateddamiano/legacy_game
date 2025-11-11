// ========================================
// MAIN GAME SCENE
// ========================================
// This file contains the primary game logic, player controls, and scene management

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.currentCharacterIndex = 0;
        this.currentCharacterConfig = ALL_CHARACTERS[this.currentCharacterIndex];
        this.autoSwitchThreshold = 25; // Auto-switch when health drops below 25%
    }

    init(data) {
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
        this.weaponManager = new WeaponManager(this);
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
        this.uiManager = new UIManager(this);
        this.inputManager = new InputManager(this);
        
        // World and level management
        this.worldManager = new WorldManager(this);
        this.levelManager = new LevelManager(this);
        
        // Gameplay systems
        this.dialogueManager = new DialogueManager(this);
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
        this.levelInitializationManager = new LevelInitializationManager(
            this,
            this.worldManager,
            this.levelManager,
            this.environmentManager,
            this.inputManager,
            this.eventManager,
            this.audioManager
        );
        
        console.log('🎮 All managers initialized');
    }

    async create() {
        console.log(`🎯 GameScene: Creating level ${this.selectedLevelId} with ${this.selectedCharacter}`);
        
        // No loading needed - assets already loaded in PreloadScene
        this.isLoading = false;
        
        // Initialize all managers
        this.initializeManagers();
        
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
        if (this.isTestMode || window.DEBUG_MODE) {
            this.debugManager = new DebugManager(this);
            this.debugManager.initialize(this.isTestMode, this.coordinateRecordingEnabled, this.debugOverlayVisible);
            // Create debug graphics for hitbox visualization
            this.debugGraphics = this.add.graphics();
            this.debugManager.setDebugGraphics(this.debugGraphics);
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
        
        // Fade in from black
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        console.log('🎬 Fading in to gameplay...');
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
                            console.log('⚠️ Set characterConfig on player sprite after switch');
                        }
                        
                        this.animationManager = new AnimationStateManager(this.player);
                        this.animationSetupManager.setupAnimationEvents(this.currentCharacterConfig, this.player, this.animationManager, this.isJumping);
                        if (this.playerPhysicsManager) {
                            this.playerPhysicsManager.player = this.player;
                            this.playerPhysicsManager.animationManager = this.animationManager;
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
                // Game over callback
                this.characterManager.handleGameOver(() => {
                    console.log("Game over - characters will respawn");
                });
            }
        );
        
        // Update player reference if character was switched
        this.player = this.characterManager.getActiveCharacter();
        this.selectedCharacter = this.characterManager.getActiveCharacterName();
        this.currentCharacterConfig = this.characterManager.currentCharacterConfig;
        
        // Update managers with new player if switched
        if (this.animationManager && this.player) {
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
        
        // Update world manager
        if (this.worldManager && this.player) {
            this.worldManager.updateWorld(this.player.x);
        }
        
        // Update animation state manager (only if initialized)
        if (this.animationManager) {
            this.animationManager.update(delta);
        }

        // Update input state (only if input manager is ready, not loading, and not disabled)
        if (this.inputManager && !this.isLoading && !this.inputManager.disabled) {
            this.inputManager.updateInputState();
            
            // Handle input and movement using managers
            this.handleInput();
            
            // Use PlayerPhysicsManager for movement, jumping, and animations
            if (this.playerPhysicsManager) {
                this.playerPhysicsManager.update(delta);
                // Update isJumping reference
                this.isJumping = this.playerPhysicsManager.getIsJumping();
            }
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
        
        // Enforce player bounds if set by event system
        if (this.eventPlayerBounds && this.player) {
            const bounds = this.eventPlayerBounds;
            const playerX = this.player.x;
            const playerY = this.player.y;
            
            // Clamp X position
            if (bounds.minX !== null && playerX < bounds.minX) {
                this.player.x = bounds.minX;
                if (this.player.body) {
                    this.player.body.setVelocityX(0);
                }
            }
            if (bounds.maxX !== null && playerX > bounds.maxX) {
                this.player.x = bounds.maxX;
                if (this.player.body) {
                    this.player.body.setVelocityX(0);
                }
            }
            
            // Clamp Y position
            if (bounds.minY !== null && playerY < bounds.minY) {
                this.player.y = bounds.minY;
                if (this.player.body) {
                    this.player.body.setVelocityY(0);
                }
            }
            if (bounds.maxY !== null && playerY > bounds.maxY) {
                this.player.y = bounds.maxY;
                if (this.player.body) {
                    this.player.body.setVelocityY(0);
                }
            }
        }
        
        // Check combat interactions using CombatManager
        if (this.combatManager) {
            this.combatManager.update();
            this.combatManager.checkCharacterCollisions();
        }
        
        // Check weapon projectile collisions with enemies
        this.weaponManager.checkProjectileCollisions(this.enemies);
        
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
            onSwitchCharacter: () => {
                if (this.characterManager) {
                    const result = this.characterManager.switchCharacter(false, this.animationManager, this.isJumping, this.eventCameraLocked || false);
                    if (result && result.success) {
                        // Update references
                        this.player = result.newPlayer;
                        this.selectedCharacter = result.newCharacter;
                        this.currentCharacterConfig = this.characterManager.currentCharacterConfig;
                        
                        // Ensure player sprite has characterConfig set (safety check)
                        if (!this.player.characterConfig) {
                            this.player.characterConfig = this.currentCharacterConfig;
                            console.log('⚠️ Set characterConfig on player sprite after switch');
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
                        }
                        
                        // Update combat manager with new player and animation manager
                        if (this.combatManager) {
                            this.combatManager.player = this.player;
                            this.combatManager.animationManager = this.animationManager;
                        }
                        
                        // Re-setup camera follow ONLY if camera is not locked by event system
                        if (!this.eventCameraLocked) {
                            this.cameras.main.startFollow(this.player, true, 0.1, 0);
                            console.log(`🎯 CHARACTER SWITCH: Camera following new player at (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`);
                        }
                    }
                }
                return true; // Skip other input processing during character switch
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
    
    onLevelCleanup() {
        console.log('🎮 GameScene: Cleaning up level...');
        
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
        
        // Get player from character manager
        this.player = this.characterManager.getActiveCharacter();
        this.currentCharacterConfig = this.characterManager.currentCharacterConfig;
        this.selectedCharacter = this.characterManager.getActiveCharacterName();
        
        // Initialize animation state manager now that player exists
        this.animationManager = new AnimationStateManager(this.player);
        console.log('🎯 Animation manager initialized');
        
        // Set up animation complete listeners for current character
        this.animationSetupManager.setupAnimationEvents(
            this.currentCharacterConfig,
            this.player,
            this.animationManager,
            this.isJumping
        );
        
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
