// ========================================
// LEVEL CONFIGURATION
// ========================================
// Defines all levels, their requirements, enemies, and progression

// Level configurations moved to JSON files in /src/config/levels/
// This keeps the system modular and editable by non-programmers

// Minimal fallback for when JSON system fails
window.LEVEL_CONFIGS = []; // Empty array - JSON system should handle all levels

// ========================================
// TEST LEVEL CONFIGURATION
// ========================================
// Debugging and testing environment
window.TEST_LEVEL_CONFIG = {
    id: 'test',
    name: "Test Level",
    description: "Debugging and testing environment",
    background: 'level_1_segments',
    music: null, // No music in test mode
    requirements: [],
    
    // Pre-level dialogue (disabled in test mode)
    preDialogue: [],
    
    // Post-level dialogue (disabled in test mode)
    postDialogue: [],
    
    // Enemy configuration - DISABLED in test mode
    enemies: {
        spawnRate: 999999,        // Effectively disable spawning
        maxEnemies: 0,             // No enemies
        types: [],                 // No enemy types
        difficulty: 1.0,
        healthMultiplier: 1.0,
        damageMultiplier: 1.0
    },
    
    // Level progression - DISABLED
    progression: null,
    
    // Mid-level dialogue (disabled in test mode)
    dialogue: [],
    
    // Scripted events (same as Level 1 for testing)
    events: [
        {
            id: 'level_1_intro',
            trigger: {
                type: 'position',
                value: 185,
                tolerance: 40,
                once: true
            },
            actions: [
                { type: 'pause', targets: ['player'] },
                { type: 'camera', stopFollow: true },
                { type: 'spawnExtra', name: 'rozotadi', position: { x: 542, y: 513 }, id: 'extra_rozotadi', matchPlayer: true, multiplier: 1.0 },
                { type: 'flip', target: 'extra_rozotadi', flipX: true },
                { type: 'dialogue', dialogue: { speaker: 'Rozotadi', text: "Yo! I saw the guy that had  your album run towards the subway.. ", dimBackground: false } },
                { type: 'dialogue', dialogue: { speaker: 'Rozotadi', text: "I'm pretty sure it was *The Critic*...", dimBackground: false } },
                { type: 'dialogue', dialogue: { speaker: 'Rozotadi', text: 'Go get that drive back!', dimBackground: false } },
                { type: 'destroyExtra', target: 'extra_rozotadi' },
                { type: 'camera', follow: 'player' },
                { type: 'resume', targets: ['player'] }
            ]
        },
        {
            id: 'level_1_end',
            trigger: {
                type: 'position',
                value: 8081,
                tolerance: 50,
                once: true
            },
            actions: [
                // Pause player so they don't move during camera pan
                { type: 'pause', targets: ['player'] },
                
                // Stop camera follow
                { type: 'camera', stopFollow: true },
                
                // Set camera max bounds to prevent scrolling past x=7845 (right edge = 9045)
                // Camera width is 1200, so bounds width should be 9045 to limit scrollX to 7845
                // Formula: max scrollX = bounds.x + bounds.width - camera.width
                // 7845 = 0 + 9045 - 1200 ✓
                { type: 'camera', setBounds: { x: 0, y: 0, width: 9045, height: 720 } },
                
                // Prevent new spawns during camera pan/cleanup
                { type: 'stopEnemySpawning', clearEnemies: false },
                
                // Clear enemies to the right before camera pan (to prevent overlap with critic)
                // Clear enemies to the right of x=8600 (just before critic spawns at x=8655)
                { type: 'clearEnemiesOffscreen', xThreshold: 8600, direction: 'right', excludeIds: ['enemy_critic'] },
                
                // Spawn critic early (during camera pan)
                { type: 'spawnEnemy', enemyType: 'critic', position: {x: 8655, y: 518}, id: 'enemy_critic' },
                
                // Pan camera to final position (x=7845, right=9045)
                { type: 'camera', pan: {x: 7845}, duration: 2000, ease: 'Power2' },
                
                // Wait for camera to finish panning
                { type: 'wait', duration: 500 },
                
                // Ensure right side is clear after pan (avoid overlap with critic)
                { type: 'clearEnemiesOffscreen', xThreshold: 8600, direction: 'right', excludeIds: ['enemy_critic'] },
                
                // Flip critic to face left (toward player) before dialogue
                { type: 'flip', target: 'enemy_critic', flipX: true },
                
                // Show dialogue
                { type: 'dialogue', dialogue: { speaker: 'Critic', text: 'Not bad... but you\'ve got a long way to go if you want to make it in this city.' } },
                
                // Wait for dialogue to complete
                { type: 'wait', duration: 500 },
                
                // Flip critic back to face right before moving
                { type: 'flip', target: 'enemy_critic', flipX: false },
                
                // Move critic from x=8655, y=518 to x=8711, y=410
                { type: 'move', target: 'enemy_critic', to: {x: 8711, y: 410}, duration: 1500, ease: 'Power2' },
                
                // Wait for critic to finish moving
                { type: 'wait', duration: 500 },
                
                // Destroy critic BEFORE fight starts
                { type: 'destroyEnemy', target: 'enemy_critic' },
                
                // Show dialogue before fight starts
                { type: 'dialogue', dialogue: { speaker: 'Narrator', text: 'Survive the fight to go after The Critic!' } },
                
                // Wait for dialogue to complete
                { type: 'wait', duration: 500 },
                
                // Resume player
                { type: 'resume', targets: ['player'] },
                
                // Lock camera in place (already stopped following, but ensure it stays locked)
                { type: 'camera', stopFollow: true },
                
                // Set player bounds to active screen area (camera is at x=7845, right=9045)
                // Allow some margin: x=7850 to x=9040, y stays within street bounds
                { type: 'setPlayerBounds', bounds: { minX: 7850, maxX: 9040, minY: 410, maxY: 650 } },
                
                // Start enemy spawning for 30 seconds - HEAVILY INCREASED SPAWN RATE
                { type: 'startEnemySpawning', config: { maxEnemies: 6, spawnInterval: 600 } },
                
                // Wait 30 seconds (30000ms) for fight
                { type: 'wait', duration: 30000 },
                
                // Stop enemy spawning and clear remaining enemies
                { type: 'stopEnemySpawning', clearEnemies: true },
                
                // Show dialogue
                { type: 'dialogue', dialogue: { speaker: 'Narrator', text: 'Enter the subway to chase The Critic!' } },
                
                // Wait for player to enter zone (x: 8550-8753, y: 380-440 for tolerance)
                { type: 'waitForZone', zone: { x1: 8550, x2: 8753, y1: 380, y2: 440 } },
                
                // Fade out before level transition
                { type: 'fade', direction: 'out', duration: 1000, color: { r: 0, g: 0, b: 0 } },
                
                // Load next level (placeholder - level 2)
                { type: 'loadLevel', levelId: 2 }
            ]
        }
    ],
        
        // Dynamic scene elements (empty in test mode)
        sceneElements: [],
        
        // Boss configuration (none)
        boss: null,
        
        // Rewards (none in test mode)
        rewards: {
            experience: 0,
            items: [],
            unlockables: []
        },
        
        // Test mode flag
        testMode: true
};

// ========================================
// LEVEL PROGRESSION FLAGS
// ========================================
window.LEVEL_FLAGS = {
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
