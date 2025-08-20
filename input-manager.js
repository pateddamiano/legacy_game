// ========================================
// INPUT MANAGER
// ========================================
// Centralized input handling system for keyboard, gamepad, and touch controls
// Manages all player input, movement, attacks, and special actions

class InputManager {
    constructor(scene) {
        this.scene = scene;
        
        // Input state tracking
        this.inputState = {
            left: false,
            right: false,
            up: false,
            down: false,
            jump: false,
            attack: false,
            weapon: false,
            switchCharacter: false,
            debug: false,
            clearEnemies: false,
            heal: false,
            musicToggle: false,
            sfxToggle: false
        };
        
        // Movement configuration (restored original speeds)
        this.movementConfig = {
            walkSpeed: 420,     // Restored from original (was 160)
            runSpeed: 420,      // Normal speed for horizontal movement  
            airkickSpeed: 200,  // Slower speed during air kick (from original)
            jumpForce: 400,
            gravity: 1000,      // Original gravity value
            verticalSpeed: 8    // For beat 'em up style vertical movement
        };
        
        // Initialize input systems
        this.setupKeyboard();
        
        console.log('🎮 InputManager initialized!');
    }
    
    // ========================================
    // INPUT SYSTEM SETUP
    // ========================================
    
    setupKeyboard() {
        // Create keyboard controls
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        
        // Action keys
        this.keys = {
            space: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            attack: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
            weapon: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            switchCharacter: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
            debug: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            clearEnemies: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
            heal: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H),
            musicToggle: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M),
            sfxToggle: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N)
        };
        
        console.log('⌨️ Keyboard controls initialized');
    }
    
    // ========================================
    // INPUT PROCESSING
    // ========================================
    
    updateInputState() {
        // Safety check - ensure all input objects are ready
        if (!this.cursors || !this.keys) {
            return;
        }
        
        try {
            // Update continuous input state (movement)
            this.inputState.left = this.cursors.left.isDown;
            this.inputState.right = this.cursors.right.isDown;
            this.inputState.up = this.cursors.up.isDown;
            this.inputState.down = this.cursors.down.isDown;
            
            // Update discrete input state (single presses) with safety checks
            this.inputState.jump = this.keys.space ? Phaser.Input.Keyboard.JustDown(this.keys.space) : false;
            this.inputState.attack = this.keys.attack ? Phaser.Input.Keyboard.JustDown(this.keys.attack) : false;
            this.inputState.weapon = this.keys.weapon ? Phaser.Input.Keyboard.JustDown(this.keys.weapon) : false;
            this.inputState.switchCharacter = this.keys.switchCharacter ? Phaser.Input.Keyboard.JustDown(this.keys.switchCharacter) : false;
            this.inputState.debug = this.keys.debug ? Phaser.Input.Keyboard.JustDown(this.keys.debug) : false;
            this.inputState.clearEnemies = this.keys.clearEnemies ? Phaser.Input.Keyboard.JustDown(this.keys.clearEnemies) : false;
            this.inputState.heal = this.keys.heal ? Phaser.Input.Keyboard.JustDown(this.keys.heal) : false;
            this.inputState.musicToggle = this.keys.musicToggle ? Phaser.Input.Keyboard.JustDown(this.keys.musicToggle) : false;
            this.inputState.sfxToggle = this.keys.sfxToggle ? Phaser.Input.Keyboard.JustDown(this.keys.sfxToggle) : false;
        } catch (error) {
            console.warn('Input update error:', error);
        }
    }
    
    // ========================================
    // MOVEMENT HANDLING
    // ========================================
    
    handleMovement(player, animationManager, isJumping) {
        if (!player || !player.body) return;
        
        const body = player.body;
        let isMoving = false;
        
        // Check if we're doing an air kick (jumping + attacking) - from original logic
        const isAirKick = isJumping && (animationManager.currentState === 'airkick');
        
        // Don't allow movement during GROUND attacks only (from original)
        if ((animationManager.currentState === 'attack' || animationManager.animationLocked) && !isAirKick) {
            // Force stop all movement for ground attacks
            body.setVelocityX(0);
            body.velocity.x = 0;
            body.acceleration.x = 0;
            return;
        }
        
        // Handle horizontal movement (normal speed or slower for air kicks) - original logic
        let speed = this.movementConfig.walkSpeed; // Normal speed (420)
        if (isAirKick) {
            speed = this.movementConfig.airkickSpeed; // Slower speed during air kick (200)
        }
        
        // Horizontal movement
        if (this.inputState.left) {
            body.setVelocityX(-speed);
            player.setFlipX(true); // Face left
            isMoving = true;
        } else if (this.inputState.right) {
            body.setVelocityX(speed);
            player.setFlipX(false); // Face right
            isMoving = true;
        } else {
            body.setVelocityX(0); // Stop horizontal movement
        }
        
        // Vertical movement (beat 'em up style) - only when not jumping
        if (!isJumping) {
            // Manual position control for beat 'em up style movement
            if (this.inputState.up && player.y > 520) { // streetTopLimit
                player.y -= 8;
                if (player.lastGroundY !== undefined) {
                    player.lastGroundY = player.y;
                }
                isMoving = true;
            } else if (this.inputState.down && player.y < 650) { // streetBottomLimit
                player.y += 8;
                if (player.lastGroundY !== undefined) {
                    player.lastGroundY = player.y;
                }
                isMoving = true;
            }
            
            // Force zero Y velocity for beat 'em up style
            body.setVelocityY(0);
        }
        
        return isMoving;
    }
    
    handleJumping(player, animationManager) {
        if (!player || !player.body) return false;
        
        // Use the input state that's already being tracked (avoids duplicate JustDown calls)
        if (this.inputState.jump) {
            // Signal that a jump was requested - scene will handle the actual jump logic
            return true;
        }
        
        return false;
    }
    
    // ========================================
    // COMBAT INPUT HANDLING
    // ========================================
    
    handleAttackInput(player, animationManager, isJumping, audioManager) {
        if (!this.inputState.attack) return false;
        
        const charName = player.characterConfig.name;
        
        if (isJumping) {
            // Air attack - shorter lock time and different state
            animationManager.currentState = 'airkick';
            animationManager.animationLocked = true;
            animationManager.lockTimer = 400; // Shorter than ground attacks
            player.anims.play(`${charName}_airkick`, true);
            
            // Play attack sound effect
            audioManager.playPlayerAttack();
            
            console.log(`Air kick performed by ${charName}`);
        } else {
            // Ground combo attack
            if (animationManager.currentState === 'attack') {
                // Try to queue the attack if we're already attacking
                animationManager.queueAttack();
            } else {
                // Start new attack
                const attackType = animationManager.startCombo();
                const animConfig = player.characterConfig.animations[attackType];
                const animationDuration = (animConfig.frames / animConfig.frameRate) * 1000;
                
                // Force set attack state for the full duration of the animation
                animationManager.currentState = 'attack';
                animationManager.animationLocked = true;
                animationManager.lockTimer = animationDuration;
                player.anims.play(`${charName}_${attackType}`, true);
                
                // Play attack sound effect
                audioManager.playPlayerAttack();
                
                console.log(`Attack started - ${attackType} by ${charName}`);
            }
        }
        
        return true;
    }
    
    // ========================================
    // SYSTEM INPUT HANDLING
    // ========================================
    
    handleSystemInput(callbacks) {
        const {
            onDebugToggle,
            onMusicToggle,
            onSfxToggle,
            onClearEnemies,
            onHeal,
            onSwitchCharacter,
            onWeaponUse
        } = callbacks;
        
        // Handle debug toggle
        if (this.inputState.debug && onDebugToggle) {
            onDebugToggle();
        }
        
        // Handle music controls
        if (this.inputState.musicToggle && onMusicToggle) {
            onMusicToggle();
        }
        
        if (this.inputState.sfxToggle && onSfxToggle) {
            onSfxToggle();
        }
        
        // Handle development/testing features
        if (this.inputState.clearEnemies && onClearEnemies) {
            onClearEnemies();
        }
        
        if (this.inputState.heal && onHeal) {
            onHeal();
        }
        
        // Handle character switching
        if (this.inputState.switchCharacter && onSwitchCharacter) {
            onSwitchCharacter();
        }
        
        // Handle weapon use
        if (this.inputState.weapon && onWeaponUse) {
            onWeaponUse();
        }
    }
    
    // ========================================
    // WEAPON INPUT HANDLING
    // ========================================
    
    handleWeaponInput(player, animationManager, audioManager) {
        if (!this.inputState.weapon) return false;
        
        const charName = player.characterConfig.name;
        
        // Play cross animation for throwing
        animationManager.currentState = 'attack';
        animationManager.animationLocked = true;
        animationManager.lockTimer = 400; // Short animation time for throwing
        player.anims.play(`${charName}_cross`, true);
        
        // Play attack sound effect (can be changed to throw sound later)
        if (audioManager) {
            audioManager.playPlayerAttack();
        }
        
        console.log(`Weapon throw animation started for ${charName}`);
        return true;
    }
    
    // ========================================
    // ANIMATION INTEGRATION
    // ========================================
    
    handleAnimations(player, animationManager, isMoving, isJumping) {
        if (!player || !animationManager) return;
        
        const charName = player.characterConfig.name;
        const currentState = animationManager.currentState;
        
        // Don't change animations if locked (during attacks, jumps, etc.)
        if (animationManager.animationLocked) {
            return;
        }
        
        // Determine appropriate animation based on movement and state
        let newAnimation = null;
        
        if (isJumping) {
            // Jump animation (should be handled by jump input)
            newAnimation = `${charName}_jump`;
        } else if (isMoving) {
            // Running animation
            newAnimation = `${charName}_run`;
        } else {
            // Idle animation
            newAnimation = `${charName}_idle`;
        }
        
        // Only change animation if it's different from current
        if (newAnimation && !player.anims.isPlaying) {
            player.anims.play(newAnimation, true);
        }
    }
    
    // ========================================
    // MOBILE/TOUCH SUPPORT (Future Expansion)
    // ========================================
    
    setupTouchControls() {
        // Virtual joystick and buttons for mobile
        console.log('📱 Touch controls ready for implementation');
        
        // This would create virtual controls for mobile devices
        // Implementation would include:
        // - Virtual joystick for movement
        // - Attack buttons
        // - Jump button
        // - System buttons (pause, etc.)
    }
    
    // ========================================
    // GAMEPAD SUPPORT (Future Expansion)
    // ========================================
    
    setupGamepadControls() {
        // Gamepad/controller support
        console.log('🎮 Gamepad controls ready for implementation');
        
        // This would add support for:
        // - Xbox controllers
        // - PlayStation controllers
        // - Generic gamepads
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    getInputState() {
        return { ...this.inputState };
    }
    
    getMovementConfig() {
        return { ...this.movementConfig };
    }
    
    setMovementConfig(newConfig) {
        this.movementConfig = { ...this.movementConfig, ...newConfig };
        console.log('🎮 Movement configuration updated:', this.movementConfig);
    }
    
    // Check if any movement input is active
    isMovementInputActive() {
        return this.inputState.left || 
               this.inputState.right || 
               this.inputState.up || 
               this.inputState.down;
    }
    
    // Check if any action input is active
    isActionInputActive() {
        return this.inputState.jump || 
               this.inputState.attack || 
               this.inputState.switchCharacter;
    }
    
    // Reset all input states (useful for cutscenes, etc.)
    resetInputState() {
        Object.keys(this.inputState).forEach(key => {
            this.inputState[key] = false;
        });
    }
    
    // ========================================
    // CLEANUP
    // ========================================
    
    destroy() {
        // Clean up input listeners and references
        console.log('🗑️ InputManager destroyed');
    }
}

// Make InputManager available globally
window.InputManager = InputManager;