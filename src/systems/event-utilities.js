// ========================================
// EVENT UTILITIES
// ========================================
// Helper methods for entity lookup and enemy management

class EventUtilities {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
    }
    
    getEntity(target) {
        if (target === 'player') {
            return this.scene.player;
        } else if (target.startsWith('enemy_')) {
            // Check if it's a special ID (e.g., "enemy_critic")
            const restOfString = target.substring(6); // Remove "enemy_" prefix
            
            // FIRST: Try protection system lookup (most reliable)
            if (this.scene.eventEnemyProtection) {
                const protectionInfo = this.scene.eventEnemyProtection.getProtectionById(target);
                if (protectionInfo && protectionInfo.enemy && protectionInfo.enemy.sprite && 
                    protectionInfo.enemy.sprite.active && !protectionInfo.enemy.destroyed) {
                    return protectionInfo.enemy.sprite;
                }
            }
            
            // FALLBACK: Check eventEnemyMap for special IDs
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(target)) {
                const index = this.scene.eventEnemyMap.get(target);
                // Validate index and enemy existence
                if (this.scene.enemies && 
                    index >= 0 && 
                    index < this.scene.enemies.length && 
                    this.scene.enemies[index] && 
                    this.scene.enemies[index].sprite && 
                    this.scene.enemies[index].sprite.active &&
                    !this.scene.enemies[index].destroyed) {
                    return this.scene.enemies[index].sprite;
                } else {
                    // Enemy was removed but map entry still exists - clean it up
                    console.warn(`🎬 Enemy ${target} at index ${index} no longer exists, cleaning up map entry`);
                    this.scene.eventEnemyMap.delete(target);
                }
            }
            
            // Otherwise, try parsing as index (e.g., "enemy_0")
            const index = parseInt(restOfString);
            if (!isNaN(index) && 
                this.scene.enemies && 
                index >= 0 && 
                index < this.scene.enemies.length && 
                this.scene.enemies[index] && 
                this.scene.enemies[index].sprite &&
                this.scene.enemies[index].sprite.active &&
                !this.scene.enemies[index].destroyed) {
                return this.scene.enemies[index].sprite;
            }
        } else if (target.startsWith('extra_')) {
            // Resolve extras by special id map first
            if (this.scene.extrasManager && this.scene.extrasManager.eventExtraMap && this.scene.extrasManager.eventExtraMap.has(target)) {
                const index = this.scene.extrasManager.eventExtraMap.get(target);
                if (this.scene.extrasManager.extras[index]) {
                    return this.scene.extrasManager.extras[index].sprite;
                }
            }
            // or by numeric index suffix
            const rest = target.substring(6);
            const idx = parseInt(rest);
            if (!isNaN(idx) && this.scene.extrasManager && this.scene.extrasManager.extras[idx]) {
                return this.scene.extrasManager.extras[idx].sprite;
            }
        } else if (target.startsWith('character_')) {
            // Support for specific character (e.g., "character_tireek")
            const charName = target.split('_')[1];
            if (this.scene.characters && this.scene.characters[charName] && this.scene.characters[charName].sprite) {
                return this.scene.characters[charName].sprite;
            }
        }
        
        return null;
    }
    
    /**
     * Centralized enemy lookup by ID
     * Uses protection system as primary lookup (most reliable)
     * Falls back to eventEnemyMap if needed
     * Returns { enemy, enemyIndex } or null
     */
    getEnemyById(enemyId) {
        if (!enemyId || !enemyId.startsWith('enemy_')) {
            return null;
        }
        
        // PRIMARY: Check protection system (most reliable, stores enemy instance directly)
        if (this.scene.eventEnemyProtection) {
            const protectionInfo = this.scene.eventEnemyProtection.getProtectionById(enemyId);
            if (protectionInfo && protectionInfo.enemy) {
                const enemy = protectionInfo.enemy;
                // Verify enemy is still valid
                if (enemy.sprite && enemy.sprite.active && !enemy.destroyed) {
                    // Find index in enemies array
                    const enemyIndex = this.scene.enemies ? this.scene.enemies.indexOf(enemy) : -1;
                    return { enemy, enemyIndex };
                }
            }
        }
        
        // FALLBACK: Check eventEnemyMap
        if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(enemyId)) {
            const enemyIndex = this.scene.eventEnemyMap.get(enemyId);
            if (this.scene.enemies && 
                enemyIndex >= 0 && 
                enemyIndex < this.scene.enemies.length && 
                this.scene.enemies[enemyIndex] &&
                this.scene.enemies[enemyIndex].sprite &&
                this.scene.enemies[enemyIndex].sprite.active &&
                !this.scene.enemies[enemyIndex].destroyed) {
                return { enemy: this.scene.enemies[enemyIndex], enemyIndex };
            } else {
                // Enemy was removed but map entry still exists - clean it up
                console.warn(`🎬 Enemy ${enemyId} at index ${enemyIndex} no longer exists, cleaning up map entry`);
                this.scene.eventEnemyMap.delete(enemyId);
            }
        }
        
        return null;
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventUtilities };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.EventUtilities = EventUtilities;
}

