// Character Animation Configuration System
class CharacterConfig {
    constructor(name, spriteSheets, animations, frameSize = {width: 128, height: 96}) {
        this.name = name;
        this.spriteSheets = spriteSheets;
        this.animations = animations;
        this.frameSize = frameSize;
    }
}

// Animation State Manager
class AnimationStateManager {
    constructor(character) {
        this.character = character;
        this.currentState = 'idle';
        this.isInCombo = false;
        this.comboStep = 0;
        this.comboTimer = 0;
        this.comboTimeout = 500; // ms to reset combo (longer window for easier chaining)
        this.animationLocked = false; // Prevents interruption during certain animations
        this.lockTimer = 0;
        this.queuedAttacks = []; // Buffer for queued attacks (array for multiple)
        this.bufferWindow = 150; // ms before animation ends to allow buffering
        this.maxQueueSize = 2; // Maximum attacks that can be queued (allows up to 3-hit combo)
    }

    update(deltaTime) {
        // Update combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }

        // Update animation lock timer
        if (this.lockTimer > 0) {
            this.lockTimer -= deltaTime;
            
            // Check if we're in the buffer window and have queued attacks
            if (this.queuedAttacks.length > 0 && this.lockTimer <= this.bufferWindow) {
                const nextAttack = this.executeQueuedAttack();
                if (nextAttack) {
                    console.log("Executing buffered attack:", nextAttack);
                    return nextAttack; // Signal to game that we need to execute this attack
                }
            }
            
            if (this.lockTimer <= 0) {
                console.log("Animation lock timer expired, unlocking");
                this.animationLocked = false;
                if (this.currentState === 'attack') {
                    console.log("Resetting attack state to idle after lock timer");
                    this.currentState = 'idle';
                }
            }
        }
    }

    executeQueuedAttack() {
        if (this.queuedAttacks.length > 0) {
            const attackType = this.queuedAttacks.shift(); // Remove first attack from queue
            console.log(`Executing queued attack: ${attackType}, ${this.queuedAttacks.length} remaining in queue`);
            return attackType;
        }
        return null;
    }

    queueAttack() {
        // Only queue if we haven't reached the maximum queue size
        if (this.queuedAttacks.length >= this.maxQueueSize) {
            console.log("Queue full! Cannot queue more attacks");
            return false;
        }

        // Only queue if we're currently attacking
        if (this.currentState === 'attack' || this.currentState === 'airkick') {
            const attackType = this.startCombo();
            this.queuedAttacks.push(attackType);
            console.log(`Queued attack: ${attackType}, queue size: ${this.queuedAttacks.length}/${this.maxQueueSize}`);
            return true;
        }
        return false;
    }

    clearQueue() {
        this.queuedAttacks = [];
        console.log("Attack queue cleared");
    }

    canTransitionTo(newState) {
        // Can't interrupt locked animations
        if (this.animationLocked) return false;
        
        // Special rules for state transitions
        if (newState === 'attack' && this.isInCombo) return true;
        if (this.currentState === 'jump' && newState === 'airkick') return true;
        
        return true;
    }

    setState(newState, lockDuration = 0) {
        if (!this.canTransitionTo(newState)) return false;

        this.currentState = newState;
        if (lockDuration > 0) {
            this.animationLocked = true;
            this.lockTimer = lockDuration;
        }
        return true;
    }

    startCombo() {
        if (!this.isInCombo) {
            this.isInCombo = true;
            this.comboStep = 0;
        }
        
        this.comboStep++;
        this.comboTimer = this.comboTimeout;
        
        // Determine which attack based on combo step
        let attackType;
        switch (this.comboStep) {
            case 1: attackType = 'jab'; break;
            case 2: attackType = 'cross'; break;
            case 3: attackType = 'kick'; this.resetCombo(); break;
            default: attackType = 'jab'; this.resetCombo(); break;
        }
        
        return attackType;
    }

    resetCombo() {
        this.isInCombo = false;
        this.comboStep = 0;
        this.comboTimer = 0;
        this.clearQueue(); // Clear any queued attacks when combo resets
    }
}

