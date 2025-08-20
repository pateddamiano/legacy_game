// ========================================
// MAIN GAME SCENE
// ========================================
// This file contains the primary game logic, player controls, and scene management

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.currentCharacterIndex = 0; // Start with first character (Tireek)
        this.currentCharacterConfig = ALL_CHARACTERS[this.currentCharacterIndex];
    }

    preload() {
        // Load background assets
        this.load.image('street', 'assets/backgrounds/StreetTexture.png');
        this.load.image('cityscape', 'assets/backgrounds/Background.png');
        
        // Load all character sprite sheets
        ALL_CHARACTERS.forEach(characterConfig => {
            this.loadCharacterAssets(characterConfig);
        });
        
        // Load enemy assets
        this.loadCharacterAssets(CRACKHEAD_CONFIG);
        
        // Load audio assets
        this.loadAudioAssets();
    }

    loadCharacterAssets(characterConfig) {
        // Load all sprite sheets for the character
        Object.entries(characterConfig.spriteSheets).forEach(([animName, path]) => {
            this.load.spritesheet(`${characterConfig.name}_${animName}`, path, {
                frameWidth: characterConfig.frameSize.width,
                frameHeight: characterConfig.frameSize.height
            });
        });
    }
    
    loadAudioAssets() {
        // 🎵 BACKGROUND MUSIC
        // Add your music files here - place them in assets/audio/music/
        
        console.log('🎵 Attempting to load music files...');
        
        // Try loading with different formats and add more debugging
        this.load.audio('combatMusic', [
            './assets/audio/music/angeloimani_river_8bit_style.ogg',
            './assets/audio/music/angeloimani_river_8bit_style.m4a'
        ]);
        
        // Add comprehensive load event listeners with detailed debugging
        this.load.on('filecomplete-audio-combatMusic', (key, type, data) => {
            console.log('🎵 Combat music loaded successfully!', { key, type });
            console.log('🎵 Audio cache after load:', this.cache.audio.has('combatMusic'));
            console.log('🎵 Available audio keys after load:', Object.keys(this.cache.audio.entries.entries));
        });
        
        this.load.on('loaderror', (file) => {
            console.error('🎵 Failed to load audio file:', file.key, file.src);
        });
        
        this.load.on('complete', () => {
            console.log('🎵 All assets loading complete');
            console.log('🎵 Final audio cache check:', this.cache.audio.has('combatMusic'));
        });
        
        // 🔊 SOUND EFFECTS  
        // Add your sound effect files here - place them in assets/audio/sfx/
        // Uncomment the lines below when you add sound files:
        
        // this.load.audio('playerAttack', 'assets/audio/sfx/player_attack.wav');
        // this.load.audio('playerHit', 'assets/audio/sfx/player_hit.wav');
        // this.load.audio('enemyHit', 'assets/audio/sfx/enemy_hit.wav');
        // this.load.audio('enemySpawn', 'assets/audio/sfx/enemy_spawn.wav');
        // this.load.audio('enemyDeath', 'assets/audio/sfx/enemy_death.wav');
        
        console.log('🎵 Audio loading configured - add your files and uncomment the load statements!');
    }

    create() {
        // Initialize managers first
        this.environmentManager = new EnvironmentManager(this);
        this.audioManager = new AudioManager(this);
        this.uiManager = new UIManager(this);
        this.inputManager = new InputManager(this);
        
        // Initialize environment (sets up world bounds and backgrounds)
        this.environmentManager.initializeWorld();
        
        // Get street limits from environment manager
        const streetBounds = this.environmentManager.getStreetBounds();
        this.streetTopLimit = streetBounds.top;
        this.streetBottomLimit = streetBounds.bottom;

        // Create player with current character
        this.createPlayer(this.currentCharacterConfig);
        
        // Set up camera using EnvironmentManager
        this.environmentManager.setupCameraForEnvironment(this.cameras.main, this.player);

        // Input is now handled by InputManager

        // Create animations for all characters
        ALL_CHARACTERS.forEach(characterConfig => {
            this.createCharacterAnimations(characterConfig);
        });
        
        // Create animations for enemies
        this.createCharacterAnimations(CRACKHEAD_CONFIG);

        // Initialize animation state manager
        this.animationManager = new AnimationStateManager(this.player);
        
        // Initialize enemy system (using centralized config)
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = ENEMY_CONFIG.spawnInterval;
        this.maxEnemies = ENEMY_CONFIG.maxEnemiesOnScreen;
        
        // Set up animation complete listeners for current character only
        this.setupAnimationEvents(this.currentCharacterConfig);
        
        // Start with idle animation
        this.player.anims.play(`${this.currentCharacterConfig.name}_idle`, true);
        
        // Initialize jump tracking
        this.isJumping = false;
        
        // Initialize player health system
        this.playerMaxHealth = 100;
        this.playerCurrentHealth = this.playerMaxHealth;
        
        // Initialize UI system  
        this.uiManager.initializeUI();
        
        // Start background music after everything is loaded and created
        this.time.delayedCall(100, () => {
            console.log('🎵 Attempting to start background music...');
            console.log('🎵 Audio cache before play attempt:', this.cache.audio.has('combatMusic'));
            this.audioManager.playBackgroundMusic('combatMusic');
        });
    }

    createPlayer(characterConfig) {
        // Create player sprite using the idle animation
        this.player = this.physics.add.sprite(200, 600, `${characterConfig.name}_idle`);
        
        // Initialize ground tracking for jumps
        this.player.lastGroundY = this.player.y;
        
        // Scale up the player sprite (restored from original)
        this.player.setScale(2.5);
        
        // Set player physics properties
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        
        // Store character config on player
        this.player.characterConfig = characterConfig;
    }

    createCharacterAnimations(characterConfig) {
        const charName = characterConfig.name;
        
        // Create all animations based on character config
        Object.entries(characterConfig.animations).forEach(([animName, config]) => {
            const spriteKey = `${charName}_${animName}`;
            const frameConfig = this.anims.generateFrameNumbers(spriteKey, { 
                start: 0, 
                end: config.frames - 1 
            });

            this.anims.create({
                key: `${charName}_${animName}`,
                frames: frameConfig,
                frameRate: config.frameRate,
                repeat: config.repeat
            });
        });
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

    switchCharacter() {
        // Only allow switching if not in middle of an action
        if (this.animationManager.animationLocked || this.isJumping || 
            this.animationManager.currentState === 'attack' || 
            this.animationManager.currentState === 'airkick') {
            console.log("Cannot switch characters during action");
            return;
        }

        // Switch to next character
        this.currentCharacterIndex = (this.currentCharacterIndex + 1) % ALL_CHARACTERS.length;
        this.currentCharacterConfig = ALL_CHARACTERS[this.currentCharacterIndex];
        
        // Store current position and state
        const currentX = this.player.x;
        const currentY = this.player.y;
        const currentScale = this.player.scaleX;
        const currentFlipX = this.player.flipX;
        
        // Destroy current player sprite
        this.player.destroy();
        
        // Create new player with new character
        this.createPlayer(this.currentCharacterConfig);
        
        // Restore position and state
        this.player.x = currentX;
        this.player.y = currentY;
        this.player.setScale(currentScale);
        this.player.setFlipX(currentFlipX);
        this.player.lastGroundY = currentY;
        
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
        
        console.log(`Switched to character: ${this.currentCharacterConfig.name}`);
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
    
    createHealthBar() {
        const healthBarWidth = 250;
        const healthBarHeight = 25;
        const healthBarX = 20;
        const healthBarY = 20; // Top left position - mobile friendly
        
        // Create outer box container (darker border)
        this.healthBarBorder = this.add.rectangle(
            healthBarX, 
            healthBarY, 
            healthBarWidth + 8, 
            healthBarHeight + 8, 
            0x2a2a2a
        );
        this.healthBarBorder.setOrigin(0, 0);
        this.healthBarBorder.setDepth(2000);
        this.healthBarBorder.setScrollFactor(0);
        
        // Create inner box background (slightly lighter)
        this.healthBarBg = this.add.rectangle(
            healthBarX + 4, 
            healthBarY + 4, 
            healthBarWidth, 
            healthBarHeight, 
            0x404040
        );
        this.healthBarBg.setOrigin(0, 0);
        this.healthBarBg.setDepth(2001);
        this.healthBarBg.setScrollFactor(0);
        
        // Create health bar graphics
        this.healthBarGraphics = this.add.graphics();
        this.healthBarGraphics.setDepth(2002);
        this.healthBarGraphics.setScrollFactor(0);
        
        // Store health bar dimensions for updates
        this.healthBarWidth = healthBarWidth;
        this.healthBarHeight = healthBarHeight;
        this.healthBarX = healthBarX + 4;
        this.healthBarY = healthBarY + 4;
        
        // Initial health bar update
        this.updateHealthBar();
    }
    
    updateHealthBar() {
        // Clear previous graphics
        this.healthBarGraphics.clear();
        
        // Calculate health percentage
        const healthPercent = this.playerCurrentHealth / this.playerMaxHealth;
        const currentWidth = this.healthBarWidth * healthPercent;
        
        // Orange gradient based on health percentage
        // Full health: Bright orange (#FF8C00)
        // Medium health: Orange (#FF7F00) 
        // Low health: Dark orange/red (#FF4500)
        let healthColor;
        if (healthPercent > 0.6) {
            // High health: Bright orange
            healthColor = 0xFF8C00;
        } else if (healthPercent > 0.3) {
            // Medium health: Standard orange
            healthColor = 0xFF7F00;
        } else {
            // Low health: Dark orange/red
            healthColor = 0xFF4500;
        }
        
        // Draw the health bar
        if (currentWidth > 0) {
            // Main health bar fill
            this.healthBarGraphics.fillStyle(healthColor);
            this.healthBarGraphics.fillRect(
                this.healthBarX,
                this.healthBarY,
                currentWidth,
                this.healthBarHeight
            );
            
            // Add a subtle highlight on top for depth
            this.healthBarGraphics.fillStyle(0xffffff, 0.25);
            this.healthBarGraphics.fillRect(
                this.healthBarX,
                this.healthBarY,
                currentWidth,
                this.healthBarHeight * 0.4
            );
            
            // Add a subtle shadow on bottom for depth
            this.healthBarGraphics.fillStyle(0x000000, 0.15);
            this.healthBarGraphics.fillRect(
                this.healthBarX,
                this.healthBarY + this.healthBarHeight * 0.7,
                currentWidth,
                this.healthBarHeight * 0.3
            );
        }
    }
    

    
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
        
        // Draw player collision radius
        this.debugGraphics.lineStyle(1, 0x00ff00, HITBOX_CONFIG.debug.bodyCollisionAlpha); // Light green for collision radius
        this.debugGraphics.strokeCircle(this.player.x, this.player.y, HITBOX_CONFIG.player.bodyRadius);
        
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
            
            // Enemy collision radius
            this.debugGraphics.lineStyle(1, 0xff8800, HITBOX_CONFIG.debug.bodyCollisionAlpha); // Light orange for collision radius
            this.debugGraphics.strokeCircle(enemy.sprite.x, enemy.sprite.y, HITBOX_CONFIG.enemy.bodyRadius);
            
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
        
        // Get camera bounds for spawning
        const cameraX = this.cameras.main.scrollX;
        const cameraWidth = this.cameras.main.width;
        
        // Randomly choose left or right side of screen
        const spawnOnLeft = Math.random() < 0.5;
        const spawnX = spawnOnLeft ? 
            cameraX - ENEMY_CONFIG.spawnOffscreenDistance : // Spawn off-screen to the left
            cameraX + cameraWidth + ENEMY_CONFIG.spawnOffscreenDistance; // Spawn off-screen to the right
            
        // Random Y position within street bounds
        const spawnY = this.streetTopLimit + Math.random() * (this.streetBottomLimit - this.streetTopLimit);
        
        // Create enemy
        const enemy = new Enemy(this, spawnX, spawnY, CRACKHEAD_CONFIG);
        enemy.setPlayer(this.player);
        this.enemies.push(enemy);
        
        console.log(`Spawned enemy at (${spawnX}, ${spawnY}) - Total enemies: ${this.enemies.length}`);
    }
    
    updateEnemies(time, delta) {
        // Update spawn timer
        this.enemySpawnTimer += delta;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
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
                this.enemies.forEach(enemy => {
                    if (enemy.state !== ENEMY_STATES.DEAD && this.isColliding(playerHitbox, enemy.sprite)) {
                        enemy.takeDamage(1);
                        console.log("Player hit enemy with " + this.animationManager.currentState + "!");
                    }
                });
            }
        }
        
        // Check enemy attacks hitting player
        this.enemies.forEach(enemy => {
            const enemyHitbox = enemy.getAttackHitbox();
            if (enemyHitbox && this.isColliding(enemyHitbox, this.player)) {
                this.playerTakeDamage(ENEMY_CONFIG.playerDamage);
                console.log("Enemy hit player!");
            }
        });
    }
    
    getPlayerAttackHitbox() {
        if ((this.animationManager.currentState !== 'attack' && this.animationManager.currentState !== 'airkick') || !this.animationManager.animationLocked) {
            return null;
        }
        
        // Use different hitbox config for air kicks vs ground attacks
        const isAirKick = this.animationManager.currentState === 'airkick';
        const config = isAirKick ? {
            width: HITBOX_CONFIG.player.airkickWidth,
            height: HITBOX_CONFIG.player.airkickHeight,
            offsetX: HITBOX_CONFIG.player.airkickOffsetX,
            offsetY: HITBOX_CONFIG.player.airkickOffsetY
        } : {
            width: HITBOX_CONFIG.player.attackWidth,
            height: HITBOX_CONFIG.player.attackHeight,
            offsetX: HITBOX_CONFIG.player.attackOffsetX,
            offsetY: HITBOX_CONFIG.player.attackOffsetY
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
        // Reduce player health
        this.playerCurrentHealth = Math.max(0, this.playerCurrentHealth - damage);
        
        // Update health bar
        this.uiManager.updateHealthBar(this.playerCurrentHealth, this.playerMaxHealth);
        
        // Play player hit sound effect
        this.audioManager.playPlayerHit();
        
        // Flash effect for player
        this.player.setTint(0xff0000);
        this.time.delayedCall(ENEMY_CONFIG.playerFlashTime, () => {
            this.player.setTint(0xffffff);
        });
        
        console.log(`Player takes ${damage} damage! Health: ${this.playerCurrentHealth}/${this.playerMaxHealth}`);
        
        // Check for game over
        if (this.playerCurrentHealth <= 0) {
            this.handlePlayerDeath();
        }
    }
    
    handlePlayerDeath() {
        console.log("Player died!");
        // Add death effects here later if needed
        // For now, just reset health after a delay
        this.time.delayedCall(2000, () => {
            this.playerCurrentHealth = this.playerMaxHealth;
            this.updateHealthBar();
            console.log("Player respawned!");
        });
    }
    
    checkCharacterCollisions() {
        // Check player collision with all enemies
        this.enemies.forEach(enemy => {
            if (!enemy.sprite || enemy.state === ENEMY_STATES.DEAD) return;
            
            // Calculate horizontal and vertical distances separately
            const deltaX = enemy.sprite.x - this.player.x;
            const deltaY = enemy.sprite.y - this.player.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Collision radius (characters can't get closer than this)
            const collisionRadius = HITBOX_CONFIG.enemy.playerCollisionRadius;
            
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
                
                const collisionRadius = HITBOX_CONFIG.enemy.enemyCollisionRadius;
                
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
        // Update animation state manager
        this.animationManager.update(delta);

        // Update input state (only if input manager is ready)
        if (this.inputManager) {
            this.inputManager.updateInputState();
        }
        
        // Handle input and movement using managers
        this.handleInput();
        this.handleMovement();
        this.handleJumping(); // For landing detection only (input handled in handleInput)
        this.handleAnimations();

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
        
        // Check combat interactions
        this.checkCombat();
        
        // Check character collisions
        this.checkCharacterCollisions();
        
        // Update UI and debug visuals using UIManager
        this.updateUIAndDebugVisuals();
    }
    
    updateUIAndDebugVisuals() {
        // Update debug display if in debug mode
        if (this.uiManager.debugMode) {
            // Prepare debug data
            const debugData = {
                state: this.animationManager.currentState,
                locked: this.animationManager.animationLocked,
                timer: Math.round(this.animationManager.lockTimer),
                velX: Math.round(this.player.body.velocity.x),
                charName: this.currentCharacterConfig.name,
                health: this.playerCurrentHealth,
                maxHealth: this.playerMaxHealth,
                enemies: this.enemies.length,
                maxEnemies: this.maxEnemies,
                playerX: this.player.x,
                playerY: this.player.y
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
                this.playerCurrentHealth = this.playerMaxHealth;
                this.uiManager.updateHealthBar(this.playerCurrentHealth, this.playerMaxHealth);
                console.log("Player healed to full health!");
            },
            onSwitchCharacter: () => {
                this.switchCharacter();
                return true; // Skip other input processing during character switch
            }
        });
        
        // Handle attack input using InputManager
        this.inputManager.handleAttackInput(
            this.player, 
            this.animationManager, 
            this.isJumping, 
            this.audioManager
        );
        
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

    createParallaxBackgrounds() {
        // Create groups for different background layers
        this.backgroundLayers = {
            cityscape: this.add.group(),
            street: this.add.group()
        };
        
        // Create far background cityscape (slower parallax)
        this.createCityscapeLayer();
        
        // Create street layer (normal scrolling speed)
        this.createStreetLayer();
    }

    createCityscapeLayer() {
        // Get cityscape texture dimensions
        const cityscapeTexture = this.textures.get('cityscape');
        const textureWidth = cityscapeTexture.source[0].width;
        const textureHeight = cityscapeTexture.source[0].height;
        
        // Scale to fit game height (720px)
        const scale = 720 / textureHeight;
        const scaledWidth = textureWidth * scale;
        
        // Create enough copies for parallax scrolling
        const numCopies = Math.ceil(3600 / scaledWidth) + 2;
        
        for (let i = 0; i < numCopies; i++) {
            const bg = this.add.image(i * scaledWidth, 150, 'cityscape');
            bg.setOrigin(0.5, 0.5);
            bg.setScale(scale);
            bg.setDepth(-200);
            bg.setScrollFactor(0.3);
            this.backgroundLayers.cityscape.add(bg);
        }
        
        console.log(`Cityscape: ${textureWidth}x${textureHeight}, Scale: ${scale}, Scaled width: ${scaledWidth}`);
    }

    createStreetLayer() {
        // Get street texture dimensions
        const streetTexture = this.textures.get('street');
        const textureWidth = streetTexture.source[0].width;
        const textureHeight = streetTexture.source[0].height;
        
        // Scale to fit game height (720px)
        const scale = 720 / textureHeight;
        const scaledWidth = textureWidth * scale;
        
        // Create enough copies for seamless scrolling
        const numCopies = Math.ceil(3600 / scaledWidth) + 1;
        
        for (let i = 0; i < numCopies; i++) {
            const bg = this.add.image(i * scaledWidth, 360, 'street');
            bg.setOrigin(0.5, 0.5);
            bg.setScale(scale);
            bg.setDepth(-100);
            bg.setScrollFactor(1.0);
            this.backgroundLayers.street.add(bg);
        }
        
        console.log(`Street: ${textureWidth}x${textureHeight}, Scale: ${scale}, Scaled width: ${scaledWidth}`);
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
}