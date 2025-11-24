// ========================================
// BOSS SYSTEM
// ========================================
// Boss battle system with extended behaviors, health bars, and post-fight dialogue

// Boss-specific states extending enemy states
const BOSS_STATES = {
    ...ENEMY_STATES,
    IDLE: 'idle',
    CHASING: 'chasing',
    JUMPING: 'jumping',
    THROWING: 'throwing',
    DYING: 'dying'
};

// ========================================
// BOSS CONFIGURATION
// ========================================

// ========================================
// BOSS CONFIGURATION
// ========================================
// Each boss type must define all required fields below.
// Required fields for each boss:
//   - name: string (boss display name)
//   - health: number (boss max health)
//   - speed: number (movement speed)
//   - attackCooldown: number (ms between attacks)
//   - playerDamage: number (damage dealt to player)
//   - attackTypes: array (list of attack animation types)
//   - detectionRange: number (range at which boss detects player)
//   - behaviors: array (list of enabled behaviors: 'jumpOnDamage', 'throwWeapons', 'verticalMovement', 'chase', 'attack')
//   - jumpOnDamageThreshold: number (0.0-1.0, health % loss needed to trigger jump)
//   - jumpCooldown: number (ms minimum between jumps)
//   - jumpType: string ('teleport', 'flip', or 'physics')
//   - jumpDistance: number (pixels to jump)
//   - throwWeaponCooldown: number (ms minimum between weapon throws)
//   - throwWeaponRange: number (range at which boss will throw weapons)
//   - throwWeaponType: string (weapon type to throw, e.g. 'rating', 'vinyl')
//   - standOnEdges: boolean (whether boss stands on camera edges)
//   - edgeMargin: number (distance from camera edges when standing)
//   - description: string (optional description)

const BOSS_TYPE_CONFIGS = {
    critic: {
        // Basic boss properties
        name: 'The Critic',
        health: 400,
        speed: 300,
        attackCooldown: 100,
        playerDamage: 5,
        attackTypes: ['enemy_punch'],
        detectionRange: 2000,
        behaviors: ['jumpOnDamage', 'throwWeapons', 'verticalMovement'],
        
        // Jump behavior
        jumpOnDamageThreshold: 0.05,  // Jump after losing 5% health
        jumpCooldown: 2000,            // Minimum time between jumps (ms)
        jumpType: 'flip',              // 'teleport', 'flip', or 'physics'
        jumpDistance: 500,             // Distance to jump (pixels)
        
        // Weapon throwing
        throwWeaponCooldown: 1250,    // Minimum time between weapon throws (ms
        throwWeaponRange: 1000,        // Range at which boss will throw weapons
        throwWeaponType: 'rating',     // Will randomly select rating_0 through rating_4
        
        // Edge-standing behavior
        standOnEdges: true,            // Enable edge-standing behavior
        edgeMargin: 150,               // Distance from camera edges
        
        description: "The Critic - formidable opponent who stands on arena edges and throws rating weapons"
    }
};

// Boss class extending Enemy
class Boss extends Enemy {
    constructor(scene, x, y, characterConfig, bossConfig = {}) {
        // Call parent constructor
        super(scene, x, y, characterConfig);
        
        // Get boss type config (all required fields must be defined per boss)
        const bossType = bossConfig.type || characterConfig.name;
        const typeConfig = BOSS_TYPE_CONFIGS[bossType] || {};
        
        // Merge: typeConfig provides all required fields, bossConfig parameter can override
        const mergedConfig = { ...typeConfig, ...bossConfig };
        
        // Validate that required fields are present
        if (!mergedConfig.name || !mergedConfig.health || mergedConfig.jumpOnDamageThreshold === undefined) {
            console.warn(`👹 [BOSS_INIT] Boss config for '${bossType}' may be missing required fields!`);
        }
        
        // Boss-specific properties
        this.isBoss = true;
        this.bossName = mergedConfig.name || bossType;
        this.bossConfig = mergedConfig;
        
        // Override health with boss config
        // Use explicit check for undefined/null, not just falsy, to allow 0 health if needed
        if (mergedConfig.health !== undefined && mergedConfig.health !== null) {
            this.health = mergedConfig.health;
        }
        // Ensure health is valid (at least 1 if not specified)
        if (!this.health || this.health <= 0) {
            console.warn(`👹 [BOSS_INIT] Invalid health value (${this.health}), setting to 100`);
            this.health = 100;
        }
        this.maxHealth = this.health;
        
        // Boss behavior flags - store initial config behaviors
        const configBehaviors = mergedConfig.behaviors || [];
        this.behaviors = {
            jumpOnDamage: configBehaviors.includes('jumpOnDamage'),
            throwWeapons: configBehaviors.includes('throwWeapons'),
            verticalMovement: configBehaviors.includes('verticalMovement'),
            chase: configBehaviors.includes('chase') !== false, // Default true
            attack: configBehaviors.includes('attack') !== false // Default true
        };
        
        // Store initial behaviors so phase system can preserve them
        this.initialBehaviors = {
            jumpOnDamage: this.behaviors.jumpOnDamage,
            throwWeapons: this.behaviors.throwWeapons,
            verticalMovement: this.behaviors.verticalMovement
        };
        
        console.log(`👹 Boss ${this.bossName} initial behaviors:`, this.behaviors);
        
        // Jump tracking
        this.lastJumpTime = 0;
        this.lastHealthPercent = 1.0;
        this.cumulativeHealthLost = 0.0; // Track cumulative health loss since last jump
        this.jumpType = mergedConfig.jumpType || 'teleport';
        this.jumpLandingTime = 0; // Track when boss landed from jump (to prevent edge-standing override)
        this.jumpLandingCooldown = 2000; // Don't let edge-standing override position for 2 seconds after landing
        this.jumpDistance = mergedConfig.jumpDistance || 400;
        
        // Weapon throwing tracking
        this.lastThrowTime = 0;
        this.throwWeaponCooldown = mergedConfig.throwWeaponCooldown;
        this.throwWeaponRange = mergedConfig.throwWeaponRange || 600;
        this.throwWeaponType = mergedConfig.throwWeaponType || 'vinyl';

        // Edge-standing behavior
        this.standOnEdges = mergedConfig.standOnEdges || false;
        this.currentEdge = null; // 'left' or 'right'
        this.edgeMargin = mergedConfig.edgeMargin || 150; // Distance from camera edge

        // Callback for boss defeat
        this.onBossDefeated = null;
        
        // Pre-jump punch tracking
        this.preJumpPunchHit = false; // Track if pre-jump punch hit player
        this.preJumpPunchCheckTimer = null; // Timer for checking punch hits
        this.notGoodSprite = null; // Image sprite for "not good" text
        this.notGoodFlashTimer = null; // Timer for flashing effect (deprecated, using delayed calls now)
        this.notGoodFlashDuration = 0; // Total duration of flash effect
        this.playerMovementLocked = false; // Track if player movement is locked
        
        // Set boss state to WALKING so parent Enemy class can handle attacks
        // IDLE is only used for edge-standing bosses when they're on an edge
        this.setState(BOSS_STATES.WALKING);
        
        // Initialize facing direction based on spawn position
        // Use a delayed call to ensure camera and sprite are fully initialized
        this.scene.time.delayedCall(100, () => {
            if (this.sprite) {
                this.updateFacingDirection();
                console.log(`👹 [BOSS_INIT] Initial facing direction set: edge=${this.currentEdge}, flipX=${this.sprite.flipX}`);
            }
        });
        
        console.log(`👹 Boss ${this.bossName} spawned at (${x}, ${y}) - Health: ${this.health}/${this.maxHealth}`);
    }
    
