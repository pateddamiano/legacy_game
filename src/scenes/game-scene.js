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
        // create() is async: Phaser does NOT await it, so update() starts running while
        // create() is still awaiting level initialization and this.player is still null.
        // Gate update() on this flag so nothing runs against a half-built scene.
        this.isSceneReady = false;
        
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
        // NOTE: isTestMode disables enemy spawning outright, so it must NOT be driven by
        // window.DEBUG_MODE - otherwise jumping to a real level with ?debug=true&level=N
        // loads a level with no enemies at all. Debug overlays still follow DEBUG_MODE.
        this.isTestMode = this.selectedLevelId === 'test' || window.LEVEL_TEST_MODE === true;
        this.coordinateRecordingEnabled = this.isTestMode || window.DEBUG_MODE;
        this.debugOverlayVisible = this.isTestMode || window.DEBUG_MODE;
        
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
        
        // The one place levels are built and torn down (see LevelLifecycle.js), and the
        // in-place transition that sequences it
        this.levelLifecycle = new LevelLifecycle(this);
        this.levelTransitionManager = new LevelTransitionManager(this);
        
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
        
        // Handle window resizing (kept as a named handler so shutdown() removes only ours)
        this._onResize = () => {
            console.log('📏 Resizing GameScene...');
            LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
        };
        this.scale.on('resize', this._onResize);
        
        // Phaser does not call shutdown() by itself. Without this, a scene restart (game
        // over) leaves the previous HUD, dialogue box and weapon HUD on the still-alive
        // UIScene and the next create() draws them all again on top.
        this.events.once('shutdown', this.shutdown, this);
        
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
        
        // Default physics world bounds (each level replaces them)
        this.environmentManager.initializeWorld();
        
        // ------------------------------------------------------------
        // ONE-TIME SETUP - survives level transitions.
        // Anything per-level belongs in LevelLifecycle.build() instead.
        // ------------------------------------------------------------
        this.cameras.main.roundPixels = true;
        
        // Animations for every character, enemy and effect. All spritesheets are loaded
        // by the boot scenes before this scene starts, so this is safe to do up front.
        ALL_CHARACTERS.forEach(config => this.animationSetupManager.createCharacterAnimations(config));
        ALL_ENEMY_TYPES.forEach(config => this.animationSetupManager.createCharacterAnimations(config));
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
        
        this.isJumping = false;
        this.playerMaxHealth = 100;
        this.playerCurrentHealth = this.playerMaxHealth;
        // NOTE: this.playerScore was set in init() (it is preserved across a game-over
        // restart) - do not zero it here.
        
        this.uiManager.initializeUI();
        
        // DebugManager - checkpoint navigation is a developer feature even outside debug mode
        this.debugManager = new DebugManager(this);
        if (this.isTestMode || window.DEBUG_MODE) {
            console.log('🔍 [GameScene] Creating DebugManager (test/debug mode)');
            this.debugManager.initialize(this.isTestMode, this.coordinateRecordingEnabled, this.debugOverlayVisible);
            this.debugGraphics = this.add.graphics();
            this.debugManager.setDebugGraphics(this.debugGraphics);
        } else {
            this.debugManager.initialize(false, false, false);
        }
        
        this.livesManager.initialize();
        
        this.weaponManager.createWeaponAnimations();
        this.weaponManager.initializeWeapons();
        this.weaponManager.createWeaponUI();
        
        this.itemPickupManager.createParticleEffect();
        
        // Safety net for the isSceneReady gate: create() is async, so anything that throws
        // after this point becomes a silent unhandled rejection and the rest of create()
        // never runs. Prefer a partly-initialised but playable scene over a dead one.
        this.time.delayedCall(3000, () => {
            if (!this.isSceneReady && this.player) {
                console.error('🎯 GameScene.create() did not finish - enabling update loop anyway');
                this.isSceneReady = true;
            }
        });
        
        // ------------------------------------------------------------
        // PER-LEVEL SETUP - world, characters, camera, spawner, audio, events
        // ------------------------------------------------------------
        const built = await this.levelLifecycle.build(this.selectedLevelId);
        if (!built) {
            console.error(`🎯 GameScene: level ${this.selectedLevelId} failed to build`);
        }
        
        // HUD values that need the characters to exist
        const activeChar = this.characterManager.getActiveCharacterData();
        this.uiManager.updateHealthBar(activeChar.health, activeChar.maxHealth);
        this.uiManager.updateDualCharacterHealth(
            this.characterManager.characters.tireek.health,
            this.characterManager.characters.tryston.health,
            this.characterManager.getActiveCharacterName()
        );
        this.uiManager.updateScoreDisplay(this.playerScore);
        this.uiManager.updateLivesDisplay(this.livesManager.getLives());
        
        // Set up automatic fullscreen on first interaction (if not already requested)
        this.setupAutoFullscreen();
        
        // Fade in from black
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        console.log('🎬 Fading in to gameplay...');
        
        // Everything is wired up - let update() start running
        this.isSceneReady = true;
    }
    
    // ========================================
    // PLAYER BINDING
    // ========================================
    
    // Point every system at the given character sprite. Called by LevelLifecycle.build()
    // once the characters exist, and on every character switch. This used to be copied
    // in four places with slightly different subsets of the same wiring - keep it here.
    bindPlayer(sprite) {
        if (!sprite) {
            console.error('🎯 bindPlayer: no sprite given');
            return;
        }
        this.player = sprite;
        this.selectedCharacter = this.characterManager.getActiveCharacterName();
        this.currentCharacterConfig = this.characterManager.currentCharacterConfig;
        if (!this.player.characterConfig) {
            this.player.characterConfig = this.currentCharacterConfig;
        }
        this.isJumping = false; // a freshly bound character is always on the ground
        
        this.animationManager = new AnimationStateManager(this.player);
        this.animationSetupManager.setupAnimationEvents(
            this.currentCharacterConfig, this.player, this.animationManager, this.isJumping
        );
        
        if (!this.combatManager) {
            this.combatManager = new CombatManager(this, this.characterManager, this.enemies);
            this.combatManager.initialize(
                this.player, this.animationManager, this.uiManager, this.audioManager,
                this.streetTopLimit, this.streetBottomLimit, this.autoSwitchThreshold
            );
        } else {
            this.combatManager.player = this.player;
            this.combatManager.animationManager = this.animationManager;
        }
        
        if (!this.playerPhysicsManager) {
            this.playerPhysicsManager = new PlayerPhysicsManager(
                this, this.player, this.animationManager, this.environmentManager, this.inputManager
            );
            this.playerPhysicsManager.initialize(this.streetTopLimit, this.streetBottomLimit, this.audioManager);
            // Created mid-build: stay frozen until the lifecycle releases gameplay
            this.playerPhysicsManager.disabled = !!(this.levelLifecycle && this.levelLifecycle.busy);
        } else {
            this.playerPhysicsManager.player = this.player;
            this.playerPhysicsManager.animationManager = this.animationManager;
            this.playerPhysicsManager.setIsJumping(false);
        }
        
        this.enemySpawnManager.setReferences(
            this.player, this.streetTopLimit, this.streetBottomLimit,
            this.eventCameraLocked || false, this.playerCurrentHealth, this.playerMaxHealth
        );
        
        if (this.debugManager) {
            this.debugManager.setReferences(
                this.player, this.enemies, this.streetTopLimit, this.streetBottomLimit,
                () => this.combatManager ? this.combatManager.getPlayerAttackHitbox() : null
            );
        }
        
        if (!this.eventCameraLocked) {
            this.cameras.main.startFollow(this.player, true, 0.1, 0);
        }
        
        // A brand-new sprite has no animation yet; a switched-in one is already animating
        const idleKey = `${this.currentCharacterConfig.name}_idle`;
        if (!this.player.anims.isPlaying && this.anims.exists(idleKey)) {
            this.player.anims.play(idleKey, true);
        }
    }
    
    // Run one physics step even while the world is paused for a cutscene.
    //
    // Physics bodies here are the full sprite frame x scale (nobody calls setSize), so a
    // freshly placed character whose body overlaps the world edge gets pushed inside by
    // collideWorldBounds - but only when the world actually steps. Cutscenes pause the
    // world before that first step, and the dialogue manager unpauses it for a few
    // frames between lines, so characters visibly snapped into place on the second line.
    // Call this after placing anything (spawn, createCharacters, pause) so it is already
    // at its resting spot on the first line.
    settlePhysics() {
        const world = this.physics && this.physics.world;
        if (!world) return;
        // Scale first: a body is sized from the sprite's current scale during preUpdate
        if (this.playerPhysicsManager && this.player && this.player.active) {
            this.playerPhysicsManager.updatePerspective();
        }
        (this.enemies || []).forEach(enemy => {
            if (enemy && enemy.sprite && enemy.sprite.active && enemy.updatePerspective) {
                enemy.updatePerspective();
            }
        });
        const wasPaused = world.isPaused;
        world.isPaused = false;
        world.update(this.time.now, world._frameTimeMS || (1000 / 60)); // preUpdate + one step
        world.postUpdate();                                             // write bodies back to sprites
        world.isPaused = wasPaused;
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
    // - Level build/teardown -> LevelLifecycle
    
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
                        this.bindPlayer(result.newPlayer);
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
        
        // Rebind to whichever character is active now (it may have switched)
        const active = this.characterManager.getActiveCharacter();
        if (active && this.animationManager) {
            this.bindPlayer(active);
        }
    }
    
    handlePlayerDeath() {
        // Legacy method - now handled by handleCharacterDown
        console.log("⚠️ handlePlayerDeath called - use handleCharacterDown instead");
        this.handleCharacterDown();
    }
    
    update(time, delta) {
        // Scene still being built by the async create() (see init()), or a level is
        // being torn down / built by LevelLifecycle
        if (!this.isSceneReady || !this.player || (this.levelLifecycle && this.levelLifecycle.busy)) {
            return;
        }
        
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
                    this.playerMaxHealth
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
    // - createParallaxBackground, createParallaxBackgroundFromConfig -> LevelLifecycle
    // - loadLevelFromJSON, loadLevelFromConfig, setupTestLevel, initializeUnifiedLevelSystem -> LevelLifecycle

    // ========================================
    // LEVEL LIFECYCLE METHODS
    // ========================================
    
    shutdown() {
        console.log('🎮 GameScene: Shutdown - Cleaning up all resources...');
        
        // Everything this scene drew onto the OTHER scenes (UIScene, TouchControlsScene)
        // must go, or the next create() stacks a second copy on top of it
        if (this.touchControlsOverlay) {
            this.touchControlsOverlay.destroy();
            this.touchControlsOverlay = null;
        }
        if (this.uiManager) {
            this.uiManager.destroy();
            this.uiManager = null;
        }
        if (this.dialogueManager) {
            this.dialogueManager.destroy();
            this.dialogueManager = null;
        }
        if (this.weaponManager && this.weaponManager.weaponUIContainer) {
            this.weaponManager.weaponUIContainer.destroy();
            this.weaponManager.weaponUIContainer = null;
        }
        if (this.audioManager && this.audioManager.destroy) {
            this.audioManager.destroy();
        }
        
        // Only our own resize listener - UIScene has one on the same ScaleManager
        if (this._onResize) {
            this.scale.off('resize', this._onResize);
            this._onResize = null;
        }
        
        console.log('🎮 GameScene: Shutdown complete');
    }
    
    // ========================================
    // LEVEL INITIALIZATION
    // ========================================
    // Delegated entirely to LevelLifecycle (build/teardown) - see bindPlayer() above
    // for the one hook it calls back into this scene.
    
}
