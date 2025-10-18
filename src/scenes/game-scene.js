// ========================================
// MAIN GAME SCENE
// ========================================
// This file contains the primary game logic, player controls, and scene management

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.currentCharacterIndex = 0; // Start with first character (Tireek)
        this.currentCharacterConfig = ALL_CHARACTERS[this.currentCharacterIndex];
        
        // Dual character system
        this.characters = {
            tireek: {
                config: TIREEK_CONFIG,
                health: 100,
                maxHealth: 100,
                sprite: null,
                isActive: true,
                regenRate: 2.0, // Health per second when inactive (increased from 0.5)
                lastSwitchTime: 0
            },
            tryston: {
                config: TRYSTON_CONFIG,
                health: 100,
                maxHealth: 100,
                sprite: null,
                isActive: false,
                regenRate: 2.0, // Health per second when inactive (increased from 0.5)
                lastSwitchTime: 0
            }
        };
        
        this.autoSwitchThreshold = 25; // Auto-switch when health drops below 25%
        this.switchCooldown = 2000; // 2 seconds cooldown between switches
    }

    init(data) {
        // Receive data from scene manager (character and level info)
        this.selectedCharacter = data?.character || 'tireek';
        this.selectedLevelId = data?.levelId || 1;
        
        console.log(`🎯 GameScene initialized with starting character: ${this.selectedCharacter}, level: ${this.selectedLevelId}`);
        
        // Set current character based on selection
        this.currentCharacterConfig = ALL_CHARACTERS.find(char => char.name === this.selectedCharacter) || ALL_CHARACTERS[0];
        this.currentCharacterIndex = ALL_CHARACTERS.findIndex(char => char.name === this.selectedCharacter);
        
        // Initialize both characters in the dual system
        this.characters.tireek.isActive = (this.selectedCharacter === 'tireek');
        this.characters.tryston.isActive = (this.selectedCharacter === 'tryston');
        
        // Update game state
        window.gameState.currentGame.character = this.selectedCharacter;
        window.gameState.currentGame.levelId = this.selectedLevelId;
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
        
        console.log('🎮 All managers initialized');
    }

    create() {
        console.log(`🎯 GameScene: Creating level ${this.selectedLevelId} with ${this.selectedCharacter}`);
        
        // No loading needed - assets already loaded in PreloadScene
        this.isLoading = false;
        
        // Initialize all managers
        this.initializeManagers();
        
        // Initialize environment (sets up world bounds and backgrounds)
        this.environmentManager.initializeWorld();
        
        // Get street limits from environment manager
        const streetBounds = this.environmentManager.getStreetBounds();
        this.streetTopLimit = streetBounds.top;
        this.streetBottomLimit = streetBounds.bottom;
        
        // Pass street bounds to input manager for vertical movement limits
        this.inputManager.setStreetBounds(this.streetTopLimit, this.streetBottomLimit);
        console.log(`🎯 GameScene: Street bounds configured: ${this.streetTopLimit} - ${this.streetBottomLimit}`);
        
        // Initialize level system FIRST (loads world and sets spawn point)
        this.initializeLevelSystem();
        
        // Initialize Level 1 world (must be before createBothCharacters)
        this.initializeLevel1World();

        // Create both character sprites (only active one will be visible)
        this.createBothCharacters();
        console.log(`🎯 Both characters created, active: ${this.selectedCharacter}`);
        
        // Set up camera to follow player
        console.log(`📷 📊 Setting up camera. Player position: x=${this.player.x}, y=${this.player.y}`);
        console.log(`📷 📊 World bounds: ${this.physics.world.bounds.x}, ${this.physics.world.bounds.y}, ${this.physics.world.bounds.width}x${this.physics.world.bounds.height}`);
        
        // Set camera bounds to match world bounds
        this.cameras.main.setBounds(
            this.physics.world.bounds.x,
            this.physics.world.bounds.y,
            this.physics.world.bounds.width,
            this.physics.world.bounds.height
        );
        
        // Make camera follow player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        
        console.log(`📷 📊 Camera setup complete. Camera scroll: x=${this.cameras.main.scrollX}, y=${this.cameras.main.scrollY}`);

        // Input is now handled by InputManager

        // Create animations for all characters and enemies with a small delay to ensure assets are loaded
        this.time.delayedCall(100, () => {
            console.log('Creating animations...');
            // Create animations for all characters
            ALL_CHARACTERS.forEach(characterConfig => {
                this.createCharacterAnimations(characterConfig);
            });
            
            // Create animations for enemies
            ALL_ENEMY_TYPES.forEach(enemyConfig => {
                this.createCharacterAnimations(enemyConfig);
            });
            
            // Start player idle animation
            this.player.anims.play(`${this.currentCharacterConfig.name}_idle`, true);
        });

        // Initialize animation state manager
        this.animationManager = new AnimationStateManager(this.player);
        
        // Initialize enemy system (using centralized config)
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = ENEMY_CONFIG.spawnInterval;
        this.maxEnemies = ENEMY_CONFIG.maxEnemiesOnScreen;
        
        // Set up animation complete listeners for current character only
        this.setupAnimationEvents(this.currentCharacterConfig);
        
        // Initialize jump tracking
        this.isJumping = false;
        
        // Initialize player health system
        this.playerMaxHealth = 100;
        this.playerCurrentHealth = this.playerMaxHealth;
        
        // Initialize player score system
        this.playerScore = 0;
        
        // Initialize UI system  
        this.uiManager.initializeUI();
        
        // Initialize health bar with full health (fix: bar wasn't showing initially)
        this.uiManager.updateHealthBar(this.characters[this.selectedCharacter].health, this.characters[this.selectedCharacter].maxHealth);
        
        // Initialize dual character health display
        this.uiManager.updateDualCharacterHealth(
            this.characters.tireek.health, 
            this.characters.tryston.health, 
            this.selectedCharacter
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
        
        // Start background music immediately (assets already loaded)
        console.log('🎵 Starting background music...');
        this.audioManager.playBackgroundMusic('combatMusic');
        
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
        
        // Calculate spawn point
        const spawnX = metadata.segments[0].x_position + 100;
        const spawnY = 600;
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

    createBothCharacters() {
        console.log('👥 Creating both character sprites...');
        
        // Create both character sprites
        Object.keys(this.characters).forEach(charName => {
            const charData = this.characters[charName];
            const spriteKey = `${charName}_idle`;
            
            // Get spawn point from world manager
            const spawnPoint = this.worldManager.getSpawnPoint();
            console.log(`👥 📊 Creating ${charName} at spawn point: x=${spawnPoint.x}, y=${spawnPoint.y}`);
            const sprite = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, spriteKey);
            console.log(`👥 📊 ${charName} sprite created at: x=${sprite.x}, y=${sprite.y}`);
            
            // Initialize ground tracking for jumps
            sprite.lastGroundY = sprite.y;
            
            // Scale up the player sprite (back to original)
            sprite.setScale(3.0);
            
            // Set player physics properties
            sprite.setBounce(0.2);
            sprite.setCollideWorldBounds(true);
            
            // Store character config on sprite
            sprite.characterConfig = charData.config;
            sprite.characterName = charName;
            
            // Set visibility based on active state
            sprite.setVisible(charData.isActive);
            
            // Store sprite reference
            charData.sprite = sprite;
        });
        
        // Set the active character as the main player reference
        this.player = this.characters[this.selectedCharacter].sprite;
        console.log(`👥 Active player set to: ${this.selectedCharacter}`);
    }
    
    createPlayer(characterConfig) {
        // Legacy method - now handled by createBothCharacters
        console.log('⚠️ createPlayer called - use createBothCharacters instead');
    }

    createCharacterAnimations(characterConfig) {
        const charName = characterConfig.name;
        
        console.log(`Creating animations for ${charName}:`, characterConfig.animations);
        
        // Create all animations based on character config
        Object.entries(characterConfig.animations).forEach(([animName, config]) => {
            const spriteKey = `${charName}_${animName}`;
            const frameConfig = this.anims.generateFrameNumbers(spriteKey, { 
                start: 0, 
                end: config.frames - 1 
            });

            console.log(`Creating animation ${spriteKey} with ${config.frames} frames at ${config.frameRate} FPS`);
            
            try {
                this.anims.create({
                    key: `${charName}_${animName}`,
                    frames: frameConfig,
                    frameRate: config.frameRate,
                    repeat: config.repeat
                });
                console.log(`Successfully created animation: ${spriteKey}`);
            } catch (error) {
                console.error(`Failed to create animation ${spriteKey}:`, error);
            }
        });
        
        console.log(`Finished creating animations for ${charName}`);
    }

    setupAnimationEvents(characterConfig) {
        // Remove any existing animation listeners to prevent conflicts
        this.player.removeAllListeners('animationcomplete');
        
        const charName = characterConfig.name;
        
        // Listen for animation complete events for current character
        this.player.on('animationcomplete', (animation, frame) => {
            const animKey = animation.key;
            
            // Check if it's an attack animation that just finished for current character
            if (animKey === `${charName}_jab` || 
                animKey === `${charName}_cross` || 
                animKey === `${charName}_kick`) {
                
                // Force reset animation state and return to idle
                this.animationManager.currentState = 'idle';
                this.animationManager.animationLocked = false;
                this.animationManager.lockTimer = 0;
                this.player.anims.play(`${charName}_idle`, true);
                
                console.log(`Attack animation ${animKey} completed, returning to idle`);
            }
        });
    }

    switchCharacter(forceSwitch = false) {
        // Check cooldown unless forced switch
        const currentTime = this.time.now;
        if (!forceSwitch && currentTime - this.characters[this.selectedCharacter].lastSwitchTime < this.switchCooldown) {
            console.log("Character switch on cooldown");
            return false;
        }
        
        // Only allow switching if not in middle of an action (unless forced)
        if (!forceSwitch && (this.animationManager.animationLocked || this.isJumping || 
            this.animationManager.currentState === 'attack' || 
            this.animationManager.currentState === 'airkick')) {
            console.log("Cannot switch characters during action");
            return false;
        }

        // Determine which character to switch to
        const currentChar = this.selectedCharacter;
        const newChar = currentChar === 'tireek' ? 'tryston' : 'tireek';
        
        // Check if the other character is available (not dead)
        if (this.characters[newChar].health <= 0) {
            console.log(`Cannot switch to ${newChar} - character is down`);
            return false;
        }
        
        console.log(`Switching from ${currentChar} to ${newChar}`);
        
        // Store current position and state
        const currentX = this.player.x;
        const currentY = this.player.y;
        const currentScale = this.player.scaleX;
        const currentFlipX = this.player.flipX;
        const currentVelX = this.player.body.velocity.x;
        const currentVelY = this.player.body.velocity.y;
        
        // Hide current character
        this.characters[currentChar].sprite.setVisible(false);
        this.characters[currentChar].isActive = false;
        this.characters[currentChar].lastSwitchTime = currentTime;
        
        // Show new character
        this.characters[newChar].sprite.setVisible(true);
        this.characters[newChar].isActive = true;
        this.characters[newChar].lastSwitchTime = currentTime;
        
        // Update references
        this.selectedCharacter = newChar;
        this.currentCharacterConfig = this.characters[newChar].config;
        this.player = this.characters[newChar].sprite;
        
        // Clear any damage tint from previous hit
        this.player.clearTint();
        
        // Restore position and state
        this.player.x = currentX;
        this.player.y = currentY;
        this.player.setScale(currentScale);
        this.player.setFlipX(currentFlipX);
        this.player.lastGroundY = currentY;
        this.player.setVelocityX(currentVelX);
        this.player.setVelocityY(currentVelY);
        
        // Reset animation manager with new character
        this.animationManager = new AnimationStateManager(this.player);
        
        // Set up animation events for new character
        this.setupAnimationEvents(this.currentCharacterConfig);
        
        // Start idle animation
        this.player.anims.play(`${this.currentCharacterConfig.name}_idle`, true);
        
        // Update character text through UIManager
        this.uiManager.updateCharacterDisplay(this.currentCharacterConfig);
        
        // Re-setup camera follow
        this.cameras.main.startFollow(this.player, true, 0.1, 0);
        
        // Update health bar with new character's health
        this.uiManager.updateHealthBar(this.characters[newChar].health, this.characters[newChar].maxHealth);
        
        // Update dual character health display
        this.uiManager.updateDualCharacterHealth(
            this.characters.tireek.health, 
            this.characters.tryston.health, 
            this.selectedCharacter
        );
        
        console.log(`✅ Switched to character: ${this.currentCharacterConfig.name}`);
        return true;
    }
    
    createDebugUI() {
        // Position debug UI elements below health bar and main debug text
        const debugUIStartY = 250; // Start well below health bar
        
        // Character selection indicator (debug only)
        this.characterIndicator = this.add.rectangle(10, debugUIStartY, 200, 40, 0x000080);
        this.characterIndicator.setDepth(2000);
        this.characterIndicator.setScrollFactor(0);
        this.characterIndicator.setOrigin(0, 0);
        this.characterIndicator.setVisible(false); // Hidden by default
        
        this.characterText = this.add.text(15, debugUIStartY + 20, `Character: ${this.currentCharacterConfig.name.toUpperCase()}\nPress C to switch`, {
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0, 0.5);
        this.characterText.setDepth(2001);
        this.characterText.setScrollFactor(0);
        this.characterText.setVisible(false); // Hidden by default
        
        // Attack state indicator (debug only)
        this.attackIndicator = this.add.rectangle(10, debugUIStartY + 50, 150, 30, 0x00ff00);
        this.attackIndicator.setDepth(2000);
        this.attackIndicator.setScrollFactor(0);
        this.attackIndicator.setOrigin(0, 0);
        this.attackIndicator.setVisible(false); // Hidden by default
        
        this.attackText = this.add.text(15, debugUIStartY + 65, 'READY', {
            fontSize: '14px',
            fill: '#000000'
        }).setOrigin(0, 0.5);
        this.attackText.setDepth(2001);
        this.attackText.setScrollFactor(0);
        this.attackText.setVisible(false); // Hidden by default
    }
    
    // Health bar is now handled by UIManager - removed duplicate method
    
    // updateHealthBar() method removed - now handled by UIManager
    

    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        this.debugText.setVisible(this.debugMode);
        
        // Show/hide debug UI elements
        this.characterIndicator.setVisible(this.debugMode);
        this.characterText.setVisible(this.debugMode);
        this.attackIndicator.setVisible(this.debugMode);
        this.attackText.setVisible(this.debugMode);
        
        if (!this.debugMode) {
            // Clear debug graphics when turning off
            this.debugGraphics.clear();
        }
        
        console.log(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
    }
    
    clearAllEnemies() {
        const enemyCount = this.enemies.length;
        
        // Destroy all enemy sprites
        this.enemies.forEach(enemy => {
            if (enemy.sprite) {
                enemy.destroy();
            }
        });
        
        // Clear the enemies array
        this.enemies = [];
        
        // Also clear all weapon projectiles
        this.weaponManager.clearAllProjectiles();
        
        // Also clear all item pickups
        this.itemPickupManager.clearAllPickups();
        
        console.log(`Cleared ${enemyCount} enemies`);
        
        // Visual feedback - flash the screen briefly
        const flashOverlay = this.add.rectangle(
            this.cameras.main.scrollX + this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0xff0000,
            0.3
        );
        flashOverlay.setDepth(1999);
        flashOverlay.setScrollFactor(0);
        
        // Remove flash after short duration
        this.time.delayedCall(100, () => {
            flashOverlay.destroy();
        });
    }
    
    updateDebugVisuals() {
        if (!this.debugMode) return;
        
        // Clear previous debug drawings
        this.debugGraphics.clear();
        
        // Draw player hitbox
        this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.bodyLineWidth, 0x00ff00); // Green for player
        const playerBounds = this.player.getBounds();
        this.debugGraphics.strokeRect(
            playerBounds.x,
            playerBounds.y,
            playerBounds.width,
            playerBounds.height
        );
        
        // Draw player collision radius (scaled)
        const playerBodyRadius = HitboxHelpers.getBodyRadius(this.player, 'player');
        this.debugGraphics.lineStyle(1, 0x00ff00, HITBOX_CONFIG.debug.bodyCollisionAlpha); // Light green for collision radius
        this.debugGraphics.strokeCircle(this.player.x, this.player.y, playerBodyRadius);
        
        // Draw player attack hitbox if attacking
        const playerHitbox = this.getPlayerAttackHitbox();
        if (playerHitbox) {
            this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.attackHitboxLineWidth, 0xff0000); // Red for attack hitbox
            this.debugGraphics.strokeRect(
                playerHitbox.x,
                playerHitbox.y,
                playerHitbox.width,
                playerHitbox.height
            );
        }
        
        // Draw enemy hitboxes and attack ranges
        this.enemies.forEach(enemy => {
            if (!enemy.sprite) return;
            
            // Enemy body hitbox
            this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.bodyLineWidth, 0xff8800); // Orange for enemies
            const enemyBounds = enemy.sprite.getBounds();
            this.debugGraphics.strokeRect(
                enemyBounds.x,
                enemyBounds.y,
                enemyBounds.width,
                enemyBounds.height
            );
            
            // Enemy collision radius (scaled)
            const enemyBodyRadius = HitboxHelpers.getBodyRadius(enemy.sprite, 'enemy');
            this.debugGraphics.lineStyle(1, 0xff8800, HITBOX_CONFIG.debug.bodyCollisionAlpha); // Light orange for collision radius
            this.debugGraphics.strokeCircle(enemy.sprite.x, enemy.sprite.y, enemyBodyRadius);
            
            // Enemy detection range
            this.debugGraphics.lineStyle(1, 0x888888, 0.3); // Gray, semi-transparent
            this.debugGraphics.strokeCircle(
                enemy.sprite.x,
                enemy.sprite.y,
                enemy.detectionRange
            );
            
            // Enemy attack range
            this.debugGraphics.lineStyle(1, 0xff0000, 0.5); // Red, semi-transparent
            this.debugGraphics.strokeCircle(
                enemy.sprite.x,
                enemy.sprite.y,
                enemy.attackRange
            );
            
            // Enemy attack hitbox if attacking and can deal damage
            const enemyHitbox = enemy.getAttackHitbox();
            if (enemyHitbox) {
                this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.attackHitboxLineWidth, 0xff0000); // Red for active attack hitbox
                this.debugGraphics.strokeRect(
                    enemyHitbox.x,
                    enemyHitbox.y,
                    enemyHitbox.width,
                    enemyHitbox.height
                );
            }
            
            // Show windup indicator if enemy is winding up attack
            if (enemy.isWindingUp) {
                this.debugGraphics.lineStyle(2, 0xffff00); // Yellow for windup
                const windupRadius = 30 + (enemy.windupTimer / ENEMY_CONFIG.attackWindupDelay) * 20;
                this.debugGraphics.strokeCircle(enemy.sprite.x, enemy.sprite.y - 40, windupRadius);
            }
        });
        
        // Draw street boundaries
        this.debugGraphics.lineStyle(2, 0x0000ff, 0.7); // Blue for boundaries
        this.debugGraphics.strokeRect(0, this.streetTopLimit, 3600, this.streetBottomLimit - this.streetTopLimit);
    }
    
    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) return;
        
        // Get camera and player bounds for spawning
        const cameraX = this.cameras.main.scrollX;
        const cameraWidth = this.cameras.main.width;
        const playerX = this.player.x;
        
        // Determine if player is in first segment (near level start)
        const worldBounds = this.physics.world.bounds;
        const firstSegmentEnd = worldBounds.x + 1200; // First segment is 1200px wide
        const isPlayerInFirstSegment = playerX < firstSegmentEnd;
        
        // If player is in first segment, only spawn from right
        // Otherwise, favor spawning from the right side (70% right, 30% left)
        let spawnOnLeft = false;
        if (!isPlayerInFirstSegment) {
            spawnOnLeft = Math.random() < 0.3;
        }
        
        const spawnX = spawnOnLeft ? 
            cameraX - ENEMY_CONFIG.spawnOffscreenDistance : // Spawn off-screen to the left
            cameraX + cameraWidth + ENEMY_CONFIG.spawnOffscreenDistance; // Spawn off-screen to the right
        
        // Check if spawn position is too close to player
        const minDistanceFromPlayer = 400; // Minimum safe distance
        const distanceToPlayer = Math.abs(spawnX - playerX);
        
        if (distanceToPlayer < minDistanceFromPlayer) {
            console.log(`⚠️ Spawn too close to player (${distanceToPlayer}px), skipping...`);
            return; // Skip this spawn
        }
        
        // Check if spawn position collides with existing enemies
        const minDistanceFromEnemies = 300; // Minimum safe distance from other enemies
        const tooCloseToEnemy = this.enemies.some(enemy => {
            if (!enemy.sprite) return false;
            const distanceToEnemy = Math.abs(spawnX - enemy.sprite.x);
            return distanceToEnemy < minDistanceFromEnemies;
        });
        
        if (tooCloseToEnemy) {
            console.log(`⚠️ Spawn too close to existing enemy, skipping...`);
            return; // Skip this spawn
        }
        
        // Random Y position within street bounds with some variety
        let spawnY = this.streetTopLimit + Math.random() * (this.streetBottomLimit - this.streetTopLimit);
        
        // Randomly select an enemy type with weighted probability FIRST
        // Crackheads are most common (50%), Green thugs medium (30%), Black thugs rare (20%)
        const random = Math.random();
        let enemyConfig;
        if (random < 0.5) {
            enemyConfig = CRACKHEAD_CONFIG; // 50% chance - most common
        } else if (random < 0.8) {
            enemyConfig = GREEN_THUG_CONFIG; // 30% chance - medium difficulty
        } else {
            enemyConfig = BLACK_THUG_CONFIG; // 20% chance - hardest enemy
        }
        
        // NOW add spawn position variety based on enemy type
        if (enemyConfig.name === 'crackhead') {
            // Crackheads prefer to spawn in the middle of the street
            spawnY = this.streetTopLimit + 0.3 * (this.streetBottomLimit - this.streetTopLimit) + 
                     Math.random() * 0.4 * (this.streetBottomLimit - this.streetTopLimit);
        } else if (enemyConfig.name === 'green_thug') {
            // Green thugs prefer the lower part of the street (closer to camera)
            spawnY = this.streetTopLimit + 0.5 * (this.streetBottomLimit - this.streetTopLimit) + 
                     Math.random() * 0.5 * (this.streetBottomLimit - this.streetTopLimit);
        } else if (enemyConfig.name === 'black_thug') {
            // Black thugs can spawn anywhere but prefer edges
            if (Math.random() < 0.5) {
                spawnY = this.streetTopLimit + Math.random() * 0.3 * (this.streetBottomLimit - this.streetTopLimit);
            } else {
                spawnY = this.streetTopLimit + 0.7 * (this.streetBottomLimit - this.streetTopLimit) + 
                         Math.random() * 0.3 * (this.streetBottomLimit - this.streetTopLimit);
            }
        }
        
        // Create enemy
        const enemy = new Enemy(this, spawnX, spawnY, enemyConfig);
        enemy.setPlayer(this.player);
        this.enemies.push(enemy);
        
        const spawnDirection = spawnOnLeft ? 'LEFT' : 'RIGHT';
        const distFromPlayer = Math.abs(spawnX - playerX);
        console.log(`✅ Spawned ${enemyConfig.name} from ${spawnDirection} at x=${Math.round(spawnX)} (${Math.round(distFromPlayer)}px from player) - Total: ${this.enemies.length}`);
    }
    
    updateEnemies(time, delta) {
        // Don't spawn enemies while loading
        if (!this.isLoading) {
            // Update spawn timer
            this.enemySpawnTimer += delta;
            
            // Dynamic spawn rate based on player performance
            let spawnInterval = this.enemySpawnInterval;
            if (this.playerCurrentHealth > this.playerMaxHealth * 0.7) {
                // Player doing well - spawn enemies faster
                spawnInterval *= 0.8;
            } else if (this.playerCurrentHealth < this.playerMaxHealth * 0.3) {
                // Player struggling - spawn enemies slower
                spawnInterval *= 1.5;
            }
            
            if (this.enemySpawnTimer >= spawnInterval) {
                this.spawnEnemy();
                this.enemySpawnTimer = 0;
                // Add some randomness to spawn interval (±20% variation)
                const variation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
                this.enemySpawnInterval = ENEMY_CONFIG.spawnInterval * variation;
            }
        }
        
        // Update all enemies
        this.enemies.forEach((enemy, index) => {
            enemy.update(time, delta);
            
            // Remove destroyed enemies
            if (!enemy.sprite || enemy.state === ENEMY_STATES.DEAD) {
                // Check if enemy should be removed (too far from player or dead for too long)
                const distanceToPlayer = Phaser.Math.Distance.Between(
                    enemy.sprite?.x || 0, enemy.sprite?.y || 0,
                    this.player.x, this.player.y
                );
                
                if (!enemy.sprite || distanceToPlayer > ENEMY_CONFIG.cleanupDistance || enemy.state === ENEMY_STATES.DEAD) {
                    if (enemy.sprite) enemy.destroy();
                    this.enemies.splice(index, 1);
                }
            }
        });
    }
    
    checkCombat() {
        // Check player attacks hitting enemies (both ground attacks and air kicks)
        if ((this.animationManager.currentState === 'attack' || this.animationManager.currentState === 'airkick') && this.animationManager.animationLocked) {
            const playerHitbox = this.getPlayerAttackHitbox();
            if (playerHitbox) {
                // Get scaled hitbox for vertical tolerance
                const scaledHitbox = HitboxHelpers.getPlayerAttackHitbox(this.player);
                const isAirKick = this.animationManager.currentState === 'airkick';
                const verticalTolerance = isAirKick ? 
                    scaledHitbox.airkickVerticalTolerance : 
                    scaledHitbox.verticalTolerance;
                
                this.enemies.forEach(enemy => {
                    if (enemy.state !== ENEMY_STATES.DEAD) {
                        // Check vertical distance first (street-level tolerance)
                        const verticalDistance = Math.abs(this.player.y - enemy.sprite.y);
                        
                        if (verticalDistance <= verticalTolerance && this.isColliding(playerHitbox, enemy.sprite)) {
                            // Only deal damage if this enemy hasn't been hit by this attack yet
                            if (!enemy.hitByCurrentAttack) {
                                enemy.takeDamage(10); // Deal 10 damage per hit (same as enemy health)
                                enemy.hitByCurrentAttack = true; // Mark as hit by this attack
                                console.log(`Player hit enemy with ${this.animationManager.currentState}! (Vertical dist: ${Math.round(verticalDistance)})`);
                                
                                // Track enemy defeat for level progression
                                if (enemy.state === ENEMY_STATES.DEAD && this.levelManager) {
                                    this.levelManager.onEnemyDefeated();
                                }
                            }
                        }
                    }
                });
            }
        }
        
        // Check enemy attacks hitting player
        this.enemies.forEach(enemy => {
            const enemyHitbox = enemy.getAttackHitbox();
            if (enemyHitbox && this.isColliding(enemyHitbox, this.player)) {
                this.playerTakeDamage(enemy.playerDamage);
                console.log(`${enemy.characterConfig.name} enemy hit player for ${enemy.playerDamage} damage!`);
            }
        });
    }
    
    getPlayerAttackHitbox() {
        if ((this.animationManager.currentState !== 'attack' && this.animationManager.currentState !== 'airkick') || !this.animationManager.animationLocked) {
            return null;
        }
        
        // Get scaled hitbox dimensions based on current sprite scale
        const scaledHitbox = HitboxHelpers.getPlayerAttackHitbox(this.player);
        
        // Use different hitbox config for air kicks vs ground attacks
        const isAirKick = this.animationManager.currentState === 'airkick';
        const config = isAirKick ? {
            width: scaledHitbox.airkickWidth,
            height: scaledHitbox.airkickHeight,
            offsetX: scaledHitbox.airkickOffsetX,
            offsetY: scaledHitbox.airkickOffsetY
        } : {
            width: scaledHitbox.attackWidth,
            height: scaledHitbox.attackHeight,
            offsetX: scaledHitbox.attackOffsetX,
            offsetY: scaledHitbox.attackOffsetY
        };
        
        // Calculate proper offset based on facing direction
        // When facing left (flipX = true), attack should be to the left
        // When facing right (flipX = false), attack should be to the right
        const offsetX = this.player.flipX ? -config.offsetX : config.offsetX;
        
        return {
            x: this.player.x + offsetX - (this.player.flipX ? config.width : 0),
            y: this.player.y + config.offsetY,
            width: config.width,
            height: config.height
        };
    }
    
    isColliding(hitbox, sprite) {
        const spriteBox = {
            x: sprite.x - sprite.width/2,
            y: sprite.y - sprite.height/2,
            width: sprite.width,
            height: sprite.height
        };
        
        return (hitbox.x < spriteBox.x + spriteBox.width &&
                hitbox.x + hitbox.width > spriteBox.x &&
                hitbox.y < spriteBox.y + spriteBox.height &&
                hitbox.y + hitbox.height > spriteBox.y);
    }
    
    playerTakeDamage(damage) {
        // Reduce active character's health
        const activeChar = this.characters[this.selectedCharacter];
        activeChar.health = Math.max(0, activeChar.health - damage);
        
        // Update health bar
        this.uiManager.updateHealthBar(activeChar.health, activeChar.maxHealth);
        
        // Update dual character health display
        this.uiManager.updateDualCharacterHealth(
            this.characters.tireek.health, 
            this.characters.tryston.health, 
            this.selectedCharacter
        );
        
        // Play player hit sound effect
        this.audioManager.playPlayerHit();
        
        // Flash effect for player
        this.player.setTint(0xff0000);
        this.time.delayedCall(ENEMY_CONFIG.playerFlashTime, () => {
            this.player.setTint(0xffffff);
        });
        
        console.log(`${this.selectedCharacter} takes ${damage} damage! Health: ${activeChar.health}/${activeChar.maxHealth}`);
        
        // Check for auto-switch when health is low
        const healthPercent = (activeChar.health / activeChar.maxHealth) * 100;
        if (healthPercent <= this.autoSwitchThreshold) {
            console.log(`Auto-switching due to low health: ${healthPercent}%`);
            this.switchCharacter(true); // Force switch
        }
        
        // Check for game over (both characters dead)
        if (activeChar.health <= 0) {
            this.handleCharacterDown();
        }
    }
    
    handleCharacterDown() {
        const activeChar = this.characters[this.selectedCharacter];
        console.log(`${this.selectedCharacter} is down!`);
        
        // Check if both characters are down
        const bothDown = this.characters.tireek.health <= 0 && this.characters.tryston.health <= 0;
        
        if (bothDown) {
            console.log("Both characters are down! Game Over!");
            this.handleGameOver();
        } else {
            // Try to switch to the other character
            const otherChar = this.selectedCharacter === 'tireek' ? 'tryston' : 'tireek';
            if (this.characters[otherChar].health > 0) {
                console.log(`Switching to ${otherChar}...`);
                this.switchCharacter(true);
            } else {
                console.log("Both characters are down!");
                this.handleGameOver();
            }
        }
    }
    
    handleGameOver() {
        console.log("Game Over! Both characters are down!");
        // Add game over effects here later
        // For now, just reset both characters after a delay
        this.time.delayedCall(3000, () => {
            this.characters.tireek.health = this.characters.tireek.maxHealth;
            this.characters.tryston.health = this.characters.tryston.maxHealth;
            this.uiManager.updateHealthBar(this.characters[this.selectedCharacter].health, this.characters[this.selectedCharacter].maxHealth);
            console.log("Both characters respawned!");
        });
    }
    
    handlePlayerDeath() {
        // Legacy method - now handled by handleCharacterDown
        console.log("⚠️ handlePlayerDeath called - use handleCharacterDown instead");
        this.handleCharacterDown();
    }
    
    checkCharacterCollisions() {
        // Check player collision with all enemies
        this.enemies.forEach(enemy => {
            if (!enemy.sprite || enemy.state === ENEMY_STATES.DEAD) return;
            
            // Calculate horizontal and vertical distances separately
            const deltaX = enemy.sprite.x - this.player.x;
            const deltaY = enemy.sprite.y - this.player.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Collision radius (characters can't get closer than this) - use scaled radius
            const playerRadius = HitboxHelpers.getBodyRadius(this.player, 'player');
            const enemyRadius = HitboxHelpers.getBodyRadius(enemy.sprite, 'enemy');
            const collisionRadius = (playerRadius + enemyRadius) / 2; // Average of both radii
            
            if (distance < collisionRadius && distance > 0) {
                // Calculate how much overlap there is
                const overlap = collisionRadius - distance;
                
                // Normalize the separation vector
                const normalX = deltaX / distance;
                const normalY = deltaY / distance;
                
                // Bias heavily toward horizontal separation to prevent vertical overlap weirdness
                const horizontalBias = 0.8; // 80% horizontal, 20% vertical
                const verticalLimit = 0.3; // Limit vertical separation strength
                
                // Calculate separation with bias
                let separationX = normalX * overlap * 0.5;
                let separationY = normalY * overlap * 0.5 * verticalLimit;
                
                // If characters are very close vertically, prioritize horizontal separation
                if (Math.abs(deltaY) < 30) {
                    separationX = Math.sign(deltaX) * overlap * 0.6; // Force stronger horizontal separation
                    separationY = 0; // No vertical separation when close vertically
                }
                
                // Apply separation to player
                const newPlayerX = this.player.x - separationX;
                const newPlayerY = this.player.y - separationY;
                
                // Keep player within world bounds and prevent vertical overlap
                if (newPlayerX >= 0 && newPlayerX <= 3600) {
                    this.player.x = newPlayerX;
                }
                // Only apply vertical separation if it keeps characters reasonably aligned
                if (newPlayerY >= this.streetTopLimit && newPlayerY <= this.streetBottomLimit && 
                    Math.abs(newPlayerY - enemy.sprite.y) > 25) { // Minimum vertical separation
                    this.player.y = newPlayerY;
                    this.player.lastGroundY = newPlayerY;
                }
                
                // Apply separation to enemy
                const newEnemyX = enemy.sprite.x + separationX;
                const newEnemyY = enemy.sprite.y + separationY;
                
                // Keep enemy within world bounds and prevent vertical overlap
                if (newEnemyX >= 0 && newEnemyX <= 3600) {
                    enemy.sprite.x = newEnemyX;
                }
                // Only apply vertical separation if it keeps characters reasonably aligned
                if (newEnemyY >= enemy.streetTopLimit && newEnemyY <= enemy.streetBottomLimit &&
                    Math.abs(newEnemyY - this.player.y) > 25) { // Minimum vertical separation
                    enemy.sprite.y = newEnemyY;
                }
            }
        });
        
        // Check enemy-to-enemy collisions
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy1 = this.enemies[i];
            if (!enemy1.sprite || enemy1.state === ENEMY_STATES.DEAD) continue;
            
            for (let j = i + 1; j < this.enemies.length; j++) {
                const enemy2 = this.enemies[j];
                if (!enemy2.sprite || enemy2.state === ENEMY_STATES.DEAD) continue;
                
                // Calculate horizontal and vertical distances separately
                const deltaX = enemy2.sprite.x - enemy1.sprite.x;
                const deltaY = enemy2.sprite.y - enemy1.sprite.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // Use scaled collision radius for enemy-to-enemy
                const enemy1Radius = HitboxHelpers.getBodyRadius(enemy1.sprite, 'enemy');
                const enemy2Radius = HitboxHelpers.getBodyRadius(enemy2.sprite, 'enemy');
                const collisionRadius = (enemy1Radius + enemy2Radius) / 2; // Average of both radii
                
                if (distance < collisionRadius && distance > 0) {
                    // Calculate how much overlap there is
                    const overlap = collisionRadius - distance;
                    
                    // Normalize the separation vector
                    const normalX = deltaX / distance;
                    const normalY = deltaY / distance;
                    
                    // Bias toward horizontal separation for enemies too
                    const verticalLimit = 0.3; // Limit vertical separation strength
                    
                    // Calculate separation with bias
                    let separationX = normalX * overlap * 0.5;
                    let separationY = normalY * overlap * 0.5 * verticalLimit;
                    
                    // If enemies are very close vertically, prioritize horizontal separation
                    if (Math.abs(deltaY) < 30) {
                        separationX = Math.sign(deltaX) * overlap * 0.6; // Force stronger horizontal separation
                        separationY = 0; // No vertical separation when close vertically
                    }
                    
                    // Apply separation to enemy1
                    const newEnemy1X = enemy1.sprite.x - separationX;
                    const newEnemy1Y = enemy1.sprite.y - separationY;
                    
                    // Apply separation to enemy2
                    const newEnemy2X = enemy2.sprite.x + separationX;
                    const newEnemy2Y = enemy2.sprite.y + separationY;
                    
                    // Update positions within bounds and prevent excessive vertical overlap
                    if (newEnemy1X >= 0 && newEnemy1X <= 3600) {
                        enemy1.sprite.x = newEnemy1X;
                    }
                    // Only apply vertical separation if it keeps enemies reasonably aligned
                    if (newEnemy1Y >= enemy1.streetTopLimit && newEnemy1Y <= enemy1.streetBottomLimit &&
                        Math.abs(newEnemy1Y - enemy2.sprite.y) > 25) { // Minimum vertical separation
                        enemy1.sprite.y = newEnemy1Y;
                    }
                    
                    if (newEnemy2X >= 0 && newEnemy2X <= 3600) {
                        enemy2.sprite.x = newEnemy2X;
                    }
                    // Only apply vertical separation if it keeps enemies reasonably aligned
                    if (newEnemy2Y >= enemy2.streetTopLimit && newEnemy2Y <= enemy2.streetBottomLimit &&
                        Math.abs(newEnemy2Y - enemy1.sprite.y) > 25) { // Minimum vertical separation
                        enemy2.sprite.y = newEnemy2Y;
                    }
                }
            }
        }
    }

    update(time, delta) {
        // Update health regeneration for inactive character
        this.updateHealthRegeneration(delta);
        
        // Update world manager
        if (this.worldManager && this.player) {
            this.worldManager.updateWorld(this.player.x);
        }
        
        // Update animation state manager
        this.animationManager.update(delta);

        // Update input state (only if input manager is ready and not loading)
        if (this.inputManager && !this.isLoading) {
            this.inputManager.updateInputState();
            
            // Handle input and movement using managers
            this.handleInput();
            this.handleMovement();
            this.handleJumping(); // For landing detection only (input handled in handleInput)
            this.handleAnimations();
        }

        // Handle perspective scaling for player when not jumping (restored)
        if (!this.isJumping) {
            this.environmentManager.updatePerspective(this.player);
        }
        
        // Update enemy system
        this.updateEnemies(time, delta);
        
        // Update perspective scaling for all enemies (restored)
        this.enemies.forEach(enemy => {
            if (enemy.sprite && enemy.sprite.active) {
                this.environmentManager.updatePerspective(enemy.sprite);
            }
        });
        
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
        
        // Check combat interactions
        this.checkCombat();
        
        // Check weapon projectile collisions with enemies
        this.weaponManager.checkProjectileCollisions(this.enemies);
        
        // Check character collisions
        this.checkCharacterCollisions();
        
        // Update UI and debug visuals using UIManager
        this.updateUIAndDebugVisuals();
    }
    
    updateHealthRegeneration(delta) {
        // Regenerate health for inactive character
        let didRegenerate = false;
        
        Object.keys(this.characters).forEach(charName => {
            const charData = this.characters[charName];
            if (!charData.isActive && charData.health < charData.maxHealth && charData.health > 0) {
                // Regenerate health over time
                const regenAmount = (charData.regenRate * delta) / 1000; // Convert to per-second
                charData.health = Math.min(charData.maxHealth, charData.health + regenAmount);
                didRegenerate = true;
            }
        });
        
        // Update dual character health bars if any regeneration occurred
        if (didRegenerate && this.uiManager) {
            this.uiManager.updateDualCharacterHealth(
                this.characters.tireek.health,
                this.characters.tryston.health,
                this.selectedCharacter
            );
        }
    }
    
    updateUIAndDebugVisuals() {
        // Update debug display if in debug mode
        if (this.uiManager.debugMode) {
            // Prepare debug data
            const activeChar = this.characters[this.selectedCharacter];
            const debugData = {
                state: this.animationManager.currentState,
                locked: this.animationManager.animationLocked,
                timer: Math.round(this.animationManager.lockTimer),
                velX: Math.round(this.player.body.velocity.x),
                charName: this.currentCharacterConfig.name,
                health: activeChar.health,
                maxHealth: activeChar.maxHealth,
                enemies: this.enemies.length,
                maxEnemies: this.maxEnemies,
                playerX: this.player.x,
                playerY: this.player.y,
                tireekHealth: this.characters.tireek.health,
                trystonHealth: this.characters.tryston.health
            };
            
            // Update debug display using UIManager
            this.uiManager.updateDebugDisplay(debugData);
            
            // Update attack indicator using UIManager
            this.uiManager.updateAttackIndicator(this.animationManager);
            
            // Prepare debug visual data for hitboxes and collision circles
            const debugVisualData = {
                player: this.player,
                enemies: this.enemies,
                streetTopLimit: this.streetTopLimit,
                streetBottomLimit: this.streetBottomLimit,
                playerAttackHitbox: this.getPlayerAttackHitbox(),
                camera: this.cameras.main
            };
            
            // Update debug visuals using UIManager
            this.uiManager.updateDebugVisuals(debugVisualData);
        }
    }

    handleInput() {
        if (!this.inputManager) return;
        
        // Handle system input using InputManager
        this.inputManager.handleSystemInput({
            onDebugToggle: () => this.uiManager.toggleDebugMode(),
            onMusicToggle: () => this.audioManager.toggleBackgroundMusic(),
            onSfxToggle: () => this.audioManager.toggleSoundEffects(),
            onClearEnemies: () => this.clearAllEnemies(),
            onHeal: () => {
                // Heal both characters to full health
                this.characters.tireek.health = this.characters.tireek.maxHealth;
                this.characters.tryston.health = this.characters.tryston.maxHealth;
                
                // Update UI
                this.uiManager.updateHealthBar(this.characters[this.selectedCharacter].health, this.characters[this.selectedCharacter].maxHealth);
                this.uiManager.updateDualCharacterHealth(
                    this.characters.tireek.health, 
                    this.characters.tryston.health, 
                    this.selectedCharacter
                );
                console.log("Both characters healed to full health!");
            },
            onSwitchCharacter: () => {
                this.switchCharacter();
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
                this.startJump(); // Use original startJump method
            }
        }
    }

    handleMovement() {
        if (!this.inputManager) return;
        
        // Check if we're doing an air kick (jumping + attacking)
        const isAirKick = this.isJumping && (this.animationManager.currentState === 'airkick');
        
        // Don't allow movement during GROUND attacks only
        if ((this.animationManager.currentState === 'attack' || this.animationManager.animationLocked) && !isAirKick) {
            // Force stop all movement for ground attacks
            this.player.setVelocityX(0);
            this.player.body.velocity.x = 0;
            this.player.body.acceleration.x = 0;
            return;
        }

        // Use InputManager for movement
        const isMoving = this.inputManager.handleMovement(this.player, this.animationManager, this.isJumping);

        // Handle vertical movement (beat 'em up style) - ONLY when not jumping and not attacking
        if (!this.isJumping) {
            // Disable physics for vertical movement
            this.player.setGravityY(0);
            this.player.setVelocityY(0);
            this.player.body.velocity.y = 0;
            this.player.body.acceleration.y = 0;
            
            // Don't allow vertical movement during attacks
            if (this.animationManager.currentState === 'attack' || this.animationManager.animationLocked) {
                this.player.body.velocity.y = 0;
                console.log("Vertical movement blocked - in attack");
                return;
            }
            
            // Manual position control is now handled by InputManager
            // No direct cursor access needed here
            
            // Enforce boundaries
            if (this.player.y <= this.streetTopLimit) {
                this.player.y = this.streetTopLimit;
                this.player.lastGroundY = this.streetTopLimit;
            }
            if (this.player.y >= this.streetBottomLimit) {
                this.player.y = this.streetBottomLimit;
                this.player.lastGroundY = this.streetBottomLimit;
            }
            
            // Force position lock
            this.player.body.velocity.y = 0;
            this.player.body.acceleration.y = 0;
        }
    }

    handleJumping() {
        // Handle landing from jump
        if (this.isJumping) {
            // Debug: log jump state every few frames
            if (Math.random() < 0.01) { // 1% chance per frame
                console.log(`Jump Debug: Y=${Math.round(this.player.y)}, LastGroundY=${this.player.lastGroundY}, VelY=${Math.round(this.player.body.velocity.y)}`);
            }
            
            // Check if we're falling and have reached or passed the ground level
            if (this.player.body.velocity.y >= 0 && this.player.y >= this.player.lastGroundY) {
                this.landPlayer(this.player.lastGroundY, "Normal landing");
            }
            // Safety checks
            else if (this.player.y >= this.streetBottomLimit) {
                this.landPlayer(this.streetBottomLimit, "Force landed at bottom boundary");
            }
            else if (Math.abs(this.player.body.velocity.y) < 10 && Math.abs(this.player.y - this.player.lastGroundY) < 20) {
                this.landPlayer(this.player.lastGroundY, "Emergency landing");
            }
        }
    }

    handleAnimations() {
        const charName = this.player.characterConfig.name;
        
        // Don't override locked animations
        if (this.animationManager.animationLocked) return;

        // Handle movement animations
        if (this.player.body.velocity.x !== 0 && !this.isJumping) {
            // Running
            if (this.animationManager.setState('run')) {
                this.player.anims.play(`${charName}_run`, true);
            }
        } else if (this.player.body.velocity.x === 0 && !this.isJumping && this.animationManager.currentState !== 'attack') {
            // Idle
            if (this.animationManager.setState('idle')) {
                this.player.anims.play(`${charName}_idle`, true);
            }
        }
    }

    startJump() {
        if (this.isJumping) return;
        
        const charName = this.player.characterConfig.name;
        
        // Store current ground position
        this.player.lastGroundY = Math.max(this.streetTopLimit, Math.min(this.player.y, this.streetBottomLimit));
        
        // Start the jump
        this.player.setVelocityY(-400);
        this.player.setGravityY(1000);
        this.isJumping = true;
        
        // Play jump animation
        if (this.animationManager.setState('jump')) {
            this.player.anims.play(`${charName}_jump`, true);
        }
        
        console.log("Jump started from Y:", this.player.y, "Will land at:", this.player.lastGroundY);
    }

    landPlayer(targetY, reason) {
        // Ensure landing position is within valid bounds
        const landingY = Math.max(this.streetTopLimit, Math.min(targetY, this.streetBottomLimit));
        
        // Set player position and stop all movement
        this.player.y = landingY;
        this.player.setVelocityY(0);
        this.player.setGravityY(0);
        this.player.body.velocity.y = 0;
        this.player.body.acceleration.y = 0;
        
        // Update ground position and exit jump state
        this.player.lastGroundY = landingY;
        this.isJumping = false;
        
        // Reset animation state
        this.animationManager.setState('idle');
        
        console.log(`${reason} - Landed at Y: ${landingY}`);
    }


    updatePerspective() {
        // Calculate scale based on Y position (perspective effect)
        const minScale = 2.2;  // Scale when at top (buildings)
        const maxScale = 2.8;  // Scale when at bottom (camera)
        
        const normalizedY = (this.player.y - this.streetTopLimit) / (this.streetBottomLimit - this.streetTopLimit);
        const scale = minScale + (maxScale - minScale) * normalizedY;
        
        this.player.setScale(scale);
        
        // Set depth/z-index - higher Y = lower depth (behind other objects)
        this.player.setDepth(1000 - this.player.y);
    }
    
    // ========================================
    // LEVEL SYSTEM METHODS
    // ========================================
    
    initializeLevelSystem() {
        console.log('🎮 Initializing level system...');
        
        // Load level by ID (find the level with id:1, which should be index 0)
        const levelIndex = LEVEL_CONFIGS.findIndex(l => l.id === this.selectedLevelId);
        console.log(`🎮 📊 Loading level with id=${this.selectedLevelId}, found at index=${levelIndex}`);
        
        if (levelIndex >= 0) {
            this.levelManager.loadLevel(levelIndex);
        } else {
            console.error(`🎮 Level with id ${this.selectedLevelId} not found!`);
        }
        
        // Set up level manager callbacks
        this.setupLevelManagerCallbacks();
        
        // Add level info to UI
        this.updateLevelDisplay();
        
        console.log('🎮 Level system initialized!');
    }
    
    setupLevelManagerCallbacks() {
        // Handle dialogue triggers
        this.onDialogueTriggered = (dialogue) => {
            console.log(`💬 Dialogue triggered: ${dialogue.text}`);
            this.showDialogue(dialogue);
        };
        
        // Handle boss spawn triggers
        this.onBossSpawnTriggered = (bossConfig) => {
            console.log(`👹 Boss spawn triggered: ${bossConfig.type}`);
            this.showBossWarning(bossConfig);
        };
    }
    
    showDialogue(dialogue) {
        // Simple dialogue display for testing
        const dialogueText = this.add.text(600, 200, dialogue.text, {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        });
        dialogueText.setOrigin(0.5);
        dialogueText.setDepth(3000);
        dialogueText.setScrollFactor(0);
        
        // Remove dialogue after duration
        this.time.delayedCall(dialogue.duration, () => {
            dialogueText.destroy();
        });
        
        console.log(`💬 Showing dialogue: ${dialogue.text}`);
    }
    
    showBossWarning(bossConfig) {
        // Simple boss warning for testing
        const warningText = this.add.text(600, 150, `BOSS INCOMING: ${bossConfig.type.toUpperCase()}!`, {
            fontSize: '32px',
            fill: '#ff0000',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        });
        warningText.setOrigin(0.5);
        warningText.setDepth(3000);
        warningText.setScrollFactor(0);
        
        // Remove warning after 3 seconds
        this.time.delayedCall(3000, () => {
            warningText.destroy();
        });
        
        console.log(`👹 Boss warning displayed: ${bossConfig.type}`);
    }
    
    updateLevelDisplay() {
        // Update level info in UI
        if (this.uiManager) {
            this.uiManager.updateLevelDisplay(
                this.levelManager.currentLevel,
                this.levelManager.getCurrentLevelConfig()?.name || 'Unknown Level'
            );
        }
    }
    
    // ========================================
    // LEVEL LIFECYCLE METHODS
    // ========================================
    
    onLevelCleanup() {
        console.log('🎮 GameScene: Cleaning up level...');
        
        // Destroy all enemies
        this.destroyAllEnemies();
        
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
    
    destroyAllEnemies() {
        if (!this.enemies) return;
        
        console.log(`🎮 Destroying ${this.enemies.length} enemies...`);
        
        this.enemies.forEach(enemy => {
            if (enemy.sprite) {
                enemy.sprite.destroy();
            }
        });
        
        this.enemies = [];
    }
    
    resetPlayerState() {
        console.log('🎮 Resetting player state...');
        
        // Get spawn point from world manager
        const spawnPoint = this.worldManager.getSpawnPoint();
        
        // Reset both character sprites
        Object.values(this.characters).forEach(charData => {
            if (charData.sprite) {
                charData.sprite.setPosition(spawnPoint.x, spawnPoint.y);
                charData.sprite.setVelocity(0, 0);
                charData.sprite.body.reset(spawnPoint.x, spawnPoint.y);
            }
        });
        
        // Reset player reference
        this.player.setPosition(spawnPoint.x, spawnPoint.y);
        this.player.setVelocity(0, 0);
        this.player.body.reset(spawnPoint.x, spawnPoint.y);
        
        // Reset player state
        this.isJumping = false;
        this.canDoubleJump = true;
        this.doubleJumpUsed = false;
        this.isFacingRight = true;
        
        // Partially restore health (75% of max)
        Object.keys(this.characters).forEach(charName => {
            const charData = this.characters[charName];
            charData.health = Math.min(charData.maxHealth, charData.health + (charData.maxHealth * 0.75));
        });
        
        // Update UI
        if (this.uiManager) {
            const activeChar = this.characters[this.getActiveCharacterName()];
            this.uiManager.updateHealthBar(activeChar.health, activeChar.maxHealth);
            this.uiManager.updateDualCharacterHealth(
                this.characters.tireek.health,
                this.characters.tryston.health,
                this.getActiveCharacterName()
            );
        }
        
        // Resume gameplay
        this.isLoading = false;
        
        console.log('🎮 Player state reset complete');
    }
    
    getActiveCharacterName() {
        return Object.keys(this.characters).find(name => this.characters[name].isActive) || 'tireek';
    }
}