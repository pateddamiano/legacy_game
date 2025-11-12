// ========================================
// ENEMY SPAWN MANAGER
// ========================================
// Handles enemy spawning, updating, and cleanup

class EnemySpawnManager {
    constructor(scene, enemies, weaponManager, itemPickupManager) {
        this.scene = scene;
        this.enemies = enemies;
        this.weaponManager = weaponManager;
        this.itemPickupManager = itemPickupManager;
        
        // Spawn configuration
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = ENEMY_CONFIG.spawnInterval;
        this.maxEnemies = ENEMY_CONFIG.maxEnemiesOnScreen;
        this.isLoading = false;
        this.isTestMode = false;
        
        // References (set during initialization)
        this.player = null;
        this.streetTopLimit = 0;
        this.streetBottomLimit = 0;
        this.eventCameraLocked = false;
        this.playerCurrentHealth = 100;
        this.playerMaxHealth = 100;
        this.levelManager = null;
        
        console.log('👾 EnemySpawnManager initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    initialize(config) {
        this.maxEnemies = config.maxEnemies || ENEMY_CONFIG.maxEnemiesOnScreen;
        this.enemySpawnInterval = config.spawnInterval || ENEMY_CONFIG.spawnInterval;
        this.isTestMode = config.isTestMode || false;
        this.isLoading = config.isLoading || false;
    }
    
    setReferences(player, streetTopLimit, streetBottomLimit, eventCameraLocked, playerCurrentHealth, playerMaxHealth, levelManager) {
        this.player = player;
        this.streetTopLimit = streetTopLimit;
        this.streetBottomLimit = streetBottomLimit;
        this.eventCameraLocked = eventCameraLocked;
        this.playerCurrentHealth = playerCurrentHealth;
        this.playerMaxHealth = playerMaxHealth;
        this.levelManager = levelManager;
    }
    
    // ========================================
    // UPDATE LOOP
    // ========================================
    
    update(time, delta) {
        // Skip if enemies array not initialized yet
        if (!this.enemies) return;
        
        // Skip enemy spawning if disabled (test mode or maxEnemies is 0)
        if (this.maxEnemies === 0 || this.isTestMode) {
            // Still update existing enemies if any (for event system)
            if (this.enemies && this.enemies.length > 0) {
                this.enemies.forEach((enemy, index) => {
                    if (enemy && enemy.update) {
                        enemy.update(time, delta);
                    }
                    // Remove destroyed enemies
                    if (!enemy.sprite || !enemy.sprite.active) {
                        this.enemies.splice(index, 1);
                    }
                });
            }
            return;
        }
        
        // Don't spawn enemies while loading
        if (!this.isLoading) {
            // Update spawn timer
            this.enemySpawnTimer += delta;
            
            // Dynamic spawn rate based on player performance
            let spawnInterval = this.enemySpawnInterval;
            if (this.playerCurrentHealth > this.playerMaxHealth * 0.7) {
                // Player doing well - spawn enemies faster
                spawnInterval *= 0.8;
            } else if (this.playerCurrentHealth < this.playerMaxHealth * 0.3) {
                // Player struggling - spawn enemies slower
                spawnInterval *= 1.5;
            }
            
            if (this.enemySpawnTimer >= spawnInterval) {
                this.spawnEnemy();
                this.enemySpawnTimer = 0;
                // Add some randomness to spawn interval (±20% variation)
                const variation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
                this.enemySpawnInterval = ENEMY_CONFIG.spawnInterval * variation;
            }
        }
        
        // Update all enemies
        this.enemies.forEach((enemy, index) => {
            enemy.update(time, delta);
            
            // Aggressive cleanup: Remove enemies that are far from player
            if (enemy.sprite && enemy.sprite.active) {
                // FIRST: Check centralized protection system
                if (this.scene.eventEnemyProtection && this.scene.eventEnemyProtection.isProtectedFromCleanup(enemy)) {
                    // Enemy is protected by the centralized system - skip all cleanup
                    return;
                }
                
                // LEGACY: Skip cleanup for enemies managed by the event system
                // Check if enemy is paused by events or is in the eventEnemyMap
                const isEventManaged = enemy.eventPaused === true;
                const hasEventId = enemy.eventId !== undefined;
                
                // Check if this enemy index is in the eventEnemyMap (more robust check)
                let isInEventMap = false;
                if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.size > 0) {
                    // Check if any entry in the map points to this enemy index
                    for (const mapIndex of this.scene.eventEnemyMap.values()) {
                        if (mapIndex === index) {
                            isInEventMap = true;
                            break;
                        }
                    }
                }
                
                if (isEventManaged || isInEventMap || hasEventId) {
                    // Don't cleanup event-managed enemies - let the event system handle them
                    console.log(`🧹 Skipping cleanup for event-managed enemy: eventPaused=${isEventManaged}, hasEventId=${hasEventId}, inEventMap=${isInEventMap}`);
                    return;
                }
                
                const distanceToPlayer = Phaser.Math.Distance.Between(
                    enemy.sprite.x, enemy.sprite.y,
                    this.player.x, this.player.y
                );
                
                // Check if enemy is behind player (to the left)
                const isBehindPlayer = enemy.sprite.x < this.player.x;
                const horizontalDistance = Math.abs(enemy.sprite.x - this.player.x);
                
                // Check grace period - don't clean up enemies that just spawned
                const timeSinceSpawn = this.scene.time.now - (enemy.spawnTime || 0);
                const isInGracePeriod = timeSinceSpawn < ENEMY_CONFIG.cleanupGracePeriod;
                
                // More aggressive cleanup for enemies behind player
                const cleanupThreshold = isBehindPlayer ? ENEMY_CONFIG.cleanupDistanceBehind : ENEMY_CONFIG.cleanupDistance;
                
                // Also check if enemy is far offscreen to the left
                const cameraLeft = this.scene.cameras.main.scrollX;
                const isOffscreenLeft = enemy.sprite.x < (cameraLeft - 400); // 400px offscreen
                
                // Only cleanup if not in grace period (unless offscreen left)
                // Dead enemies are always cleaned up, live enemies need to pass distance check AND not be in grace period
                const shouldCleanup = enemy.state === ENEMY_STATES.DEAD ? false : // Don't cleanup dead enemies here - they handle their own cleanup
                                     (!isInGracePeriod && (distanceToPlayer > cleanupThreshold || isOffscreenLeft));
                
                if (shouldCleanup) {
                    if (enemy.sprite) {
                        enemy.destroy();
                    }
                    this.enemies.splice(index, 1);
                    console.log(`🧹 Cleaned up enemy (distance: ${Math.round(distanceToPlayer)}, behind: ${isBehindPlayer}, offscreen: ${isOffscreenLeft}, grace: ${isInGracePeriod})`);
                }
            } else if (!enemy.sprite) {
                // Remove enemies with destroyed sprites (but not dead enemies - they handle their own cleanup)
                if (enemy.state !== ENEMY_STATES.DEAD) {
                    this.enemies.splice(index, 1);
                }
            }
        });
    }
    
