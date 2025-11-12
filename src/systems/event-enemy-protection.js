// ========================================
// EVENT ENEMY PROTECTION SYSTEM
// ========================================
// Centralized protection system for event-managed enemies
// Prevents important characters from being destroyed by cleanup systems during cutscenes

// Protection Levels
const PROTECTION_LEVELS = {
    NONE: 'none',                    // No protection (normal enemy)
    INVULNERABLE: 'invulnerable',    // Cannot take damage, cannot be destroyed by any system
    DAMAGE_IMMUNE: 'damage_immune',  // Can be targeted but takes no damage, cannot be destroyed
    CLEANUP_PROTECTED: 'cleanup_protected', // Can take damage but protected from all cleanup systems
    EVENT_CONTROLLED: 'event_controlled'    // Normal behavior but only event system can destroy
};

class EventEnemyProtection {
    constructor(scene) {
        this.scene = scene;
        
        // Central registry of protected enemies
        // Map: enemyId -> { enemy, protectionLevel, registeredAt, metadata }
        this.protectedEnemies = new Map();
        
        // Quick lookup by enemy instance
        // WeakMap: enemy -> { enemyId, protectionLevel }
        this.enemyLookup = new WeakMap();
        
        // Statistics for debugging
        this.stats = {
            registered: 0,
            unregistered: 0,
            protectionChecks: 0,
            protectionBlocks: 0
        };
        
        console.log('🛡️ EventEnemyProtection system initialized');
    }
    
    // ========================================
    // REGISTRATION METHODS
    // ========================================
    
    /**
     * Register an enemy for protection
     * @param {string} enemyId - Unique identifier (e.g., "enemy_critic")
     * @param {Enemy} enemy - Enemy instance to protect
     * @param {string} protectionLevel - Protection level from PROTECTION_LEVELS
     * @param {object} metadata - Optional metadata (event name, sequence info, etc.)
     */
    registerEnemy(enemyId, enemy, protectionLevel = PROTECTION_LEVELS.EVENT_CONTROLLED, metadata = {}) {
        if (!enemyId || !enemy) {
            console.warn('🛡️ Cannot register enemy: missing enemyId or enemy instance');
            return false;
        }
        
        if (!Object.values(PROTECTION_LEVELS).includes(protectionLevel)) {
            console.warn(`🛡️ Invalid protection level: ${protectionLevel}, using EVENT_CONTROLLED`);
            protectionLevel = PROTECTION_LEVELS.EVENT_CONTROLLED;
        }
        
        const registration = {
            enemy,
            protectionLevel,
            registeredAt: this.scene.time.now,
            metadata: { ...metadata }
        };
        
        this.protectedEnemies.set(enemyId, registration);
        this.enemyLookup.set(enemy, { enemyId, protectionLevel });
        this.stats.registered++;
        
        console.log(`🛡️ Registered enemy protection: ${enemyId} (${protectionLevel})`, metadata);
        return true;
    }
    
    /**
     * Unregister an enemy from protection
     * @param {string} enemyId - Enemy identifier to unregister
     */
    unregisterEnemy(enemyId) {
        const registration = this.protectedEnemies.get(enemyId);
        if (!registration) {
            console.warn(`🛡️ Cannot unregister enemy: ${enemyId} not found in registry`);
            return false;
        }
        
        // Remove from both maps
        this.enemyLookup.delete(registration.enemy);
        this.protectedEnemies.delete(enemyId);
        this.stats.unregistered++;
        
        console.log(`🛡️ Unregistered enemy protection: ${enemyId}`);
        return true;
    }
    
    /**
     * Update protection level for an existing enemy
     * @param {string} enemyId - Enemy identifier
     * @param {string} newProtectionLevel - New protection level
     */
    updateProtectionLevel(enemyId, newProtectionLevel) {
        const registration = this.protectedEnemies.get(enemyId);
        if (!registration) {
            console.warn(`🛡️ Cannot update protection: ${enemyId} not found in registry`);
            return false;
        }
        
        const oldLevel = registration.protectionLevel;
        registration.protectionLevel = newProtectionLevel;
        this.enemyLookup.set(registration.enemy, { enemyId, protectionLevel: newProtectionLevel });
        
        console.log(`🛡️ Updated protection level: ${enemyId} (${oldLevel} -> ${newProtectionLevel})`);
        return true;
    }
    
    // ========================================
    // PROTECTION CHECK METHODS
    // ========================================
    
    /**
     * Check if an enemy is protected from damage
     * @param {Enemy} enemy - Enemy instance to check
     * @returns {boolean} True if enemy should not take damage
     */
    isProtectedFromDamage(enemy) {
        this.stats.protectionChecks++;
        
        const lookup = this.enemyLookup.get(enemy);
        if (!lookup) return false;
        
        const isProtected = lookup.protectionLevel === PROTECTION_LEVELS.INVULNERABLE ||
                           lookup.protectionLevel === PROTECTION_LEVELS.DAMAGE_IMMUNE;
        
        if (isProtected) {
            this.stats.protectionBlocks++;
            console.log(`🛡️ Blocked damage to protected enemy: ${lookup.enemyId} (${lookup.protectionLevel})`);
        }
        
        return isProtected;
    }
    
