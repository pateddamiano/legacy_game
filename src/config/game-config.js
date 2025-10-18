// ========================================
// GAME CONFIGURATION
// ========================================
// Centralized configuration for all game systems
// This file contains constants, settings, and configurations

// ========================================
// GAME CONSTANTS
// ========================================
const GAME_CONFIG = {
    // Game dimensions
    width: 1200,
    height: 720,
    
    // Physics settings
    physics: {
        gravity: { y: 0 },
        debug: false
    },
    
    // Player settings
    player: {
        maxHealth: 100,
        startingHealth: 100,
        movementSpeed: 420,
        jumpForce: 400,
        verticalSpeed: 3
    },
    
    // Enemy settings
    enemy: {
        spawnInterval: 1200,
        maxEnemiesOnScreen: 5,
        cleanupDistance: 1000,
        deathLingerTime: 2000
    },
    
    // Level settings
    level: {
        maxLevels: 10,
        bossLevels: [3, 6, 9], // Levels that contain boss fights
        checkpointLevels: [2, 5, 8] // Levels with save points
    },
    
    // Audio settings
    audio: {
        musicVolume: 0.3,
        sfxVolume: 0.5,
        fadeInDuration: 2000,
        fadeOutDuration: 1000
    },
    
    // UI settings
    ui: {
        healthBarWidth: 250,
        healthBarHeight: 25,
        debugMode: false
    }
};

// ========================================
// WORLD BOUNDS
// ========================================
// 🎯 SINGLE SOURCE OF TRUTH FOR WORLD BOUNDARIES 🎯
// All systems read from here - DO NOT duplicate these values elsewhere!
const WORLD_CONFIG = {
    width: 3600,
    height: 720,
    streetTopLimit: 410,      // Top boundary for vertical movement (expanded upward)
    streetBottomLimit: 650,    // Bottom boundary for vertical movement
    spawnOffscreenDistance: 50
};

// ========================================
// HITBOX CONFIGURATION
// ========================================
// 🎯 EASY HITBOX ADJUSTMENT PANEL 🎯
// 
// Modify these values to adjust combat feel and balance.
// All measurements are in pixels AT SCALE 1.0
// Hitboxes automatically scale with sprite scale

const HITBOX_CONFIG = {
    // 👤 PLAYER HITBOXES (base values at scale 1.0)
    player: {
        // Body collision (for character-to-character blocking)
        bodyRadius: 25,                 // collision radius for character separation
        
        // Attack hitboxes (when player attacks enemies)
        attackWidth: 35,                // width of player attack hitbox
        attackHeight: 45,               // height of player attack hitbox
        attackOffsetX: 10,              // how far in front of player the attack reaches
        attackOffsetY: -20,             // vertical offset for attack hitbox (raised up)
        verticalTolerance: 25,          // Maximum vertical distance for melee attacks
        
        // Air kick hitboxes (when player does air attacks)
        airkickWidth: 25,               // width of air kick hitbox
        airkickHeight: 35,              // height of air kick hitbox
        airkickOffsetX: 20,             // how far in front of player the air kick reaches
        airkickOffsetY: -8,             // vertical offset for air kick hitbox (raised up)
        airkickVerticalTolerance: 35,   // Slightly more tolerance for air kicks
    },
    
    // 👹 ENEMY HITBOXES (base values at scale 1.0)
    enemy: {
        // Body collision (for character-to-character blocking)
        bodyRadius: 25,                 // collision radius for character separation
        playerCollisionRadius: 25,      // collision radius with player specifically
        enemyCollisionRadius: 20,       // collision radius between enemies
        
        // Attack hitboxes (when enemies attack player)
        attackWidth: 40,                // width of enemy attack hitbox
        attackHeight: 45,               // height of enemy attack hitbox
        attackOffsetX: 10,              // how far in front of enemy the attack reaches
        attackOffsetY: -20,             // vertical offset for attack hitbox (raised up)
    },
    
    // 🎨 VISUAL DEBUG SETTINGS
    debug: {
        bodyCollisionAlpha: 0.4,        // transparency of collision radius circles
        attackHitboxLineWidth: 3,       // thickness of attack hitbox lines
        bodyLineWidth: 2,               // thickness of body hitbox lines
    }
};

// ========================================
// HITBOX HELPER FUNCTIONS
// ========================================
// Functions to calculate scaled hitboxes based on sprite scale

const HitboxHelpers = {
    /**
     * Get scaled hitbox dimensions for a sprite
     * @param {Phaser.GameObjects.Sprite} sprite - The sprite to get hitbox for
     * @param {object} baseConfig - Base hitbox config (from HITBOX_CONFIG)
     * @returns {object} Scaled hitbox values
     */
    getScaledHitbox(sprite, baseConfig) {
        const scale = sprite.scaleX; // Assuming uniform scaling
        const scaled = {};
        
        for (const [key, value] of Object.entries(baseConfig)) {
            if (typeof value === 'number') {
                scaled[key] = value * scale;
            } else {
                scaled[key] = value;
            }
        }
        
        return scaled;
    },
    
    /**
     * Get scaled attack hitbox for player
     * @param {Phaser.GameObjects.Sprite} playerSprite - Player sprite
     * @returns {object} Scaled attack hitbox
     */
    getPlayerAttackHitbox(playerSprite) {
        return this.getScaledHitbox(playerSprite, HITBOX_CONFIG.player);
    },
    
    /**
     * Get scaled attack hitbox for enemy
     * @param {Phaser.GameObjects.Sprite} enemySprite - Enemy sprite
     * @returns {object} Scaled attack hitbox
     */
    getEnemyAttackHitbox(enemySprite) {
        return this.getScaledHitbox(enemySprite, HITBOX_CONFIG.enemy);
    },
    
    /**
     * Get scaled body collision radius
     * @param {Phaser.GameObjects.Sprite} sprite - The sprite
     * @param {string} type - 'player' or 'enemy'
     * @returns {number} Scaled body radius
     */
    getBodyRadius(sprite, type) {
        const scale = sprite.scaleX;
        return HITBOX_CONFIG[type].bodyRadius * scale;
    }
};

// ========================================
// EXPORT CONFIGURATIONS
// ========================================
// Note: In a browser environment, these will be available globally
// In a module system, you would export them instead

// Make configurations available globally for browser environment
if (typeof window !== 'undefined') {
    window.GAME_CONFIG = GAME_CONFIG;
    window.WORLD_CONFIG = WORLD_CONFIG;
    window.HITBOX_CONFIG = HITBOX_CONFIG;
    window.HitboxHelpers = HitboxHelpers;
}
