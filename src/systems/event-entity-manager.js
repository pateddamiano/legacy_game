// ========================================
// EVENT ENTITY MANAGER
// ========================================
// Handles pause/resume logic for entities (player and enemies)

class EventEntityManager {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
        this.pausedEntities = eventManager.pausedEntities;
        this.savedEntityStates = eventManager.savedEntityStates;
    }
    
    pauseEntities(targets) {
        targets.forEach(target => {
            if (target === 'player') {
                this.pausePlayer();
            } else if (target === 'enemies') {
                this.pauseEnemies();
            } else if (target === 'all') {
                this.pausePlayer();
                this.pauseEnemies();
            } else if (target.startsWith('enemy_')) {
                const index = parseInt(target.split('_')[1]);
                this.pauseEnemy(index);
            }
        });
    }
    
    resumeEntities(targets) {
        targets.forEach(target => {
            if (target === 'player') {
                this.resumePlayer();
            } else if (target === 'enemies') {
                this.resumeEnemies();
            } else if (target === 'all') {
                this.resumePlayer();
                this.resumeEnemies();
            } else if (target.startsWith('enemy_')) {
                const index = parseInt(target.split('_')[1]);
                this.resumeEnemy(index);
            }
        });
    }
    
    pausePlayer() {
        if (this.pausedEntities.player) {
            console.log('🎬 Player already paused, skipping');
            return; // Already paused
        }
        
        console.log('🎬 Pausing player - setting pausedEntities.player = true');
        this.pausedEntities.player = true;
        console.log(`🎬 After pause - pausedEntities.player is now: ${this.pausedEntities.player}`);
        
        // Save current state
        if (this.scene.player && this.scene.player.body) {
            this.savedEntityStates.set('player', {
                velocityX: this.scene.player.body.velocity.x,
                velocityY: this.scene.player.body.velocity.y,
                gravityY: (this.scene.player.body.gravity && this.scene.player.body.gravity.y !== undefined) ? this.scene.player.body.gravity.y : 0,
                isJumping: this.scene.isJumping || false,
                animationState: this.scene.animationManager?.currentState || 'idle',
                animationLocked: this.scene.animationManager?.animationLocked || false,
                lockTimer: this.scene.animationManager?.lockTimer || 0
            });
            
            // Freeze physics
            this.scene.player.body.setVelocity(0, 0);
            this.scene.player.body.setGravityY(0);
            
            // Stop running sound effect immediately
            if (this.scene.audioManager) {
                this.scene.audioManager.stopPlayerRunning();
            }
            
            // Reset animation state to idle and stop running animation
            const charName = this.scene.currentCharacterConfig?.name || 'tireek';
            if (this.scene.animationManager) {
                // Clear any animation locks
                if (this.scene.animationManager.currentState === 'airkick' || 
                    this.scene.animationManager.currentState === 'run') {
                    console.log(`🎬 Clearing ${this.scene.animationManager.currentState} animation state on pause`);
                    this.scene.animationManager.currentState = 'idle';
                    this.scene.animationManager.animationLocked = false;
                    this.scene.animationManager.lockTimer = 0;
                    // Play idle animation
                    this.scene.player.anims.play(`${charName}_idle`, true);
                } else if (this.scene.animationManager.currentState === 'attack') {
                    // For attacks, we might want to let them finish, but if we're pausing, clear it
                    this.scene.animationManager.currentState = 'idle';
                    this.scene.animationManager.animationLocked = false;
                    this.scene.animationManager.lockTimer = 0;
                    this.scene.player.anims.play(`${charName}_idle`, true);
                } else {
                    // Ensure idle animation is playing
                    this.scene.player.anims.play(`${charName}_idle`, true);
                }
            } else {
                // Fallback: just play idle animation
                this.scene.player.anims.play(`${charName}_idle`, true);
            }
            
            // Reset jumping state
            this.scene.isJumping = false;
            
            // Disable input
            if (this.scene.inputManager) {
                this.scene.inputManager.disabled = true;
            }
            
            // Pause physics world for player
            if (this.scene.physics && this.scene.physics.world) {
                // Store original physics state
                if (!this.savedEntityStates.has('physics')) {
                    this.savedEntityStates.set('physics', {
                        isPaused: this.scene.physics.world.isPaused
                    });
                }
                this.scene.physics.world.isPaused = true;
            }
        }
    }
    
    resumePlayer() {
        if (!this.pausedEntities.player) {
            console.log('🎬 Player not paused, skipping resume');
            return;
        }
        
        console.log(`🎬 Resuming player - current animation state: ${this.scene.animationManager.currentState}, locked: ${this.scene.animationManager.animationLocked}`);
        console.log('🎬 Setting pausedEntities.player = false');
        this.pausedEntities.player = false;
        console.log(`🎬 After resume - pausedEntities.player is now: ${this.pausedEntities.player}`);
        
        // Restore state
        if (this.scene.player && this.scene.player.body && this.savedEntityStates.has('player')) {
            const savedState = this.savedEntityStates.get('player');
            this.scene.player.body.setVelocity(savedState.velocityX, savedState.velocityY);
            if (savedState.gravityY !== undefined) {
                this.scene.player.body.setGravityY(savedState.gravityY);
            }
            
            // Ensure animation state is cleared (don't restore airkick state)
            if (this.scene.animationManager) {
                // Force clear any stuck animation states, especially airkick
                if (this.scene.animationManager.currentState === 'airkick' || 
                    this.scene.animationManager.animationLocked) {
                    
                    // If animation was locked, check if timer expired
                    const wasLocked = this.scene.animationManager.animationLocked;
                    const lockTimer = this.scene.animationManager.lockTimer || 0;
                    
                    // Always clear airkick state on resume
                    if (this.scene.animationManager.currentState === 'airkick') {
                        console.log('🎬 Clearing stuck airkick state on resume');
                        this.scene.animationManager.currentState = 'idle';
                        this.scene.animationManager.animationLocked = false;
                        this.scene.animationManager.lockTimer = 0;
                        const charName = this.scene.currentCharacterConfig?.name || 'tireek';
                        this.scene.player.anims.play(`${charName}_idle`, true);
                    } else if (wasLocked && lockTimer <= 0) {
                        // Lock timer expired, clear lock
                        console.log('🎬 Animation lock expired, clearing on resume');
                        this.scene.animationManager.animationLocked = false;
                        this.scene.animationManager.lockTimer = 0;
                        if (this.scene.animationManager.currentState === 'attack') {
                            this.scene.animationManager.currentState = 'idle';
                            const charName = this.scene.currentCharacterConfig?.name || 'tireek';
                            this.scene.player.anims.play(`${charName}_idle`, true);
                        }
                    }
                }
            }
            
            // Don't restore jumping state - player should be on ground after pause
            this.scene.isJumping = false;
            
            this.savedEntityStates.delete('player');
        }
        
        // Re-enable input
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = false;
        }
        
        // Resume physics world
        if (this.scene.physics && this.scene.physics.world && this.savedEntityStates.has('physics')) {
            const savedState = this.savedEntityStates.get('physics');
            this.scene.physics.world.isPaused = savedState.isPaused;
            this.savedEntityStates.delete('physics');
        }
    }
    
    pauseEnemies() {
        if (this.pausedEntities.all) return; // Already paused
        
        console.log('🎬 Pausing all enemies');
        
        if (!this.scene.enemies) return;
        
        this.scene.enemies.forEach((enemy, index) => {
            if (!this.pausedEntities.enemies.includes(index)) {
                this.pauseEnemy(index);
            }
        });
    }
    
    resumeEnemies() {
        console.log('🎬 Resuming all enemies');
        
        if (!this.scene.enemies) return;
        
        // Resume all paused enemies
        const pausedIndices = [...this.pausedEntities.enemies];
        pausedIndices.forEach(index => {
            this.resumeEnemy(index);
        });
    }
    
    pauseEnemy(index) {
        if (this.pausedEntities.enemies.includes(index)) return; // Already paused
        
        if (!this.scene.enemies || !this.scene.enemies[index] || !this.scene.enemies[index].sprite) {
            return;
        }
        
        console.log(`🎬 Pausing enemy ${index}`);
        this.pausedEntities.enemies.push(index);
        
        const enemy = this.scene.enemies[index];
        const sprite = enemy.sprite;
        
        // Save current state
        const stateKey = `enemy_${index}`;
        this.savedEntityStates.set(stateKey, {
            velocityX: sprite.body.velocity.x,
            velocityY: sprite.body.velocity.y,
            state: enemy.state
        });
        
        // Freeze physics
        sprite.body.setVelocity(0, 0);
        
        // Stop enemy AI updates (set a flag)
        enemy.eventPaused = true;
    }
    
    resumeEnemy(index) {
        if (!this.pausedEntities.enemies.includes(index)) return; // Not paused
        
        if (!this.scene.enemies || !this.scene.enemies[index] || !this.scene.enemies[index].sprite) {
            // Remove from paused list even if enemy doesn't exist anymore
            this.pausedEntities.enemies = this.pausedEntities.enemies.filter(i => i !== index);
            return;
        }
        
        console.log(`🎬 Resuming enemy ${index}`);
        this.pausedEntities.enemies = this.pausedEntities.enemies.filter(i => i !== index);
        
        const enemy = this.scene.enemies[index];
        const sprite = enemy.sprite;
        
        // Restore state
        const stateKey = `enemy_${index}`;
        if (this.savedEntityStates.has(stateKey)) {
            const savedState = this.savedEntityStates.get(stateKey);
            sprite.body.setVelocity(savedState.velocityX, savedState.velocityY);
            this.savedEntityStates.delete(stateKey);
        }
        
        // Resume enemy AI updates
        enemy.eventPaused = false;
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventEntityManager };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.EventEntityManager = EventEntityManager;
}

