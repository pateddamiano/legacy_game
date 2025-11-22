// ========================================
// DIALOGUE MANAGER
// ========================================
// Handles dialogue display, queue management, and player pause

class DialogueManager {
    constructor(scene) {
        this.scene = scene;
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
        
        // Create container for all dialogue elements
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(10000); // Always on top
        this.container.setVisible(false);
        this.container.setScrollFactor(0); // Fixed to camera
        
        // Semi-transparent overlay (optional, for pausing effect)
        this.overlay = this.scene.add.rectangle(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x000000,
            0.3
        );
        this.overlay.setScrollFactor(0);
        
        // Dialogue box background (right side, just past 50%)
        const cam = this.scene.cameras.main;
        const panelWidth = 520;
        const panelHeight = 110;
        const panelX = Math.floor(cam.width * 0.72); // slightly right of center
        const panelY = Math.floor(cam.height * 0.50); // centered vertically
        
        this.dialogueBox = this.scene.add.rectangle(
            panelX,
            panelY,
            panelWidth,
            panelHeight,
            0x000000,
            0.85
        );
        this.dialogueBox.setStrokeStyle(3, 0xFFD700);
        
        // Speaker name
        this.speakerText = this.scene.add.text(
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
        
        // Message text
        this.messageText = this.scene.add.text(
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
        
        // Continue prompt
        this.continuePrompt = this.scene.add.text(
            panelX + Math.floor(panelWidth / 2) - 10,
            panelY + Math.floor(panelHeight / 2) - 18,
            '[SPACE]',
            {
                fontSize: GAME_CONFIG.ui.fontSize.tiny,
                fill: '#FFD700',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontStyle: 'italic'
            }
        );
        this.continuePrompt.setOrigin(1, 0.5);
        this.continuePrompt.setAlpha(0);
        
        // Add all elements to container
        this.container.add([
            this.overlay,
            this.dialogueBox,
            this.speakerText,
            this.messageText,
            this.continuePrompt
        ]);
        
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
        
        // Set up input for manual dismissal
        this.setupDialogueInput();
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
        }
        
        // Set up space key to advance dialogue
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            if (this.isActive) {
                if (this.typewriterTimer) {
                    // Skip typewriter
                    this.skipTypewriter();
                } else {
                    // Dismiss dialogue
                    this.hideDialogue();
                }
            }
        });
    }
    
    // ========================================
    // GAME PAUSE/RESUME
    // ========================================
    
    pauseGameplay() {
        console.log('💬 Pausing gameplay for dialogue');
        
        // Check if event system already has control
        const eventManager = this.scene.eventManager;
        const playerPausedByEvent = eventManager && eventManager.pausedEntities.player;
        const enemiesPausedByEvent = eventManager && eventManager.pausedEntities.enemies.length > 0;
        
        if (playerPausedByEvent || enemiesPausedByEvent) {
            console.log('💬 Event system already has control - minimal dialogue pause');
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

