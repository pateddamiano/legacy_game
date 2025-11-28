// ========================================
// LEVEL CONFIGURATION
// ========================================
// ⚠️  MOST OF THIS FILE IS DEPRECATED ⚠️
//
// All level configurations have been moved to JSON files in /src/config/levels/
// This file is kept only for backwards compatibility.
// 
// The game now exclusively uses the JSON-based level system:
// - Level definitions: src/config/levels/*.json
// - Level registry: src/systems/level/LevelRegistry.js
// - Level loading: src/systems/level-initialization-manager.js
//
// DO NOT ADD NEW LEVELS OR EVENTS TO THIS FILE!
// Use the JSON files instead.

// Empty array for backwards compatibility (not used)
window.LEVEL_CONFIGS = [];

// ========================================
// LEVEL PROGRESSION FLAGS
// ========================================
// NOTE: LEVEL_FLAGS is still used by level-manager.js for progression tracking
// This is the only part of this file that is still actively used
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
