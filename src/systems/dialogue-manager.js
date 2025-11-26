// ========================================
// DIALOGUE MANAGER
// ========================================
// Handles dialogue display, queue management, and player pause

class DialogueManager {
    constructor(scene, uiScene = null) {
        this.scene = scene;
        this.uiScene = uiScene || scene; // Use uiScene if provided, fallback to scene
        this.isActive = false;
        this.currentDialogue = null;
        this.dialogueQueue = [];
        
        // UI elements
        this.dialogueBox = null;
        this.speakerText = null;
        this.messageText = null;
        this.continuePrompt = null;
        this.container = null;
        
        // Typewriter effect
        this.typewriterSpeed = 30; // ms per character
        this.typewriterTimer = null;
        this.fullText = '';
        this.displayedText = '';
        this.charIndex = 0;
        
        // Callbacks
        this.onDialogueComplete = null;
        
        // Touch controls state tracking
        this.touchControlsWereVisible = false;
        
        console.log('💬 DialogueManager initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    createDialogueUI() {
        if (this.container) {
            return; // Already created
        }
        
        console.log('💬 Creating dialogue UI...');
        
        // Use virtual coordinates (1200x720) to match other UI elements
        const virtualWidth = 1200;
        const virtualHeight = 720;
        
        // Create container for all dialogue elements on UIScene
        // Container at (0, 0) - elements will be positioned absolutely
        this.container = this.uiScene.add.container(0, 0);
        this.container.setDepth(10000); // Always on top
        this.container.setVisible(false);
        this.container.setScrollFactor(0); // Fixed to camera
        
        // Scale the container to match the UI scene's scale factor
        if (this.uiScene.uiScale !== undefined) {
            this.container.setScale(this.uiScene.uiScale);
            console.log(`💬 DIALOGUE_DEBUG: Applied UI scale ${this.uiScene.uiScale} to dialogue container`);
        } else {
            const calculatedScale = this.uiScene.cameras.main.zoom || 1.0;
            this.container.setScale(calculatedScale);
            console.log(`💬 DIALOGUE_DEBUG: Applied calculated scale ${calculatedScale} to dialogue container`);
        }
        
        // Dialogue box background (right side, just past 50%)
        // Use virtual coordinates instead of camera width to match other UI elements
        const panelWidth = 520;
        const panelHeight = 110;
        const panelX = Math.floor(virtualWidth * 0.72); // slightly right of center (864 in virtual coords)
        const panelY = Math.floor(virtualHeight * 0.50); // centered vertically (360 in virtual coords)
        
        // Semi-transparent overlay (optional, for pausing effect)
        // Use virtual coordinates to match other UI elements
        this.overlay = this.uiScene.add.rectangle(
            virtualWidth / 2,
            virtualHeight / 2,
            virtualWidth,
            virtualHeight,
            0x000000,
            0.3
        );
        this.overlay.setScrollFactor(0);
        
        // Dialogue box background - positioned absolutely
        this.dialogueBox = this.uiScene.add.rectangle(
            panelX,
            panelY,
            panelWidth,
            panelHeight,
            0x000000,
            0.85
        );
        this.dialogueBox.setStrokeStyle(3, 0xFFD700);
        this.dialogueBox.setScrollFactor(0);
        
        // Speaker name
        this.speakerText = this.uiScene.add.text(
            panelX - Math.floor(panelWidth / 2) + 16,
            panelY - Math.floor(panelHeight / 2) + 10,
            '',
            {
                fontSize: GAME_CONFIG.ui.fontSize.label,
                fill: '#FFD700',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontStyle: 'bold'
            }
        );
        this.speakerText.setScrollFactor(0);
        
        // Message text
        this.messageText = this.uiScene.add.text(
            panelX - Math.floor(panelWidth / 2) + 16,
            panelY - Math.floor(panelHeight / 2) + 38,
            '',
            {
                fontSize: GAME_CONFIG.ui.fontSize.small,
                fill: '#FFFFFF',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                wordWrap: { width: panelWidth - 32 }
            }
        );
        this.messageText.setScrollFactor(0);
        
        // Continue prompt (text will be updated based on device)
        const promptText = (window.DeviceManager && window.DeviceManager.shouldShowTouchControls()) ? '[TAP]' : '[SPACE]';
        this.continuePrompt = this.uiScene.add.text(
            panelX + Math.floor(panelWidth / 2) - 10,
            panelY + Math.floor(panelHeight / 2) - 18,
            promptText,
            {
                fontSize: GAME_CONFIG.ui.fontSize.tiny,
                fill: '#FFD700',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontStyle: 'italic'
            }
        );
        this.continuePrompt.setOrigin(1, 0.5);
        this.continuePrompt.setAlpha(0);
        this.continuePrompt.setScrollFactor(0);
        
        // Add all elements to container
        this.container.add([
            this.overlay,
            this.dialogueBox,
            this.speakerText,
            this.messageText,
            this.continuePrompt
        ]);
        
        // Make dialogue box and overlay interactive for tap-to-advance on mobile
        this.dialogueBox.setInteractive({ useHandCursor: false });
        if (this.overlay) {
            this.overlay.setInteractive({ useHandCursor: false });
        }
        
        // Make continue prompt blink
        this.scene.tweens.add({
            targets: this.continuePrompt,
            alpha: 1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            paused: true
        });
        
        console.log('💬 Dialogue UI created');
    }
    
    // ========================================
    // DIALOGUE DISPLAY
    // ========================================
    
    showDialogue(dialogue, callback = null) {
        if (!this.container) {
            this.createDialogueUI();
        }

        console.log(`💬 Showing dialogue: "${dialogue.text}" (speaker: ${dialogue.speaker || 'narrator'})`);

        // Hide touch controls during dialogue for cleaner presentation
        if (this.scene.touchControlsOverlay) {
            this.touchControlsWereVisible = this.scene.touchControlsOverlay.visible;
            this.scene.touchControlsOverlay.setVisible(false);
        }

        // HARD STOP: Disable input immediately and clear all input states to prevent skipping
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = true;
            // Clear all input states to prevent queued inputs from skipping dialogue
            if (this.scene.inputManager.inputState) {
                this.scene.inputManager.inputState.left = false;
                this.scene.inputManager.inputState.right = false;
                this.scene.inputManager.inputState.up = false;
                this.scene.inputManager.inputState.down = false;
                this.scene.inputManager.inputState.jump = false;
                this.scene.inputManager.inputState.attack = false;
                this.scene.inputManager.inputState.weapon = false;
                this.scene.inputManager.inputState.switchCharacter = false;
            }
            console.log(`💬 Input disabled and cleared to prevent dialogue skipping`);
        }

        // PAUSE GAMEPLAY FIRST - before showing dialogue
        if (dialogue.pauseGame !== false) {
            this.pauseGameplay();
        }

        this.isActive = true;
        this.currentDialogue = dialogue;
        this.onDialogueComplete = callback;
        
        // Update game state
        if (this.scene.gameStateManager) {
            this.scene.gameStateManager.setDialogueActive(true);
            this.scene.gameStateManager.setCurrentDialogue(dialogue);
        }
        
        // Show UI
        this.container.setVisible(true);
        
        // Clear any existing space key listeners to prevent immediate skip
        if (this.spaceKey) {
            this.spaceKey.off('down');
            this.spaceKey = null;
        }
        
        // Clear keyboard state more aggressively
        if (this.scene.input && this.scene.input.keyboard) {
            const spaceKeyObj = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            // Reset the key state by removing and re-adding
            spaceKeyObj.reset();
        }
        
        // Respect per-dialogue background dim preference (default: dim)
        // Note: Event dialogues will have their overlay controlled by EventManager
        const isEventDialogue = this.scene.eventManager && this.scene.eventManager.isEventActive();
        if (!isEventDialogue && this.overlay) {
            const shouldDim = dialogue.dimBackground !== false;
            this.overlay.setVisible(shouldDim);
        }
        
        // Set speaker name
        this.speakerText.setText(dialogue.speaker ? dialogue.speaker.toUpperCase() : 'NARRATOR');
        
        // Start typewriter effect
        this.fullText = dialogue.text;
        this.displayedText = '';
        this.charIndex = 0;
        this.messageText.setText('');
        this.continuePrompt.setAlpha(0);
        
        // Start typewriter
        this.startTypewriter();
        
        // Auto-dismiss if duration specified and no callback
        if (dialogue.duration && !callback) {
            this.scene.time.delayedCall(dialogue.duration, () => {
                this.hideDialogue();
            });
        }
        
        // Set up input for manual dismissal with a delay to prevent immediate skip
        // This ensures any queued input from attack button presses is cleared
        this.scene.time.delayedCall(150, () => {
        this.setupDialogueInput();
        });
    }
    
