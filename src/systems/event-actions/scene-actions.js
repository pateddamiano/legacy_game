// ========================================
// EVENT ACTIONS: SCENE OPERATIONS
// ========================================
// Handles scene-related event actions (dialogue, wait, fade, loadLevel, waitForZone)

class SceneActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
    }
    
    advanceAction() {
        this.eventManager.advanceAction();
    }
    
    updateSpeakingExtra(speakerName) {
        return this.eventManager.cinematicManager.updateSpeakingExtra(speakerName);
    }
    
    executeDialogue(action) {
        const dialogue = action.dialogue;
        
        if (!dialogue) {
            console.warn('🎬 Dialogue action missing dialogue data');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Showing dialogue: "${dialogue.text}"`);
        
        // NOTE: Enemies are NOT automatically paused during dialogue
        // If enemies should be paused during dialogue, add a 'pause' action with targets: ["enemies"] before the dialogue action
        
        // Ensure event-managed enemies stay visible during dialogue
        if (this.scene.enemies && this.scene.eventEnemyMap) {
            this.scene.eventEnemyMap.forEach((enemyIndex, enemyId) => {
                const enemy = this.scene.enemies[enemyIndex];
                if (enemy && enemy.sprite) {
                    enemy.sprite.setVisible(true);
                    enemy.sprite.setActive(true);
                }
            });
        }
        
        // Update speaking extra for cinematic darkening
        this.updateSpeakingExtra(dialogue.speaker);
        
        // Use DialogueManager if available
        if (this.scene.dialogueManager) {
            // Show dialogue with callback to advance to next action
            // NOTE: Do NOT resume enemies here - they should stay paused for the entire event duration
            // Enemies will only resume when explicitly told to via a 'resume' action or when event completes
            this.scene.dialogueManager.showDialogue(dialogue, () => {
                this.advanceAction();
            });
        } else {
            console.warn('🎬 DialogueManager not available');
            // Do NOT resume enemies - they should stay paused for the entire event duration
            this.advanceAction();
        }
    }
    
    executeWait(action) {
        let duration = action.duration || 1000;

        // Support random duration in format: "random(min,max)"
        if (typeof duration === 'string' && duration.startsWith('random(')) {
            const match = duration.match(/random\((\d+),(\d+)\)/);
            if (match) {
                const min = parseInt(match[1]);
                const max = parseInt(match[2]);
                duration = Phaser.Math.Between(min, max);
                console.log(`🎬 Random wait: ${min}-${max}ms, selected: ${duration}ms`);
            }
        }

        console.log(`🎬 Waiting ${duration}ms`);

        // Wait for specified duration, then advance
        this.scene.time.delayedCall(duration, () => {
            this.advanceAction();
        });
    }
    
    executeFade(action) {
        const direction = action.direction || 'out'; // 'in' or 'out'
        const duration = action.duration || 1000;
        const color = action.color || { r: 0, g: 0, b: 0 }; // Default black
        
        console.log(`🎬 Fading ${direction} over ${duration}ms`);
        
        const camera = this.scene.cameras.main;
        
        if (direction === 'out') {
            // Fade out
            camera.fadeOut(duration, color.r, color.g, color.b);
            
            // Wait for fade to complete
            camera.once('camerafadeoutcomplete', () => {
                console.log('🎬 Fade out complete');
                this.advanceAction();
            });
        } else if (direction === 'in') {
            // Fade in
            camera.fadeIn(duration, color.r, color.g, color.b);
            
            // Wait for fade to complete
            camera.once('camerafadeincomplete', () => {
                console.log('🎬 Fade in complete');
                this.advanceAction();
            });
        } else {
            console.warn(`🎬 Unknown fade direction: ${direction}`);
            this.advanceAction();
        }
    }
    
    executeLoadLevel(action) {
        const levelId = action.levelId;
        if (!levelId) {
            console.warn('🎬 LoadLevel action missing levelId');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Loading level: ${levelId}`);
        
        // Transition to next level using LevelTransitionManager
        if (this.scene.levelTransitionManager) {
            this.scene.levelTransitionManager.transitionToLevel(levelId);
        } else {
            console.error('🎬 LevelTransitionManager not available, falling back to scene restart');
            // Fallback to scene restart if transition manager not available
            this.scene.scene.restart({
                character: this.scene.selectedCharacter || 'tireek',
                levelId: levelId
            });
        }
        
        // Note: advanceAction won't be called since transition is in progress
    }
    
    executeWaitForZone(action) {
        const zone = action.zone;
        if (!zone || !zone.x1 || !zone.x2 || !zone.y1 || !zone.y2) {
            console.warn('🎬 WaitForZone action missing zone coordinates');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Waiting for player to enter zone: (${zone.x1}, ${zone.y1}) to (${zone.x2}, ${zone.y2})`);
        
        // Store zone check in scene for update loop
        this.scene.eventWaitingForZone = {
            x1: Math.min(zone.x1, zone.x2),
            x2: Math.max(zone.x1, zone.x2),
            y1: Math.min(zone.y1, zone.y2),
            y2: Math.max(zone.y1, zone.y2),
            actionIndex: this.eventManager.currentActionIndex
        };
        
        // Don't advance - wait for zone check in update loop
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SceneActions };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.SceneActions = SceneActions;
}