    // Helper method to update facing direction based on current edge
    updateFacingDirection() {
        if (!this.sprite) return;
        
        // Determine current edge if not set, or if boss has moved significantly
        if (this.scene && this.scene.cameras) {
            const camera = this.scene.cameras.main;
            const cameraCenter = camera.scrollX + camera.width / 2;
            const bossX = this.sprite.x;
            
            // Only update edge if boss has moved to a different side of the camera
            // Don't recalculate based on player position - use boss's actual position
            const newEdge = bossX < cameraCenter ? 'left' : 'right';
            
            // Only update if edge actually changed (boss jumped to other side)
            // Don't change edge just because player moved
            if (!this.currentEdge || this.currentEdge !== newEdge) {
                this.currentEdge = newEdge;
            }
        }
        
        // On right side: face left toward center/player (flipX = true)
        // On left side: face right toward center/player (flipX = false)
        if (this.currentEdge === 'right') {
            this.sprite.setFlipX(true); // Face left toward center
        } else if (this.currentEdge === 'left') {
            this.sprite.setFlipX(false); // Face right toward center
        }
    }
    
    setState(newState) {
        // Call parent state setter
        super.setState(newState);
        
        // Boss-specific state handling
        switch (newState) {
            case BOSS_STATES.ATTACKING:
                // Start boss attack when entering attacking state
                this.startAttack();
                break;
            case BOSS_STATES.JUMPING:
                // Jump animation/behavior handled in update
                break;
            case BOSS_STATES.THROWING:
                // Throwing animation/behavior handled in update
                break;
            case BOSS_STATES.DYING:
                this.sprite.setVelocity(0, 0);
                break;
        }
    }
    
    update(time, delta) {
        // Early returns for invalid states
        if (!this.player || this.state === BOSS_STATES.DEAD) return;
        if (!this.sprite || !this.sprite.active) return;
        
        // Check for defeat in update loop (in case health reached 0 outside of takeDamage)
        if (this.health <= 0 && this.state !== BOSS_STATES.DYING && this.state !== BOSS_STATES.DEAD) {
            console.log(`👹 [BOSS_UPDATE] Health at/below 0 in update loop, triggering defeat. Health: ${this.health}`);
            this.health = 0; // Ensure health is exactly 0
            this.onBossDefeat();
            return; // Don't continue update if defeated
        }
        
        // Ensure tracking the correct active player instance
        if (this.scene.player && this.scene.player.active && this.player !== this.scene.player) {
            this.setPlayer(this.scene.player);
            console.log(`👹 Boss ${this.bossName} updated tracking target to new player: ${this.scene.player.characterName || 'Unknown'}`);
        }
        
        // Update perspective scaling (from parent)
        this.updatePerspective();
        
        // Skip AI updates if paused by event system
        if (this.eventPaused) return;
        
        // Skip AI updates if paused due to player death
        if (this.deathPaused) return;
        
        // Update knockback timer (from parent)
        if (this.isKnockedBack) {
            this.knockbackTimer -= delta;
            if (this.knockbackTimer <= 0) {
                this.isKnockedBack = false;
                if (this.state === BOSS_STATES.WALKING || this.state === BOSS_STATES.SPAWNING) {
                    this.sprite.setVelocityX(0);
                }
            }
        }
        
        // Update animation lock timer (from parent)
        if (this.lockTimer > 0) {
            this.lockTimer -= delta;
            if (this.lockTimer <= 0) {
                this.animationLocked = false;
                this.canDealDamage = false;
                if (this.state === BOSS_STATES.ATTACKING) {
                    this.setState(BOSS_STATES.WALKING);
                }
            }
        }
        
        // Update attack windup timer (from parent)
        if (this.isWindingUp && this.windupTimer > 0) {
            this.windupTimer -= delta;
            if (this.windupTimer <= 0) {
                this.isWindingUp = false;
                this.canDealDamage = true;
            }
        }
        
        // Skip boss-specific updates if dead or dying
        if (this.state === BOSS_STATES.DEAD || this.state === BOSS_STATES.DYING) {
            return;
        }
        
        // Boss-specific behavior updates
        if (this.state === BOSS_STATES.JUMPING) {
            this.updateJump(delta);
        } else if (this.state === BOSS_STATES.THROWING) {
            this.updateThrow(delta);
        } else if (this.state === BOSS_STATES.ATTACKING) {
            this.updateAttackingBehavior();
            
            // Update "not good" sprite position to follow player during attack/jump
            if (this.notGoodSprite && this.notGoodSprite.visible && this.player) {
                const playerSprite = this.player.sprite || this.player;
                this.notGoodSprite.x = playerSprite.x;
                this.notGoodSprite.y = playerSprite.y - 40; // Centered on player
            }
        } else if (this.state === BOSS_STATES.JUMPING) {
            // Update "not good" sprite position to follow player during jump
            if (this.notGoodSprite && this.notGoodSprite.visible && this.player) {
                const playerSprite = this.player.sprite || this.player;
                this.notGoodSprite.x = playerSprite.x;
                this.notGoodSprite.y = playerSprite.y - 40; // Centered on player
            }
        } else {
            // Boss-specific behavior (WALKING or IDLE state)
            this.updateBossBehavior(time, delta);
        }
    }
    