// Define Tireek character configuration
const TIREEK_CONFIG = new CharacterConfig(
    'tireek',
    {
        run: 'assets/characters/tireek/spritesheets/Tireek_Run.png',
        jab: 'assets/characters/tireek/spritesheets/Tireek_Jab.png',
        cross: 'assets/characters/tireek/spritesheets/Tireek_Cross.png',
        kick: 'assets/characters/tireek/spritesheets/Tireek_Kick.png',
        jump: 'assets/characters/tireek/spritesheets/Tireek_Jump.png',
        airkick: 'assets/characters/tireek/spritesheets/Tireek_AirKick.png',
        idle: 'assets/characters/tireek/spritesheets/Tireek_Idle.png'
    },
    {
        run: { frames: 8, frameRate: 12, repeat: -1 },
        jab: { frames: 4, frameRate: 20, repeat: 0 },     // Very fast: 24 FPS
        cross: { frames: 4, frameRate: 20, repeat: 0 },   // Very fast: 24 FPS  
        kick: { frames: 5, frameRate: 16, repeat: 0 },    // Fast: 20 FPS
        jump: { frames: 1, frameRate: 12, repeat: 0 },
        airkick: { frames: 1, frameRate: 12, repeat: 0 },
        idle: { frames: 5, frameRate: 12, repeat: -1 }    // Keep idle at normal speed
    }
);

// Define Tryston character configuration
const TRYSTON_CONFIG = new CharacterConfig(
    'tryston',
    {
        run: 'assets/characters/tryston/spritesheets/Tryston_Run.png',
        jab: 'assets/characters/tryston/spritesheets/Tryston_Jab.png',
        cross: 'assets/characters/tryston/spritesheets/Tryston_Cross.png',
        kick: 'assets/characters/tryston/spritesheets/Tryston_Kick.png',
        jump: 'assets/characters/tryston/spritesheets/Tryston_Jump.png',
        airkick: 'assets/characters/tryston/spritesheets/Tryston_AirKick.png',
        idle: 'assets/characters/tryston/spritesheets/Tryston_Idle.png'
    },
    {
        run: { frames: 8, frameRate: 12, repeat: -1 },
        jab: { frames: 4, frameRate: 20, repeat: 0 },     // Very fast: 24 FPS
        cross: { frames: 4, frameRate: 20, repeat: 0 },   // Very fast: 24 FPS  
        kick: { frames: 5, frameRate: 16, repeat: 0 },    // Fast: 20 FPS
        jump: { frames: 1, frameRate: 12, repeat: 0 },
        airkick: { frames: 1, frameRate: 12, repeat: 0 },
        idle: { frames: 5, frameRate: 12, repeat: -1 }    // Keep idle at normal speed
    }
);