    startTypewriter() {
        if (this.typewriterTimer) {
            this.typewriterTimer.remove();
        }
        
        // Start typing sound (loops during typing)
        if (this.scene.audioManager) {
            this.scene.audioManager.startTextTyping();
        }
        
        this.typewriterTimer = this.scene.time.addEvent({
            delay: this.typewriterSpeed,
            callback: () => {
                if (this.charIndex < this.fullText.length) {
                    this.displayedText += this.fullText[this.charIndex];
                    this.messageText.setText(this.displayedText);
                    this.charIndex++;
                } else {
                    // Typewriter complete - stop typing sound
                    if (this.scene.audioManager) {
                        this.scene.audioManager.stopTextTyping();
                    }
                    this.typewriterTimer.remove();
                    this.typewriterTimer = null;
                    this.showContinuePrompt();
                }
            },
            loop: true
        });
    }
    
    skipTypewriter() {
        if (this.typewriterTimer) {
            this.typewriterTimer.remove();
            this.typewriterTimer = null;
        }
        
        // Stop typing sound when skipped
        if (this.scene.audioManager) {
            this.scene.audioManager.stopTextTyping();
        }
        
        this.displayedText = this.fullText;
        this.messageText.setText(this.displayedText);
        this.showContinuePrompt();
    }
    
