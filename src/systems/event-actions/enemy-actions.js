// ========================================
// EVENT ACTIONS: ENEMY OPERATIONS
// ========================================
// Handles all enemy-related event actions

class EnemyActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
    }
    
    advanceAction() {
        this.eventManager.advanceAction();
    }
    
    getEnemyById(enemyId) {
        return this.eventManager.getEnemyById(enemyId);
    }
    
    executeSpawnEnemy(action) {
        const enemyType = action.enemyType;
        const position = action.position;
        
        if (!enemyType || !position) {
            console.warn('🎬 SpawnEnemy action missing enemyType or position');
            this.advanceAction();
            return;
        }
        
        // Find enemy config
        let enemyConfig = null;
        if (typeof ALL_ENEMY_TYPES !== 'undefined' && ALL_ENEMY_TYPES) {
            enemyConfig = ALL_ENEMY_TYPES.find(config => config.name === enemyType);
        }
        
        if (!enemyConfig) {
            console.warn(`🎬 Could not find enemy config for type: ${enemyType}`);
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Spawning enemy: ${enemyType} at (${position.x}, ${position.y})`);
        
        // Create enemy instance
        if (typeof Enemy === 'undefined') {
            console.error('🎬 Enemy class not defined! Make sure enemy-system.js loads before event-manager.js');
            this.advanceAction();
            return;
        }
        
        const enemy = new Enemy(this.scene, position.x, position.y, enemyConfig);
        enemy.setPlayer(this.scene.player);
        
        // Disable AI for spawned enemy (they'll be controlled by events)
        enemy.eventPaused = true;
        
        // Store the event ID on the enemy for easier identification
        if (action.id) {
            enemy.eventId = action.id;
        }
        
        // Ensure sprite is visible and has proper depth for event sequences
        if (enemy.sprite) {
            enemy.sprite.setVisible(true);
            enemy.sprite.setActive(true);
            // Use Y-position based depth for proper layering (same as regular enemies)
            enemy.sprite.setDepth(enemy.sprite.y);
        }
        
        // Set initial flip state IMMEDIATELY if specified in action (before anything else can override it)
        if (action.flipX !== undefined && enemy.sprite) {
            enemy.sprite.setFlipX(action.flipX);
            // Also update the enemy's facingLeft property to match
            enemy.facingLeft = action.flipX;
            console.log(`🎬 Set initial flipX=${action.flipX} for spawned enemy ${action.id || enemyType} (immediate)`);
        }
        
        // Add to enemies array
        if (!this.scene.enemies) {
            this.scene.enemies = [];
        }
        const enemyIndex = this.scene.enemies.length;
        this.scene.enemies.push(enemy);
        
        // Store special reference for targeting (e.g., "enemy_critic")
        // IMPORTANT: Store this BEFORE setting flipX to ensure exclusion checks work
        if (action.id) {
            // Store mapping: "enemy_critic" -> enemyIndex
            if (!this.scene.eventEnemyMap) {
                this.scene.eventEnemyMap = new Map();
            }
            this.scene.eventEnemyMap.set(action.id, enemyIndex);
            console.log(`🎬 Stored enemy reference: ${action.id} -> index ${enemyIndex}`);
            
            // Register enemy for protection in centralized system
            const protectionLevel = action.protectionLevel || PROTECTION_LEVELS.EVENT_CONTROLLED;
            const metadata = {
                eventName: this.eventManager.activeEvent?.id || 'unknown',
                spawnedAt: this.scene.time.now,
                enemyType: enemyType,
                position: { x: position.x, y: position.y }
            };
            
            if (this.scene.eventEnemyProtection) {
                this.scene.eventEnemyProtection.registerEnemy(action.id, enemy, protectionLevel, metadata);
            }
        }
        
        // Ensure flipX persists (set again after a tiny delay to override any AI behavior)
        if (action.flipX !== undefined) {
            this.scene.time.delayedCall(1, () => {
                if (enemy.sprite && enemy.sprite.active) {
                    enemy.sprite.setFlipX(action.flipX);
                    enemy.facingLeft = action.flipX;
                }
            });
        }
        
        // Advance to next action
        this.advanceAction();
    }
    
    executeMoveAllEnemies(action) {
        const direction = action.direction || 'left'; // 'left' or 'right'
        const speed = action.speed || 300; // pixels per second
        const duration = action.duration || 2000; // milliseconds
        
        if (!this.scene.enemies || this.scene.enemies.length === 0) {
            console.log('🎬 No enemies to move');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Moving all ${this.scene.enemies.length} enemies ${direction} at speed ${speed}px/s`);
        
        const moveDistance = (speed * duration) / 1000; // Calculate distance based on speed and duration
        const directionMultiplier = direction === 'left' ? -1 : 1;
        
        let completedMovements = 0;
        const totalEnemies = this.scene.enemies.length;
        
        // Move each enemy
        this.scene.enemies.forEach((enemy, index) => {
            if (!enemy.sprite || (typeof ENEMY_STATES !== 'undefined' && enemy.state === ENEMY_STATES.DEAD)) {
                completedMovements++;
                if (completedMovements >= totalEnemies) {
                    this.advanceAction();
                }
                return;
            }
            
            const targetX = enemy.sprite.x + (moveDistance * directionMultiplier);
            
            // Create tween for smooth movement
            const tween = this.scene.tweens.add({
                targets: enemy.sprite,
                x: targetX,
                duration: duration,
                ease: action.ease || 'Power2',
                onComplete: () => {
                    completedMovements++;
                    
                    // If all enemies have moved, advance to next action
                    if (completedMovements >= totalEnemies) {
                        console.log('🎬 All enemies moved');
                        this.advanceAction();
                    }
                }
            });
            
            // Store tween reference
            if (!enemy.sprite.eventTweens) {
                enemy.sprite.eventTweens = [];
            }
            enemy.sprite.eventTweens.push(tween);
        });
        
        // If no valid enemies, advance immediately
        if (completedMovements >= totalEnemies) {
            this.advanceAction();
        }
    }
    
    executeDestroyEnemy(action) {
        const target = action.target;
        
        if (!target) {
            console.warn('🎬 DestroyEnemy action missing target');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Destroying enemy: ${target}`);
        
        // Use centralized lookup
        const enemyInfo = this.getEnemyById(target);
        
        if (!enemyInfo || !enemyInfo.enemy || !enemyInfo.enemy.sprite) {
            console.warn(`🎬 Could not find enemy to destroy: ${target} - may already be destroyed`);
            // Clean up any stale references (idempotent operations)
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(target)) {
                this.scene.eventEnemyMap.delete(target);
            }
            if (this.scene.eventEnemyProtection) {
                this.scene.eventEnemyProtection.unregisterEnemy(target);
            }
            this.advanceAction();
            return;
        }
        
        const { enemy, enemyIndex } = enemyInfo;
        
        // STEP 1: Unregister from protection system FIRST (to allow destruction)
        // This is idempotent - safe to call even if already unregistered
        if (this.scene.eventEnemyProtection) {
            this.scene.eventEnemyProtection.unregisterEnemy(target);
        }
        
        // STEP 2: Remove from eventEnemyMap immediately (before array manipulation)
        if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(target)) {
            this.scene.eventEnemyMap.delete(target);
        }
        
        // STEP 3: Stop any active tweens
        if (enemy.sprite && enemy.sprite.eventTweens) {
            enemy.sprite.eventTweens.forEach(tween => {
                if (tween && tween.stop) {
                    tween.stop();
                }
            });
            enemy.sprite.eventTweens = [];
        }
        
        // STEP 4: Set sprite to inactive
        if (enemy.sprite) {
            enemy.sprite.setActive(false);
            enemy.sprite.setVisible(false);
        }
        
        // STEP 5: Remove from enemies array
        if (enemyIndex >= 0 && this.scene.enemies && enemyIndex < this.scene.enemies.length) {
            // Verify the enemy at this index is actually the one we want to destroy
            if (this.scene.enemies[enemyIndex] === enemy) {
                // Update eventEnemyMap indices for other enemies before removing this one
                if (this.scene.eventEnemyMap) {
                    for (const [key, value] of this.scene.eventEnemyMap.entries()) {
                        if (value > enemyIndex) {
                            this.scene.eventEnemyMap.set(key, value - 1);
                        }
                    }
                }
                // Remove from array
                this.scene.enemies.splice(enemyIndex, 1);
                console.log(`🎬 Removed enemy ${target} from array at index ${enemyIndex}`);
            } else {
                // Enemy at index doesn't match - search for it in the array
                const actualIndex = this.scene.enemies.indexOf(enemy);
                if (actualIndex !== -1) {
                    // Update eventEnemyMap indices
                    if (this.scene.eventEnemyMap) {
                        for (const [key, value] of this.scene.eventEnemyMap.entries()) {
                            if (value > actualIndex) {
                                this.scene.eventEnemyMap.set(key, value - 1);
                            }
                        }
                    }
                    this.scene.enemies.splice(actualIndex, 1);
                    console.log(`🎬 Found and removed enemy ${target} from array at index ${actualIndex}`);
                } else {
                    console.warn(`🎬 Enemy ${target} not found in enemies array - may have already been removed`);
                }
            }
        } else if (enemyIndex === -1 && this.scene.enemies) {
            // Index not found, but we have the enemy instance - try to find it in array
            const actualIndex = this.scene.enemies.indexOf(enemy);
            if (actualIndex !== -1) {
                // Update eventEnemyMap indices
                if (this.scene.eventEnemyMap) {
                    for (const [key, value] of this.scene.eventEnemyMap.entries()) {
                        if (value > actualIndex) {
                            this.scene.eventEnemyMap.set(key, value - 1);
                        }
                    }
                }
                this.scene.enemies.splice(actualIndex, 1);
                console.log(`🎬 Found and removed enemy ${target} from array at index ${actualIndex} (fallback search)`);
            } else {
                console.warn(`🎬 Enemy ${target} not found in enemies array - proceeding with sprite destruction only`);
            }
        }
        
        // STEP 6: Mark enemy as destroyed and destroy the instance
        enemy.destroyed = true;
        
        // Call the Enemy's destroy method which properly cleans up
        if (enemy.destroy && typeof enemy.destroy === 'function') {
            enemy.destroy();
        } else if (enemy.sprite) {
            // Fallback: destroy sprite directly
            enemy.sprite.destroy();
        }
        
        console.log(`🎬 Enemy destroyed: ${target} (removed from array and map)`);
        
        // Advance action synchronously (no delays)
        this.advanceAction();
    }
    
    executeWaitForEnemyDestroy(action) {
        const target = action.target;
        
        if (!target) {
            console.warn('🎬 WaitForEnemyDestroy action missing target');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Waiting for enemy ${target} to be destroyed...`);
        
        // Use centralized lookup to check if enemy exists
        const enemyInfo = this.getEnemyById(target);
        
        // If enemy doesn't exist, it's already destroyed
        if (!enemyInfo || !enemyInfo.enemy || !enemyInfo.enemy.sprite || !enemyInfo.enemy.sprite.active) {
            console.log(`🎬 Enemy ${target} already destroyed`);
            this.advanceAction();
            return;
        }
        
        // Poll for enemy destruction using protection system (most reliable)
        const checkInterval = this.scene.time.addEvent({
            delay: 50,
            callback: () => {
                // Check if enemy still exists in protection system
                let stillExists = false;
                
                if (this.scene.eventEnemyProtection) {
                    const protectionInfo = this.scene.eventEnemyProtection.getProtectionById(target);
                    if (protectionInfo && protectionInfo.enemy) {
                        // Enemy still registered in protection system
                        // Check if sprite is still active
                        stillExists = protectionInfo.enemy.sprite && 
                                     protectionInfo.enemy.sprite.active && 
                                     !protectionInfo.enemy.destroyed;
                    }
                }
                
                // Also check if enemy is still in the enemies array (fallback check)
                if (!stillExists && this.scene.enemies) {
                    const currentEnemyInfo = this.getEnemyById(target);
                    if (currentEnemyInfo && currentEnemyInfo.enemy) {
                        stillExists = currentEnemyInfo.enemy.sprite && 
                                     currentEnemyInfo.enemy.sprite.active && 
                                     !currentEnemyInfo.enemy.destroyed;
                    }
                }
                
                if (!stillExists) {
                    console.log(`🎬 Enemy ${target} confirmed destroyed`);
                    checkInterval.destroy();
                    this.advanceAction();
                }
            },
            repeat: -1 // Repeat indefinitely until enemy is destroyed
        });
        
        // Safety timeout - if enemy isn't destroyed in 5 seconds, advance anyway
        this.scene.time.delayedCall(5000, () => {
            if (checkInterval && checkInterval.active) {
                console.warn(`🎬 Timeout waiting for enemy ${target} destruction`);
                checkInterval.destroy();
                this.advanceAction();
            }
        });
    }
    
    executeClearEnemiesOffscreen(action) {
        const xThreshold = action.xThreshold;
        const direction = action.direction || 'right';
        
        if (xThreshold === undefined) {
            console.warn('🎬 ClearEnemiesOffscreen action missing xThreshold');
            this.advanceAction();
            return;
        }
        
        if (!this.scene.enemies || this.scene.enemies.length === 0) {
            console.log('🎬 No enemies to clear');
            this.advanceAction();
            return;
        }
        
        let clearedCount = 0;
        const enemiesToRemove = [];
        const excludeIds = Array.isArray(action.excludeIds) ? action.excludeIds : [];
        
        console.log(`🎬 ClearEnemiesOffscreen: threshold=${xThreshold}, direction=${direction}, excludeIds=${JSON.stringify(excludeIds)}`);
        console.log(`🎬 Current eventEnemyMap:`, this.scene.eventEnemyMap);
        console.log(`🎬 Current enemies count: ${this.scene.enemies.length}`);
        
        // Build a fast lookup of indices that should be excluded based on special IDs
        const excludedIndices = new Set();
        if (this.scene.eventEnemyMap && excludeIds.length > 0) {
            for (const [id, mapIndex] of this.scene.eventEnemyMap.entries()) {
                if (excludeIds.includes(id)) {
                    excludedIndices.add(mapIndex);
                    console.log(`🎬 Adding index ${mapIndex} to exclusions for ID ${id}`);
                }
            }
        }
        
        console.log(`🎬 Excluded indices:`, excludedIndices);
        
        // Filter enemies based on position
        this.scene.enemies.forEach((enemy, index) => {
            if (!enemy || !enemy.sprite) return;
            
            const enemyX = enemy.sprite.x;
            let shouldRemove = false;
            
            if (direction === 'right') {
                shouldRemove = enemyX > xThreshold;
            } else if (direction === 'left') {
                shouldRemove = enemyX < xThreshold;
            }
            
            console.log(`🎬 Enemy at index ${index}: x=${enemyX}, shouldRemove=${shouldRemove} (${direction} of ${xThreshold}), eventId=${enemy.eventId || 'none'}`);
            
            if (!shouldRemove) return;
            
            // Respect exclusions (by special ID or explicit enemy_<index>)
            // FIRST: Check if this enemy has an eventId that should be excluded
            if (enemy.eventId && excludeIds.includes(enemy.eventId)) {
                console.log(`🎬 ✅ Excluding enemy at index ${index} from cleanup (eventId: ${enemy.eventId})`);
                return;
            }
            
            // SECOND: Check if this enemy is in the excludedIndices set (based on eventEnemyMap)
            if (excludedIndices.has(index)) {
                console.log(`🎬 ✅ Excluding enemy at index ${index} from cleanup (in excludedIndices)`);
                return;
            }
            
            // THIRD: Also check if this enemy's ID is in the excludeIds list by searching eventEnemyMap
            if (this.scene.eventEnemyMap) {
                for (const [id, mapIndex] of this.scene.eventEnemyMap.entries()) {
                    if (mapIndex === index && excludeIds.includes(id)) {
                        console.log(`🎬 ✅ Excluding enemy ${id} at index ${index} from cleanup (eventEnemyMap match)`);
                        return;
                    }
                }
            }
            
            // FOURTH: Check explicit enemy_<index> format
            if (excludeIds.includes(`enemy_${index}`)) {
                console.log(`🎬 ✅ Excluding enemy_${index} from cleanup (explicit index)`);
                return;
            }
            
            console.log(`🎬 ❌ Marking enemy at index ${index} for removal (x=${enemyX})`);
            enemiesToRemove.push(index);
        });
        
        // Remove enemies in reverse order to maintain indices
        for (let i = enemiesToRemove.length - 1; i >= 0; i--) {
            const index = enemiesToRemove[i];
            const enemy = this.scene.enemies[index];
            
            console.log(`🎬 Removing enemy at index ${index}, eventId=${enemy?.eventId || 'none'}`);
            
            if (enemy) {
                // Stop any active tweens
                if (enemy.sprite && enemy.sprite.eventTweens) {
                    enemy.sprite.eventTweens.forEach(tween => {
                        if (tween && tween.stop) {
                            tween.stop();
                        }
                    });
                    enemy.sprite.eventTweens = [];
                }
                
                // Properly destroy enemy (cleanup physics, timers, etc.)
                if (enemy.sprite) {
                    enemy.sprite.setActive(false);
                    enemy.sprite.setVisible(false);
                }
                if (enemy.destroy && typeof enemy.destroy === 'function') {
                    enemy.destroy();
                } else if (enemy.sprite) {
                    enemy.sprite.destroy();
                }
                enemy.destroyed = true;
                clearedCount++;
            }
            
            // Remove from array
            this.scene.enemies.splice(index, 1);
            
            // Update and prune eventEnemyMap
            if (this.scene.eventEnemyMap) {
                console.log(`🎬 EventEnemyMap before cleanup:`, this.scene.eventEnemyMap);
                for (const [key, value] of this.scene.eventEnemyMap.entries()) {
                    if (value === index) {
                        console.log(`🎬 Removing eventEnemyMap entry: ${key} -> ${value}`);
                        this.scene.eventEnemyMap.delete(key);
                    } else if (value > index) {
                        const newIndex = value - 1;
                        console.log(`🎬 Updating eventEnemyMap entry: ${key} ${value} -> ${newIndex}`);
                        this.scene.eventEnemyMap.set(key, newIndex);
                    }
                }
                console.log(`🎬 EventEnemyMap after cleanup:`, this.scene.eventEnemyMap);
            }
        }
        
        console.log(`🎬 Cleared ${clearedCount} enemies ${direction} of x=${xThreshold}`);
        this.advanceAction();
    }
    
    executeClearAllEnemies(action) {
        const excludeIds = Array.isArray(action.excludeIds) ? action.excludeIds : [];
        
        console.log(`🎬 ClearAllEnemies: excludeIds=${JSON.stringify(excludeIds)}`);
        console.log(`🎬 Current enemies count: ${this.scene.enemies ? this.scene.enemies.length : 0}`);
        
        if (!this.scene.enemies || this.scene.enemies.length === 0) {
            console.log('🎬 No enemies to clear');
            this.advanceAction();
            return;
        }
        
        let clearedCount = 0;
        const enemiesToRemove = [];
        
        // Build a fast lookup of indices that should be excluded based on special IDs
        const excludedIndices = new Set();
        if (this.scene.eventEnemyMap && excludeIds.length > 0) {
            for (const [id, mapIndex] of this.scene.eventEnemyMap.entries()) {
                if (excludeIds.includes(id)) {
                    excludedIndices.add(mapIndex);
                    console.log(`🎬 Adding index ${mapIndex} to exclusions for ID ${id}`);
                }
            }
        }
        
        // Get camera bounds for on-screen check
        const camera = this.scene.cameras.main;
        const cameraLeft = camera.scrollX;
        const cameraRight = camera.scrollX + camera.width;
        const cameraTop = camera.scrollY;
        const cameraBottom = camera.scrollY + camera.height;
        
        // Filter enemies - clear all except excluded ones and enemies on screen
        this.scene.enemies.forEach((enemy, index) => {
            if (!enemy || !enemy.sprite) return;
            
            // Check if this enemy should be excluded
            // FIRST: Check if this enemy has an eventId that should be excluded
            if (enemy.eventId && excludeIds.includes(enemy.eventId)) {
                console.log(`🎬 ✅ Excluding enemy at index ${index} from cleanup (eventId: ${enemy.eventId})`);
                return;
            }
            
            // SECOND: Check if this enemy is in the excludedIndices set (based on eventEnemyMap)
            if (excludedIndices.has(index)) {
                console.log(`🎬 ✅ Excluding enemy at index ${index} from cleanup (in excludedIndices)`);
                return;
            }
            
            // THIRD: Also check if this enemy's ID is in the excludeIds list by searching eventEnemyMap
            if (this.scene.eventEnemyMap) {
                for (const [id, mapIndex] of this.scene.eventEnemyMap.entries()) {
                    if (mapIndex === index && excludeIds.includes(id)) {
                        console.log(`🎬 ✅ Excluding enemy ${id} at index ${index} from cleanup (eventEnemyMap match)`);
                        return;
                    }
                }
            }
            
            // FOURTH: Check explicit enemy_<index> format
            if (excludeIds.includes(`enemy_${index}`)) {
                console.log(`🎬 ✅ Excluding enemy_${index} from cleanup (explicit index)`);
                return;
            }
            
            // FIFTH: Check if enemy is on screen (within camera view) - preserve on-screen enemies
            if (enemy.sprite && enemy.sprite.active) {
                const enemyX = enemy.sprite.x;
                const enemyY = enemy.sprite.y;
                const enemyWidth = enemy.sprite.width || 0;
                const enemyHeight = enemy.sprite.height || 0;
                
                // Check if enemy sprite is within camera bounds (with some margin for partial visibility)
                const margin = 50; // Allow enemies slightly off-screen to be considered "on screen"
                const isOnScreen = enemyX + enemyWidth >= cameraLeft - margin &&
                                  enemyX <= cameraRight + margin &&
                                  enemyY + enemyHeight >= cameraTop - margin &&
                                  enemyY <= cameraBottom + margin;
                
                if (isOnScreen) {
                    console.log(`🎬 ✅ Preserving enemy at index ${index} from cleanup (on screen at x=${Math.round(enemyX)}, y=${Math.round(enemyY)})`);
                    return;
                }
            }
            
            console.log(`🎬 ❌ Marking enemy at index ${index} for removal`);
            enemiesToRemove.push(index);
        });
        
        // Remove enemies in reverse order to maintain indices
        for (let i = enemiesToRemove.length - 1; i >= 0; i--) {
            const index = enemiesToRemove[i];
            const enemy = this.scene.enemies[index];
            
            console.log(`🎬 Removing enemy at index ${index}, eventId=${enemy?.eventId || 'none'}`);
            
            if (enemy) {
                // Stop any active tweens
                if (enemy.sprite && enemy.sprite.eventTweens) {
                    enemy.sprite.eventTweens.forEach(tween => {
                        if (tween && tween.stop) {
                            tween.stop();
                        }
                    });
                    enemy.sprite.eventTweens = [];
                }
                
                // Properly destroy enemy (cleanup physics, timers, etc.)
                if (enemy.sprite) {
                    enemy.sprite.setActive(false);
                    enemy.sprite.setVisible(false);
                }
                if (enemy.destroy && typeof enemy.destroy === 'function') {
                    enemy.destroy();
                } else if (enemy.sprite) {
                    enemy.sprite.destroy();
                }
                enemy.destroyed = true;
                clearedCount++;
            }
            
            // Remove from array
            this.scene.enemies.splice(index, 1);
            
            // Update and prune eventEnemyMap
            if (this.scene.eventEnemyMap) {
                // Update indices for enemies after this one
                for (const [key, value] of this.scene.eventEnemyMap.entries()) {
                    if (value > index) {
                        this.scene.eventEnemyMap.set(key, value - 1);
                    }
                }
            }
        }
        
        console.log(`🎬 Cleared ${clearedCount} enemies`);
        this.advanceAction();
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyActions };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.EnemyActions = EnemyActions;
}