    // ========================================
    // ENEMY SPAWNING
    // ========================================
    
    spawnEnemy() {
        // Don't spawn enemies if disabled
        if (this.maxEnemies === 0 || this.isTestMode) {
            return;
        }
        
        // Count only active (non-dead) enemies
        const activeEnemyCount = this.enemies.filter(enemy => 
            enemy && enemy.state !== ENEMY_STATES.DEAD && enemy.sprite && enemy.sprite.active
        ).length;
        
        if (activeEnemyCount >= this.maxEnemies) return;
        
        // Get camera and player bounds for spawning
        const cameraX = this.scene.cameras.main.scrollX;
        const cameraWidth = this.scene.cameras.main.width;
        const playerX = this.player.x;
        
        // Determine if player is in first segment (near level start)
        const worldBounds = this.scene.physics.world.bounds;
        const firstSegmentEnd = worldBounds.x + 1200; // First segment is 1200px wide
        const isPlayerInFirstSegment = playerX < firstSegmentEnd;
        
        // Check if camera is locked (event system fight sequence)
        const isCameraLocked = this.eventCameraLocked || false;
        
        // Compute offscreen spawn positions relative to camera
        const cameraLeft = cameraX;
        const cameraRight = cameraX + cameraWidth;
        const worldMinX = worldBounds.x;
        const worldMaxX = worldBounds.x + worldBounds.width;
        
        // Larger margin to keep large sprites fully offscreen
        const offscreenMargin = Math.max(ENEMY_CONFIG.spawnOffscreenDistance || 0, 220);
        
        // Decide side to spawn from
        let spawnOnLeft = false;
        if (isCameraLocked) {
            // During locked camera fights, always allow either side (ignore world bounds)
            spawnOnLeft = Math.random() < 0.5;
        } else {
            // Normal roaming: slight left bias when not near start
            spawnOnLeft = !isPlayerInFirstSegment && Math.random() < 0.3;
        }
        
        // Pick an offscreen X, not clamped to world bounds (so we can spawn out-of-world)
        let spawnX = spawnOnLeft ? (cameraLeft - offscreenMargin) : (cameraRight + offscreenMargin);
        
        // Check if spawn position is too close to player
        const minDistanceFromPlayer = 400; // Minimum safe distance
        const distanceToPlayer = Math.abs(spawnX - playerX);
        
        if (distanceToPlayer < minDistanceFromPlayer) {
            // console.log(`⚠️ Spawn too close to player (${distanceToPlayer}px), skipping...`);
            return; // Skip this spawn
        }
        
        // Check if spawn position collides with existing enemies
        const minDistanceFromEnemies = 300; // Minimum safe distance from other enemies
        const tooCloseToEnemy = this.enemies.some(enemy => {
            if (!enemy.sprite) return false;
            const distanceToEnemy = Math.abs(spawnX - enemy.sprite.x);
            return distanceToEnemy < minDistanceFromEnemies;
        });
        
        if (tooCloseToEnemy) {
            // console.log(`⚠️ Spawn too close to existing enemy, skipping...`);
            return; // Skip this spawn
        }
        
        // Random Y position within street bounds with some variety
        let spawnY = this.streetTopLimit + Math.random() * (this.streetBottomLimit - this.streetTopLimit);
        
        // Randomly select an enemy type with weighted probability FIRST
        // Crackheads are most common (50%), Green thugs medium (30%), Black thugs rare (20%)
        const random = Math.random();
        let enemyConfig;
        if (random < 0.5) {
            enemyConfig = CRACKHEAD_CONFIG; // 50% chance - most common
        } else if (random < 0.8) {
            enemyConfig = GREEN_THUG_CONFIG; // 30% chance - medium difficulty
        } else {
            enemyConfig = BLACK_THUG_CONFIG; // 20% chance - hardest enemy
        }
        
        // NOW add spawn position variety based on enemy type
        if (enemyConfig.name === 'crackhead') {
            // Crackheads prefer to spawn in the middle of the street
            spawnY = this.streetTopLimit + 0.3 * (this.streetBottomLimit - this.streetTopLimit) + 
                     Math.random() * 0.4 * (this.streetBottomLimit - this.streetTopLimit);
        } else if (enemyConfig.name === 'green_thug') {
            // Green thugs prefer the lower part of the street (closer to camera)
            spawnY = this.streetTopLimit + 0.5 * (this.streetBottomLimit - this.streetTopLimit) + 
                     Math.random() * 0.5 * (this.streetBottomLimit - this.streetTopLimit);
        } else if (enemyConfig.name === 'black_thug') {
            // Black thugs can spawn anywhere but prefer edges
            if (Math.random() < 0.5) {
                spawnY = this.streetTopLimit + Math.random() * 0.3 * (this.streetBottomLimit - this.streetTopLimit);
            } else {
                spawnY = this.streetTopLimit + 0.7 * (this.streetBottomLimit - this.streetTopLimit) + 
                         Math.random() * 0.3 * (this.streetBottomLimit - this.streetTopLimit);
            }
        }
        
        // Create enemy
        const enemy = new Enemy(this.scene, spawnX, spawnY, enemyConfig);
        enemy.setPlayer(this.player);
        this.enemies.push(enemy);
        
        // If spawned beyond the physics world horizontally, temporarily disable world-bound collisions
        if (spawnX < worldMinX || spawnX > worldMaxX) {
            if (enemy.sprite && typeof enemy.sprite.setCollideWorldBounds === 'function') {
                enemy.sprite.setCollideWorldBounds(false);
            }
            // Mark for re-enabling once inside
            enemy.reenableWorldBoundsOnEntry = true;
        }
        
        const spawnDirection = spawnOnLeft ? 'LEFT' : 'RIGHT';
        const distFromPlayer = Math.abs(spawnX - playerX);
        console.log(`✅ Spawned ${enemyConfig.name} from ${spawnDirection} at x=${Math.round(spawnX)} (${Math.round(distFromPlayer)}px from player) - Total: ${this.enemies.length}`);
    }
    
