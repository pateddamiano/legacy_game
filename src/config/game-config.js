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
const WORLD_CONFIG = {
    width: 3600,
    height: 720,
    streetTopLimit: 520,
    streetBottomLimit: 650,
    spawnOffscreenDistance: 50
};

// ========================================
// HITBOX CONFIGURATION
// ========================================
// 🎯 EASY HITBOX ADJUSTMENT PANEL 🎯
// 
// Modify these values to adjust combat feel and balance.
// All measurements are in pixels.

const HITBOX_CONFIG = {
    // 👤 PLAYER HITBOXES
    player: {
        // Body collision (for character-to-character blocking)
        bodyRadius: 60,                 // collision radius for character separation
        
        // Attack hitboxes (when player attacks enemies)
        attackWidth: 80,               // width of player attack hitbox
        attackHeight: 100,              // height of player attack hitbox
        attackOffsetX: 20,              // how far in front of player the attack reaches (reduced from 120)
        attackOffsetY: -50,             // vertical offset for attack hitbox (raised up)
        verticalTolerance: 60,          // Maximum vertical distance for melee attacks
        
        // Air kick hitboxes (when player does air attacks)
        airkickWidth: 60,              // width of air kick hitbox
        airkickHeight: 80,              // height of air kick hitbox
        airkickOffsetX: 50,             // how far in front of player the air kick reaches (reduced from 100)
        airkickOffsetY: -15,            // vertical offset for air kick hitbox (raised up)
        airkickVerticalTolerance: 80,   // Slightly more tolerance for air kicks
    },
    
    // 👹 ENEMY HITBOXES  
    enemy: {
        // Body collision (for character-to-character blocking)
        bodyRadius: 60,                 // collision radius for character separation
        playerCollisionRadius: 60,      // collision radius with player specifically
        enemyCollisionRadius: 50,       // collision radius between enemies
        
        // Attack hitboxes (when enemies attack player)
        attackWidth: 90,               // width of enemy attack hitbox
        attackHeight: 100,              // height of enemy attack hitbox
        attackOffsetX: 20,              // how far in front of enemy the attack reaches (reduced from 120)
        attackOffsetY: -50,             // vertical offset for attack hitbox (raised up)
        
    },
    
    // 🎨 VISUAL DEBUG SETTINGS
    debug: {
        bodyCollisionAlpha: 0.4,        // transparency of collision radius circles
        attackHitboxLineWidth: 3,       // thickness of attack hitbox lines
        bodyLineWidth: 2,               // thickness of body hitbox lines
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
}
