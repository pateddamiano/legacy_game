// ========================================
// EVENT ACTIONS: BOSS OPERATIONS
// ========================================
// Handles all boss-related event actions

class BossActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
    }
    
    advanceAction() {
        this.eventManager.advanceAction();
    }
    
    executeSpawnBoss(action) {
        const bossType = action.bossType || action.enemyType; // Support both names
        const position = action.position;
        const bossConfig = action.config || {};
        
        if (!bossType || !position) {
            console.warn('🎬 SpawnBoss action missing bossType or position');
            this.advanceAction();
            return;
        }
        
        // Check if Boss class is available
        if (typeof Boss === 'undefined') {
            console.error('🎬 Boss class not defined! Make sure boss-system.js loads before event-manager.js');
            this.advanceAction();
            return;
        }
        
        // Find character config
        let characterConfig = null;
        if (typeof ALL_ENEMY_TYPES !== 'undefined' && ALL_ENEMY_TYPES) {
            characterConfig = ALL_ENEMY_TYPES.find(config => config.name === bossType);
        }
        
        if (!characterConfig) {
            console.warn(`🎬 Could not find character config for boss type: ${bossType}`);
            this.advanceAction();
            return;
        }
        
        // Merge boss config
        const mergedConfig = {
            type: bossType,
            name: bossConfig.name || BOSS_TYPE_CONFIGS[bossType]?.name || bossType,
            ...bossConfig
        };
        
        console.log(`👹 Spawning boss: ${mergedConfig.name} at (${position.x}, ${position.y})`);
        
        // Create boss instance
        const boss = new Boss(this.scene, position.x, position.y, characterConfig, mergedConfig);
        boss.setPlayer(this.scene.player);
        
        // Enable AI for boss (unlike regular enemies spawned by events)
        boss.eventPaused = false;
        
        // Add to enemies array
        if (!this.scene.enemies) {
            this.scene.enemies = [];
        }
        const bossIndex = this.scene.enemies.length;
        this.scene.enemies.push(boss);
        
        // Store special reference for targeting (e.g., "boss_critic")
        if (action.id) {
            if (!this.scene.eventEnemyMap) {
                this.scene.eventEnemyMap = new Map();
            }
            this.scene.eventEnemyMap.set(action.id, bossIndex);
            console.log(`👹 Stored boss reference: ${action.id} -> index ${bossIndex}`);
        }
        
        // Store boss reference separately for easy access
        if (!this.scene.bosses) {
            this.scene.bosses = [];
        }
        this.scene.bosses.push(boss);
        
        // Advance to next action
        this.advanceAction();
    }
    
    executeShowBossHealthBar(action) {
        const bossId = action.bossId || action.target;
        let boss = null;
        
        if (bossId) {
            // Find boss by ID
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(bossId)) {
                const bossIndex = this.scene.eventEnemyMap.get(bossId);
                if (this.scene.enemies && this.scene.enemies[bossIndex]) {
                    boss = this.scene.enemies[bossIndex];
                }
            }
        } else if (this.scene.bosses && this.scene.bosses.length > 0) {
            // Use first boss if no ID specified
            boss = this.scene.bosses[0];
        }
        
        if (!boss || !boss.isBoss) {
            console.warn(`👹 Could not find boss to show health bar for: ${bossId || 'first boss'}`);
            this.advanceAction();
            return;
        }
        
        const bossName = boss.bossName || action.bossName || 'BOSS';
        
        console.log(`👹 Showing boss health bar for: ${bossName}`);
        
        if (this.scene.uiManager && this.scene.uiManager.showBossHealthBar) {
            this.scene.uiManager.showBossHealthBar(bossName, boss);
        }
        
        this.advanceAction();
    }
    
    executeSetBossBehavior(action) {
        const bossId = action.bossId || action.target;
        const behaviors = action.behaviors || {};
        
        let boss = null;
        if (bossId) {
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(bossId)) {
                const bossIndex = this.scene.eventEnemyMap.get(bossId);
                if (this.scene.enemies && this.scene.enemies[bossIndex]) {
                    boss = this.scene.enemies[bossIndex];
                }
            }
        } else if (this.scene.bosses && this.scene.bosses.length > 0) {
            boss = this.scene.bosses[0];
        }
        
        if (!boss || !boss.isBoss) {
            console.warn(`👹 Could not find boss to set behavior for: ${bossId || 'first boss'}`);
            this.advanceAction();
            return;
        }
        
        console.log(`👹 Setting boss behaviors: ${JSON.stringify(behaviors)}`);
        
        // Update boss behaviors
        if (behaviors.jumpOnDamage !== undefined) {
            boss.behaviors.jumpOnDamage = behaviors.jumpOnDamage;
        }
        if (behaviors.throwWeapons !== undefined) {
            boss.behaviors.throwWeapons = behaviors.throwWeapons;
        }
        if (behaviors.chase !== undefined) {
            boss.behaviors.chase = behaviors.chase;
        }
        if (behaviors.attack !== undefined) {
            boss.behaviors.attack = behaviors.attack;
        }
        
        this.advanceAction();
    }
    
    executeWaitForBossDefeated(action) {
        const bossId = action.bossId || action.target;
        
        let boss = null;
        if (bossId) {
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(bossId)) {
                const bossIndex = this.scene.eventEnemyMap.get(bossId);
                if (this.scene.enemies && this.scene.enemies[bossIndex]) {
                    boss = this.scene.enemies[bossIndex];
                }
            }
        } else if (this.scene.bosses && this.scene.bosses.length > 0) {
            boss = this.scene.bosses[0];
        }
        
        if (!boss || !boss.isBoss) {
            console.warn(`👹 Could not find boss to wait for: ${bossId || 'first boss'}`);
            this.advanceAction();
            return;
        }
        
        console.log(`👹 Waiting for boss ${boss.bossName} to be defeated...`);
        console.log(`👹 [WAIT_BOSS] Boss state check: health=${boss.health}/${boss.maxHealth}, state=${boss.state}, isDying=${boss.state === BOSS_STATES.DYING}, isDead=${boss.state === BOSS_STATES.DEAD}`);
        
        // Set up callback to advance when boss is defeated
        const previousCallback = boss.onBossDefeated;
        boss.onBossDefeated = (defeatedBoss) => {
            console.log(`👹 [WAIT_BOSS] ✅ onBossDefeated CALLBACK FIRED`);
            console.log(`👹 Boss ${defeatedBoss.bossName} defeated!`);
            // Small delay before advancing to next action
            this.scene.time.delayedCall(500, () => {
                this.advanceAction();
            });
        };
        console.log(`👹 [WAIT_BOSS] Callback set. Previous callback was: ${previousCallback ? 'YES' : 'NO'}`);
        
        // Check if already defeated
        if (boss.health <= 0 || boss.state === BOSS_STATES.DYING || boss.state === BOSS_STATES.DEAD) {
            console.log(`👹 [WAIT_BOSS] ⚠️ Boss already in defeated state! health=${boss.health}, state=${boss.state}`);
            console.log(`👹 Boss already defeated, advancing immediately`);
            this.advanceAction();
            return;
        }
        
        // Don't advance - wait for callback
    }
    
    executeBossDefeatedDialogue(action) {
        const dialogue = action.dialogue;
        
        if (!dialogue) {
            console.warn('👹 BossDefeatedDialogue action missing dialogue data');
            this.advanceAction();
            return;
        }
        
        console.log(`👹 Showing post-fight dialogue: "${dialogue.text}"`);
        
        // Use DialogueManager if available
        if (this.scene.dialogueManager) {
            this.scene.dialogueManager.showDialogue(dialogue, () => {
                this.advanceAction();
            });
        } else {
            console.warn('👹 DialogueManager not available');
            this.advanceAction();
        }
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BossActions };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.BossActions = BossActions;
}