    showContinuePrompt() {
        // Fade in continue prompt
        this.scene.tweens.add({
            targets: this.continuePrompt,
            alpha: 1,
            duration: 300
        });
    }
    
    hideDialogue() {
        console.log('💬 Hiding dialogue');
        
        // Restore touch controls if they were visible before dialogue
        if (this.scene.touchControlsOverlay && this.touchControlsWereVisible) {
            this.scene.touchControlsOverlay.setVisible(true);
            this.touchControlsWereVisible = false;
        }
        
        // Note: Cinematic darkening is managed by EventManager, not here
        
        this.isActive = false;
        this.currentDialogue = null;
        
        // Update game state
        if (this.scene.gameStateManager) {
            this.scene.gameStateManager.setDialogueActive(false);
            this.scene.gameStateManager.setCurrentDialogue(null);
        }
        
        // Hide UI
        if (this.container) {
            this.container.setVisible(false);
        }
        
        // Clean up typewriter
        if (this.typewriterTimer) {
            this.typewriterTimer.remove();
            this.typewriterTimer = null;
        }
        
        // Resume game
        this.resumeGameplay();
        
        // Call completion callback
        if (this.onDialogueComplete) {
            this.onDialogueComplete();
            this.onDialogueComplete = null;
        }
        
        // Check for queued dialogue
        if (this.dialogueQueue.length > 0) {
            const nextDialogue = this.dialogueQueue.shift();
            this.scene.time.delayedCall(500, () => {
                this.showDialogue(nextDialogue);
            });
        }
    }
    
