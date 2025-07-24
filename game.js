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
        this.comboTimeout = 800; // ms to reset combo
        this.animationLocked = false; // Prevents interruption during certain animations
        this.lockTimer = 0;
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
            if (this.lockTimer <= 0) {
                this.animationLocked = false;
            }
        }
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
        jab: { frames: 4, frameRate: 12, repeat: 0 },
        cross: { frames: 4, frameRate: 12, repeat: 0 },
        kick: { frames: 5, frameRate: 12, repeat: 0 },
        jump: { frames: 1, frameRate: 12, repeat: 0 },
        airkick: { frames: 1, frameRate: 12, repeat: 0 },
        idle: { frames: 5, frameRate: 12, repeat: -1 } // Corrected: 5 frames for idle animation
    }
);

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load background assets
        this.load.image('street', 'assets/backgrounds/StreetTexture.png');
        this.load.image('cityscape', 'assets/backgrounds/Background.png');
        
        // Load character sprite sheets
        this.loadCharacterAssets(TIREEK_CONFIG);
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

        // Create player with Tireek character
        this.createPlayer(TIREEK_CONFIG);
        
        // Set up camera to follow player horizontally only
        this.cameras.main.startFollow(this.player, true, 0.1, 0);
        this.cameras.main.setFollowOffset(0, 0);
        this.cameras.main.setBounds(0, 0, 3600, 720);

        // Create keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X); // X key for attack

        // Create animations for the character
        this.createCharacterAnimations(TIREEK_CONFIG);

        // Initialize animation state manager
        this.animationManager = new AnimationStateManager(this.player);
        
        // Set up animation complete listeners
        this.setupAnimationEvents(TIREEK_CONFIG);
        
        // Start with idle animation
        this.player.anims.play(`${TIREEK_CONFIG.name}_idle`, true);
        
        // Initialize jump tracking
        this.isJumping = false;
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
        const charName = characterConfig.name;
        
        // Listen for animation complete events
        this.player.on('animationcomplete', (animation, frame) => {
            const animKey = animation.key;
            
            // Check if it's an attack animation that just finished
            if (animKey === `${charName}_jab` || 
                animKey === `${charName}_cross` || 
                animKey === `${charName}_kick`) {
                
                // Reset animation state and return to idle
                this.animationManager.setState('idle');
                this.player.anims.play(`${charName}_idle`, true);
                
                console.log(`Attack animation ${animKey} completed, returning to idle`);
            }
        });
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
    }

    handleInput() {
        const charName = this.player.characterConfig.name;
        
        // Handle attack input
        if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
            if (this.isJumping) {
                // Air attack
                if (this.animationManager.setState('airkick', 400)) {
                    this.player.anims.play(`${charName}_airkick`, true);
                }
            } else {
                // Ground combo attack
                const attackType = this.animationManager.startCombo();
                if (this.animationManager.setState('attack', 300)) {
                    this.player.anims.play(`${charName}_${attackType}`, true);
                }
            }
        }

        // Handle jump input
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.isJumping) {
            this.startJump();
        }
    }

    handleMovement() {
        // Handle horizontal movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-420);
            this.player.setFlipX(true); // Face left
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(420);
            this.player.setFlipX(false); // Face right
        }
        else {
            this.player.setVelocityX(0);
        }

        // Handle vertical movement (beat 'em up style) - ONLY when not jumping
        if (!this.isJumping) {
            // Disable physics for vertical movement
            this.player.setGravityY(0);
            this.player.setVelocityY(0);
            this.player.body.velocity.y = 0;
            this.player.body.acceleration.y = 0;
            
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