    updateBossBehavior(time, delta) {
        if (!this.player || !this.sprite) return;
        if (this.animationLocked) return;
        
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            this.player.x, this.player.y
        );
        
        // Check if player is in detection range
        if (distanceToPlayer > this.detectionRange) {
            this.sprite.setVelocity(0, 0);
            return;
        }
        
        // Edge-standing behavior (but not immediately after landing from a jump)
            if (this.standOnEdges) {
            const timeSinceLanding = time - this.jumpLandingTime;
            if (timeSinceLanding > this.jumpLandingCooldown) {
                this.updateEdgeStanding();
            } else {
                // After jump, just maintain position on the edge we landed on
                // Don't let edge-standing logic override the jump position
                // But ensure facing direction is correct
                this.updateFacingDirection();
            }
        } else {
            // Even if not standing on edges, ensure facing direction is correct
            this.updateFacingDirection();
            }

            // Vertical movement behavior (align with player)
            if (this.behaviors.verticalMovement && this.player) {
                this.updateVerticalMovement();
            }

        // Check for melee attack (when close)
        const meleeAttackRange = this.attackRange || 140;
        if (distanceToPlayer <= meleeAttackRange && time - this.lastAttackTime > this.attackCooldown) {
            if (this.state !== BOSS_STATES.ATTACKING && this.state !== BOSS_STATES.JUMPING && this.state !== BOSS_STATES.THROWING) {
                // Ensure facing direction is correct BEFORE entering attack state
                // This prevents the boss from flipping when player gets close
                this.updateFacingDirection();
                this.setState(BOSS_STATES.ATTACKING);
                return;
            }
        }

        // Update weapon throwing if enabled (when far)
            if (this.behaviors.throwWeapons && this.player) {
                this.updateWeaponThrowing(time, delta);
            }
        
