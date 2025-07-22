class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load the player sprite sheet
        this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
            frameWidth: 32,
            frameHeight: 48
        });
        
        // Load the street background texture
        this.load.image('street', 'StreetTexture.png');
        
        // Load the city skyline background for parallax
        this.load.image('cityscape', 'Background.png');
    }

    create() {
        // Set world bounds (make it wider for scrolling)
        this.physics.world.setBounds(0, 0, 3600, 720); // 3x wider for scrolling

        // Create parallax backgrounds
        this.createParallaxBackgrounds();

        // Set street/curb limits for beat 'em up style movement
        this.streetTopLimit = 520; // Can't go higher than this (curb/buildings)
        this.streetBottomLimit = 650; // Can't go lower than this (street edge)

        // Create player sprite at bottom center
        this.player = this.physics.add.sprite(200, 600, 'dude');
        
        // Set up camera to follow player horizontally only
        this.cameras.main.startFollow(this.player, true, 0.1, 0);
        this.cameras.main.setFollowOffset(0, 0);
        this.cameras.main.setBounds(0, 0, 3600, 720);
        
        // Initialize ground tracking for jumps
        this.player.lastGroundY = this.player.y;
        
        // Scale up the player sprite (3x larger)
        this.player.setScale(3);
        
        // Set player physics properties
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        // No gravity by default - we'll handle it manually for jumps only

        // Create walking animation
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 4 }],
            frameRate: 20
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        // Create keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // No ground platforms needed for beat 'em up style movement
        // We handle positioning manually without gravity/collisions
    }

    update() {
        // Handle horizontal movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-360);
            this.player.anims.play('left', true);
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(360);
            this.player.anims.play('right', true);
        }
        else {
            this.player.setVelocityX(0);
        }

        // Track if we're jumping
        this.isJumping = this.isJumping || false;

        // Handle jumping with spacebar - applies temporary gravity
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.isJumping) {
            this.startJump();
        }

        // Handle landing from jump - return to ground level
        if (this.isJumping) {
            console.log("Jumping - Y:", this.player.y, "VelY:", this.player.body.velocity.y, "Target:", this.player.lastGroundY);
            
            // Check if we're falling and have reached or passed the ground level
            if (this.player.body.velocity.y >= 0 && this.player.y >= this.player.lastGroundY) {
                this.landPlayer(this.player.lastGroundY, "Normal landing");
            }
            // Safety check: if at or past bottom boundary while jumping
            else if (this.player.y >= this.streetBottomLimit) {
                this.landPlayer(this.streetBottomLimit, "Force landed at bottom boundary");
            }
            // Emergency safety: if velocity is very small and close to ground
            else if (Math.abs(this.player.body.velocity.y) < 10 && Math.abs(this.player.y - this.player.lastGroundY) < 20) {
                this.landPlayer(this.player.lastGroundY, "Emergency landing - near ground with low velocity");
            }
        }

        // Handle vertical movement (beat 'em up style) - ONLY when not jumping
        if (!this.isJumping) {
            // Completely disable all physics for vertical movement
            this.player.setGravityY(0);
            this.player.setVelocityY(0);
            this.player.body.velocity.y = 0; // Force zero velocity
            this.player.body.acceleration.y = 0; // Force zero acceleration
            
            // Manual position control
            if (this.cursors.up.isDown && this.player.y > this.streetTopLimit) {
                this.player.y -= 8; // Direct position change instead of velocity
                this.player.lastGroundY = this.player.y; // Track ground position for jumps
            }
            else if (this.cursors.down.isDown && this.player.y < this.streetBottomLimit) {
                this.player.y += 8; // Direct position change instead of velocity
                this.player.lastGroundY = this.player.y; // Track ground position for jumps
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
            
            // Double-check: force position lock every frame
            this.player.body.velocity.y = 0;
            this.player.body.acceleration.y = 0;
        }

        // Handle perspective scaling and depth (slanted ground effect) - only when not jumping
        if (!this.isJumping) {
            this.updatePerspective();
        }

        // Handle animations
        if (this.player.body.velocity.x === 0) {
            this.player.anims.play('turn');
        }
    }

    startJump() {
        // Make sure we're not already jumping
        if (this.isJumping) {
            console.log("Already jumping, ignoring input");
            return;
        }
        
        // Store current ground position (ensure it's within bounds)
        this.player.lastGroundY = Math.max(this.streetTopLimit, Math.min(this.player.y, this.streetBottomLimit));
        
        // Start the jump
        this.player.setVelocityY(-400);
        this.player.setGravityY(1000); // Enable gravity only for jump
        this.isJumping = true;
        console.log("Jump started from Y:", this.player.y, "Will land at:", this.player.lastGroundY); // Debug message
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
        
        // Create enough copies for parallax scrolling (needs more for slower movement)
        const numCopies = Math.ceil(3600 / scaledWidth) + 2;
        
        for (let i = 0; i < numCopies; i++) {
            const bg = this.add.image(i * scaledWidth, 150, 'cityscape'); // Moved up from 360 to 200
            bg.setOrigin(0.5, 0.5);
            bg.setScale(scale);
            bg.setDepth(-200); // Far behind everything
            bg.setScrollFactor(0.3); // Slow parallax - moves at 30% of camera speed
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
            bg.setDepth(-100); // Behind game objects but in front of cityscape
            bg.setScrollFactor(1.0); // Normal scrolling - moves with camera
            this.backgroundLayers.street.add(bg);
        }
        
        console.log(`Street: ${textureWidth}x${textureHeight}, Scale: ${scale}, Scaled width: ${scaledWidth}`);
    }

    updatePerspective() {
        // Calculate scale based on Y position (perspective effect)
        // Characters higher up (toward buildings) are smaller
        // Characters lower down (toward camera) are larger
        const minScale = 3.7;  // Scale when at top (buildings)
        const maxScale = 4.2;  // Scale when at bottom (camera)
        
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
    backgroundColor: '#87CEEB', // Sky blue background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // No world gravity
            debug: false
        }
    },
    scene: GameScene
};

// Start the game
const game = new Phaser.Game(config); 