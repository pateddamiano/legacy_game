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

    // Input modifiers
    input: {
        touchMovementMultiplier: 1.25, // Make analog stick feel snappier without changing keyboard
        touchDeadZone: 0.04            // Ignore very slight ghost inputs near center
    },

    // 🎮 GAME FEEL ("juice") - applied by EffectSystem
    juice: {
        // ms the world freezes when a hit lands (physics + animations), by hit kind
        hitStop: { hit: 60, bossHit: 90, kill: 140 },
        // Camera shake, boss fights only: player lands a hit / player gets hit / boss goes down
        bossShake: {
            hit:    { duration: 80,  intensity: 0.004 },
            hurt:   { duration: 160, intensity: 0.008 },
            defeat: { duration: 500, intensity: 0.015 }
        },
        // Regular enemies on the killing blow: shoved back from the hit and squashed
        enemyDeath: {
            knockback: 520,          // px/s away from whatever hit them
            knockbackDuration: 220,  // ms before they stop sliding
            stretchX: 1.25,          // scale multipliers at the peak of the squash...
            squashY: 0.75,
            squashDuration: 90       // ...reached in this many ms, then back (yoyo)
        },
        // Screen-edge vignette that closes in as health drops (WebGL only)
        lowHealthVignette: {
            startBelow: 0.5,     // health fraction where it starts to appear
            maxStrength: 0.7,    // darkness at 0 health
            minRadius: 0.55,     // how far in it reaches at 0 health (1 = edges only)
            pulseBelow: 0.25,    // health fraction under which it pulses
            pulseStrength: 0.15,
            pulsePeriod: 900     // ms per pulse
        }
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
        debugMode: false,
        fontFamily: 'VT323', // Centralized font for all game text
        // Centralized font sizes - adjust these to scale all text globally
        fontSize: {
            title: '60px',        // Main titles (e.g., "SELECT YOUR FIGHTER!")
            subtitle: '55px',     // Large subtitles
            golden_microphone_count: '50px',      // Section headings, score display
            heading: '40px',      // Section headings, score display
            button: '48px',       // Menu buttons
            buttonHover: '52px',  // Button hover state (slightly larger)
            body: '40px',         // Main body text, labels, score display
            label: '32px',        // Dialogue, labels
            small: '28px',        // Small text, volume controls
            tiny: '24px',         // Tiny labels, debug text
            micro: '22px',        // Character names, health bars, debug text
            mini: '20px'          // Very small debug text
        }
    }
};

// ========================================
// WORLD BOUNDS
// ========================================
// 🎯 LEVEL-SPECIFIC BOUNDS NOW USED FROM JSON FILES 🎯
// This is kept for backwards compatibility but levels now define their own bounds
const WORLD_CONFIG = {
    width: 100000,  // Very large default - levels now use their own bounds from JSON
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
