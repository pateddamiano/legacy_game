// ========================================
// CHARACTER CONFIGURATION SYSTEM
// ========================================
// This file contains all character definitions and the CharacterConfig class

// Character Animation Configuration System
class CharacterConfig {
    constructor(name, spriteSheets, animations, frameSize = {width: 128, height: 96}) {
        this.name = name;
        this.spriteSheets = spriteSheets;
        this.animations = animations;
        this.frameSize = frameSize;
    }
}

// Define Tireek character configuration
const TIREEK_CONFIG = new CharacterConfig(
    'tireek',
    {
        run: 'assets/characters/tireek/spritesheets/Tireek_Run.png',
        jab: 'assets/characters/tireek/spritesheets/Tireek_Jab.png',
        cross: 'assets/characters/tireek/spritesheets/Tireek_Cross.png',
        kick: 'assets/characters/tireek/spritesheets/Tireek_Kick.png',
        jump: 'assets/characters/tireek/spritesheets/Tireek_Jump.png',
        airkick: 'assets/characters/tireek/spritesheets/Tireek_AirKick.png',
        idle: 'assets/characters/tireek/spritesheets/Tireek_Idle.png'
    },
    {
        run: { frames: 8, frameRate: 12, repeat: -1 },
        jab: { frames: 4, frameRate: 20, repeat: 0 },     // Very fast: 24 FPS
        cross: { frames: 4, frameRate: 20, repeat: 0 },   // Very fast: 24 FPS  
        kick: { frames: 5, frameRate: 16, repeat: 0 },    // Fast: 20 FPS
        jump: { frames: 1, frameRate: 12, repeat: 0 },
        airkick: { frames: 1, frameRate: 12, repeat: 0 },
        idle: { frames: 5, frameRate: 12, repeat: -1 }    // Keep idle at normal speed
    }
);

// Define Tryston character configuration
const TRYSTON_CONFIG = new CharacterConfig(
    'tryston',
    {
        run: 'assets/characters/tryston/spritesheets/Tryston_Run.png',
        jab: 'assets/characters/tryston/spritesheets/Tryston_Jab.png',
        cross: 'assets/characters/tryston/spritesheets/Tryston_Cross.png',
        kick: 'assets/characters/tryston/spritesheets/Tryston_Kick.png',
        jump: 'assets/characters/tryston/spritesheets/Tryston_Jump.png',
        airkick: 'assets/characters/tryston/spritesheets/Tryston_AirKick.png',
        idle: 'assets/characters/tryston/spritesheets/Tryston_Idle.png'
    },
    {
        run: { frames: 8, frameRate: 12, repeat: -1 },
        jab: { frames: 4, frameRate: 20, repeat: 0 },     // Very fast: 24 FPS
        cross: { frames: 4, frameRate: 20, repeat: 0 },   // Very fast: 24 FPS  
        kick: { frames: 5, frameRate: 16, repeat: 0 },    // Fast: 20 FPS
        jump: { frames: 1, frameRate: 12, repeat: 0 },
        airkick: { frames: 1, frameRate: 12, repeat: 0 },
        idle: { frames: 5, frameRate: 12, repeat: -1 }    // Keep idle at normal speed
    }
);

// Define Crackhead enemy configuration
const CRACKHEAD_CONFIG = new CharacterConfig(
    'crackhead',
    {
        walk: 'assets/characters/crackhead/spritesheets/crackhead_idle_5Frames.png', // Using idle as walk for now
        jab: 'assets/characters/crackhead/spritesheets/Crackhead_Jab_4frames.png',
        bottle_attack: 'assets/characters/crackhead/spritesheets/Crackhead_Bottle_Attack_5Frames.png',
        idle: 'assets/characters/crackhead/spritesheets/crackhead_idle_5Frames.png'
    },
    {
        walk: { frames: 5, frameRate: 8, repeat: -1 },    // Slow shambling walk
        jab: { frames: 4, frameRate: 16, repeat: 0 },     // Medium speed attack
        bottle_attack: { frames: 5, frameRate: 14, repeat: 0 }, // Special bottle attack
        idle: { frames: 5, frameRate: 6, repeat: -1 }     // Slow idle animation
    }
);

// ========================================
// HITBOX CONFIGURATION CENTER
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

// Array of all available playable characters
const ALL_CHARACTERS = [TIREEK_CONFIG, TRYSTON_CONFIG];