    // ========================================
    // CLEANUP
    // ========================================
    
    clearAll() {
        const enemyCount = this.enemies.length;
        
        // Destroy all enemy sprites
        this.enemies.forEach(enemy => {
            if (enemy.sprite) {
                enemy.destroy();
            }
        });
        
        // Clear the enemies array
        this.enemies.length = 0;
        
        // Also clear all weapon projectiles
        if (this.weaponManager) {
            this.weaponManager.clearAllProjectiles();
        }
        
        // Also clear all item pickups
        if (this.itemPickupManager) {
            this.itemPickupManager.clearAllPickups();
        }
        
        console.log(`Cleared ${enemyCount} enemies`);
        
        // Visual feedback - flash the screen briefly
        const flashOverlay = this.scene.add.rectangle(
            this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0xff0000,
            0.3
        );
        flashOverlay.setDepth(1999);
        flashOverlay.setScrollFactor(0);
        
        // Remove flash after short duration
        this.scene.time.delayedCall(100, () => {
            flashOverlay.destroy();
        });
    }
    
    destroyAll() {
        if (!this.enemies) return;
        
        console.log(`🎮 Destroying ${this.enemies.length} enemies...`);
        
        this.enemies.forEach(enemy => {
            if (enemy.sprite) {
                enemy.sprite.destroy();
            }
        });
        
        this.enemies.length = 0;
    }
    
    // ========================================
    // CONFIGURATION
    // ========================================
    
    setMaxEnemies(count) {
        this.maxEnemies = count;
    }
    
    setSpawnInterval(interval) {
        this.enemySpawnInterval = interval;
    }
    
    setIsLoading(loading) {
        this.isLoading = loading;
    }
    
    setIsTestMode(testMode) {
        this.isTestMode = testMode;
    }
}