    // ========================================
    // DIALOGUE QUEUE
    // ========================================
    
    queueDialogue(dialogue) {
        console.log(`💬 Queuing dialogue: "${dialogue.text}"`);
        this.dialogueQueue.push(dialogue);
        
        // If no dialogue is active, show the first one
        if (!this.isActive && this.dialogueQueue.length === 1) {
            const firstDialogue = this.dialogueQueue.shift();
            this.showDialogue(firstDialogue);
        }
    }
    
    queueMultipleDialogues(dialogues) {
        dialogues.forEach(dialogue => {
            this.queueDialogue(dialogue);
        });
    }
    
    clearQueue() {
        console.log('💬 Clearing dialogue queue');
        this.dialogueQueue = [];
    }
    
    // ========================================
    // TRIGGER-BASED DIALOGUE
    // ========================================
    
    triggerDialogue(triggerName, levelConfig) {
        if (!levelConfig || !levelConfig.dialogue) {
            return;
        }
        
        const dialogues = levelConfig.dialogue.filter(d => d.trigger === triggerName);
        
        if (dialogues.length > 0) {
            console.log(`💬 Triggering ${dialogues.length} dialogue(s) for: ${triggerName}`);
            
            // Queue all dialogues with this trigger
            dialogues.forEach(dialogue => {
                this.queueDialogue(dialogue);
            });
        }
    }
    
    // ========================================
    // INPUT HANDLING
    // ========================================
    