        // Boss doesn't move toward player - stays on edges or in position
        // Only clear velocity if not already set by edge-standing
        if (!this.standOnEdges) {
            this.sprite.setVelocityX(0);
        }
    }
    
    // Override executeBehaviors - bosses use object-based behaviors, not array-based
    executeBehaviors() {
        // Boss behaviors are handled in the boss-specific update methods
        // (jumpOnDamage, throwWeapons, verticalMovement)
        // Don't call parent executeBehaviors() as it expects behaviors to be an array
        return;
    }
    
    // Update behavior during attack state - maintain facing direction
    updateAttackingBehavior() {
        // Ensure boss maintains correct facing direction during attack
        // Boss should face based on edge position, not player position
        this.updateFacingDirection();
        
        // Update facingLeft to match current flipX state (for hitbox calculations)
        this.facingLeft = this.sprite.flipX;
    }
    
    // Override startAttack - bosses use boss-specific attack logic
    startAttack() {
        if (this.animationLocked) return;
        
        // Don't start attacks if paused by event system
        if (this.eventPaused) return;
        
        // Ensure boss is facing the correct direction before attacking
        // Boss should face based on edge position, not player position
        this.updateFacingDirection();
        
        // Use boss config attack types
        const attackTypes = this.bossConfig.attackTypes || this.enemyTypeConfig?.attackTypes || ['enemy_punch'];
        const attackType = attackTypes[0]; // Use first attack type for boss
        
        // Verify the attack animation exists
        if (!this.characterConfig.animations[attackType]) {
            console.error(`👹 Boss attack animation ${attackType} not found for ${this.characterConfig.name}`);
            return;
        }
        
        // Get animation duration
        const animConfig = this.characterConfig.animations[attackType];
        const animationDuration = (animConfig.frames / animConfig.frameRate) * 1000;
        
        // Boss-specific windup delay
        const windupDelay = this.bossConfig.attackWindupDelay || ENEMY_CONFIG.attackWindupDelay || 300;
        
        // Lock animation and play attack
        this.animationLocked = true;
        this.lockTimer = Math.max(animationDuration, windupDelay + 100);
        this.sprite.anims.play(`${this.variationName}_${attackType}`, true);
        
        // Start attack windup
        this.isWindingUp = true;
        this.windupTimer = windupDelay;
        this.canDealDamage = false;
        
        // Update facingLeft to match current flipX state (for hitbox calculations)
        this.facingLeft = this.sprite.flipX;
        
        console.log(`👹 Boss ${this.bossName} attack setup:`, {
            attackType: attackType,
            windupDelay: windupDelay,
            isWindingUp: this.isWindingUp,
            windupTimer: this.windupTimer,
            canDealDamage: this.canDealDamage,
            facingLeft: this.facingLeft,
            flipX: this.sprite.flipX
        });
        
        // Update last attack time
        this.lastAttackTime = this.scene.time.now;
        
        // Reset hit flag for new attack
        this.hasHitPlayer = false;
        
        // Play boss attack sound (use bossName or characterConfig name)
        if (this.scene.audioManager) {
            // Try to use boss-specific sound, fallback to character name
            const soundType = this.bossName?.toLowerCase().includes('critic') ? 'critic' : this.characterConfig.name;
            this.scene.audioManager.playEnemyAttack(soundType);
                }
    }
    
    // Alias for boss-specific attack
    startBossAttack() {
        this.setState(BOSS_STATES.ATTACKING);
    }
    
    takeDamage(damage = 1) {
        // Prevent damage during jumps (boss shouldn't take damage when landing)
        if (this.state === BOSS_STATES.JUMPING) {
            console.log(`👹 [BOSS_DAMAGE] ⚠️ Boss ${this.bossName} is jumping - damage blocked`);
            return;
        }
        
        const healthBefore = this.health;
        
        console.log(`👹 [BOSS_DAMAGE] Boss ${this.bossName} taking ${damage} damage. Health: ${healthBefore} -> ${healthBefore - damage}`);
        
        // Call parent takeDamage
        super.takeDamage(damage);
        
        // Ensure health doesn't go below 0 (clamp to 0 minimum)
        if (this.health < 0) {
            this.health = 0;
        }
        
        console.log(`👹 [BOSS_DAMAGE] After takeDamage, health is now: ${this.health}/${this.maxHealth}`);
        
        // Update health bar immediately
        if (this.scene.uiManager && this.scene.uiManager.updateBossHealthBar) {
            this.scene.uiManager.updateBossHealthBar(this.health, this.maxHealth);
        }
        
        // Check for jump-on-damage behavior
        if (this.behaviors.jumpOnDamage && this.state !== BOSS_STATES.JUMPING && this.state !== BOSS_STATES.DYING) {
            const healthPercent = this.health / this.maxHealth;
            const healthLostThisHit = this.lastHealthPercent - healthPercent;
            
            // Accumulate health loss since last jump
            this.cumulativeHealthLost += healthLostThisHit;
            
            console.log(`👹 [BOSS_JUMP_CHECK] jumpOnDamage=${this.behaviors.jumpOnDamage}, healthLostThisHit=${healthLostThisHit.toFixed(3)}, cumulativeHealthLost=${this.cumulativeHealthLost.toFixed(3)}, threshold=${this.bossConfig.jumpOnDamageThreshold}, lastHealthPercent=${this.lastHealthPercent.toFixed(3)}, currentHealthPercent=${healthPercent.toFixed(3)}`);
            
            // Check if we've lost enough cumulative health to trigger jump
            // Values are already merged from BOSS_TYPE_CONFIGS -> bossConfig in constructor
            const jumpThreshold = this.bossConfig.jumpOnDamageThreshold;
            const jumpCooldown = this.bossConfig.jumpCooldown;
            
            // Use a small epsilon for floating point comparison
            if (this.cumulativeHealthLost >= jumpThreshold - 0.001) {
                const timeSinceLastJump = this.scene.time.now - this.lastJumpTime;
                console.log(`👹 [BOSS_JUMP_CHECK] Cumulative health threshold met! cumulativeHealthLost=${this.cumulativeHealthLost.toFixed(3)} >= ${jumpThreshold}, timeSinceLastJump=${timeSinceLastJump}, cooldown=${jumpCooldown}`);
                if (timeSinceLastJump >= jumpCooldown) {
                    console.log(`👹 [BOSS_JUMP_CHECK] ✅ Triggering boss jump!`);
                    this.executeBossJump();
                    // Reset cumulative health loss after jumping
                    this.cumulativeHealthLost = 0.0;
                } else {
                    console.log(`👹 [BOSS_JUMP_CHECK] ⏳ Jump on cooldown, need ${jumpCooldown - timeSinceLastJump}ms more`);
                }
            } else {
                console.log(`👹 [BOSS_JUMP_CHECK] ⏳ Not enough cumulative health lost yet: ${this.cumulativeHealthLost.toFixed(3)} < ${jumpThreshold}`);
            }
            
            this.lastHealthPercent = healthPercent;
        } else {
            if (!this.behaviors.jumpOnDamage) {
                console.log(`👹 [BOSS_JUMP_CHECK] ⚠️ jumpOnDamage behavior is disabled`);
            }
            if (this.state === BOSS_STATES.JUMPING) {
                console.log(`👹 [BOSS_JUMP_CHECK] ⚠️ Boss is already jumping`);
            }
            if (this.state === BOSS_STATES.DYING) {
                console.log(`👹 [BOSS_JUMP_CHECK] ⚠️ Boss is dying`);
            }
        }
        
        // Check for boss defeat - ensure health is clamped to 0 minimum
        if (this.health < 0) {
            this.health = 0;
        }
        
        // Check for boss defeat - trigger if health reaches 0 or below
        if (this.health <= 0 && healthBefore > 0) {
            console.log(`👹 [BOSS_DAMAGE] ⚠️ BOSS DEFEATED! Health dropped from ${healthBefore} to ${this.health}`);
            this.health = 0; // Ensure health is exactly 0
            this.onBossDefeat();
        } else if (this.health <= 0 && healthBefore <= 0) {
            // Health was already 0 or below, but defeat wasn't triggered - trigger it now
            console.log(`👹 [BOSS_DAMAGE] ⚠️ BOSS DEFEATED (health already at/below 0)! Health: ${this.health}`);
            this.health = 0; // Ensure health is exactly 0
            if (this.state !== BOSS_STATES.DYING && this.state !== BOSS_STATES.DEAD) {
            this.onBossDefeat();
            }
        }
    }
    
    executeBossJump() {
        if (!this.player || !this.sprite) {
            console.warn(`👹 [BOSS_JUMP] Cannot jump - missing player or sprite`);
            return;
        }

        console.log(`👹 [BOSS_JUMP] Boss ${this.bossName} executing pre-jump punch attack`);

        // Reset tracking
        this.preJumpPunchHit = false;
        this.lastJumpTime = this.scene.time.now;
        this.cumulativeHealthLost = 0.0; // Reset cumulative health loss when jumping
        
        // First, perform a punch attack before jumping
        this.setState(BOSS_STATES.ATTACKING);
        this.startAttack(); // Start the punch attack
        
        // Set up a check loop to detect when punch hits player
        // Check every frame during the attack window
        this.preJumpPunchCheckTimer = this.scene.time.addEvent({
            delay: 50, // Check every 50ms
            callback: () => {
                if (this.state !== BOSS_STATES.ATTACKING) {
                    // Attack finished, stop checking
                    if (this.preJumpPunchCheckTimer) {
                        this.preJumpPunchCheckTimer.destroy();
                        this.preJumpPunchCheckTimer = null;
                    }
                    
                    // If punch didn't hit, proceed immediately with jump
                    // If punch hit, proceedWithJump was already scheduled
                    if (!this.preJumpPunchHit) {
                        this.proceedWithJump();
                    }
                    return;
                }
                
                // Check if punch hit the player during attack window
                if (this.canDealDamage && !this.preJumpPunchHit) {
                    this.checkPreJumpPunchHit();
                }
            },
            repeat: -1 // Repeat until destroyed
        });
    }
    
    checkPreJumpPunchHit() {
        if (!this.player || !this.sprite || this.preJumpPunchHit) return;
        
        // Get attack hitbox (only valid when canDealDamage is true)
        const attackHitbox = this.getAttackHitbox();
        if (!attackHitbox) {
            return; // Not in attack window yet
        }
        
        // Check if player is in hitbox
        const playerSprite = this.player.sprite || this.player;
        const playerBox = {
            x: playerSprite.x - playerSprite.width / 2,
            y: playerSprite.y - playerSprite.height / 2,
            width: playerSprite.width,
            height: playerSprite.height
        };
        
        const hit = (attackHitbox.x < playerBox.x + playerBox.width &&
                    attackHitbox.x + attackHitbox.width > playerBox.x &&
                    attackHitbox.y < playerBox.y + playerBox.height &&
                    attackHitbox.y + attackHitbox.height > playerBox.y);
        
        if (hit) {
            console.log(`👹 [BOSS_JUMP] Pre-jump punch HIT player!`);
            this.preJumpPunchHit = true;
            this.hasHitPlayer = true; // Mark as hit to prevent duplicate damage
            
            // Stop the check timer
            if (this.preJumpPunchCheckTimer) {
                this.preJumpPunchCheckTimer.destroy();
                this.preJumpPunchCheckTimer = null;
            }
            
            // Deal damage to player only 30% of the time
            const damageChance = Math.random();
            if (damageChance <= 0.3 && this.scene.playerTakeDamage) {
                this.scene.playerTakeDamage(this.playerDamage || 10);
                console.log(`👹 [BOSS_JUMP] Pre-jump punch dealt damage (30% chance)`);
            } else {
                console.log(`👹 [BOSS_JUMP] Pre-jump punch hit but no damage (70% chance)`);
            }
            
            // Show "not good" animation and lock player movement (always happens on hit)
            this.lockPlayerMovement();
            this.showNotGoodAnimation();
            
            // Wait for attack animation to finish, then proceed with jump
            const attackAnimDuration = 300; // Approximate duration
            this.scene.time.delayedCall(attackAnimDuration, () => {
                this.proceedWithJump();
            });
            
            // Note: Player will be unlocked when flash completes (handled in showNotGoodAnimation)
        }
    }
    
    showNotGoodAnimation() {
        if (!this.player) return;
        
        const playerSprite = this.player.sprite || this.player;
        const imageKey = 'notGoodText'; // Single image, not spritesheet
        
        // Check if image exists
        if (!this.scene.textures.exists(imageKey)) {
            console.error(`👹 [BOSS_JUMP] Image ${imageKey} not found!`);
            return;
        }
        
        // Set texture filter to NEAREST for pixel-perfect rendering (no anti-aliasing)
        try {
            const tex = this.scene.textures.get(imageKey);
            if (tex && tex.setFilter) {
                tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        } catch (e) {
            // Ignore if texture not yet available
        }
        
        // Create "not good" text sprite centered on player
        if (!this.notGoodSprite) {
            // Position it centered on the player (lower than before)
            this.notGoodSprite = this.scene.add.image(playerSprite.x, playerSprite.y - 30, imageKey);
            this.notGoodSprite.setDepth(3000); // Above everything
            this.notGoodSprite.setScrollFactor(1); // Scroll with world (follows player)
            this.notGoodSprite.setScale(2); // Smaller scale (reduced from 3)
            this.notGoodSprite.setVisible(false); // Start hidden
        }
        
        // Position it centered on the player
        this.notGoodSprite.x = playerSprite.x;
        this.notGoodSprite.y = playerSprite.y - 30;
        
        // Calculate freeze duration based on jump duration
        // Freeze should last until jump completes, but be slightly shorter to give player time to react
        const jumpDuration = this.getJumpDuration();
        // Use jump duration * 0.8 to ensure player can move slightly before boss lands
        // This gives player time to dodge before boss starts throwing
        const freezeDuration = Math.round(jumpDuration * 0.8);
        
        // Flash parameters - determined by freeze duration
        const flashOnDuration = 150; // Visible for 150ms (long enough to read)
        const flashOffDuration = 50; // Hidden for 50ms
        const flashCycleDuration = flashOnDuration + flashOffDuration; // 200ms per cycle
        
        // Calculate number of flashes based on freeze duration
        // Ensure we get a whole number of flashes that fits within the freeze duration
        const numFlashes = Math.max(1, Math.floor(freezeDuration / flashCycleDuration));
        const totalFlashDuration = flashCycleDuration * numFlashes;
        
        // Store flash duration for unlock timing
        this.notGoodFlashDuration = freezeDuration;
        
        // Start first flash (visible)
        this.notGoodSprite.setVisible(true);
        let flashCount = 0;
        
        // Flash pattern: visible -> hidden -> visible -> hidden (4 times)
        const flashPattern = () => {
            flashCount++;
            if (flashCount < numFlashes * 2) { // 2 states per flash (on/off)
                if (flashCount % 2 === 0) {
                    // Even count = show
                    this.notGoodSprite.setVisible(true);
                    this.scene.time.delayedCall(flashOnDuration, flashPattern);
                } else {
                    // Odd count = hide
                    this.notGoodSprite.setVisible(false);
                    this.scene.time.delayedCall(flashOffDuration, flashPattern);
                }
            } else {
                // All flashes complete, hide sprite (but keep player locked until freeze duration)
                this.notGoodSprite.setVisible(false);
            }
        };
        
        // Start the flash pattern
        this.scene.time.delayedCall(flashOnDuration, flashPattern);
        
        // Unlock player after freeze duration (jumpDuration / 1.5 or flash duration, whichever is longer)
        this.scene.time.delayedCall(freezeDuration, () => {
            if (this.playerMovementLocked) {
                this.unlockPlayerMovement();
            }
        });
        
        console.log(`👹 [BOSS_JUMP] Showing "not good" text above player (flashing ${numFlashes} times, ${totalFlashDuration}ms flash, ${freezeDuration}ms freeze, jumpDuration=${jumpDuration}ms)`);
    }
    
    lockPlayerMovement() {
        // Lock player movement via input manager
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = true;
            this.playerMovementLocked = true;
            console.log(`👹 [BOSS_JUMP] Player movement locked`);
        }
        
        // Also stop player velocity
        if (this.player && this.player.body) {
            this.player.setVelocity(0, 0);
        }
        
        // Force player to idle animation when hit with "not good"
        if (this.player && this.scene.animationManager) {
            const charName = this.player.characterConfig?.name || 'tireek';
            // Clear any animation locks and set to idle
            this.scene.animationManager.currentState = 'idle';
            this.scene.animationManager.animationLocked = false;
            this.scene.animationManager.lockTimer = 0;
            // Play idle animation
            if (this.player.anims) {
                this.player.anims.play(`${charName}_idle`, true);
            }
            console.log(`👹 [BOSS_JUMP] Forced player to idle animation`);
        }
    }
    
    unlockPlayerMovement() {
        // Unlock player movement
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = false;
            this.playerMovementLocked = false;
            console.log(`👹 [BOSS_JUMP] Player movement unlocked`);
        }
        
        // Stop flashing and hide "not good" sprite
        if (this.notGoodFlashTimer) {
            this.notGoodFlashTimer.destroy();
            this.notGoodFlashTimer = null;
        }
        
        if (this.notGoodSprite) {
            this.notGoodSprite.setVisible(false);
        }
    }
    
    // Calculate jump duration based on jump type
    getJumpDuration() {
        if (this.jumpType === 'teleport') {
            return 300; // Teleport is instant, but has a delay
        } else if (this.jumpType === 'flip') {
            return 800; // Flip jump duration
        } else {
            return 500; // Physics-based jump duration
        }
    }
    
    proceedWithJump() {
        if (!this.player || !this.sprite) {
            console.warn(`👹 [BOSS_JUMP] Cannot proceed with jump - missing player or sprite`);
            return;
        }

        // Prevent double calls
        if (this.state === BOSS_STATES.JUMPING) {
            console.log(`👹 [BOSS_JUMP] Already jumping, skipping proceedWithJump`);
            return;
        }

        console.log(`👹 [BOSS_JUMP] Boss ${this.bossName} executing jump to opposite arena side`);

        this.setState(BOSS_STATES.JUMPING);

        // For edge-standing bosses, jump to the opposite edge of the arena
        const camera = this.scene.cameras.main;
        const cameraLeft = camera.scrollX + this.edgeMargin;
        const cameraRight = camera.scrollX + camera.width - this.edgeMargin;
        const bossX = this.sprite.x;
        const cameraCenter = camera.scrollX + camera.width / 2;

        // Determine current edge if not set
        if (!this.currentEdge) {
            // Determine which edge we're closer to
            this.currentEdge = bossX < cameraCenter ? 'left' : 'right';
            console.log(`👹 [BOSS_JUMP] currentEdge was null, determined it to be: ${this.currentEdge} (bossX=${bossX}, cameraCenter=${cameraCenter})`);
        }

        let targetX;
        if (this.currentEdge === 'left') {
            // Currently on left edge, jump directly to right edge
            targetX = cameraRight; // Jump directly to the edge
            this.currentEdge = 'right';
            console.log(`👹 [BOSS_JUMP] Jumping from LEFT to RIGHT: bossX=${bossX}, cameraLeft=${cameraLeft}, targetX=${targetX.toFixed(1)}, cameraRight=${cameraRight}`);
        } else {
            // Currently on right edge, jump directly to left edge
            targetX = cameraLeft; // Jump directly to the edge
            this.currentEdge = 'left';
            console.log(`👹 [BOSS_JUMP] Jumping from RIGHT to LEFT: bossX=${bossX}, cameraRight=${cameraRight}, targetX=${targetX.toFixed(1)}, cameraLeft=${cameraLeft}`);
        }
        
        // Update facing direction after determining new edge
        this.updateFacingDirection();

        // Keep Y position similar
        const targetY = this.sprite.y;
        
        if (this.jumpType === 'teleport') {
            // Instant teleport
            this.sprite.x = targetX;
            this.sprite.y = targetY;
            
            // Flash effect
            this.sprite.setTint(0xffffff);
            this.scene.time.delayedCall(100, () => {
                if (this.sprite && this.sprite.active) {
                    this.sprite.clearTint();
                }
            });
            
            // Return to previous state
            this.scene.time.delayedCall(300, () => {
                if (this.sprite && this.state === BOSS_STATES.JUMPING) {
                    this.jumpLandingTime = this.scene.time.now; // Record landing time
                    this.updateFacingDirection(); // Ensure correct facing direction after landing
                    
                    // Reset throw cooldown so boss can throw immediately after landing
                    this.lastThrowTime = 0;
                    
                    // Don't unlock player here - unlock happens when flash completes
                    // Player is unlocked in showNotGoodAnimation after flash duration
                    
                    this.setState(BOSS_STATES.WALKING);
                    console.log(`👹 [BOSS_JUMP] Teleport jump complete, boss at (${this.sprite.x.toFixed(1)}, ${this.sprite.y.toFixed(1)}), edge=${this.currentEdge}, throw cooldown reset`);
                }
            });
        } else if (this.jumpType === 'flip') {
            // Acrobatic flip jump
            const jumpHeight = 250;
            const jumpDuration = 800;
            
            // Determine direction for flip
            const direction = targetX > this.sprite.x ? 1 : -1;
            const startX = this.sprite.x;
            const startY = this.sprite.y;
            
            // Play jump sound if available
            if (this.scene.audioManager && this.scene.audioManager.playJump) {
                this.scene.audioManager.playJump();
            }
            
            // Calculate midpoint for peak of jump (peak should be in the middle, not at the end)
            const midX = (startX + targetX) / 2;
            const peakY = startY - jumpHeight;
            
            // Create tween for jump arc - peak should be in the middle
            // First half: go up and forward to midpoint (peak)
            this.scene.tweens.add({
                targets: this.sprite,
                x: midX, // Peak at midpoint X
                y: peakY, // Peak height
                angle: 180 * direction, // Half rotation going up
                duration: jumpDuration / 2,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    // Second half: come down and forward from peak to target position
                    this.scene.tweens.add({
                        targets: this.sprite,
                        x: targetX, // Land at target X
                        y: targetY, // Land at target Y
                        angle: 360 * direction, // Complete the rotation
                        duration: jumpDuration / 2,
                        ease: 'Sine.easeIn',
                onComplete: () => {
                    if (this.sprite && this.sprite.active) {
                                    // Ensure exact landing position
                                    this.sprite.x = targetX;
                                    this.sprite.y = targetY;
                        this.sprite.angle = 0;   // Reset rotation
                        
                                    // Update facing direction after landing
                                    this.updateFacingDirection();
                        
                        if (this.state === BOSS_STATES.JUMPING) {
                                        // After landing, return to walking state so boss can throw weapons again
                                        this.jumpLandingTime = this.scene.time.now; // Record landing time
                                        
                                        // Reset throw cooldown so boss can throw immediately after landing
                                        // (when he's farthest from player - best advantage)
                                        this.lastThrowTime = 0;
                                        
                                        // Don't unlock player here - unlock happens when flash completes
                                        // Player is unlocked in showNotGoodAnimation after flash duration
                                        
                            this.setState(BOSS_STATES.WALKING);
                                        console.log(`👹 [BOSS_JUMP] Jump complete, boss landed at (${this.sprite.x.toFixed(1)}, ${this.sprite.y.toFixed(1)}), state set to WALKING, edge=${this.currentEdge}, throw cooldown reset`);
                        }
                    }
                        }
                    });
                }
            });
        } else {
            // Physics-based jump with arc
            const jumpHeight = 150;
            const jumpDuration = 500;
            
            // Create tween for jump arc
            this.scene.tweens.add({
                targets: this.sprite,
                x: targetX,
                y: targetY - jumpHeight,
                duration: jumpDuration / 2,
                ease: 'Power2',
                onComplete: () => {
                    // Fall down
                    this.scene.tweens.add({
                        targets: this.sprite,
                        y: targetY,
                        duration: jumpDuration / 2,
                        ease: 'Power2',
                        onComplete: () => {
                            if (this.sprite && this.state === BOSS_STATES.JUMPING) {
                                this.jumpLandingTime = this.scene.time.now; // Record landing time
                                this.updateFacingDirection(); // Ensure correct facing direction after landing
                                
                                // Reset throw cooldown so boss can throw immediately after landing
                                this.lastThrowTime = 0;
                                
                                // Don't unlock player here - unlock happens when flash completes
                                // Player is unlocked in showNotGoodAnimation after flash duration
                                
                                this.setState(BOSS_STATES.WALKING);
                                console.log(`👹 [BOSS_JUMP] Physics jump complete, boss at (${this.sprite.x.toFixed(1)}, ${this.sprite.y.toFixed(1)}), edge=${this.currentEdge}, throw cooldown reset`);
                            }
                        }
                    });
                }
            });
        }
    }
    
    updateJump(delta) {
        // Jump behavior handled in executeBossJump via tweens
        // This is called during jump state for any additional updates
    }

    updateVerticalMovement() {
        if (!this.player || !this.sprite) return;
        
        // Don't move vertically if attacking or casting
        if (this.state === BOSS_STATES.ATTACKING || this.state === BOSS_STATES.THROWING) return;

        const targetY = this.player.y;
        const currentY = this.sprite.y;
        const diffY = targetY - currentY;
        
        // Deadzone to prevent jitter
        if (Math.abs(diffY) > 10) {
            const speed = this.speed * 0.8; // Vertical speed slightly slower
            const direction = Math.sign(diffY);
            
            this.sprite.setVelocityY(direction * speed);
        } else {
            this.sprite.setVelocityY(0);
        }
        
        // Constrain to street bounds if available
        if (this.scene.inputManager && this.scene.inputManager.streetTopLimit) {
            const minY = this.scene.inputManager.streetTopLimit;
            const maxY = this.scene.inputManager.streetBottomLimit;
            
            if (this.sprite.y < minY) this.sprite.y = minY;
            if (this.sprite.y > maxY) this.sprite.y = maxY;
        }
    }
    
    updateWeaponThrowing(time, delta) {
        if (!this.player || !this.sprite) return;
        
        // Check cooldown
        const timeSinceLastThrow = time - this.lastThrowTime;
        if (timeSinceLastThrow < this.throwWeaponCooldown) {
            return;
        }
        
        // Check if player is in range
        const distanceToPlayer = Math.abs(this.sprite.x - this.player.x);
        if (distanceToPlayer > this.throwWeaponRange) {
            return;
        }
        
        // PRIORITY: Don't throw weapons if player is close enough for melee attacks
        // This allows the boss to use melee attacks when close, and ranged attacks when far
        const meleeAttackRange = this.attackRange || ENEMY_CONFIG.attackRange || 140;
        if (distanceToPlayer <= meleeAttackRange) {
            // Player is close - let melee attack system handle it instead
            return;
        }
        
        // Check if boss is not already attacking or jumping
        if (this.state === BOSS_STATES.ATTACKING || this.state === BOSS_STATES.JUMPING) {
            return;
        }
        
        // Throw weapon (only when player is far enough away)
        this.executeBossThrow();
    }
    
    executeBossThrow() {
        if (!this.player || !this.sprite || !this.scene.weaponManager) return;
        
        // Ensure we are targeting the active player
        // The update loop should keep this in sync, but for the throw calculation, 
        // using scene.player is safer to ensure we target the currently visible character
        const targetPlayer = this.scene.player || this.player;

        console.log(`👹 Boss ${this.bossName} throwing rating weapon`);

        this.lastThrowTime = this.scene.time.now;
        this.setState(BOSS_STATES.THROWING);

        // Determine throw direction based on target player
        const direction = this.sprite.x < targetPlayer.x ? 1 : -1;

        // Calculate throw position (from boss sprite)
        const throwX = this.sprite.x + (direction * 50);
        const throwY = this.sprite.y;

        // Randomly select a rating weapon (0-4 stars)
        const ratingLevel = Math.floor(Math.random() * 5); // 0-4
        const weaponType = `rating_${ratingLevel}`;

        // Use WeaponManager to create projectile
        if (this.scene.weaponManager.createBossProjectile) {
            this.scene.weaponManager.createBossProjectile(throwX, throwY, direction, weaponType);
        } else {
            // Fallback: create projectile directly
            this.createBossProjectile(throwX, throwY, direction, weaponType);
        }

        // Return to walking state after throw (so boss can still attack)
        this.scene.time.delayedCall(500, () => {
            if (this.sprite && this.state === BOSS_STATES.THROWING) {
                // Update facing direction before returning to walking state
                this.updateFacingDirection();
                this.setState(BOSS_STATES.WALKING);
            }
        });
    }
    
    createBossProjectile(x, y, direction, weaponType = 'vinyl') {
        // Create a projectile using WeaponManager's projectile system
        // This is a simplified version - may need to extend WeaponManager
        const weaponConfig = WEAPON_CONFIG[weaponType] || WEAPON_CONFIG.vinyl;
        
        if (this.scene.weaponManager && this.scene.weaponManager.projectiles) {
            const projectile = new Projectile(this.scene, x, y, weaponConfig, direction);
            this.scene.weaponManager.projectiles.push(projectile);
        }
    }
    
    updateThrow(delta) {
        // Throwing behavior handled in executeBossThrow via delayed call
        // This is called during throw state for any additional updates
    }

    updateEdgeStanding() {
        // Stand on the edges of the camera view
        const camera = this.scene.cameras.main;
        const cameraLeft = camera.scrollX + this.edgeMargin;
        const cameraRight = camera.scrollX + camera.width - this.edgeMargin;

        // Determine which edge to stand on based on player position
        const playerCenter = this.player.x;
        const cameraCenter = camera.scrollX + camera.width / 2;

        let targetEdge, targetX;

        if (playerCenter < cameraCenter) {
            // Player is on left side, stand on right edge
            targetEdge = 'right';
            targetX = cameraRight;
        } else {
            // Player is on right side, stand on left edge
            targetEdge = 'left';
            targetX = cameraLeft;
        }

        // Move to edge if not already there
        if (this.currentEdge !== targetEdge) {
            this.currentEdge = targetEdge;
            this.updateFacingDirection(); // Update facing direction when edge changes

            // Smooth movement to edge
            const moveSpeed = this.speed * 0.5; // Slower movement to edges
            const distance = Math.abs(this.sprite.x - targetX);

            if (distance > 10) { // Only move if not already at edge
                const direction = targetX > this.sprite.x ? 1 : -1;
                this.sprite.setVelocityX(direction * moveSpeed);
                // Facing direction is handled by updateFacingDirection() above
            } else {
                // Stop moving when at edge, but stay in WALKING state so attacks work
                this.sprite.setVelocityX(0);
                this.setState(BOSS_STATES.WALKING);
            }
        } else {
            // Already on correct edge, stop moving but stay in WALKING state so attacks work
            this.sprite.setVelocityX(0);
            this.setState(BOSS_STATES.WALKING);
        }
    }
    
    onBossDefeat() {
        // Prevent multiple calls
        if (this.state === BOSS_STATES.DYING || this.state === BOSS_STATES.DEAD) {
            console.log(`👹 [BOSS_DEFEAT] Already in dying/dead state, ignoring duplicate call`);
            return;
        }
        
        console.log(`👹 Boss ${this.bossName} defeated!`);
        console.log(`👹 [BOSS_DEFEAT] Health: ${this.health}/${this.maxHealth}, State: ${this.state}`);
        console.log(`👹 [BOSS_DEFEAT] Stack trace:`, new Error().stack);
        
        // Set to dying state
        this.setState(BOSS_STATES.DYING);
        
        // Trigger callback if set
        if (this.onBossDefeated) {
            console.log(`👹 [BOSS_DEFEAT] Calling onBossDefeated callback`);
            this.onBossDefeated(this);
        } else {
            console.warn(`👹 [BOSS_DEFEAT] ⚠️ No onBossDefeated callback set! Boss defeated but no one is waiting for it.`);
        }
        
        // Play death animation
        this.sprite.setTint(0x888888);
        this.sprite.setVelocity(0, 0);
        
        // Play enemy death sound
        if (this.scene.audioManager) {
            this.scene.audioManager.playEnemyDeath();
        }
        
        // Hide boss health bar
        if (this.scene.uiManager && this.scene.uiManager.hideBossHealthBar) {
            this.scene.uiManager.hideBossHealthBar();
        }
        
        // Boss will be destroyed by event system after dialogue
    }
    
    destroy() {
        // Clean up pre-jump punch check timer
        if (this.preJumpPunchCheckTimer) {
            this.preJumpPunchCheckTimer.destroy();
            this.preJumpPunchCheckTimer = null;
        }
        
        // Clean up flash timer
        if (this.notGoodFlashTimer) {
            this.notGoodFlashTimer.destroy();
            this.notGoodFlashTimer = null;
        }
        
        // Unlock player movement if still locked
        if (this.playerMovementLocked) {
            this.unlockPlayerMovement();
        }
        
        // Clean up "not good" sprite
        if (this.notGoodSprite) {
            this.notGoodSprite.destroy();
            this.notGoodSprite = null;
        }
        
        // Hide boss health bar before destroying
        if (this.scene.uiManager && this.scene.uiManager.hideBossHealthBar) {
            this.scene.uiManager.hideBossHealthBar();
        }
        
        // Call parent destroy
        super.destroy();
    }
}

// Make Boss class available globally
if (typeof window !== 'undefined') {
    window.Boss = Boss;
    window.BOSS_STATES = BOSS_STATES;
    window.BOSS_TYPE_CONFIGS = BOSS_TYPE_CONFIGS;
}

