// ========================================
// EVENT ACTIONS: SPAWNING OPERATIONS
// ========================================
// Handles enemy spawning control actions

class SpawningActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
    }
    
    advanceAction() {
        this.eventManager.advanceAction();
    }
    
    executeStartEnemySpawning(action) {
        const config = action.config || {};
        console.log(`🎬 Starting enemy spawning: ${JSON.stringify(config)}`);
        
        // Enable enemy spawning
        this.scene.maxEnemies = config.maxEnemies !== undefined ? config.maxEnemies : 4;
        this.scene.enemySpawnInterval = config.spawnInterval !== undefined ? config.spawnInterval : 1200;
        this.scene.enemySpawnTimer = 0; // Reset timer
        
        // CRITICAL: Also reset the EnemySpawnManager's internal settings
        // Preserve allowedEnemyTypes from current config if not specified in action
        if (this.scene.enemySpawnManager) {
            // Preserve current allowedEnemyTypes if not overridden in action config
            const currentAllowedTypes = this.scene.enemySpawnManager.allowedEnemyTypes || [];
            const allowedTypes = config.allowedEnemyTypes !== undefined ? config.allowedEnemyTypes : currentAllowedTypes;
            
            this.scene.enemySpawnManager.initialize({
                maxEnemies: this.scene.maxEnemies,
                spawnInterval: this.scene.enemySpawnInterval,
                isTestMode: this.scene.enemySpawnManager.isTestMode || false,
                isLoading: false,
                allowedEnemyTypes: allowedTypes // Preserve or use config value
            });
            this.scene.enemySpawnManager.enemySpawnTimer = 0;
            console.log(`🎬 Reset EnemySpawnManager: maxEnemies=${this.scene.maxEnemies}, interval=${this.scene.enemySpawnInterval}, types=${allowedTypes.join(', ') || 'all'}`);
        }
        
        // Store original spawn settings if needed
        if (!this.scene.eventEnemySpawningConfig) {
            this.scene.eventEnemySpawningConfig = {};
        }
        this.scene.eventEnemySpawningConfig.enabled = true;
        this.scene.eventEnemySpawningConfig.maxEnemies = this.scene.maxEnemies;
        this.scene.eventEnemySpawningConfig.spawnInterval = this.scene.enemySpawnInterval;
        
        this.advanceAction();
    }
    
    executeStopEnemySpawning(action) {
        console.log('🎬 Stopping enemy spawning');
        
        // Disable enemy spawning (but don't clear existing enemies)
        this.scene.maxEnemies = 0;
        this.scene.enemySpawnInterval = 999999;
        
        // CRITICAL: Also stop the EnemySpawnManager
        if (this.scene.enemySpawnManager) {
            this.scene.enemySpawnManager.setMaxEnemies(0);
            console.log('🎬 Stopped EnemySpawnManager');
        }
        
        if (this.scene.eventEnemySpawningConfig) {
            this.scene.eventEnemySpawningConfig.enabled = false;
        }
        
        // Only clear enemies if explicitly requested
        if (action.clearEnemies) {
            this.eventManager.utilities.clearEnemiesInPlace();
        }
        
        this.advanceAction();
    }
    
    executeWaitForEnemiesCleared(action) {
        console.log('🎬 Waiting for all enemies to be cleared...');
        
        // Check if enemies are already cleared
        const enemies = this.eventManager.utilities.getEnemiesArray();
        if (enemies.length === 0) {
            console.log('🎬 No enemies present, advancing immediately');
            this.advanceAction();
            return;
        }
        
        // Store interval reference on scene for cleanup if needed
        const checkInterval = this.scene.time.addEvent({
            delay: 100, // Check every 100ms
            callback: () => {
                // Drop dead/destroyed enemies IN PLACE (see EventUtilities.getEnemiesArray)
                const activeEnemies = this.eventManager.utilities.filterEnemiesInPlace(enemy => {
                    if (!enemy || !enemy.sprite) return false;
                    if (typeof ENEMY_STATES !== 'undefined' && enemy.state === ENEMY_STATES.DEAD) return false;
                    return enemy.sprite.active;
                });
                
                // If no active enemies remain, advance
                if (activeEnemies.length === 0) {
                    console.log('🎬 All enemies cleared!');
                    checkInterval.destroy();
                    if (this.scene.eventEnemiesClearedCheck) {
                        delete this.scene.eventEnemiesClearedCheck;
                    }
                    this.advanceAction();
                }
            },
            repeat: -1 // Repeat indefinitely until enemies are cleared
        });
        
        // Store reference for cleanup
        this.scene.eventEnemiesClearedCheck = checkInterval;
        
        // Safety timeout - if enemies aren't cleared in 60 seconds, advance anyway
        this.scene.time.delayedCall(60000, () => {
            if (checkInterval && checkInterval.active) {
                console.warn('🎬 Timeout waiting for enemies to clear (60s), advancing anyway');
                checkInterval.destroy();
                if (this.scene.eventEnemiesClearedCheck) {
                    delete this.scene.eventEnemiesClearedCheck;
                }
                this.advanceAction();
            }
        });
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpawningActions };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.SpawningActions = SpawningActions;
}

