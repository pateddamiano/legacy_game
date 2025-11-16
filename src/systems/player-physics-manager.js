// ========================================
// PLAYER PHYSICS MANAGER
// ========================================
// Handles player movement, jumping, landing, animations, and perspective scaling

class PlayerPhysicsManager {
    constructor(scene, player, animationManager, environmentManager, inputManager) {
        this.scene = scene;
        this.player = player;
        this.animationManager = animationManager;
        this.environmentManager = environmentManager;
        this.inputManager = inputManager;
        
        // State
        this.isJumping = false;
        this.streetTopLimit = 0;
        this.streetBottomLimit = 0;
        
        // Manager references (set during initialization)
        this.audioManager = null;
        
        console.log('🏃 PlayerPhysicsManager initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    initialize(streetTopLimit, streetBottomLimit, audioManager) {
        this.streetTopLimit = streetTopLimit;
        this.streetBottomLimit = streetBottomLimit;
        this.audioManager = audioManager;
    }
    
    // ========================================
    // UPDATE LOOP
    // ========================================
    
    update(delta) {
        // Skip updates if disabled (e.g., during level transitions)
        if (this.disabled) {
            return;
        }
        
        this.handleMovement();
        this.handleJumping();
        this.handleAnimations();
    }
    
    // ========================================
    // MOVEMENT HANDLING
    // ========================================
    
    handleMovement() {
        if (!this.inputManager || !this.player || !this.player.body) return;
        
        // Check if we're doing an air kick (jumping + attacking)
        const isAirKick = this.isJumping && (this.animationManager && this.animationManager.currentState === 'airkick');
        
        // Don't allow movement during GROUND attacks only
        if (this.animationManager && (this.animationManager.currentState === 'attack' || this.animationManager.animationLocked) && !isAirKick) {
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
            if (this.player.body && this.player.setGravityY) {
                this.player.setGravityY(0);
            }
            if (this.player.setVelocityY) {
                this.player.setVelocityY(0);
            }
            if (this.player.body) {
                this.player.body.velocity.y = 0;
                this.player.body.acceleration.y = 0;
            }
            
            // Don't allow vertical movement during attacks
            if (this.animationManager && (this.animationManager.currentState === 'attack' || this.animationManager.animationLocked)) {
                if (this.player.body) {
                    this.player.body.velocity.y = 0;
                }
                console.log("Vertical movement blocked - in attack");
                return;
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
    
    // ========================================
    // JUMP HANDLING
    // ========================================
    
    handleJumping() {
        // Skip if player not initialized yet
        if (!this.player || !this.player.body) return;
        
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
    
    startJump() {
        if (this.isJumping) return;
        
        const charName = this.player.characterConfig.name;
        
        // Store current ground position
        this.player.lastGroundY = Math.max(this.streetTopLimit, Math.min(this.player.y, this.streetBottomLimit));
        
        // Start the jump
        if (this.player.setVelocityY) {
            this.player.setVelocityY(-400);
        }
        if (this.player.body && this.player.setGravityY) {
            this.player.setGravityY(1000);
        }
        this.isJumping = true;
        
        // Play jump animation
        if (this.animationManager && this.animationManager.setState('jump')) {
            this.player.anims.play(`${charName}_jump`, true);
        }
        
        // Play jump sound effect
        if (this.audioManager) {
            this.audioManager.playPlayerJump();
        }
        
        console.log("Jump started from Y:", this.player.y, "Will land at:", this.player.lastGroundY);
    }
    
    landPlayer(targetY, reason) {
        // Ensure landing position is within valid bounds
        const landingY = Math.max(this.streetTopLimit, Math.min(targetY, this.streetBottomLimit));
        
        // Set player position and stop all movement
        this.player.y = landingY;
        if (this.player.setVelocityY) {
            this.player.setVelocityY(0);
        }
        if (this.player.body && this.player.setGravityY) {
            this.player.setGravityY(0);
        }
        if (this.player.body) {
            this.player.body.velocity.y = 0;
            this.player.body.acceleration.y = 0;
        }
        
        // Update ground position and exit jump state
        this.player.lastGroundY = landingY;
        this.isJumping = false;
        
        // Reset animation state
        if (this.animationManager) {
            this.animationManager.setState('idle');
        }
        
        console.log(`${reason} - Landed at Y: ${landingY}`);
    }
    
    // ========================================
    // ANIMATION HANDLING
    // ========================================
    
    handleAnimations() {
        // Skip if animation manager or player not initialized yet
        if (!this.animationManager || !this.player || !this.player.body) return;
        
        const charName = this.player.characterConfig.name;
        
        // Don't override locked animations
        if (this.animationManager.animationLocked) return;
        
        // Handle movement animations and running sound
        if (this.player.body.velocity.x !== 0 && !this.isJumping) {
            // Running
            if (this.animationManager.setState('run')) {
                this.player.anims.play(`${charName}_run`, true);
            }
            
            // Start running sound effect
            if (this.audioManager) {
                this.audioManager.startPlayerRunning();
            }
        } else if (this.player.body.velocity.x === 0 && !this.isJumping && this.animationManager.currentState !== 'attack') {
            // Idle
            if (this.animationManager.setState('idle')) {
                this.player.anims.play(`${charName}_idle`, true);
            }
            
            // Stop running sound effect when not moving
            if (this.audioManager) {
                this.audioManager.stopPlayerRunning();
            }
        }
    }
    
    // ========================================
    // PERSPECTIVE SCALING
    // ========================================
    
    updatePerspective() {
        // Skip if player not initialized yet
        if (!this.player || !this.player.characterConfig) return;
        
        // Calculate scale based on Y position (perspective effect) with baseScale multiplier from config
        // Get perspective scales from character config (defaults if not specified)
        const perspectiveScales = this.player.characterConfig.perspectiveScales || {minScale: 3.0, maxScale: 4.0};
        const baseMinScale = perspectiveScales.minScale;
        const baseMaxScale = perspectiveScales.maxScale;
        
        // Get baseScale multiplier from character config (defaults to 1.0)
        const baseScaleMultiplier = this.player.characterConfig.baseScale || 1.0;
        
        const normalizedY = (this.player.y - this.streetTopLimit) / (this.streetBottomLimit - this.streetTopLimit);
        const baseScale = baseMinScale + (baseMaxScale - baseMinScale) * normalizedY;
        // Apply character-specific base scale multiplier
        const scale = baseScale * baseScaleMultiplier;
        
        this.player.setScale(scale);
        
        // Set depth/z-index - higher Y (lower on screen) should have higher depth (appear in front)
        this.player.setDepth(this.player.y);
    }
    
    // ========================================
    // STATE GETTERS/SETTERS
    // ========================================
    
    setIsJumping(value) {
        this.isJumping = value;
    }
    
    getIsJumping() {
        return this.isJumping;
    }
    
    setStreetBounds(top, bottom) {
        this.streetTopLimit = top;
        this.streetBottomLimit = bottom;
    }
}

