// ========================================
// LEVEL CONFIGURATION
// ========================================
// Defines all levels, their requirements, enemies, and progression

const LEVEL_CONFIGS = [
    // ========================================
    // LEVEL 1: THE STREETS
    // ========================================
    {
        id: 1,
        name: "The Streets",
        description: "Welcome to the concrete jungle",
        background: 'level_1_segments',
        music: 'street_ambient',
        requirements: [], // First level, no requirements
        
        // Pre-level dialogue (shown before level starts)
        preDialogue: [],
        
        // Post-level dialogue (shown after level complete)
        postDialogue: [],
        
        // Enemy configuration
        enemies: {
            spawnRate: 1200,        // Normal spawning
            maxEnemies: 4,          // More enemies
            types: ['crackhead', 'green_thug'], // Mix of enemies
            difficulty: 1.0,        // Normal difficulty
            healthMultiplier: 1.0,  // Normal health
            damageMultiplier: 1.0   // Normal damage
        },
        
        // Level progression - DISABLED (no automatic progression)
        progression: null,
        
        // Mid-level dialogue (triggered during gameplay)
        dialogue: [],
        
        // Dynamic scene elements
        sceneElements: [
            // Example: Add a moving car in the background
            // {
            //     type: 'decoration',
            //     sprite: 'car',
            //     x: -500,
            //     y: 500,
            //     depth: -150,
            //     scrollFactor: 0.8
            // }
        ],
        
        // Boss configuration (none for Level 1)
        boss: null,
        
        // Rewards
        rewards: {
            experience: 100,
            items: ['health_potion'],
            unlockables: ['advanced_combat_moves']
        }
    },
    
    // ========================================
    // LEVEL 2: FIRST CHECKPOINT
    // ========================================
    {
        id: 2,
        name: "Street Showdown",
        description: "Prove your worth on the streets",
        background: 'street_level_3',
        music: 'street_dramatic',
        requirements: ['level_1_complete'],
        
        // Enemy configuration
        enemies: {
            spawnRate: 1000,        // Faster spawning
            maxEnemies: 5,          // Maximum enemies
            types: ['crackhead', 'green_thug', 'black_thug'], // All enemy types
            difficulty: 1.2,        // Slightly harder
            healthMultiplier: 1.1,  // Enemies have more health
            damageMultiplier: 1.1   // Enemies deal more damage
        },
        
        // Level progression - DISABLED (no automatic progression)
        progression: null,
        
        // Dialogue and story
        dialogue: [
            {
                trigger: 'level_start',
                text: "This is your first real test. Survive and you'll unlock a checkpoint.",
                speaker: 'narrator',
                duration: 3500
            },
            {
                trigger: 'checkpoint_reached',
                text: "Checkpoint unlocked! Your progress is now saved.",
                speaker: 'narrator',
                duration: 3000
            }
        ],
        
        // Rewards
        rewards: {
            experience: 150,
            items: ['health_potion', 'golden_microphone'],
            unlockables: ['checkpoint_system', 'new_character_tryston']
        }
    },
    
    // ========================================
    // LEVEL 3: FIRST BOSS FIGHT
    // ========================================
    {
        id: 3,
        name: "Boss Battle: Street Gang Leader",
        description: "Face the leader of the street gang",
        background: 'boss_arena_1',
        music: 'boss_battle',
        requirements: ['level_2_complete'],
        
        // Enemy configuration (minions before boss)
        enemies: {
            spawnRate: 800,         // Fast spawning for boss level
            maxEnemies: 3,          // Fewer minions during boss fight
            types: ['green_thug', 'black_thug'], // Stronger minions
            difficulty: 1.3,        // Harder minions
            healthMultiplier: 1.2,  // Minions have more health
            damageMultiplier: 1.2   // Minions deal more damage
        },
        
        // Boss configuration
        boss: {
            type: 'street_gang_leader',
            health: 300,
            phases: 3,
            spawnCondition: 'enemies_defeated_8', // Boss spawns after 8 minions
            rewards: {
                experience: 500,
                items: ['boss_weapon', 'health_potion'],
                unlockables: ['new_area_unlocked', 'boss_defeated_achievement']
            }
        },
        
        // Level progression
        // Level progression - DISABLED (no automatic progression)
        progression: null,
        
        // Dialogue and story
        dialogue: [
            {
                trigger: 'level_start',
                text: "The street gang leader has been terrorizing this area. Time to put a stop to it!",
                speaker: 'narrator',
                duration: 4000
            },
            {
                trigger: 'boss_spawn',
                text: "Here comes the boss! Get ready for a real fight!",
                speaker: 'narrator',
                duration: 3000
            },
            {
                trigger: 'boss_defeated',
                text: "Incredible! You've defeated the gang leader and cleared the streets!",
                speaker: 'narrator',
                duration: 4000
            }
        ],
        
        // Rewards
        rewards: {
            experience: 500,
            items: ['boss_weapon', 'health_potion'],
            unlockables: ['new_area_unlocked', 'boss_defeated_achievement']
        }
    }
];

// ========================================
// LEVEL PROGRESSION FLAGS
// ========================================
const LEVEL_FLAGS = {
    // Completion flags
    'level_0_complete': false,
    'level_1_complete': false,
    'level_2_complete': false,
    'level_3_complete': false,
    
    // Boss flags
    'boss_street_gang_leader_defeated': false,
    
    // Achievement flags
    'first_enemy_killed': false,
    'first_level_completed': false,
    'first_boss_defeated': false,
    
    // Unlock flags
    'character_tryston_unlocked': false,
    'checkpoint_system_unlocked': false,
    'new_area_unlocked': false
};

// ========================================
// LEVEL TRANSITION CONFIGURATIONS
// ========================================
const LEVEL_TRANSITIONS = {
    // Transition effects between levels
    fadeOut: {
        duration: 1000,
        color: 0x000000
    },
    fadeIn: {
        duration: 1000,
        color: 0x000000
    },
    
    // Loading screen configuration
    loadingScreen: {
        showProgress: true,
        minDisplayTime: 2000,
        background: 'loading_background'
    }
};