    /**
     * Check if an enemy is protected from cleanup/destruction
     * @param {Enemy} enemy - Enemy instance to check
     * @returns {boolean} True if enemy should not be cleaned up
     */
    isProtectedFromCleanup(enemy) {
        this.stats.protectionChecks++;
        
        const lookup = this.enemyLookup.get(enemy);
        if (!lookup) return false;
        
        const isProtected = lookup.protectionLevel !== PROTECTION_LEVELS.NONE;
        
        if (isProtected) {
            this.stats.protectionBlocks++;
            console.log(`🛡️ Blocked cleanup of protected enemy: ${lookup.enemyId} (${lookup.protectionLevel})`);
        }
        
        return isProtected;
    }
    
    /**
     * Check if an enemy can only be destroyed by the event system
     * @param {Enemy} enemy - Enemy instance to check
     * @returns {boolean} True if only event system can destroy this enemy
     */
    isEventControlledOnly(enemy) {
        const lookup = this.enemyLookup.get(enemy);
        if (!lookup) return false;
        
        return lookup.protectionLevel === PROTECTION_LEVELS.EVENT_CONTROLLED ||
               lookup.protectionLevel === PROTECTION_LEVELS.INVULNERABLE ||
               lookup.protectionLevel === PROTECTION_LEVELS.DAMAGE_IMMUNE ||
               lookup.protectionLevel === PROTECTION_LEVELS.CLEANUP_PROTECTED;
    }
    
    /**
     * Get protection info for an enemy
     * @param {Enemy} enemy - Enemy instance
     * @returns {object|null} Protection info or null if not protected
     */
    getProtectionInfo(enemy) {
        const lookup = this.enemyLookup.get(enemy);
        if (!lookup) return null;
        
        const registration = this.protectedEnemies.get(lookup.enemyId);
        return {
            enemyId: lookup.enemyId,
            protectionLevel: lookup.protectionLevel,
            registeredAt: registration?.registeredAt,
            metadata: registration?.metadata || {}
        };
    }
    
    /**
     * Check protection by enemy ID (for event system use)
     * @param {string} enemyId - Enemy identifier
     * @returns {object|null} Protection info or null if not found
     */
    getProtectionById(enemyId) {
        const registration = this.protectedEnemies.get(enemyId);
        if (!registration) return null;
        
        return {
            enemyId,
            enemy: registration.enemy,
            protectionLevel: registration.protectionLevel,
            registeredAt: registration.registeredAt,
            metadata: registration.metadata
        };
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    /**
     * Get all protected enemies
     * @returns {Array} Array of protection info objects
     */
    getAllProtectedEnemies() {
        const result = [];
        for (const [enemyId, registration] of this.protectedEnemies.entries()) {
            result.push({
                enemyId,
                enemy: registration.enemy,
                protectionLevel: registration.protectionLevel,
                registeredAt: registration.registeredAt,
                metadata: registration.metadata
            });
        }
        return result;
    }
    
    /**
     * Validate protection registry (remove invalid entries)
     */
    validateRegistry() {
        let removedCount = 0;
        const toRemove = [];
        
        for (const [enemyId, registration] of this.protectedEnemies.entries()) {
            const enemy = registration.enemy;
            
            // Check if enemy is still valid
            if (!enemy || !enemy.sprite || enemy.destroyed || !enemy.sprite.active) {
                toRemove.push(enemyId);
                removedCount++;
            }
        }
        
        // Remove invalid entries
        toRemove.forEach(enemyId => {
            const registration = this.protectedEnemies.get(enemyId);
            if (registration) {
                this.enemyLookup.delete(registration.enemy);
            }
            this.protectedEnemies.delete(enemyId);
        });
        
        if (removedCount > 0) {
            console.log(`🛡️ Cleaned up ${removedCount} invalid protection entries`);
        }
        
        return removedCount;
    }
    
    /**
     * Clear all protections (for level cleanup)
     */
    clearAll() {
        const count = this.protectedEnemies.size;
        this.protectedEnemies.clear();
        // WeakMap will be garbage collected automatically
        
        console.log(`🛡️ Cleared all ${count} enemy protections`);
        
        // Reset stats
        this.stats = {
            registered: 0,
            unregistered: 0,
            protectionChecks: 0,
            protectionBlocks: 0
        };
    }
    
    /**
     * Get protection statistics
     * @returns {object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            currentlyProtected: this.protectedEnemies.size
        };
    }
    
    /**
     * Debug: Log all protected enemies
     */
    debugLogProtectedEnemies() {
        console.log(`🛡️ Protected Enemies (${this.protectedEnemies.size}):`);
        for (const [enemyId, registration] of this.protectedEnemies.entries()) {
            console.log(`  - ${enemyId}: ${registration.protectionLevel}`, registration.metadata);
        }
        console.log('🛡️ Protection Stats:', this.getStats());
    }
}

// Export protection levels and class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventEnemyProtection, PROTECTION_LEVELS };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.EventEnemyProtection = EventEnemyProtection;
    window.PROTECTION_LEVELS = PROTECTION_LEVELS;
}
