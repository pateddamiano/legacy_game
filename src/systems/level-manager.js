// ========================================
// LEVEL MANAGER
// ========================================
// Handles level loading, progression, and transitions

class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = 0;
        this.levels = LEVEL_CONFIGS;
        this.progressionFlags = new Map();
        this.checkpoints = new Map();
        this.enemiesDefeated = 0;
        this.levelStartTime = 0;
        
        // Initialize progression flags
        this.initializeProgressionFlags();
        
        console.log('🎮 LevelManager initialized!');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    initializeProgressionFlags() {
        // Copy default flags
        Object.entries(LEVEL_FLAGS).forEach(([flag, value]) => {
            this.progressionFlags.set(flag, value);
        });
        
        // Load saved progress if available
        this.loadProgress();
    }
    
    // ========================================
    // LEVEL LOADING AND MANAGEMENT
    // ========================================
    
    loadLevel(levelIndex) {
        if (levelIndex < 0 || levelIndex >= this.levels.length) {
            console.error(`Invalid level index: ${levelIndex}`);
            return false;
        }
        
        const levelConfig = this.levels[levelIndex];
        
        // Check if level is unlocked
        if (!this.isLevelUnlocked(levelIndex)) {
            console.warn(`Level ${levelIndex} is not unlocked yet!`);
            return false;
        }
        
        console.log(`🎮 Loading level ${levelIndex}: ${levelConfig.name}`);
        
        // Update current level
        this.currentLevel = levelIndex;
        this.levelStartTime = this.scene.time.now;
        this.enemiesDefeated = 0;
        
        // Apply level configuration
        this.applyLevelConfiguration(levelConfig);
        
        // Trigger level start dialogue
        this.triggerDialogue('level_start');
        
        // Start level-specific music
        this.startLevelMusic(levelConfig.music);
        
        return true;
    }
    
    applyLevelConfiguration(levelConfig) {
        // Update enemy spawning based on level config
        if (this.scene.enemySpawnInterval !== undefined) {
            this.scene.enemySpawnInterval = levelConfig.enemies.spawnRate;
        }
        
        if (this.scene.maxEnemies !== undefined) {
            this.scene.maxEnemies = levelConfig.enemies.maxEnemies;
        }
        
        // Apply difficulty multipliers to enemies
        this.applyDifficultyMultipliers(levelConfig.enemies);
        
        console.log(`🎮 Applied level configuration: ${levelConfig.name}`);
    }
    
    applyDifficultyMultipliers(enemyConfig) {
        // Store difficulty multipliers for enemy spawning
        this.currentDifficultyMultipliers = {
            health: enemyConfig.healthMultiplier || 1.0,
            damage: enemyConfig.damageMultiplier || 1.0,
            speed: enemyConfig.difficulty || 1.0
        };
    }
    
    // ========================================
    // LEVEL PROGRESSION
    // ========================================
    
    checkLevelConditions() {
        const currentLevelConfig = this.levels[this.currentLevel];
        if (!currentLevelConfig) return;
        
        // Check if ready for next level
        if (this.isReadyForNextLevel(currentLevelConfig)) {
            this.advanceLevel();
        }
        
        // Check if boss should spawn
        if (this.shouldSpawnBoss(currentLevelConfig)) {
            this.triggerBossSpawn(currentLevelConfig);
        }
    }
    
    isReadyForNextLevel(levelConfig) {
        const nextLevelCondition = levelConfig.progression.nextLevel;
        if (!nextLevelCondition) return false;
        
        switch (nextLevelCondition.condition) {
            case 'enemies_defeated_8':
                return this.enemiesDefeated >= 8;
            case 'enemies_defeated_12':
                return this.enemiesDefeated >= 12;
            case 'enemies_defeated_15':
                return this.enemiesDefeated >= 15;
            case 'boss_defeated':
                return this.progressionFlags.get('boss_street_gang_leader_defeated') || false;
            default:
                return false;
        }
    }
    
    shouldSpawnBoss(levelConfig) {
        const bossTrigger = levelConfig.progression.bossTrigger;
        if (!bossTrigger) return false;
        
        switch (bossTrigger.condition) {
            case 'enemies_defeated_8':
                return this.enemiesDefeated >= 8;
            default:
                return false;
        }
    }
    
    advanceLevel() {
        const currentLevelConfig = this.levels[this.currentLevel];
        const nextLevelId = currentLevelConfig.progression.nextLevel.levelId;
        
        console.log(`🎮 Level ${this.currentLevel} complete! Advancing to level ${nextLevelId}`);
        
        // Mark current level as complete
        this.setFlag(`level_${this.currentLevel}_complete`, true);
        
        // Save progress
        this.saveProgress();
        
        // Transition to next level
        this.transitionToLevel(nextLevelId);
    }
    
    transitionToLevel(levelId) {
        // Fade out current level
        this.scene.cameras.main.fadeOut(1000, 0, 0, 0);
        
        // Wait for fade out, then load new level
        this.scene.time.delayedCall(1000, () => {
            this.loadLevel(levelId);
            this.scene.cameras.main.fadeIn(1000, 0, 0, 0);
        });
    }
    
    // ========================================
    // ENEMY TRACKING
    // ========================================
    
    onEnemyDefeated() {
        this.enemiesDefeated++;
        
        // Check for dialogue triggers
        this.checkDialogueTriggers();
        
        // Check level progression
        this.checkLevelConditions();
        
        console.log(`🎮 Enemy defeated! Total: ${this.enemiesDefeated}`);
    }
    
    checkDialogueTriggers() {
        const currentLevelConfig = this.levels[this.currentLevel];
        if (!currentLevelConfig) return;
        
        // Check for enemy kill count triggers
        currentLevelConfig.dialogue.forEach(dialogue => {
            if (dialogue.trigger.startsWith('enemy_killed_')) {
                const requiredKills = parseInt(dialogue.trigger.split('_')[2]);
                if (this.enemiesDefeated === requiredKills) {
                    this.triggerDialogue(dialogue.trigger);
                }
            }
        });
    }
    
    // ========================================
    // BOSS MANAGEMENT
    // ========================================
    
    triggerBossSpawn(levelConfig) {
        if (!levelConfig.boss) return;
        
        console.log(`🎮 Boss spawn triggered: ${levelConfig.boss.type}`);
        
        // Trigger boss spawn dialogue
        this.triggerDialogue('boss_spawn');
        
        // Signal to game scene that boss should spawn
        if (this.scene.onBossSpawnTriggered) {
            this.scene.onBossSpawnTriggered(levelConfig.boss);
        }
    }
    
    onBossDefeated(bossType) {
        console.log(`🎮 Boss defeated: ${bossType}`);
        
        // Set boss defeat flag
        this.setFlag(`boss_${bossType}_defeated`, true);
        
        // Trigger boss defeat dialogue
        this.triggerDialogue('boss_defeated');
        
        // Check if level can now advance
        this.checkLevelConditions();
    }
    
    // ========================================
    // DIALOGUE SYSTEM
    // ========================================
    
    triggerDialogue(triggerType) {
        const currentLevelConfig = this.levels[this.currentLevel];
        if (!currentLevelConfig) return;
        
        // Find dialogue for this trigger
        const dialogue = currentLevelConfig.dialogue.find(d => d.trigger === triggerType);
        if (!dialogue) return;
        
        console.log(`💬 Triggering dialogue: ${dialogue.text}`);
        
        // Signal to game scene that dialogue should be shown
        if (this.scene.onDialogueTriggered) {
            this.scene.onDialogueTriggered(dialogue);
        }
    }
    
    // ========================================
    // PROGRESSION FLAGS
    // ========================================
    
    setFlag(flagName, value) {
        this.progressionFlags.set(flagName, value);
        console.log(`🎮 Set flag ${flagName}: ${value}`);
    }
    
    getFlag(flagName) {
        return this.progressionFlags.get(flagName) || false;
    }
    
    isLevelUnlocked(levelIndex) {
        const levelConfig = this.levels[levelIndex];
        if (!levelConfig) return false;
        
        // First level is always unlocked
        if (levelIndex === 0) return true;
        
        // Check requirements
        return levelConfig.requirements.every(req => this.getFlag(req));
    }
    
    // ========================================
    // CHECKPOINT SYSTEM
    // ========================================
    
    createCheckpoint() {
        const currentLevelConfig = this.levels[this.currentLevel];
        if (!currentLevelConfig.progression.checkpoint) return;
        
        const checkpointData = {
            level: this.currentLevel,
            playerHealth: this.scene.playerCurrentHealth,
            playerPosition: {
                x: this.scene.player.x,
                y: this.scene.player.y
            },
            enemiesDefeated: this.enemiesDefeated,
            timestamp: this.scene.time.now
        };
        
        this.checkpoints.set(this.currentLevel, checkpointData);
        this.saveProgress();
        
        console.log(`🎮 Checkpoint created for level ${this.currentLevel}`);
        
        // Trigger checkpoint dialogue
        this.triggerDialogue('checkpoint_reached');
    }
    
    loadCheckpoint(levelIndex) {
        const checkpoint = this.checkpoints.get(levelIndex);
        if (!checkpoint) return false;
        
        console.log(`🎮 Loading checkpoint for level ${levelIndex}`);
        
        // Restore player state
        this.scene.playerCurrentHealth = checkpoint.playerHealth;
        this.scene.player.x = checkpoint.playerPosition.x;
        this.scene.player.y = checkpoint.playerPosition.y;
        
        // Restore level state
        this.enemiesDefeated = checkpoint.enemiesDefeated;
        
        return true;
    }
    
    // ========================================
    // SAVE/LOAD SYSTEM
    // ========================================
    
    saveProgress() {
        const saveData = {
            currentLevel: this.currentLevel,
            progressionFlags: Object.fromEntries(this.progressionFlags),
            checkpoints: Object.fromEntries(this.checkpoints),
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('legacy_game_progress', JSON.stringify(saveData));
            console.log('🎮 Progress saved successfully');
        } catch (error) {
            console.error('🎮 Failed to save progress:', error);
        }
    }
    
    loadProgress() {
        try {
            const saveData = localStorage.getItem('legacy_game_progress');
            if (saveData) {
                const data = JSON.parse(saveData);
                
                // Restore progression flags
                Object.entries(data.progressionFlags || {}).forEach(([flag, value]) => {
                    this.progressionFlags.set(flag, value);
                });
                
                // Restore checkpoints
                Object.entries(data.checkpoints || {}).forEach(([level, checkpoint]) => {
                    this.checkpoints.set(parseInt(level), checkpoint);
                });
                
                console.log('🎮 Progress loaded successfully');
            }
        } catch (error) {
            console.error('🎮 Failed to load progress:', error);
        }
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    getCurrentLevelConfig() {
        return this.levels[this.currentLevel];
    }
    
    getCurrentDifficultyMultipliers() {
        return this.currentDifficultyMultipliers || {
            health: 1.0,
            damage: 1.0,
            speed: 1.0
        };
    }
    
    startLevelMusic(musicKey) {
        if (this.scene.audioManager && musicKey) {
            this.scene.audioManager.playBackgroundMusic(musicKey);
        }
    }
    
    // ========================================
    // DEBUG METHODS
    // ========================================
    
    debugPrintStatus() {
        console.log('🎮 Level Manager Status:');
        console.log(`  Current Level: ${this.currentLevel}`);
        console.log(`  Level Name: ${this.levels[this.currentLevel]?.name || 'Unknown'}`);
        console.log(`  Enemies Defeated: ${this.enemiesDefeated}`);
        console.log(`  Progression Flags:`, Object.fromEntries(this.progressionFlags));
        console.log(`  Checkpoints:`, Object.fromEntries(this.checkpoints));
    }
}