// Array of all available characters
const ALL_CHARACTERS = [TIREEK_CONFIG, TRYSTON_CONFIG];

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

    create() {
        // Set world bounds (make it wider for scrolling)
        this.physics.world.setBounds(0, 0, 3600, 720);

        // Create parallax backgrounds
        this.createParallaxBackgrounds();

        // Set street/curb limits for beat 'em up style movement
        this.streetTopLimit = 520;
        this.streetBottomLimit = 650;

        // Create player with current character
        this.createPlayer(this.currentCharacterConfig);
        
        // Set up camera to follow player horizontally only
        this.cameras.main.startFollow(this.player, true, 0.1, 0);
        this.cameras.main.setFollowOffset(0, 0);
        this.cameras.main.setBounds(0, 0, 3600, 720);

        // Create keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X); // X key for attack
        this.switchCharacterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C); // C key for character switch

        // Create animations for all characters
        ALL_CHARACTERS.forEach(characterConfig => {
            this.createCharacterAnimations(characterConfig);
        });

        // Initialize animation state manager
        this.animationManager = new AnimationStateManager(this.player);
        
        // Set up animation complete listeners for current character only
        this.setupAnimationEvents(this.currentCharacterConfig);
        
        // Start with idle animation
        this.player.anims.play(`${this.currentCharacterConfig.name}_idle`, true);
        
        // Initialize jump tracking
        this.isJumping = false;
        
        // Add visual debug text on screen - Safari compatibility fix
        this.debugText = this.add.text(10, 10, 'Debug: Safari Test...', {
            fontSize: '20px',
            fill: '#ff0000',
            backgroundColor: '#ffffff',
            padding: { x: 15, y: 10 }
        });
        this.debugText.setDepth(2000); // Much higher depth
        this.debugText.setScrollFactor(0); // Fixed position on screen
        
        // Add character indicator
        this.characterIndicator = this.add.rectangle(10, 100, 200, 40, 0x000080);
        this.characterIndicator.setDepth(2000);
        this.characterIndicator.setScrollFactor(0);
        this.characterIndicator.setOrigin(0, 0);
        this.characterText = this.add.text(15, 120, `Character: ${this.currentCharacterConfig.name.toUpperCase()}\nPress C to switch`, {
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0, 0.5);
        this.characterText.setDepth(2001);
        this.characterText.setScrollFactor(0);
        
        // Add a visual indicator that changes color when attacking
        this.attackIndicator = this.add.rectangle(200, 50, 100, 30, 0x00ff00);
        this.attackIndicator.setDepth(2000);
        this.attackIndicator.setScrollFactor(0);
        this.attackText = this.add.text(200, 50, 'READY', {
            fontSize: '16px',
            fill: '#000000'
        }).setOrigin(0.5);
        this.attackText.setDepth(2001);
        this.attackText.setScrollFactor(0);
    }

    createPlayer(characterConfig) {
        // Create player sprite using the idle animation
        this.player = this.physics.add.sprite(200, 600, `${characterConfig.name}_idle`);
        
        // Initialize ground tracking for jumps
        this.player.lastGroundY = this.player.y;
        
        // Scale up the player sprite
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
        
        // Update character text
        this.characterText.setText(`Character: ${this.currentCharacterConfig.name.toUpperCase()}\nPress C to switch`);
        
        // Re-setup camera follow
        this.cameras.main.startFollow(this.player, true, 0.1, 0);
        
        console.log(`Switched to character: ${this.currentCharacterConfig.name}`);
    }

    update(time, delta) {
        // Update animation state manager
        this.animationManager.update(delta);

        // Handle input and movement
        this.handleInput();
        this.handleMovement();
        this.handleJumping();
        this.handleAnimations();

        // Handle perspective scaling when not jumping
        if (!this.isJumping) {
            this.updatePerspective();
        }
        
        // Update visual debug display - Safari compatible
        const state = this.animationManager.currentState;
        const locked = this.animationManager.animationLocked;
        const timer = Math.round(this.animationManager.lockTimer);
        const velX = Math.round(this.player.body.velocity.x);
        const charName = this.currentCharacterConfig.name;
        
        this.debugText.setText(`Character: ${charName}\nState: ${state}\nLocked: ${locked}\nTimer: ${timer}ms\nVelX: ${velX}`);
        
        // Update attack indicator
        if (state === 'attack' || locked) {
            this.attackIndicator.setFillStyle(0xff0000); // Red when attacking
            this.attackText.setText('ATTACKING');
        } else {
            this.attackIndicator.setFillStyle(0x00ff00); // Green when ready
            this.attackText.setText('READY');
        }
    }

    handleInput() {
        const charName = this.player.characterConfig.name;
        
        // Handle character switching
        if (Phaser.Input.Keyboard.JustDown(this.switchCharacterKey)) {
            this.switchCharacter();
            return; // Skip other input processing during character switch
        }
        
        // Handle attack input
        if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
            if (this.isJumping) {
                // Air attack - shorter lock time and different state
                this.animationManager.currentState = 'airkick';
                this.animationManager.animationLocked = true;
                this.animationManager.lockTimer = 400; // Shorter than ground attacks
                this.player.anims.play(`${charName}_airkick`, true);
                
                // Visual feedback for air kick
                this.attackIndicator.setFillStyle(0xffa500); // Orange for air kick
                this.attackText.setText('AIR KICK');
            } else {
                // Ground combo attack
                if (this.animationManager.currentState === 'attack') {
                    // Try to queue the attack if we're already attacking
                    this.animationManager.queueAttack();
                } else {
                    // Start new attack
                    const attackType = this.animationManager.startCombo();
                    const animConfig = this.currentCharacterConfig.animations[attackType];
                    const animationDuration = (animConfig.frames / animConfig.frameRate) * 1000; // Convert to milliseconds
                    
                    // Force set attack state for the full duration of the animation
                    this.animationManager.currentState = 'attack';
                    this.animationManager.animationLocked = true;
                    this.animationManager.lockTimer = animationDuration;
                    this.player.anims.play(`${charName}_${attackType}`, true);
                    
                    // Visual feedback - Safari compatible
                    this.attackIndicator.setFillStyle(0xff0000); // Immediate red
                    this.attackText.setText('ATTACKING!');
                    console.log(`SAFARI DEBUG: Attack started - ${attackType}`);
                }
            }
        }

        // Handle jump input
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.isJumping) {
            this.startJump();
        }
    }

    handleMovement() {
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

        // Handle horizontal movement (normal speed or slower for air kicks)
        let speed = 420; // Normal speed
        if (isAirKick) {
            speed = 200; // Slower speed during air kick
        }

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true); // Face left
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false); // Face right
        }
        else {
            this.player.setVelocityX(0);
        }

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
            
            // Manual position control
            if (this.cursors.up.isDown && this.player.y > this.streetTopLimit) {
                this.player.y -= 8;
                this.player.lastGroundY = this.player.y;
            }
            else if (this.cursors.down.isDown && this.player.y < this.streetBottomLimit) {
                this.player.y += 8;
                this.player.lastGroundY = this.player.y;
            }
            
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

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: GameScene
};

// Start the game
const game = new Phaser.Game(config); 