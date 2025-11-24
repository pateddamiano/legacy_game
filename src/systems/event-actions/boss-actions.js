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
        
        // Pause boss AI initially - he will be resumed when the fight actually starts
        // This prevents him from throwing weapons during dialogue
        boss.eventPaused = true;
        
        // Set initial facing direction based on spawn position
        // Boss spawns on right side (x: 7760), so should face left (toward center/player)
        if (boss.sprite) {
            // Determine which side of camera center the boss is on
            const camera = this.scene.cameras.main;
            const cameraCenter = camera.scrollX + camera.width / 2;
            const bossX = position.x;
            const isOnRightSide = bossX >= cameraCenter;
            
            // On right side: face left (flipX = true)
            // On left side: face right (flipX = false)
            boss.sprite.setFlipX(isOnRightSide);
            boss.currentEdge = isOnRightSide ? 'right' : 'left';
            console.log(`👹 Boss ${mergedConfig.name} spawned at x=${bossX}, cameraCenter=${cameraCenter}, facing ${isOnRightSide ? 'left (flipX=true)' : 'right (flipX=false)'}, edge=${boss.currentEdge}`);
        }
        
        console.log(`👹 Boss ${mergedConfig.name} spawned and paused (will resume when fight starts)`);
        
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
            // Also store eventId on the boss itself for fallback lookup
            boss.eventId = action.id;
            console.log(`👹 Stored boss reference: ${action.id} -> index ${bossIndex}`);
            console.log(`👹 Boss eventId set to: ${boss.eventId}`);
            console.log(`👹 Current eventEnemyMap after spawn:`, Array.from(this.scene.eventEnemyMap.entries()));
        } else {
            // Also store by bossType if no explicit ID provided, as a fallback
            if (!this.scene.eventEnemyMap) {
                this.scene.eventEnemyMap = new Map();
            }
            // If ID wasn't provided, use the bossType or 'boss_type' format as key if valid
            // This is a safety measure for boss actions looking for specific boss types
            this.scene.eventEnemyMap.set(mergedConfig.type, bossIndex);
            this.scene.eventEnemyMap.set(`boss_${mergedConfig.type}`, bossIndex); 
            console.log(`👹 Stored boss fallback references: ${mergedConfig.type}, boss_${mergedConfig.type} -> index ${bossIndex}`);
        }
        
        // Store boss reference separately for easy access
        if (!this.scene.bosses) {
            this.scene.bosses = [];
        }
        this.scene.bosses.push(boss);
        
        // Register boss in protection system to prevent cleanup
        if (this.scene.eventEnemyProtection && action.id) {
            // Use the protection level constant if available, otherwise use string
            const protectionLevel = (typeof PROTECTION_LEVELS !== 'undefined' && PROTECTION_LEVELS.CLEANUP_PROTECTED) 
                ? PROTECTION_LEVELS.CLEANUP_PROTECTED 
                : 'cleanup_protected';
            
            this.scene.eventEnemyProtection.registerEnemy(
                action.id,
                boss,
                protectionLevel, // Bosses are protected from cleanup
                { type: 'boss', bossName: boss.bossName }
            );
            console.log(`👹 Registered boss in protection system: ${action.id} (${protectionLevel})`);
        }
        
        // Advance to next action
        this.advanceAction();
    }
    
    executeShowBossHealthBar(action) {
        const bossId = action.bossId || action.target;
        console.log(`👹 [SHOW_HEALTH] Looking for boss with ID: ${bossId}`);
        console.log(`👹 [SHOW_HEALTH] eventEnemyMap exists: ${!!this.scene.eventEnemyMap}`);
        if (this.scene.eventEnemyMap) {
            console.log(`👹 [SHOW_HEALTH] eventEnemyMap contents:`, Array.from(this.scene.eventEnemyMap.entries()));
        }
        
        let boss = null;
        if (bossId) {
            // Find boss by ID
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(bossId)) {
                const bossIndex = this.scene.eventEnemyMap.get(bossId);
                console.log(`👹 [SHOW_HEALTH] Found boss ID in map at index: ${bossIndex}`);
                if (this.scene.enemies && this.scene.enemies[bossIndex]) {
                    boss = this.scene.enemies[bossIndex];
                    console.log(`👹 [SHOW_HEALTH] Found boss at index ${bossIndex}, isBoss: ${boss.isBoss}`);
                } else {
                    console.warn(`👹 [SHOW_HEALTH] ⚠️ Boss index ${bossIndex} is out of bounds! Searching for boss...`);
                    // Index is invalid, search for boss in enemies array
                    if (this.scene.enemies) {
                        for (let i = 0; i < this.scene.enemies.length; i++) {
                            const enemy = this.scene.enemies[i];
                            if (enemy && enemy.isBoss) {
                                console.log(`👹 [SHOW_HEALTH] Found boss '${enemy.bossName}' at index ${i}`);
                                // Check if this boss matches by checking eventId or bossName
                                if (enemy.eventId === bossId || enemy.bossName === bossId) {
                                    console.log(`👹 [SHOW_HEALTH] ✅ Found boss by search!`);
                                    boss = enemy;
                                    // Update the map for future lookups
                                    this.scene.eventEnemyMap.set(bossId, i);
                                    break;
                                }
                            }
                        }
                    }
                    // If still not found, try bosses array
                    if (!boss && this.scene.bosses && this.scene.bosses.length > 0) {
                        for (const potentialBoss of this.scene.bosses) {
                            if (potentialBoss && potentialBoss.isBoss && (potentialBoss.eventId === bossId || potentialBoss.bossName === bossId)) {
                                console.log(`👹 [SHOW_HEALTH] ✅ Found boss in bosses array!`);
                                boss = potentialBoss;
                                // Find its index in enemies array and update map
                                if (this.scene.enemies) {
                                    const foundIndex = this.scene.enemies.indexOf(boss);
                                    if (foundIndex !== -1) {
                                        this.scene.eventEnemyMap.set(bossId, foundIndex);
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            } else {
                console.warn(`👹 [SHOW_HEALTH] ⚠️ Boss ID '${bossId}' not found in eventEnemyMap, searching enemies array...`);
                // Try to find boss by searching through enemies array
                if (this.scene.enemies) {
                    for (let i = 0; i < this.scene.enemies.length; i++) {
                        const enemy = this.scene.enemies[i];
                        if (enemy && enemy.isBoss) {
                            console.log(`👹 [SHOW_HEALTH] Found boss '${enemy.bossName}' at index ${i}`);
                            // Check if this boss matches by checking eventId or bossName
                            if (enemy.eventId === bossId || enemy.bossName === bossId) {
                                console.log(`👹 [SHOW_HEALTH] ✅ Found boss by search!`);
                                boss = enemy;
                                // Update the map for future lookups
                                if (!this.scene.eventEnemyMap) {
                                    this.scene.eventEnemyMap = new Map();
                                }
                                this.scene.eventEnemyMap.set(bossId, i);
                                break;
                            }
                        }
                    }
                }
            }
        } else if (this.scene.bosses && this.scene.bosses.length > 0) {
            // Use first boss if no ID specified
            boss = this.scene.bosses[0];
            console.log(`👹 [SHOW_HEALTH] Using first boss from bosses array: ${boss.bossName}`);
        }
        
        if (!boss || !boss.isBoss) {
            console.error(`👹 [SHOW_HEALTH] ❌ Could not find boss to show health bar for: ${bossId || 'first boss'}`);
            console.error(`👹 [SHOW_HEALTH] ❌ Stack trace:`, new Error().stack);
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
        
        console.log(`👹 [WAIT_BOSS] Looking for boss with ID: ${bossId}`);
        console.log(`👹 [WAIT_BOSS] eventEnemyMap exists: ${!!this.scene.eventEnemyMap}`);
        if (this.scene.eventEnemyMap) {
            console.log(`👹 [WAIT_BOSS] eventEnemyMap contents:`, Array.from(this.scene.eventEnemyMap.entries()));
        }
        console.log(`👹 [WAIT_BOSS] enemies array length: ${this.scene.enemies?.length || 0}`);
        console.log(`👹 [WAIT_BOSS] bosses array length: ${this.scene.bosses?.length || 0}`);
        
        let boss = null;
        if (bossId) {
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(bossId)) {
                const bossIndex = this.scene.eventEnemyMap.get(bossId);
                console.log(`👹 [WAIT_BOSS] Found boss ID in map at index: ${bossIndex}`);
                if (this.scene.enemies && this.scene.enemies[bossIndex]) {
                    boss = this.scene.enemies[bossIndex];
                    console.log(`👹 [WAIT_BOSS] Found boss at index ${bossIndex}, isBoss: ${boss.isBoss}`);
                } else {
                    console.warn(`👹 [WAIT_BOSS] ⚠️ Boss index ${bossIndex} is out of bounds! enemies array length: ${this.scene.enemies?.length || 0}`);
                    console.warn(`👹 [WAIT_BOSS] Searching for boss in enemies array...`);
                    // Index is invalid, search for boss in enemies array
                    if (this.scene.enemies) {
                        for (let i = 0; i < this.scene.enemies.length; i++) {
                            const enemy = this.scene.enemies[i];
                            if (enemy && enemy.isBoss) {
                                console.log(`👹 [WAIT_BOSS] Found boss '${enemy.bossName}' at index ${i}, checking if it matches...`);
                                // Check if this boss matches by checking if it has the expected ID stored
                                if (enemy.eventId === bossId) {
                                    console.log(`👹 [WAIT_BOSS] ✅ Found boss by eventId match!`);
                                    boss = enemy;
                                    // Update the map for future lookups
                                    this.scene.eventEnemyMap.set(bossId, i);
                                    break;
                                }
                            }
                        }
                    }
                    // If still not found, try bosses array
                    if (!boss && this.scene.bosses && this.scene.bosses.length > 0) {
                        console.log(`👹 [WAIT_BOSS] Searching bosses array...`);
                        for (const potentialBoss of this.scene.bosses) {
                            if (potentialBoss && potentialBoss.isBoss && potentialBoss.eventId === bossId) {
                                console.log(`👹 [WAIT_BOSS] ✅ Found boss in bosses array!`);
                                boss = potentialBoss;
                                // Find its index in enemies array and update map
                                if (this.scene.enemies) {
                                    const foundIndex = this.scene.enemies.indexOf(boss);
                                    if (foundIndex !== -1) {
                                        this.scene.eventEnemyMap.set(bossId, foundIndex);
                                        console.log(`👹 [WAIT_BOSS] Updated map: ${bossId} -> ${foundIndex}`);
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            } else {
                console.warn(`👹 [WAIT_BOSS] ⚠️ Boss ID '${bossId}' not found in eventEnemyMap`);
                // Try to find boss by searching through enemies array
                if (this.scene.enemies) {
                    for (let i = 0; i < this.scene.enemies.length; i++) {
                        const enemy = this.scene.enemies[i];
                        if (enemy && enemy.isBoss && enemy.bossName) {
                            console.log(`👹 [WAIT_BOSS] Found boss '${enemy.bossName}' at index ${i}, checking if it matches...`);
                            // Check if this boss matches by checking if it has the expected ID stored
                            if (enemy.eventId === bossId) {
                                console.log(`👹 [WAIT_BOSS] ✅ Found boss by eventId match!`);
                                boss = enemy;
                                // Update the map for future lookups
                                if (!this.scene.eventEnemyMap) {
                                    this.scene.eventEnemyMap = new Map();
                                }
                                this.scene.eventEnemyMap.set(bossId, i);
                                break;
                            }
                        }
                    }
                }
            }
        } else if (this.scene.bosses && this.scene.bosses.length > 0) {
            boss = this.scene.bosses[0];
            console.log(`👹 [WAIT_BOSS] Using first boss from bosses array: ${boss.bossName}`);
        }
        
        if (!boss || !boss.isBoss) {
            console.error(`👹 [WAIT_BOSS] ❌ Could not find boss to wait for: ${bossId || 'first boss'}`);
            console.error(`👹 [WAIT_BOSS] ❌ Boss object:`, boss);
            console.error(`👹 [WAIT_BOSS] ❌ Stack trace:`, new Error().stack);
            this.advanceAction();
            return;
        }
        
        console.log(`👹 Waiting for boss ${boss.bossName} to be defeated...`);
        console.log(`👹 [WAIT_BOSS] Boss state check: health=${boss.health}/${boss.maxHealth}, state=${boss.state}, isDying=${boss.state === BOSS_STATES.DYING}, isDead=${boss.state === BOSS_STATES.DEAD}`);
        console.log(`👹 [WAIT_BOSS] Boss sprite active: ${boss.sprite?.active}, visible: ${boss.sprite?.visible}`);
        console.log(`👹 [WAIT_BOSS] Boss isBoss flag: ${boss.isBoss}`);
        
        // Check if already defeated FIRST before setting up callback
        // This prevents race conditions where boss dies between checks or is already dead
        // BUT: Only advance if boss is ACTUALLY defeated, not just if health is 0 due to initialization bug
        const isActuallyDefeated = (boss.health <= 0 && boss.maxHealth > 0) || 
                                   boss.state === BOSS_STATES.DYING || 
                                   boss.state === BOSS_STATES.DEAD ||
                                   (boss.sprite && !boss.sprite.active);
        
        if (isActuallyDefeated) {
            console.log(`👹 [WAIT_BOSS] ⚠️ Boss already in defeated state! health=${boss.health}/${boss.maxHealth}, state=${boss.state}, spriteActive=${boss.sprite?.active}`);
            console.log(`👹 [WAIT_BOSS] ⚠️ This should NOT happen if boss was just spawned!`);
            console.log(`👹 [WAIT_BOSS] ⚠️ Stack trace:`, new Error().stack);
            console.log(`👹 Boss already defeated, advancing immediately (with small delay to prevent race conditions)`);
            
            // Use a small delay even for already-defeated bosses to prevent race conditions
            // This ensures any pending callbacks or state updates complete first
            this.scene.time.delayedCall(100, () => {
                this.advanceAction();
            });
            return;
        }
        
        // Additional safety check: if health is 0 but maxHealth is also 0, this is likely an initialization bug
        if (boss.health <= 0 && boss.maxHealth <= 0) {
            console.error(`👹 [WAIT_BOSS] ⚠️ CRITICAL: Boss has invalid health values! health=${boss.health}, maxHealth=${boss.maxHealth}`);
            console.error(`👹 [WAIT_BOSS] ⚠️ This indicates a boss initialization bug. Fixing health to 100.`);
            boss.health = 100;
            boss.maxHealth = 100;
        }

        // Set up callback to advance when boss is defeated
        // Use a chainable callback pattern instead of overwriting directly
        const previousCallback = boss.onBossDefeated;
        
        // Track the expected action index when this wait action was set up
        // This prevents double-advancing if the callback fires multiple times
        const expectedActionIndex = this.eventManager.currentActionIndex;
        let callbackFired = false; // Guard to prevent multiple calls
        
        boss.onBossDefeated = (defeatedBoss) => {
            // Guard: prevent multiple calls
            if (callbackFired) {
                console.log(`👹 [WAIT_BOSS] ⚠️ Callback already fired, ignoring duplicate call`);
                return;
            }
            
            // Check if we're still on the expected action (prevent double-advancing)
            const currentIndex = this.eventManager.currentActionIndex;
            if (currentIndex !== expectedActionIndex) {
                console.log(`👹 [WAIT_BOSS] ⚠️ Action index mismatch! Expected: ${expectedActionIndex}, Current: ${currentIndex}. Event may have advanced already.`);
                // Still execute previous callback but don't advance
                if (previousCallback && typeof previousCallback === 'function') {
                    previousCallback(defeatedBoss);
                }
                return;
            }
            
            callbackFired = true;
            console.log(`👹 [WAIT_BOSS] ✅ onBossDefeated CALLBACK FIRED (action index: ${expectedActionIndex})`);
            console.log(`👹 Boss ${defeatedBoss.bossName} defeated!`);
            
            // Execute previous callback if it existed
            if (previousCallback && typeof previousCallback === 'function') {
                previousCallback(defeatedBoss);
            }
            
            // HARD STOP: Completely disable all input immediately to prevent skipping dialogue
            if (this.scene.inputManager) {
                this.scene.inputManager.disabled = true;
                // Clear all input states to prevent queued inputs
                if (this.scene.inputManager.inputState) {
                    this.scene.inputManager.inputState.left = false;
                    this.scene.inputManager.inputState.right = false;
                    this.scene.inputManager.inputState.up = false;
                    this.scene.inputManager.inputState.down = false;
                    this.scene.inputManager.inputState.jump = false;
                    this.scene.inputManager.inputState.attack = false;
                    this.scene.inputManager.inputState.weapon = false;
                    this.scene.inputManager.inputState.switchCharacter = false;
                }
                console.log(`👹 [WAIT_BOSS] Input completely disabled to prevent dialogue skipping`);
            }
            
            // Clear all boss projectiles (rating weapons) immediately when boss is defeated
            // This prevents rating weapons from continuing to fly during dialogue
            if (this.scene.weaponManager) {
                const projectileCount = this.scene.weaponManager.projectiles?.length || 0;
                this.scene.weaponManager.clearAllProjectiles();
                console.log(`👹 [WAIT_BOSS] Cleared ${projectileCount} projectiles (including rating weapons) when boss defeated`);
            }
            
            // Small delay before advancing to next action
            // This gives time for any queued actions to settle
            this.scene.time.delayedCall(500, () => {
                // Double-check we're still on the expected action before advancing
                const checkIndex = this.eventManager.currentActionIndex;
                if (checkIndex === expectedActionIndex) {
                    console.log(`👹 [WAIT_BOSS] Advancing from action ${expectedActionIndex} to ${expectedActionIndex + 1}`);
                    this.advanceAction();
                } else {
                    console.log(`👹 [WAIT_BOSS] ⚠️ Action already advanced! Expected: ${expectedActionIndex}, Current: ${checkIndex}. Skipping advance.`);
                }
            });
        };
        console.log(`👹 [WAIT_BOSS] Callback set for action index ${expectedActionIndex}. Previous callback was: ${previousCallback ? 'YES' : 'NO'}`);
        
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

