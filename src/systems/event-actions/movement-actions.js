// ========================================
// EVENT ACTIONS: MOVEMENT OPERATIONS
// ========================================
// Handles movement-related event actions (move, flip, setPlayerBounds)

class MovementActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
    }
    
    advanceAction() {
        this.eventManager.advanceAction();
    }
    
    getEntity(target) {
        return this.eventManager.getEntity(target);
    }
    
    executeDestroyEnemy(action) {
        // Delegate to enemy actions
        return this.eventManager.enemyActions.executeDestroyEnemy(action);
    }
    
    executeMove(action) {
        const target = action.target;
        const destination = action.to;
        const duration = action.duration || 1000; // Default 1 second
        
        if (!target || !destination) {
            console.warn('🎬 Move action missing target or destination');
            this.advanceAction();
            return;
        }
        
        // Get entity to move
        const entity = this.getEntity(target);
        if (!entity) {
            console.warn(`🎬 Could not find entity: ${target}`);
            this.advanceAction();
            return;
        }
        
        // Support relative syntax like '+=3600' or '-=500' for x/y
        const parseRelative = (raw, current) => {
            if (typeof raw === 'string') {
                // Handle camera-relative expressions (e.g., "camera.x+1400")
                if (raw.includes('camera.x')) {
                    const cameraX = this.scene.cameras.main.scrollX;
                    const expr = raw.replace('camera.x', cameraX.toString());
                    try {
                        return eval(expr);
                    } catch (e) {
                        console.warn('🎬 Failed to evaluate camera expression:', raw);
                        return current; // fallback
                    }
                }

                // Handle relative syntax like '+=3600' or '-=500'
                const m = raw.match(/^([+\-]=)(-?\d+(?:\.\d+)?)$/);
                if (m) {
                    const delta = parseFloat(m[2]);
                    return m[1] === '+=' ? current + delta : current - delta;
                }
            }
            return (raw !== undefined && raw !== null) ? raw : current;
        };
        const destX = parseRelative(destination.x, entity.x);
        const destY = parseRelative(destination.y, entity.y);
        
        console.log(`🎬 Moving ${target} to (${destX}, ${destY}) over ${duration}ms`);
        
        // Stop any physics movement and disable physics temporarily for smooth tween movement
        if (entity.body) {
            entity.body.setVelocity(0, 0);
            entity.body.setImmovable(true); // Prevent physics from interfering
        }
        
        // If this is an enemy, ensure it's paused and set velocity to 0
        if (target.startsWith('enemy_')) {
            const restOfString = target.substring(6);
            let enemyIndex = null;
            
            // Check eventEnemyMap first for special IDs
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(target)) {
                enemyIndex = this.scene.eventEnemyMap.get(target);
            } else {
                // Try parsing as index
                const index = parseInt(restOfString);
                if (!isNaN(index)) {
                    enemyIndex = index;
                }
            }
            
            if (enemyIndex !== null && this.scene.enemies && this.scene.enemies[enemyIndex]) {
                const enemy = this.scene.enemies[enemyIndex];
                enemy.eventPaused = true; // Ensure enemy AI is paused
                if (enemy.sprite && enemy.sprite.body) {
                    enemy.sprite.body.setVelocity(0, 0);
                    enemy.sprite.body.setImmovable(true);
                }
            }
        }
        
        // Create tween for smooth movement
        const tween = this.scene.tweens.add({
            targets: entity,
            x: destX,
            y: destY,
            duration: duration,
            ease: action.ease || 'Power2', // Default easing
            onStart: () => {
                console.log(`🎬 Started moving ${target} to (${destX}, ${destY})`);
            },
            onUpdate: () => {
                // Keep velocity at 0 during tween to prevent physics interference
                if (entity.body) {
                    entity.body.setVelocity(0, 0);
                }
            },
            onComplete: () => {
                console.log(`🎬 Move complete for ${target}`);
                // Re-enable physics if it was disabled
                if (entity.body) {
                    entity.body.setImmovable(false);
                }
                
                // If destroyOnComplete is set, destroy the enemy immediately
                if (action.destroyOnComplete && target.startsWith('enemy_')) {
                    console.log(`🎬 Destroying ${target} immediately after movement completes`);
                    
                    // Call destroy directly (no delay needed - executeDestroyEnemy handles everything)
                    // Protection will be unregistered inside executeDestroyEnemy
                    this.executeDestroyEnemy({ target: target });
                } else {
                    this.advanceAction();
                }
            }
        });
        
        // Store tween reference in case we need to cancel it
        if (!entity.eventTweens) {
            entity.eventTweens = [];
        }
        entity.eventTweens.push(tween);
    }
    
    executeFlip(action) {
        const target = action.target;
        const flipX = action.flipX !== undefined ? action.flipX : true;
        const flipY = action.flipY !== undefined ? action.flipY : false;
        
        if (!target) {
            console.warn('🎬 Flip action missing target');
            this.advanceAction();
            return;
        }
        
        // Get entity to flip
        const entity = this.getEntity(target);
        if (!entity) {
            console.warn(`🎬 Could not find entity to flip: ${target}`);
            this.advanceAction();
            return;
        }
        
        // getEntity returns the sprite directly for enemies, or the sprite for players
        // So entity should already be the sprite
        const sprite = entity;
        
        if (!sprite || typeof sprite.setFlipX !== 'function') {
            console.warn(`🎬 Entity ${target} does not support flipping`);
            this.advanceAction();
            return;
        }
        
        // Skip flip if already in desired state (optimization)
        if (flipX !== undefined && sprite.flipX === flipX) {
            console.log(`🎬 Skipping flip for ${target} - already flipped to ${flipX}`);
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Flipping ${target}: flipX=${flipX}, flipY=${flipY}`);
        
        sprite.setFlipX(flipX);
        if (flipY !== undefined) {
            sprite.setFlipY(flipY);
        }
        
        // Also update facingLeft for enemies if applicable
        if (target.startsWith('enemy_') && this.scene.enemies) {
            const enemyIndex = this.scene.eventEnemyMap?.get(target);
            if (enemyIndex !== undefined && this.scene.enemies[enemyIndex]) {
                this.scene.enemies[enemyIndex].facingLeft = flipX;
            }
        }
        
        this.advanceAction();
    }
    
    executeSetPlayerBounds(action) {
        const bounds = action.bounds;
        if (!bounds || !this.scene.player) {
            console.warn('🎬 SetPlayerBounds action missing bounds or player');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Setting player bounds: ${JSON.stringify(bounds)}`);
        
        // Store bounds on scene for checking in update loop
        if (!this.scene.eventPlayerBounds) {
            this.scene.eventPlayerBounds = {};
        }
        
        this.scene.eventPlayerBounds.minX = bounds.minX !== undefined ? bounds.minX : null;
        this.scene.eventPlayerBounds.maxX = bounds.maxX !== undefined ? bounds.maxX : null;
        this.scene.eventPlayerBounds.minY = bounds.minY !== undefined ? bounds.minY : null;
        this.scene.eventPlayerBounds.maxY = bounds.maxY !== undefined ? bounds.maxY : null;
        
        // Also update physics world bounds if needed
        if (bounds.minX !== undefined || bounds.maxX !== undefined) {
            const currentBounds = this.scene.physics.world.bounds;
            const newMinX = bounds.minX !== undefined ? bounds.minX : currentBounds.x;
            const newMaxX = bounds.maxX !== undefined ? bounds.maxX : currentBounds.x + currentBounds.width;
            
            this.scene.physics.world.setBounds(
                newMinX,
                currentBounds.y,
                newMaxX - newMinX,
                currentBounds.height
            );
        }
        
        this.advanceAction();
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MovementActions };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.MovementActions = MovementActions;
}

