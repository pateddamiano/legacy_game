// ========================================
// INPUT MANAGER
// ========================================
// Centralized input handling system for keyboard, gamepad, and touch controls
// Manages all player input, movement, attacks, and special actions

class InputManager {
    constructor(scene, unifiedInputController = null) {
        this.disabled = false;
        this.scene = scene;
        
        // Unified input controller (create if not provided)
        this.unifiedInput = unifiedInputController || new UnifiedInputController();
        
        // Input state tracking (kept for backward compatibility)
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
            verticalSpeed: 3    // For beat 'em up style vertical movement (reduced from 8)
        };
        
        // Street bounds - read from centralized WORLD_CONFIG
        this.streetTopLimit = WORLD_CONFIG.streetTopLimit;
        this.streetBottomLimit = WORLD_CONFIG.streetBottomLimit;
        
        // Initialize input systems
        this.setupKeyboard();
        
        console.log('🎮 InputManager initialized!');
    }
    
    // ========================================
    // CONFIGURATION
    // ========================================
    
    setStreetBounds(top, bottom) {
        this.streetTopLimit = top;
        this.streetBottomLimit = bottom;
        console.log(`🎮 InputManager: Street bounds set to ${top} - ${bottom}`);
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
            sfxToggle: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N),
            // Level testing keys
            nextLevel: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
            levelStatus: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
            // Touch controls toggle (for testing)
            touchControlsToggle: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T)
        };
        
        console.log('⌨️ Keyboard controls initialized');
    }
    
    // ========================================
    // INPUT PROCESSING
    // ========================================
    
    updateInputState() {
        // Don't process input if disabled by dialogue manager
        if (this.disabled) {
            return;
        }

        // Safety check - ensure all input objects are ready
        if (!this.cursors || !this.keys) {
            return;
        }
        
        // Check if dialogue is active - if so, block ALL input (DialogueManager handles SPACE)
        const isDialogueActive = this.scene.dialogueManager && typeof this.scene.dialogueManager.isActive === 'function' && this.scene.dialogueManager.isActive();

        if (isDialogueActive) {
            // Clear all input states when dialogue is active
            this.inputState.left = false;
            this.inputState.right = false;
            this.inputState.up = false;
            this.inputState.down = false;
            this.inputState.jump = false;
            this.inputState.attack = false;
            this.inputState.weapon = false;
            this.inputState.switchCharacter = false;
            this.inputState.debug = false;
            this.inputState.clearEnemies = false;
            this.inputState.heal = false;
            this.inputState.musicToggle = false;
            this.inputState.sfxToggle = false;
            this.inputState.nextLevel = false;
            this.inputState.levelStatus = false;
            
            // Also clear unified input
            if (this.unifiedInput) {
                this.unifiedInput.reset();
            }
            return; // Don't process any input
        }
        
        try {
            // Update continuous input state (movement) - for backward compatibility
            this.inputState.left = this.cursors.left.isDown;
            this.inputState.right = this.cursors.right.isDown;
            this.inputState.up = this.cursors.up.isDown;
            this.inputState.down = this.cursors.down.isDown;
            
            // Update unified input controller with keyboard movement
            if (this.unifiedInput) {
                // Convert keyboard input to normalized movement vector
                let moveX = 0;
                let moveY = 0;
                
                if (this.inputState.left) moveX = -1;
                else if (this.inputState.right) moveX = 1;
                
                if (this.inputState.up) moveY = -1;
                else if (this.inputState.down) moveY = 1;
                
                // Only update keyboard movement if touch is not currently driving movement
                if (!this.unifiedInput.isTouchActive()) {
                    this.unifiedInput.setMovementFromKeyboard(moveX, moveY);
                }
            }
            
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
        // Level testing input states
        this.inputState.nextLevel = this.keys.nextLevel ? Phaser.Input.Keyboard.JustDown(this.keys.nextLevel) : false;
        this.inputState.levelStatus = this.keys.levelStatus ? Phaser.Input.Keyboard.JustDown(this.keys.levelStatus) : false;
        this.inputState.touchControlsToggle = this.keys.touchControlsToggle ? Phaser.Input.Keyboard.JustDown(this.keys.touchControlsToggle) : false;
            
            // Update unified input controller with keyboard actions
            if (this.unifiedInput) {
                this.unifiedInput.setActionFromKeyboard('jump', this.keys.space ? this.keys.space.isDown : false);
                this.unifiedInput.setActionFromKeyboard('punch', this.keys.attack ? this.keys.attack.isDown : false);
                this.unifiedInput.setActionFromKeyboard('recordThrow', this.keys.weapon ? this.keys.weapon.isDown : false);
                this.unifiedInput.setActionFromKeyboard('characterSwitch', this.keys.switchCharacter ? this.keys.switchCharacter.isDown : false);
                // uiConfirm is set when SPACE is pressed (for dialogue/menus)
                this.unifiedInput.setActionFromKeyboard('uiConfirm', this.keys.space ? this.keys.space.isDown : false);
            }
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
        
        // Get movement vector from unified input controller (supports both keyboard and touch)
        let moveX = 0;
        let moveY = 0;
        
        if (this.unifiedInput) {
            const movement = this.unifiedInput.getMovementVector();
            moveX = movement.x;
            moveY = movement.y;
        } else {
            // Fallback to legacy inputState
            if (this.inputState.left) moveX = -1;
            else if (this.inputState.right) moveX = 1;
            if (this.inputState.up) moveY = -1;
            else if (this.inputState.down) moveY = 1;
        }
        
        // Handle horizontal movement (normal speed or slower for air kicks) - original logic
        let speed = this.movementConfig.walkSpeed; // Normal speed (420)
        if (isAirKick) {
            speed = this.movementConfig.airkickSpeed; // Slower speed during air kick (200)
        }
        
        // Check if player is being knocked back - don't override knockback velocity
        const isKnockedBack = player.isKnockedBack === true && 
                              (player.knockbackEndTime === undefined || this.scene.time.now < player.knockbackEndTime);
        
        // Horizontal movement (skip if being knocked back)
        if (!isKnockedBack) {
            if (moveX < 0) {
                body.setVelocityX(-speed * Math.abs(moveX)); // Scale by magnitude
                player.setFlipX(true); // Face left
                isMoving = true;
            } else if (moveX > 0) {
                body.setVelocityX(speed * Math.abs(moveX)); // Scale by magnitude
                player.setFlipX(false); // Face right
                isMoving = true;
            } else {
                body.setVelocityX(0); // Stop horizontal movement
            }
        } else {
            // During knockback, don't override velocity but still track if player is trying to move
            if (moveX !== 0) {
                isMoving = true; // Player is trying to move, but knockback takes priority
            }
        }
        
        // Vertical movement (beat 'em up style) - only when not jumping
        if (!isJumping) {
            // Manual position control for beat 'em up style movement
            if (moveY < 0 && player.y > this.streetTopLimit) {
                player.y -= this.movementConfig.verticalSpeed * Math.abs(moveY); // Scale by magnitude
                if (player.lastGroundY !== undefined) {
                    player.lastGroundY = player.y;
                }
                isMoving = true;
            } else if (moveY > 0 && player.y < this.streetBottomLimit) {
                player.y += this.movementConfig.verticalSpeed * Math.abs(moveY); // Scale by magnitude
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
        
        // Check unified input controller first, then fallback to legacy inputState
        if (this.unifiedInput && this.unifiedInput.isActionPressed('jump')) {
            return true;
        }
        
        // Fallback to legacy input state
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
        // Check unified input controller first, then fallback to legacy inputState
        const attackPressed = (this.unifiedInput && this.unifiedInput.isActionPressed('punch')) || this.inputState.attack;
        if (!attackPressed) return false;
        
        const charName = player.characterConfig.name;
        
        if (isJumping) {
            // Air attack - shorter lock time and different state
            animationManager.currentState = 'airkick';
            animationManager.animationLocked = true;
            animationManager.lockTimer = 400; // Shorter than ground attacks
            player.anims.play(`${charName}_airkick`, true);
            
            // Play kick sound effect for air kicks
            audioManager.playPlayerKick();
            
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
                
                // Play appropriate attack sound based on attack type
                if (attackType.toLowerCase().includes('kick')) {
                    audioManager.playPlayerKick();
                } else {
                    audioManager.playPlayerPunch();
                }
                
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
            onWeaponUse,
            onTouchControlsToggle
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
        
        // Handle character switching (check unified input first)
        const switchPressed = (this.unifiedInput && this.unifiedInput.isActionPressed('characterSwitch')) || this.inputState.switchCharacter;
        if (switchPressed && onSwitchCharacter) {
            onSwitchCharacter();
        }
        
        // Handle weapon use (check unified input first)
        const weaponPressed = (this.unifiedInput && this.unifiedInput.isActionPressed('recordThrow')) || this.inputState.weapon;
        if (weaponPressed && onWeaponUse) {
            onWeaponUse();
        }
        
        // Handle touch controls toggle
        if (this.inputState.touchControlsToggle && onTouchControlsToggle) {
            onTouchControlsToggle();
        }
    }
    
    // ========================================
    // WEAPON INPUT HANDLING
    // ========================================
    
    handleWeaponInput(player, animationManager, audioManager) {
        // Check unified input controller first, then fallback to legacy inputState
        const weaponPressed = (this.unifiedInput && this.unifiedInput.isActionPressed('recordThrow')) || this.inputState.weapon;
        if (!weaponPressed) return false;
        
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
    
    /**
     * Get movement vector from unified input controller
     * @returns {{x: number, y: number}} Normalized movement vector
     */
    getMovementVector() {
        if (this.unifiedInput) {
            return this.unifiedInput.getMovementVector();
        }
        // Fallback: convert legacy inputState to vector
        let x = 0, y = 0;
        if (this.inputState.left) x = -1;
        else if (this.inputState.right) x = 1;
        if (this.inputState.up) y = -1;
        else if (this.inputState.down) y = 1;
        return { x, y };
    }
    
    /**
     * Check if action was just pressed
     * @param {string} action - Action name
     * @returns {boolean}
     */
    isActionPressed(action) {
        if (this.unifiedInput) {
            return this.unifiedInput.isActionPressed(action);
        }
        // Fallback to legacy inputState
        const actionMap = {
            'punch': 'attack',
            'jump': 'jump',
            'characterSwitch': 'switchCharacter',
            'recordThrow': 'weapon'
        };
        const legacyKey = actionMap[action] || action;
        return this.inputState[legacyKey] || false;
    }
    
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