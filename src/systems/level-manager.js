// ========================================
// LEVEL MANAGER
// ========================================
// Handles level loading, progression, and transitions

class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = 0;
        this.levels = window.LEVEL_CONFIGS;
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
        Object.entries(window.LEVEL_FLAGS).forEach(([flag, value]) => {
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
        console.log(`🎮 loadLevel: index=${levelIndex}, id=${levelConfig.id}, name=${levelConfig.name}`);
        console.log(`🎮 loadLevel: background='${levelConfig.background}', music='${levelConfig.music}'`);
        if (Array.isArray(levelConfig.events)) {
            console.log(`🎮 loadLevel: events configured: ${levelConfig.events.length}`);
        } else {
            console.log('🎮 loadLevel: no events configured');
        }
        
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
        
        // Load world for this level
        this.loadLevelWorld(levelConfig);
        
        // Apply level configuration
        this.applyLevelConfiguration(levelConfig);
        
        // Trigger level start dialogue
        this.triggerDialogue('level_start');
        
        // Start level-specific music
        this.startLevelMusic(levelConfig.music);
        
        return true;
    }
    
    loadLevelWorld(levelConfig) {
        console.log(`🌍 Loading world for level: ${levelConfig.name}`);
        
        // Get world manager from scene
        const worldManager = this.scene.worldManager;
        if (!worldManager) {
            console.error('🌍 World manager not found in scene!');
            return;
        }
        
        // Create world configuration based on level config
        const worldId = `level_${levelConfig.id}`;
        
        // Check if world is already loaded
        if (worldManager.isWorldLoaded(worldId)) {
            console.log(`🌍 World ${worldId} already loaded, switching to it`);
            worldManager.switchWorld(worldId);
            return;
        }
        
        // Load world assets if needed
        if (levelConfig.background && levelConfig.background.includes('segments')) {
            // Load segmented background world
            this.loadSegmentedWorld(worldId, levelConfig);
        } else {
            // Load simple background world
            this.loadSimpleWorld(worldId, levelConfig);
        }
    }
    
    loadSegmentedWorld(worldId, levelConfig) {
        console.log(`🌍 Loading segmented world: ${worldId}`);
        
        const worldManager = this.scene.worldManager;
        const metadataPath = `assets/backgrounds/${levelConfig.background}/metadata.json`;
        const metadataKey = `${worldId}_metadata`;
        
        // If metadata already in cache (preloaded in AudioBootScene), use it immediately
        if (this.scene.cache && this.scene.cache.json && this.scene.cache.json.exists(metadataKey)) {
            const data = this.scene.cache.json.get(metadataKey);
            console.log(`🌍 Using cached metadata for ${worldId}:`, data);

            const worldConfig = {
                segments: data.segments,
                metadataPath: metadataPath,
                spawnPoint: levelConfig.spawnPoint || {
                    x: data.segments[0].x_position + 100,
                    y: 600
                },
                bounds: {
                    x: data.segments[0].x_position,
                    y: 0,
                    width: data.segments[data.segments.length - 1].x_position +
                          data.segments[data.segments.length - 1].width -
                          data.segments[0].x_position,
                    height: 720
                }
            };
            
            worldManager.registerWorld(worldId, worldConfig);
            worldManager.createWorld(worldId);
            console.log(`🌍 Segmented world ${worldId} created successfully (from cache)`);
            return;
        }
        
        // Otherwise, request metadata and start the loader if needed
        this.scene.load.json(metadataKey, metadataPath);
        this.scene.load.once('filecomplete-json-' + metadataKey, (key, type, data) => {
            console.log(`🌍 Metadata loaded for ${worldId}:`, data);
            const worldConfig = {
                segments: data.segments,
                metadataPath: metadataPath,
                spawnPoint: levelConfig.spawnPoint || {
                    x: data.segments[0].x_position + 100,
                    y: 600
                },
                bounds: {
                    x: data.segments[0].x_position,
                    y: 0,
                    width: data.segments[data.segments.length - 1].x_position +
                          data.segments[data.segments.length - 1].width -
                          data.segments[0].x_position,
                    height: 720
                }
            };
            worldManager.registerWorld(worldId, worldConfig);
            worldManager.createWorld(worldId);
            console.log(`🌍 Segmented world ${worldId} created successfully`);
        });
        if (!this.scene.load.isLoading()) {
            this.scene.load.start();
        }
    }
    
    loadSimpleWorld(worldId, levelConfig) {
        console.log(`🌍 Loading simple world: ${worldId}`);
        
        const worldManager = this.scene.worldManager;
        
        // Create simple world configuration
        const worldConfig = {
            bounds: {
                x: 0,
                y: 0,
                width: 3600, // Default width
                height: 720
            },
            spawnPoint: levelConfig.spawnPoint || {
                x: 200,
                y: 600
            },
            assets: levelConfig.background ? [{
                type: 'image',
                key: levelConfig.background,
                path: `assets/backgrounds/${levelConfig.background}.png`
            }] : []
        };
        
        // Register and create the world
        worldManager.registerWorld(worldId, worldConfig);
        worldManager.createWorld(worldId);
        
        console.log(`🌍 Simple world ${worldId} created successfully`);
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
        // OLD TUTORIAL CODE DISABLED
        // No automatic level progression or boss spawning
        // This prevents the game from changing levels after killing enemies
        return;
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
        console.log(`🎮 Transitioning to level ${levelId}...`);
        
        const fromLevel = this.currentLevel;
        const toLevelConfig = this.levels.find(l => l.id === levelId);
        
        if (!toLevelConfig) {
            console.error(`🎮 Level ${levelId} not found!`);
            return;
        }
        
        // Update game state
        if (this.scene.gameStateManager) {
            this.scene.gameStateManager.startTransition(fromLevel, levelId);
        }
        
        // Phase 1: Show post-level dialogue (if any)
        const currentLevelConfig = this.levels[this.currentLevel];
        if (currentLevelConfig && currentLevelConfig.postDialogue) {
            console.log('🎮 Showing post-level dialogue...');
            this.showPostDialogue(currentLevelConfig, () => {
                this.continueTransition(levelId, toLevelConfig);
            });
        } else {
            this.continueTransition(levelId, toLevelConfig);
        }
    }
    
    continueTransition(levelId, toLevelConfig) {
        // Phase 2: Award rewards
        const currentLevelConfig = this.levels[this.currentLevel];
        if (currentLevelConfig && currentLevelConfig.rewards) {
            this.awardRewards(currentLevelConfig.rewards);
        }
        
        // Phase 3: Fade out
        if (this.scene.gameStateManager) {
            this.scene.gameStateManager.setTransitionPhase('fadeOut');
        }
        
        this.scene.cameras.main.fadeOut(1000, 0, 0, 0);
        
        // Phase 4: Cleanup and load
        this.scene.time.delayedCall(1000, () => {
            this.cleanupLevel();
            this.loadNewLevel(levelId, toLevelConfig);
        });
    }
    
    cleanupLevel() {
        console.log('🎮 Cleaning up current level...');
        
        if (this.scene.gameStateManager) {
            this.scene.gameStateManager.setTransitionPhase('cleanup');
        }
        
        // Call scene cleanup
        if (this.scene.onLevelCleanup) {
            this.scene.onLevelCleanup();
        }
        
        // Destroy all enemies
        if (this.scene.destroyAllEnemies) {
            this.scene.destroyAllEnemies();
        }
        
        // Clear projectiles
        if (this.scene.weaponManager) {
            this.scene.weaponManager.clearAllProjectiles();
        }
        
        // Hide current world
        if (this.scene.worldManager) {
            const currentWorldId = `level_${this.levels[this.currentLevel].id}`;
            this.scene.worldManager.hideWorld(currentWorldId);
        }
        
        // Clear scene elements
        if (this.scene.sceneElementManager) {
            this.scene.sceneElementManager.clearAll();
        }
    }
    
    loadNewLevel(levelId, levelConfig) {
        console.log('🎮 Loading new level...');
        
        if (this.scene.gameStateManager) {
            this.scene.gameStateManager.setTransitionPhase('load');
        }
        
        // Find level index
        const levelIndex = this.levels.findIndex(l => l.id === levelId);
        
        // Load world for new level
        this.loadLevelWorld(levelConfig);
        
        // Wait a bit for world to initialize
        this.scene.time.delayedCall(500, () => {
            // Update current level
            this.currentLevel = levelIndex;
            this.levelStartTime = this.scene.time.now;
            this.enemiesDefeated = 0;
            
            // Apply level configuration
            this.applyLevelConfiguration(levelConfig);
            
            // Reset player position
            if (this.scene.resetPlayerState) {
                this.scene.resetPlayerState();
            }
            
            // Show pre-level dialogue
            if (levelConfig.preDialogue) {
                this.showPreDialogue(levelConfig, () => {
                    this.completeTransition(levelConfig);
                });
            } else {
                this.completeTransition(levelConfig);
            }
        });
    }
    
    completeTransition(levelConfig) {
        console.log('🎮 Completing transition...');
        
        // Phase 5: Fade in
        if (this.scene.gameStateManager) {
            this.scene.gameStateManager.setTransitionPhase('fadeIn');
        }
        
        this.scene.cameras.main.fadeIn(1000, 0, 0, 0);
        
        // Phase 6: Start gameplay
        this.scene.time.delayedCall(1000, () => {
            // Trigger level start dialogue
            this.triggerDialogue('level_start');
            
            // Start level-specific music
            this.startLevelMusic(levelConfig.music);
            
            // Create scene elements
            if (levelConfig.sceneElements && this.scene.sceneElementManager) {
                this.scene.sceneElementManager.createElementsFromConfig(levelConfig.sceneElements);
            }
            
            // Register events from level config
            if (levelConfig.events && this.scene.eventManager) {
                this.scene.eventManager.registerEvents(levelConfig.events);
            }
            
            // End transition state
            if (this.scene.gameStateManager) {
                this.scene.gameStateManager.endTransition();
                this.scene.gameStateManager.setCurrentLevel(levelConfig.id, levelConfig);
            }
            
            console.log('🎮 Transition complete!');
        });
    }
    
    // ========================================
    // ENEMY TRACKING
    // ========================================
    
    onEnemyDefeated() {
        this.enemiesDefeated++;
        console.log(`🎮 Enemy defeated! Total: ${this.enemiesDefeated}`);
        
        // OLD TUTORIAL CODE DISABLED - No automatic level progression
        // Players stay on current level and fight continuously
        // Level changes must be triggered manually or through other game events
    }
    
    checkDialogueTriggers() {
        // OLD TUTORIAL CODE DISABLED
        // No automatic dialogue based on enemy kill counts
        return;
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
        
        // Use dialogue manager if available
        if (this.scene.dialogueManager) {
            this.scene.dialogueManager.showDialogue(dialogue);
        } else if (this.scene.onDialogueTriggered) {
            // Fallback to legacy method
            this.scene.onDialogueTriggered(dialogue);
        }
    }
    
    showPreDialogue(levelConfig, callback) {
        if (!levelConfig.preDialogue || levelConfig.preDialogue.length === 0) {
            if (callback) callback();
            return;
        }
        
        console.log('💬 Showing pre-level dialogue...');
        
        if (this.scene.dialogueManager) {
            // Queue all pre-dialogue
            levelConfig.preDialogue.forEach((dialogue, index) => {
                if (index === levelConfig.preDialogue.length - 1) {
                    // Last dialogue should call callback
                    this.scene.dialogueManager.showDialogue(dialogue, callback);
                } else {
                    this.scene.dialogueManager.queueDialogue(dialogue);
                }
            });
        } else if (callback) {
            callback();
        }
    }
    
    showPostDialogue(levelConfig, callback) {
        if (!levelConfig.postDialogue || levelConfig.postDialogue.length === 0) {
            if (callback) callback();
            return;
        }
        
        console.log('💬 Showing post-level dialogue...');
        
        if (this.scene.dialogueManager) {
            // Queue all post-dialogue
            levelConfig.postDialogue.forEach((dialogue, index) => {
                if (index === levelConfig.postDialogue.length - 1) {
                    // Last dialogue should call callback
                    this.scene.dialogueManager.showDialogue(dialogue, callback);
                } else {
                    this.scene.dialogueManager.queueDialogue(dialogue);
                }
            });
        } else if (callback) {
            callback();
        }
    }
    
    awardRewards(rewards) {
        console.log('🎮 Awarding rewards:', rewards);
        
        // Award experience
        if (rewards.experience && this.scene.gameStateManager) {
            this.scene.gameStateManager.addExperience(rewards.experience);
        }
        
        // Award items
        if (rewards.items && this.scene.gameStateManager) {
            rewards.items.forEach(item => {
                this.scene.gameStateManager.addItem(item);
            });
        }
        
        // Award unlockables
        if (rewards.unlockables && this.scene.gameStateManager) {
            rewards.unlockables.forEach(unlock => {
                this.scene.gameStateManager.addUnlock(unlock);
            });
        }
        
        // TODO: Show rewards UI
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
