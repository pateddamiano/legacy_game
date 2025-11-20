// ========================================
// CHARACTER CONFIGURATION SYSTEM
// ========================================
// This file contains all character definitions and the CharacterConfig class

// Character Animation Configuration System
class CharacterConfig {
    constructor(name, spriteSheets, animations, frameSize = {width: 128, height: 96}, baseScale = 1.0, perspectiveScales = {minScale: 3.0, maxScale: 4.0}) {
        this.name = name;
        this.spriteSheets = spriteSheets;
        this.animations = animations;
        this.frameSize = frameSize;
        this.baseScale = baseScale; // Base size multiplier for perspective scaling
        this.perspectiveScales = perspectiveScales; // Min and max scale for perspective effect
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
    },
    {width: 128, height: 96},
    0.87,  // Base scale multiplier (1.0 = normal size, can be adjusted per character)
    {minScale: 3.3396, maxScale: 4.2504}  // Perspective scaling range (Tireek: 2.783 * 1.2 to 3.542 * 1.2)
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
    },
    {width: 128, height: 96},
    0.85,  // Base scale multiplier (1.0 = normal size, can be adjusted per character)
    {minScale: 3.3396, maxScale: 4.2504}  // Perspective scaling range (Tryston: 2.662 * 1.2 to 3.388 * 1.2)
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

// Define Critic enemy configuration
const CRITIC_CONFIG = new CharacterConfig(
    'critic',
    {
        walk: 'assets/characters/critic/spritesheets/critic_idle_4frames.png', // Using idle as walk
        enemy_punch: 'assets/characters/critic/spritesheets/critic_punch_3frames.png',
        idle: 'assets/characters/critic/spritesheets/critic_idle_4frames.png'
    },
    {
        walk: { frames: 4, frameRate: 10, repeat: -1 },   // Medium speed walk (using idle animation)
        enemy_punch: { frames: 3, frameRate: 16, repeat: 0 }, // Medium speed punch
        idle: { frames: 4, frameRate: 8, repeat: -1 }      // Medium idle animation
    }
);

// Array of all available playable characters
const ALL_CHARACTERS = [TIREEK_CONFIG, TRYSTON_CONFIG];

// Array of all available enemy types
const ALL_ENEMY_TYPES = [CRACKHEAD_CONFIG, GREEN_THUG_CONFIG, BLACK_THUG_CONFIG, CRITIC_CONFIG];

// ========================================
// EXTRAS REGISTRY (STATIC, NON-ANIMATED CHARACTERS)
// ========================================
// These are simple image-based characters used for story beats and events
const EXTRAS_REGISTRY = {
    rozotadi: {
        key: 'extra_rozotadi',
        path: 'assets/characters/extras/Rozotadi.png',
        scale: 3.0,  // Legacy static scale (used if perspective scaling disabled)
        baseScale: 0.8,  // Base size multiplier for perspective scaling
        perspectiveScales: {minScale: 3.0, maxScale: 4.0}  // Perspective scaling range
    },
    misfit: {
        key: 'extra_misfit',
        path: 'assets/characters/extras/Misfit.png',
        scale: 3.00,  // Legacy static scale (used if perspective scaling disabled)
        baseScale: 0.7,  // Base size multiplier for perspective scaling
        perspectiveScales: {minScale: 3.0, maxScale: 4.0}  // Perspective scaling range
    },
    subwaycar: {
        key: 'subwaycar',
        path: 'assets/level_2_pieces/subwaycar.png',
        scale: 0.5,  // Legacy static scale (used if perspective scaling disabled)
        baseScale: 1.0,  // Base size multiplier for perspective scaling
        perspectiveScales: {minScale: 0.4, maxScale: 0.6}  // Perspective scaling range (smaller for background elements)
    }
};

// Export configurations for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TIREEK_CONFIG,
        TRYSTON_CONFIG,
        CRACKHEAD_CONFIG,
        GREEN_THUG_CONFIG,
        BLACK_THUG_CONFIG,
        CRITIC_CONFIG,
        ALL_CHARACTERS,
        ALL_ENEMY_TYPES,
        EXTRAS_REGISTRY,
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
    window.CRITIC_CONFIG = CRITIC_CONFIG;
    window.EXTRAS_REGISTRY = EXTRAS_REGISTRY;
}