    setupDialogueInput() {
        // Remove previous listeners
        if (this.spaceKey) {
            this.spaceKey.off('down');
            this.spaceKey = null;
        }
        
        // Reset space key state to prevent immediate trigger from queued inputs
        if (this.scene.input && this.scene.input.keyboard) {
            const tempKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            tempKey.reset();
        }
        
        // Set up space key to advance dialogue
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            if (this.isActive) {
                this.advanceDialogue();
            }
        });
        
        // Set up touch input for dialogue (tap to advance)
        // Only register taps on dialogue box/overlay, not on gameplay controls
        if (this.dialogueBox) {
            this.dialogueBox.on('pointerdown', (pointer) => {
                if (this.isActive && this.isTouchInDialogueArea(pointer)) {
                    this.advanceDialogue();
                }
            });
        }
        
        if (this.overlay) {
            this.overlay.on('pointerdown', (pointer) => {
                if (this.isActive && this.isTouchInDialogueArea(pointer)) {
                    this.advanceDialogue();
                }
            });
        }
        
        // Also set up uiConfirm action in unified input controller
        // This will be checked in update() method
        if (this.scene.inputManager && this.scene.inputManager.unifiedInput) {
            // Set uiConfirm when SPACE is pressed
            this.spaceKey.on('down', () => {
                if (this.isActive) {
                    this.scene.inputManager.unifiedInput.setActionFromKeyboard('uiConfirm', true);
                }
            });
        }
    }
    
    /**
     * Check if touch is in dialogue area (not on gameplay controls)
     * @param {Phaser.Input.Pointer} pointer - The pointer event
     * @returns {boolean} True if touch is in dialogue area
     */
    isTouchInDialogueArea(pointer) {
        // Check if touch is outside gameplay control zones
        // For now, we'll allow any tap on dialogue box/overlay
        // The touch controls overlay should handle its own zones
        return true;
    }
    
    /**
     * Advance dialogue (skip typewriter or dismiss)
     */
    advanceDialogue() {
        if (!this.isActive) return;
        
        if (this.typewriterTimer) {
            // Skip typewriter
            this.skipTypewriter();
        } else {
            // Dismiss dialogue
            this.hideDialogue();
        }
    }
    
    /**
     * Update method to check for unified input controller actions
     * Should be called each frame when dialogue is active
     */
    update() {
        if (!this.isActive) return;
        
        // Check unified input controller for uiConfirm action
        if (this.scene.inputManager && this.scene.inputManager.unifiedInput) {
            if (this.scene.inputManager.unifiedInput.isActionPressed('uiConfirm')) {
                this.advanceDialogue();
            }
        }
    }
    
    // ========================================
    // GAME PAUSE/RESUME
    // ========================================
    
    pauseGameplay() {
        console.log('💬 Pausing gameplay for dialogue');
        
        // ALWAYS stop player animations and sounds when dialogue starts
        // This prevents stuck animations/sounds even if event system has control
        if (this.scene.player && this.scene.player.body) {
            // Stop player movement immediately
            this.scene.player.body.setVelocity(0, 0);
            
            // Stop running sound effect immediately
            if (this.scene.audioManager) {
                this.scene.audioManager.stopPlayerRunning();
            }
            
            // Force stop any active animations and reset to idle
            const charName = this.scene.currentCharacterConfig?.name || 'tireek';
            if (this.scene.animationManager) {
                const currentState = this.scene.animationManager.currentState;
                console.log(`💬 Stopping player animation: ${currentState} -> idle`);
                
                // Clear any animation locks (attack, airkick, run, etc.)
                this.scene.animationManager.animationLocked = false;
                this.scene.animationManager.lockTimer = 0;
                this.scene.animationManager.currentState = 'idle';
                
                // Play idle animation to stop any active animations
                this.scene.player.anims.play(`${charName}_idle`, true);
            } else {
                // Fallback: just play idle animation
                this.scene.player.anims.play(`${charName}_idle`, true);
            }
            
            // Reset jumping state
            if (this.scene.isJumping !== undefined) {
                this.scene.isJumping = false;
            }
        }
        
        // Clear all projectiles (especially boss rating weapons) when dialogue starts
        // This prevents weapons from continuing to fly during dialogue
        if (this.scene.weaponManager) {
            const projectileCount = this.scene.weaponManager.projectiles?.length || 0;
            if (projectileCount > 0) {
                this.scene.weaponManager.clearAllProjectiles();
                console.log(`💬 Cleared ${projectileCount} projectiles (including boss rating weapons) when dialogue started`);
            }
        }
        
        // Check if event system already has control
        const eventManager = this.scene.eventManager;
        const playerPausedByEvent = eventManager && eventManager.pausedEntities.player;
        const enemiesPausedByEvent = eventManager && eventManager.pausedEntities.enemies.length > 0;
        console.log(`💬 PAUSE CHECK - eventManager exists: ${!!eventManager}, pausedEntities.player: ${eventManager?.pausedEntities.player}, enemies: ${eventManager?.pausedEntities.enemies.length}`);
        
        if (playerPausedByEvent || enemiesPausedByEvent) {
            console.log('💬 Event system already has control - minimal dialogue pause (animations/sounds already stopped)');
            // Don't interfere with event system's pause state
            // Just pause physics if not already paused
            if (this.scene.physics && this.scene.physics.world && !this.scene.physics.world.isPaused) {
                this.scene.physics.world.isPaused = true;
            }
            return;
        }
        
        // Normal dialogue pause - no event system control
        console.log('💬 Full dialogue pause - no event control detected');
        
        // Pause physics
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.isPaused = true;
        }
        
        // Disable input manager
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = true;
        }
        
        // Update game state
        if (this.scene.gameStateManager) {
            this.scene.gameStateManager.pauseGame();
        }
    }
    
    resumeGameplay() {
        console.log('💬 Resuming gameplay after dialogue');
        
        // Check if event system has control over pause state
        const eventManager = this.scene.eventManager;
        const playerPausedByEvent = eventManager && eventManager.pausedEntities.player;
        const enemiesPausedByEvent = eventManager && eventManager.pausedEntities.enemies.length > 0;
        console.log(`💬 RESUME CHECK - eventManager exists: ${!!eventManager}, pausedEntities.player: ${eventManager?.pausedEntities.player}, enemies: ${eventManager?.pausedEntities.enemies.length}`);
        
        if (playerPausedByEvent || enemiesPausedByEvent) {
            console.log(`💬 Event system has control - Player paused: ${playerPausedByEvent}, Enemies paused: ${enemiesPausedByEvent}`);
            
            // Only resume physics world, but let event system control entities
            if (this.scene.physics && this.scene.physics.world) {
                this.scene.physics.world.isPaused = false;
            }
            
            // If only player is paused by events, we can still enable input for dialogue navigation
            // but the input manager will ignore movement commands due to event pause
            if (playerPausedByEvent && !this.scene.inputManager.disabled) {
                // Input manager is already enabled, leave it as is for dialogue interaction
            } else if (!playerPausedByEvent && this.scene.inputManager) {
                // Player not paused by events, safe to enable input
                this.scene.inputManager.disabled = false;
            }
            
            // Don't resume game state - let event system control it
            return;
        }
        
        // Normal resume - event system doesn't have control
        console.log('💬 No event control detected - full resume');
        
        // Resume physics
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.isPaused = false;
        }
        
        // Enable input manager
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = false;
        }
        
        // Update game state
        if (this.scene.gameStateManager) {
            this.scene.gameStateManager.resumeGame();
        }
    }
    
    // ========================================
    // DIALOGUE CONFIGURATION
    // ========================================
    
    // Configure dialogue box position and size
    setDialoguePosition(x, y) {
        if (!this.dialogueBox || !this.container) {
            console.warn('💬 Cannot set dialogue position - UI not created yet');
            return;
        }
        
        // Use provided coordinates or keep current position
        const screenX = x !== undefined ? x : this.dialogueBox.x;
        const screenY = y !== undefined ? y : this.dialogueBox.y;
        
        // Update dialogue box position
        this.dialogueBox.setPosition(screenX, screenY);
        
        // Recalculate text positions based on box center and current size
        const boxWidth = this.dialogueBox.width;
        const boxHeight = this.dialogueBox.height;
        const halfWidth = Math.floor(boxWidth / 2);
        const halfHeight = Math.floor(boxHeight / 2);
        
        // Update speaker text position (relative to box center)
        if (this.speakerText) {
            this.speakerText.setPosition(
                screenX - halfWidth + 16,
                screenY - halfHeight + 10
            );
        }
        
        // Update message text position (relative to box center)
        if (this.messageText) {
            this.messageText.setPosition(
                screenX - halfWidth + 16,
                screenY - halfHeight + 38
            );
        }
        
        // Update continue prompt position (relative to box center)
        if (this.continuePrompt) {
            this.continuePrompt.setPosition(
                screenX + halfWidth - 10,
                screenY + halfHeight - 18
            );
        }
        
        console.log(`💬 Dialogue position set to: (${screenX}, ${screenY})`);
    }
    
    // Configure dialogue box size
    setDialogueSize(width, height) {
        if (!this.dialogueBox) {
            console.warn('💬 Cannot set dialogue size - UI not created yet');
            return;
        }
        
        const newWidth = width !== undefined ? width : this.dialogueBox.width;
        const newHeight = height !== undefined ? height : this.dialogueBox.height;
        
        // Update dialogue box size
        this.dialogueBox.setSize(newWidth, newHeight);
        
        // Update text positions to stay within box
        const halfWidth = Math.floor(newWidth / 2);
        const halfHeight = Math.floor(newHeight / 2);
        
        if (this.speakerText) {
            this.speakerText.setPosition(
                this.dialogueBox.x - halfWidth + 16,
                this.dialogueBox.y - halfHeight + 10
            );
        }
        
        if (this.messageText) {
            this.messageText.setPosition(
                this.dialogueBox.x - halfWidth + 16,
                this.dialogueBox.y - halfHeight + 38
            );
            // Update word wrap width
            if (this.messageText.style) {
                this.messageText.style.wordWrapWidth = newWidth - 32;
            }
        }
        
        if (this.continuePrompt) {
            this.continuePrompt.setPosition(
                this.dialogueBox.x + halfWidth - 10,
                this.dialogueBox.y + halfHeight - 18
            );
        }
        
        console.log(`💬 Dialogue size set to: ${newWidth}x${newHeight}`);
    }
    
    // Configure text sizes
    setTextSizes(speakerSize, messageSize) {
        if (!this.speakerText || !this.messageText) {
            console.warn('💬 Cannot set text sizes - UI not created yet');
            return;
        }
        
        if (speakerSize !== undefined) {
            this.speakerText.setFontSize(speakerSize);
            console.log(`💬 Speaker text size set to: ${speakerSize}`);
        }
        
        if (messageSize !== undefined) {
            this.messageText.setFontSize(messageSize);
            console.log(`💬 Message text size set to: ${messageSize}`);
        }
    }
    
    // Configure word wrap width for message text
    setWordWrapWidth(width) {
        if (!this.messageText) {
            console.warn('💬 Cannot set word wrap width - UI not created yet');
            return;
        }
        
        if (this.messageText.style) {
            this.messageText.style.wordWrapWidth = width;
            console.log(`💬 Word wrap width set to: ${width}`);
        }
    }
    
    // Comprehensive configuration method
    configureDialogue(config) {
        if (!config) {
            console.warn('💬 configureDialogue: config object required');
            return;
        }
        
        console.log('💬 configureDialogue called with config:', JSON.stringify(config, null, 2));
        
        // Ensure UI is created
        if (!this.container) {
            console.log('💬 UI not created yet, creating now...');
            this.createDialogueUI();
        } else {
            console.log('💬 UI already exists, applying configuration...');
        }
        
        // Position
        if (config.position) {
            console.log(`💬 Setting position: (${config.position.x}, ${config.position.y})`);
            this.setDialoguePosition(config.position.x, config.position.y);
        }
        
        // Size
        if (config.size) {
            console.log(`💬 Setting size: ${config.size.width}x${config.size.height}`);
            this.setDialogueSize(config.size.width, config.size.height);
        }
        
        // Text sizes
        if (config.textSizes) {
            console.log(`💬 Setting text sizes: speaker=${config.textSizes.speaker}, message=${config.textSizes.message}`);
            this.setTextSizes(config.textSizes.speaker, config.textSizes.message);
        }
        
        // Word wrap
        if (config.wordWrapWidth !== undefined) {
            console.log(`💬 Setting word wrap width: ${config.wordWrapWidth}`);
            this.setWordWrapWidth(config.wordWrapWidth);
        }
        
        console.log('💬 Dialogue configuration complete. Current box position:', 
            this.dialogueBox ? `(${this.dialogueBox.x}, ${this.dialogueBox.y})` : 'N/A',
            'Size:', this.dialogueBox ? `${this.dialogueBox.width}x${this.dialogueBox.height}` : 'N/A');
    }
    
    // ========================================
    // UTILITY
    // ========================================

    isActive() {
        return this.isActive;
    }

    isDialogueActive() {
        return this.isActive;
    }
    
    getCurrentDialogue() {
        return this.currentDialogue;
    }
    
    getQueueLength() {
        return this.dialogueQueue.length;
    }
    
    // ========================================
    // CLEANUP
    // ========================================
    
    destroy() {
        if (this.typewriterTimer) {
            this.typewriterTimer.remove();
        }
        
        if (this.spaceKey) {
            this.spaceKey.off('down');
        }
        
        if (this.container) {
            this.container.destroy();
        }
        
        this.dialogueQueue = [];
        this.isActive = false;
        
        console.log('💬 DialogueManager destroyed');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DialogueManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DialogueManager = DialogueManager;
}

