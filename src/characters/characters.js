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

// Define Green Thug enemy configuration
const GREEN_THUG_CONFIG = new CharacterConfig(
    'green_thug',
    {
        walk: 'assets/characters/thug/spritesheets/green_thug_idle_4frames.png', // Using idle as walk
        knife_hit: 'assets/characters/thug/spritesheets/green_thug_knife_hit_4frames.png',
        idle: 'assets/characters/thug/spritesheets/green_thug_idle_4frames.png'
    },
    {
        walk: { frames: 4, frameRate: 10, repeat: -1 },   // Medium speed walk (using idle animation)
        knife_hit: { frames: 4, frameRate: 18, repeat: 0 }, // Fast knife attack
        idle: { frames: 4, frameRate: 8, repeat: -1 }      // Medium idle animation
    }
);

// Define Black Thug enemy configuration
const BLACK_THUG_CONFIG = new CharacterConfig(
    'black_thug',
    {
        walk: 'assets/characters/thug/spritesheets/black_thug_idle_5frames.png', // Using idle as walk
        enemy_punch: 'assets/characters/thug/spritesheets/black_thug_enemy_punch_4frames.png',
        idle: 'assets/characters/thug/spritesheets/black_thug_idle_5frames.png'
    },
    {
        walk: { frames: 5, frameRate: 12, repeat: -1 },   // Fast walk (using idle animation)
        enemy_punch: { frames: 4, frameRate: 16, repeat: 0 }, // Medium speed punch
        idle: { frames: 5, frameRate: 10, repeat: -1 }    // Fast idle animation
    }
);

// Array of all available playable characters
const ALL_CHARACTERS = [TIREEK_CONFIG, TRYSTON_CONFIG];

// Array of all available enemy types
const ALL_ENEMY_TYPES = [CRACKHEAD_CONFIG, GREEN_THUG_CONFIG, BLACK_THUG_CONFIG];

// Export configurations for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TIREEK_CONFIG,
        TRYSTON_CONFIG,
        CRACKHEAD_CONFIG,
        GREEN_THUG_CONFIG,
        BLACK_THUG_CONFIG,
        ALL_CHARACTERS,
        ALL_ENEMY_TYPES,
    };
}

// Make constants available globally for browser environment
if (typeof window !== 'undefined') {
    window.ALL_CHARACTERS = ALL_CHARACTERS;
    window.ALL_ENEMY_TYPES = ALL_ENEMY_TYPES;
    window.TIREEK_CONFIG = TIREEK_CONFIG;
    window.TRYSTON_CONFIG = TRYSTON_CONFIG;
    window.CRACKHEAD_CONFIG = CRACKHEAD_CONFIG;
    window.GREEN_THUG_CONFIG = GREEN_THUG_CONFIG;
    window.BLACK_THUG_CONFIG = BLACK_THUG_CONFIG;
}