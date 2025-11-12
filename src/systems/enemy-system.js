// ========================================
// ENEMY SYSTEM
// ========================================
// This file contains the enemy AI system, configuration, and behavior logic

// Enemy AI States
const ENEMY_STATES = {
    SPAWNING: 'spawning',
    WALKING: 'walking',
    ATTACKING: 'attacking',
    STUNNED: 'stunned',
    DEAD: 'dead'
};

// Enemy Behavior Types
const ENEMY_BEHAVIORS = {
    CALL_FOR_HELP: 'callForHelp',
    COORDINATE_ALLIES: 'coordinateAllies',
    ASSESS_PLAYER_STATE: 'assessPlayerState',
    CHECK_ENVIRONMENT: 'checkEnvironment',
    CHECK_CROWD_SIZE: 'checkCrowdSize',
    CHECK_EXPERIENCE: 'checkExperience',
    CHECK_PLAYER_HEALTH: 'checkPlayerHealth',
    CHECK_PLAYER_WEAPONS: 'checkPlayerWeapons',
    DODGE_ATTACKS: 'dodgeAttacks'
};

// ========================================
// ENEMY BEHAVIOR CONFIGURATION CENTER
// ========================================
// 🎮 GAME BALANCE CONTROL PANEL 🎮
// 
// This is your one-stop shop for tweaking enemy behavior!
// Change these values to adjust difficulty, pacing, and feel.
//
// 💡 QUICK TWEAKS:
// - Want more action? Decrease spawnInterval, increase maxEnemiesOnScreen
// - Too hard? Increase health, decrease playerDamage
// - Enemies too slow? Increase speed
// - Want faster gameplay? Decrease attackCooldown

const ENEMY_CONFIG = {
    // 👹 SPAWNING BEHAVIOR
    spawnInterval: 800,         // milliseconds between enemy spawns (lower = more frequent) - INCREASED from 1200
    maxEnemiesOnScreen: 5,      // maximum enemies allowed at once (higher = more chaos)
    spawnOffscreenDistance: 50, // how far offscreen enemies spawn (higher = more spawn time)
    
    // 💪 ENEMY STATS (base values - can be overridden per enemy type)
    health: 10,                  // strength of enemy (higher = tankier enemies)
    speed: 180,                  // enemy movement speed (player is 420, so this is ~19% player speed)
    verticalMoveSpeed: 2,       // speed for up/down movement (beat 'em up style)
    
    // 🧠 AI BEHAVIOR
    detectionRange: 1200,       // distance at which enemies notice player (higher = more aggressive) - INCREASED from 800
    attackRange: 140,           // distance at which enemies can attack (lower = need to get closer)
    attackCooldown: 250,       // milliseconds between enemy attacks (lower = more frequent attacks)
    deadZoneHorizontal: 60,     // prevents jittering when close to player horizontally
    deadZoneVertical: 25,       // prevents vertical jittering (smoother movement) - balanced for responsiveness
    
    // 🎨 VISUAL & CLEANUP
    deathLingerTime: 2000,      // how long dead enemies stay on screen (ms) - dramatic effect
    cleanupDistance: 1200,      // distance at which enemies are removed (increased to be larger than spawn distance ~820px)
    cleanupDistanceBehind: 1000, // More aggressive cleanup for enemies behind player (when player is moving forward)
    cleanupGracePeriod: 3000,   // Grace period after spawn before cleanup can occur (ms) - prevents immediate cleanup
    damageFlashTime: 200,       // duration of damage flash effect (ms) - increased for better visibility
    deathFlashTime: 300,        // duration of death flash effect (ms) - visible red flash before disappearing
    
    // 🏃 CATCH-UP BEHAVIOR
    catchUpSpeedMultiplier: 2.0, // Speed multiplier when enemy is behind player and player is moving forward
    catchUpDistance: 500,       // Distance threshold for catch-up behavior (enemy behind player by this much)
    
    // 📏 SCALING & SIZE (further increased by 1.25x)
    minScale: 4.356,            // 3.4848 * 1.25
    maxScale: 5.445,            // 4.356 * 1.25
    
    // ⚔️ COMBAT
    playerDamage: 10,          // damage enemies deal to player (DOUBLED from 5 - more punishing!)
    playerFlashTime: 200,       // player damage flash duration (ms) - visual feedback
    attackWindupDelay: 300,     // delay before attack actually hits (ms) - gives player time to react
    knockbackForce: 150,        // Horizontal knockback force when hit by player (pixels/second)
    knockbackDuration: 200,     // Duration of knockback effect (ms)
    
    // 🎯 VERTICAL MOVEMENT CONTROL
    verticalMoveSpeed: 1,       // Reduced from 2 - much slower vertical movement
    verticalResponseDelay: 200, // Reduced from 300 - enemies respond faster but still not instantly
    verticalDeadZone: 25,       // Reduced from 40 - enemies respond to moderate vertical differences
    ignoreJumpingPlayer: true,  // Enemies ignore vertical movements when player is jumping
    
    // NOTE: Hitbox dimensions are now configured in HITBOX_CONFIG (characters.js)
};

// ========================================
// ENEMY TYPE CONFIGURATIONS
// ========================================
// 🎯 ENEMY VARIETY CONTROL PANEL 🎯
// 
// Each enemy type can have different stats and behaviors.
// This creates variety and strategic depth in combat!

const ENEMY_TYPE_CONFIGS = {
    crackhead: {
        // Base stats (inherits from ENEMY_CONFIG if not specified)
        health: 10,                    // Weak but numerous
        speed: 400,                   // Slow, shambling movement
        attackCooldown: 300,         // Slower attacks
        playerDamage: 2,             // Less damage (DOUBLED from 1)
        attackTypes: ['jab', 'bottle_attack'],
        detectionRange: 900,         // Less aggressive - shorter detection range (increased from 600)
        baseScale: 0.65,              // Base size multiplier (1.0 = normal size, 0.8 = smaller, 1.2 = larger)
        description: "Weak but numerous crackhead enemies"
    },
    
    green_thug: {
        // Medium difficulty enemy
        health: 20,                   // Medium health
        speed: 300,                   // Faster than crackhead
        attackCooldown: 250,         // Standard attack speed
        playerDamage: 5,             // Medium damage (DOUBLED from 2)
        attackTypes: ['knife_hit'],
        detectionRange: 1200,        // Standard detection range (increased from 800)
        baseScale: 0.6,              // Base size multiplier (1.0 = normal size)
        description: "Medium difficulty thug with knife attacks"
    },
    
    black_thug: {
        // Harder enemy type
        health: 30,                   // Higher health
        speed: 200,                   // Fast movement
        attackCooldown: 200,         // Faster attacks
        playerDamage: 7,             // Higher damage (DOUBLED from 3)
        attackTypes: ['enemy_punch'],
        detectionRange: 1500,        // More aggressive - longer detection range (increased from 1000)
        baseScale: 0.6,              // Base size multiplier (1.0 = normal size)
        description: "Harder thug with powerful punch attacks"
    },
    
    critic: {
        // Special boss-like enemy
        health: 50,                   // High health (boss-tier)
        speed: 150,                   // Slower movement (dramatic)
        attackCooldown: 300,         // Slower attacks
        playerDamage: 9,             // High damage
        attackTypes: ['enemy_punch'],
        detectionRange: 2000,        // Very aggressive - long detection range
        baseScale: 0.85,              // Base size multiplier (1.0 = normal size)
        description: "The Critic - formidable opponent"
    }
};

// Enemy class for AI-controlled characters
class Enemy {
    constructor(scene, x, y, characterConfig) {
        this.scene = scene;
        this.characterConfig = characterConfig;
        this.state = ENEMY_STATES.SPAWNING;
        
        // Get enemy type configuration
        const enemyType = characterConfig.name;
        const typeConfig = ENEMY_TYPE_CONFIGS[enemyType] || {};
        
        // Store base scale multiplier from type config (defaults to 1.0 if not specified)
        this.baseScaleMultiplier = typeConfig.baseScale !== undefined ? typeConfig.baseScale : 1.0;
        
        // Ensure crisp pixel-art filtering for all animations of this enemy
        if (characterConfig && characterConfig.spriteSheets) {
            try {
                Object.keys(characterConfig.spriteSheets).forEach(animKey => {
                    const texKey = `${characterConfig.name}_${animKey}`;
                    if (scene.textures.exists(texKey)) {
                        const tex = scene.textures.get(texKey);
                        if (tex && tex.setFilter) {
                            tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
                        }
                    }
                });
            } catch (e) {}
        }
        
        // Create sprite
        this.sprite = scene.physics.add.sprite(Math.round(x), Math.round(y), `${characterConfig.name}_idle`);
        // Apply base scale multiplier to initial scale
        this.sprite.setScale(ENEMY_CONFIG.minScale * this.baseScaleMultiplier);
        this.sprite.setDepth(y);
        this.sprite.setBounce(0.2);
        this.sprite.setCollideWorldBounds(true);
        
        // Add visual variety based on enemy type (only for crackheads now)
        if (this.characterConfig.name === 'crackhead') {
            // Crackheads keep their original appearance
        }
        // Green and black thugs now use their natural colors without tint
        
        // AI properties (using enemy type config with fallback to base config)
        this.health = typeConfig.health || ENEMY_CONFIG.health;
        this.maxHealth = this.health;
        this.speed = typeConfig.speed || ENEMY_CONFIG.speed;
        this.attackRange = ENEMY_CONFIG.attackRange;
        this.attackCooldown = typeConfig.attackCooldown || ENEMY_CONFIG.attackCooldown;
        this.lastAttackTime = 0;
        this.detectionRange = typeConfig.detectionRange || ENEMY_CONFIG.detectionRange;
        this.playerDamage = typeConfig.playerDamage || ENEMY_CONFIG.playerDamage;
        
        // Store enemy type config for attack selection
        this.enemyTypeConfig = typeConfig;
        
        // Help calling flag
        this.hasCalledForHelp = false;
        
        // Attack hit tracking
        this.hasHitPlayer = false; // Track if current attack has hit player
        
        // Vertical movement tracking
        this.lastPlayerY = 0;
        this.verticalMoveTimer = 0;
        this.isPlayerJumping = false;
        
        // Spawn time for experience tracking
        this.spawnTime = scene.time.now;
        
        // Animation properties
        this.animationLocked = false;
        this.lockTimer = 0;
        this.facingLeft = true; // Start facing left (walking toward player from right)
        // Set sprite to visually face left to match facingLeft property
        this.sprite.setFlipX(true);
        
        // Attack timing properties
        this.isWindingUp = false; // True during attack windup phase
        this.windupTimer = 0;     // Time remaining in windup
        this.canDealDamage = false; // True when attack can actually hit
        
        // Knockback tracking
        this.isKnockedBack = false; // True when enemy is being knocked back
        this.knockbackTimer = 0;   // Time remaining in knockback
        
        // Movement bounds - read from centralized WORLD_CONFIG
        this.streetTopLimit = WORLD_CONFIG.streetTopLimit;
        this.streetBottomLimit = WORLD_CONFIG.streetBottomLimit;
        
        // Store reference to player
        this.player = null;
        
        // Set initial state
        this.setState(ENEMY_STATES.WALKING);
        
        console.log(`Enemy ${characterConfig.name} spawned at (${x}, ${y}) - Type: ${enemyType}, Health: ${this.health}, Speed: ${this.speed}, Damage: ${this.playerDamage}`);
    }
    
    setPlayer(player) {
        this.player = player;
    }
    
    setState(newState) {
        if (this.state === newState) return;
        
        console.log(`Enemy ${this.characterConfig.name} state: ${this.state} -> ${newState}`);
        this.state = newState;
        
        // Handle state-specific setup
        switch (newState) {
            case ENEMY_STATES.WALKING:
                // Try to play walk animation, fall back to idle if walk doesn't exist
                const walkKey = `${this.characterConfig.name}_walk`;
                const idleKey = `${this.characterConfig.name}_idle`;
                
                //console.log(`Enemy ${this.characterConfig.name} trying to play walk animation: ${walkKey}`);
                // console.log(`Available animations:`, Object.keys(this.scene.anims.anims.entries));
                
                // Check if animations exist and are valid
                if (this.scene.anims.exists(walkKey) && this.scene.anims.get(walkKey).frames.length > 0) {
                    console.log(`Playing walk animation: ${walkKey}`);
                    this.sprite.anims.play(walkKey, true);
                } else if (this.scene.anims.exists(idleKey) && this.scene.anims.get(idleKey).frames.length > 0) {
                    console.log(`Falling back to idle animation: ${idleKey}`);
                    this.sprite.anims.play(idleKey, true);
                } else {
                    console.error(`No valid animations found for ${this.characterConfig.name}! Walk: ${walkKey}, Idle: ${idleKey}`);
                    // Don't try to play any animation if none exist
                }
                break;
            case ENEMY_STATES.ATTACKING:
                this.startAttack();
                break;
            case ENEMY_STATES.DEAD:
                this.sprite.setTint(0x888888); // Gray tint when dead
                this.sprite.setVelocity(0, 0);
                break;
        }
    }
    
    update(time, delta) {
        // Early returns for invalid states
        if (!this.player || this.state === ENEMY_STATES.DEAD) return;
        if (!this.sprite || !this.sprite.active) return; // Don't update if sprite is destroyed
        
        // If we spawned outside the world horizontally, re-enable world bounds once we enter
        if (this.reenableWorldBoundsOnEntry) {
            const bounds = this.scene.physics.world.bounds;
            let bodyFullyInside = false;
            if (this.sprite.body) {
                const worldLeft = bounds.x;
                const worldRight = bounds.x + bounds.width;
                bodyFullyInside = (this.sprite.body.left >= worldLeft) && (this.sprite.body.right <= worldRight);
            } else {
                bodyFullyInside = (this.sprite.x >= bounds.x) && (this.sprite.x <= (bounds.x + bounds.width));
            }
            if (bodyFullyInside) {
                if (typeof this.sprite.setCollideWorldBounds === 'function') {
                    this.sprite.setCollideWorldBounds(true);
                }
                this.reenableWorldBoundsOnEntry = false;
            }
        }
        
        // Update perspective scaling (always update depth, even for event-paused enemies)
        this.updatePerspective();
        
        // Skip AI updates if paused by event system (but still update visual properties above)
        if (this.eventPaused) return;
        
        // Update knockback timer
        if (this.isKnockedBack) {
            this.knockbackTimer -= delta;
            if (this.knockbackTimer <= 0) {
                this.isKnockedBack = false;
                // Velocity will be cleared by the delayedCall in takeDamage, but also clear here as safety
                if (this.state === ENEMY_STATES.WALKING || this.state === ENEMY_STATES.SPAWNING) {
                    this.sprite.setVelocityX(0);
                }
            }
        }
        
        // Update animation lock timer
        if (this.lockTimer > 0) {
            this.lockTimer -= delta;
            if (this.lockTimer <= 0) {
                this.animationLocked = false;
                this.canDealDamage = false; // Reset damage capability
                if (this.state === ENEMY_STATES.ATTACKING) {
                    this.setState(ENEMY_STATES.WALKING);
                }
            }
        }
        
        // Track player jumping state (if available)
        if (this.player.isJumping !== undefined) {
            this.isPlayerJumping = this.player.isJumping;
        }
        
        // Update vertical movement timer
        if (this.verticalMoveTimer > 0) {
            this.verticalMoveTimer -= delta;
        }
        
        // Update attack windup timer
        if (this.isWindingUp && this.windupTimer > 0) {
            this.windupTimer -= delta;
            if (this.windupTimer <= 0) {
                // Windup complete, now the attack can deal damage
                this.isWindingUp = false;
                this.canDealDamage = true;
            }
        }
        
        // AI behavior based on state
        switch (this.state) {
            case ENEMY_STATES.WALKING:
                this.updateWalkingBehavior(time);
                break;
            case ENEMY_STATES.ATTACKING:
                this.updateAttackingBehavior();
                break;
        }
    }
    
    updateWalkingBehavior(time) {
        if (this.animationLocked) return;
        
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            this.player.x, this.player.y
        );
        
        // Check if player is in detection range
        if (distanceToPlayer > this.detectionRange) {
            // Stop moving if player is too far
            this.sprite.setVelocity(0, 0);
            return;
        }
        
        // Only run AI behaviors when player is within detection range AND not too frequently
        if (this.shouldRunAIBehaviors(time)) {
            // Execute all behaviors assigned to this enemy
            this.executeBehaviors();
        }

        // Handle low-health aggression (this affects attack parameters, not behaviors)
        let currentAttackRange = this.attackRange;
        let currentAttackCooldown = this.attackCooldown;

        if (this.characterConfig.name === 'black_thug' && this.health < this.maxHealth * 0.3) {
            // Black thugs become more aggressive when low on health
            currentAttackRange += 20; // Attack from further away
            currentAttackCooldown *= 0.7; // Attack faster
        }
        
        // Some enemies retreat when very low on health
        if (this.characterConfig.name === 'crackhead' && this.health < this.maxHealth * 0.2) {
            // Crackheads retreat when very low on health
            this.retreatFromPlayer();
            return;
        }
        
        // Don't track vertical movements if player is jumping
        if (ENEMY_CONFIG.ignoreJumpingPlayer && this.isPlayerJumping) {
            // Skip vertical movement tracking during jumps
            return;
        }
        
        // Check if in attack range and ready to attack
        // Don't attack if paused by event system
        if (!this.eventPaused && distanceToPlayer <= currentAttackRange && time - this.lastAttackTime > currentAttackCooldown) {
            this.setState(ENEMY_STATES.ATTACKING);
            return;
        }
        
        // Move toward player
        this.moveTowardPlayer();
    }
    
    moveTowardPlayer() {
        // Don't move if being knocked back
        if (this.isKnockedBack) {
            return;
        }
        
        const dx = this.player.x - this.sprite.x;
        const dy = this.player.y - this.sprite.y;
        
        // Add some movement variety based on enemy type
        let moveSpeed = this.speed;
        let verticalSpeed = ENEMY_CONFIG.verticalMoveSpeed;
        
        // CATCH-UP BEHAVIOR: If enemy is behind player and player is moving forward, speed up
        const isBehindPlayer = dx > 0; // Enemy is to the left of player
        const horizontalDistance = Math.abs(dx);
        const playerMovingRight = this.player.body && this.player.body.velocity.x > 0;
        const playerFacingRight = !this.player.flipX;
        
        // Apply catch-up speed multiplier when enemy is behind player and player is moving/heading right
        if (isBehindPlayer && horizontalDistance > ENEMY_CONFIG.catchUpDistance && (playerMovingRight || playerFacingRight)) {
            moveSpeed *= ENEMY_CONFIG.catchUpSpeedMultiplier;
            // console.log(`🏃 Enemy ${this.characterConfig.name} catching up! Speed: ${moveSpeed.toFixed(0)} (${horizontalDistance.toFixed(0)}px behind)`);
        }
        
        // Increase vertical movement when close to player (better tracking)
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        if (distanceToPlayer < 200) {
            verticalSpeed *= 2; // Double vertical speed when close
        }
        
        // Crackheads move more erratically
        if (this.characterConfig.name === 'crackhead') {
            // Add some randomness to movement
            moveSpeed += (Math.random() - 0.5) * 40; // ±20 speed variation
            verticalSpeed += (Math.random() - 0.5) * 2; // ±1 vertical variation
        }
        
        // Green thugs move more strategically
        if (this.characterConfig.name === 'green_thug') {
            // Green thugs try to flank the player
            const playerDirection = this.player.x > this.sprite.x ? 1 : -1;
            const flankingOffset = 30; // Try to stay slightly to the side
            if (Math.abs(dx) > flankingOffset) {
                // Don't slow down if we're catching up
                if (!(isBehindPlayer && horizontalDistance > ENEMY_CONFIG.catchUpDistance)) {
                    moveSpeed *= 0.8; // Move slower when flanking (unless catching up)
                }
            }
        }
        
        // Black thugs move more directly and aggressively
        if (this.characterConfig.name === 'black_thug') {
            // Black thugs move directly toward the player
            moveSpeed *= 1.1; // Move slightly faster
        }
        
        // Horizontal movement
        if (Math.abs(dx) > ENEMY_CONFIG.deadZoneHorizontal) {
            if (dx > 0) {
                this.sprite.setVelocityX(moveSpeed);
                this.sprite.setFlipX(false); // Face right
                this.facingLeft = false;
            } else {
                this.sprite.setVelocityX(-moveSpeed);
                this.sprite.setFlipX(true); // Face left
                this.facingLeft = true;
            }
        } else {
            this.sprite.setVelocityX(0);
        }
        
        // Vertical movement (beat 'em up style) - SMART tracking with delays and jump detection
        if (Math.abs(dy) > ENEMY_CONFIG.verticalDeadZone) {
            // Don't respond to vertical movements if player is jumping
            if (ENEMY_CONFIG.ignoreJumpingPlayer && this.isPlayerJumping) {
                // Ignore vertical movements during jumps
                return;
            }
            
            // Only respond to vertical movements after a delay (prevents "sticky" behavior)
            if (this.verticalMoveTimer <= 0) {
                // Check if player has moved significantly since last check
                const playerYChange = Math.abs(this.player.y - this.lastPlayerY);
                if (playerYChange > 10) { // Only respond to significant movements
                    if (dy > 0 && this.sprite.y < this.streetBottomLimit) {
                        this.sprite.y += ENEMY_CONFIG.verticalMoveSpeed;
                    } else if (dy < 0 && this.sprite.y > this.streetTopLimit) {
                        this.sprite.y -= ENEMY_CONFIG.verticalMoveSpeed;
                    }
                    
                    // Set timer to prevent immediate re-response
                    this.verticalMoveTimer = ENEMY_CONFIG.verticalResponseDelay;
                    this.lastPlayerY = this.player.y;
                }
            }
        }
        
        // Enforce street boundaries
        this.sprite.y = Math.max(this.streetTopLimit, Math.min(this.sprite.y, this.streetBottomLimit));
    }
    
    retreatFromPlayer() {
        // Move away from player when retreating
        const dx = this.player.x - this.sprite.x;
        const dy = this.player.y - this.sprite.y;
        
        // Move in opposite direction of player
        if (dx > 0) {
            this.sprite.setVelocityX(-this.speed * 0.7); // Retreat slower
            this.sprite.setFlipX(true); // Face left
            this.facingLeft = true;
        } else {
            this.sprite.setVelocityX(this.speed * 0.7); // Retreat slower
            this.sprite.setFlipX(false); // Face right
            this.facingLeft = false;
        }
        
        // Move vertically away from player (slower retreat)
        if (dy > 0 && this.sprite.y > this.streetTopLimit) {
            this.sprite.y -= ENEMY_CONFIG.verticalMoveSpeed * 0.3; // Even slower retreat
        } else if (dy < 0 && this.sprite.y < this.streetBottomLimit) {
            this.sprite.y += ENEMY_CONFIG.verticalMoveSpeed * 0.3; // Even slower retreat
        }
        
        // Enforce street boundaries
        this.sprite.y = Math.max(this.streetTopLimit, Math.min(this.sprite.y, this.streetBottomLimit));
    }
    
    callForHelp() {
        // Black thugs can call for help when they first detect the player
        const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y));
        console.log(`Black thug calls for help! Player detected at distance ${distance}`);

        // This could trigger additional enemy spawning or make nearby enemies more aggressive
        // For now, just log the behavior
    }
    
    checkForDodge() {
        // Green thugs can dodge player attacks when healthy
        // This is a placeholder for future dodge mechanics
        // For now, just log the behavior
        const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y));
        if (Math.random() < 0.1) { // 10% chance to dodge
            console.log(`Green thug attempts to dodge! (distance: ${distance})`);
        }
    }

    coordinateWithAllies() {
        // Black thugs coordinate with other black thugs
        // This is a placeholder for future cooperative behavior
        // For now, just log the behavior
        const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y));
        console.log(`Black thug coordinates with allies! (distance: ${distance})`);
    }
    
    checkEnvironment() {
        // Green thugs check their environment for tactical advantages
        // This is a placeholder for future environmental awareness
        // For now, just log the behavior
        const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y));
        if (Math.random() < 0.05) { // 5% chance to check environment
            console.log(`Green thug assesses the situation! (distance: ${distance})`);
        }
    }
    
    assessPlayerState() {
        // Black thugs assess the player's current state
        // This is a placeholder for future player state assessment
        // For now, just log the behavior
        const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y));
        if (Math.random() < 0.03) { // 3% chance to assess player
            console.log(`Black thug assesses player state! (distance: ${distance})`);
        }
    }
    
    checkCrowdSize() {
        // Crackheads are more aggressive in groups
        // This is a placeholder for future crowd behavior
        // For now, just log the behavior
        const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y));
        if (Math.random() < 0.08) { // 8% chance to check crowd
            console.log(`Crackhead checks crowd size! (distance: ${distance})`);
        }
    }
    
    checkExperience() {
        // Green thugs become more experienced over time
        const timeAlive = this.scene.time.now - this.spawnTime;
        if (timeAlive > 10000 && Math.random() < 0.02) { // After 10 seconds, 2% chance
            const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y));
            console.log(`Green thug gains experience! Time alive: ${Math.round(timeAlive/1000)}s (distance: ${distance})`);
        }
    }
    
    checkPlayerHealth() {
        // Black thugs are more aggressive when player is low on health
        // This is a placeholder for future player health assessment
        // For now, just log the behavior
        const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y));
        if (Math.random() < 0.04) { // 4% chance to check player health
            console.log(`Black thug checks player health! (distance: ${distance})`);
        }
    }
    
    checkPlayerWeapons() {
        // Green thugs are more cautious when player has weapons
        // This is a placeholder for future weapon awareness
        // For now, just log the behavior
        const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y));
        if (Math.random() < 0.06) { // 6% chance to check player weapons
            console.log(`Green thug checks player weapons! (distance: ${distance})`);
        }
    }
    
    updateAttackingBehavior() {
        // Stop horizontal movement during attack
        this.sprite.setVelocityX(0);
        
        // But allow vertical movement to track player during attack (with jump detection)
        if (this.player && !this.isPlayerJumping) {
            const dy = this.player.y - this.sprite.y;
            if (Math.abs(dy) > ENEMY_CONFIG.verticalDeadZone) {
                let verticalSpeed = ENEMY_CONFIG.verticalMoveSpeed * 1.5; // Slightly faster vertical movement during attack
                
                if (dy > 0 && this.sprite.y < this.streetBottomLimit) {
                    this.sprite.y += verticalSpeed;
                } else if (dy < 0 && this.sprite.y > this.streetTopLimit) {
                    this.sprite.y -= verticalSpeed;
                }
                
                // Enforce street boundaries
                this.sprite.y = Math.max(this.streetTopLimit, Math.min(this.sprite.y, this.streetBottomLimit));
            }
        }
    }
    
    startAttack() {
        if (this.animationLocked) return;
        
        // Don't start attacks if paused by event system
        if (this.eventPaused) return;
        
        // Choose attack based on enemy type preferences
        const attackTypes = this.enemyTypeConfig.attackTypes || ['jab'];
        let attackType;
        
        if (this.characterConfig.name === 'crackhead') {
            // Crackheads use jab for close range, bottle for medium range
            const distanceToPlayer = Phaser.Math.Distance.Between(
                this.sprite.x, this.sprite.y,
                this.player.x, this.player.y
            );
            if (distanceToPlayer > 100 && attackTypes.includes('bottle_attack')) {
                attackType = 'bottle_attack';
            } else {
                attackType = 'jab';
            }
        } else if (this.characterConfig.name === 'green_thug') {
            // Green thugs always use knife attacks
            attackType = 'knife_hit';
        } else if (this.characterConfig.name === 'black_thug') {
            // Black thugs always use punch attacks
            attackType = 'enemy_punch';
        } else {
            // Fallback to first available attack
            attackType = attackTypes[0];
        }
        
        // Verify the attack animation exists
        if (!this.characterConfig.animations[attackType]) {
            console.error(`Attack animation ${attackType} not found for ${this.characterConfig.name}, falling back to jab`);
            attackType = 'jab';
        }
        
        // Get animation duration
        const animConfig = this.characterConfig.animations[attackType];
        const animationDuration = (animConfig.frames / animConfig.frameRate) * 1000;
        
        // Different enemy types have different windup times
        let windupDelay = ENEMY_CONFIG.attackWindupDelay;
        if (this.characterConfig.name === 'green_thug') {
            windupDelay = 200; // Fast knife attacks
        } else if (this.characterConfig.name === 'black_thug') {
            windupDelay = 250; // Medium punch windup
        } else if (this.characterConfig.name === 'crackhead') {
            windupDelay = 350; // Slower bottle attacks
        }
        
        // Lock animation and play attack
        this.animationLocked = true;
        // Make sure the lock timer is longer than the windup time so damage can be dealt
        this.lockTimer = Math.max(animationDuration, windupDelay + 100); // Add 100ms buffer
        this.sprite.anims.play(`${this.characterConfig.name}_${attackType}`, true);
        
        // Start attack windup - attack won't deal damage immediately
        this.isWindingUp = true;
        this.windupTimer = windupDelay;
        this.canDealDamage = false;
        
        console.log(`Enemy ${this.characterConfig.name} attack setup:`, {
            attackType: attackType,
            windupDelay: windupDelay,
            isWindingUp: this.isWindingUp,
            windupTimer: this.windupTimer,
            canDealDamage: this.canDealDamage,
            animationLocked: this.animationLocked
        });
        
        // Update last attack time
        this.lastAttackTime = this.scene.time.now;
        
        // Reset hit flag for new attack
        this.hasHitPlayer = false;
        
        // Play enemy attack sound effect (type-specific)
        if (this.scene.audioManager) {
            this.scene.audioManager.playEnemyAttack(this.characterConfig.name);
        }
        
        console.log(`Enemy ${this.characterConfig.name} starts ${attackType} attack (${windupDelay}ms windup)`);
    }
    
    takeDamage(damage = 1, knockbackSource = null) {
        if (this.state === ENEMY_STATES.DEAD) return;
        
        // Check if this enemy is protected from damage
        if (this.scene.eventEnemyProtection && this.scene.eventEnemyProtection.isProtectedFromDamage(this)) {
            console.log(`🛡️ Damage blocked for protected enemy: ${this.characterConfig.name}`);
            return;
        }
        
        this.health -= damage;
        console.log(`Enemy ${this.characterConfig.name} takes ${damage} damage (${this.health}/${this.maxHealth} HP)`);
        
        // Apply knockback if source is provided
        if (knockbackSource && this.sprite && this.sprite.body) {
            const dx = this.sprite.x - knockbackSource.x;
            const knockbackDirection = dx > 0 ? 1 : -1; // Push away from player
            const knockbackVelocity = knockbackDirection * ENEMY_CONFIG.knockbackForce;
            
            // Set knockback flag and timer
            this.isKnockedBack = true;
            this.knockbackTimer = ENEMY_CONFIG.knockbackDuration;
            
            // Apply knockback velocity
            this.sprite.setVelocityX(knockbackVelocity);
            
            console.log(`💥 Knockback applied to ${this.characterConfig.name}: ${knockbackVelocity}px/s for ${ENEMY_CONFIG.knockbackDuration}ms`);
            
            // Clear knockback after duration
            this.scene.time.delayedCall(ENEMY_CONFIG.knockbackDuration, () => {
                if (this.sprite && this.sprite.body && this.state !== ENEMY_STATES.DEAD) {
                    // Only clear velocity if enemy is still in walking state (not attacking)
                    if (this.state === ENEMY_STATES.WALKING || this.state === ENEMY_STATES.SPAWNING) {
                        this.sprite.setVelocityX(0);
                    }
                    this.isKnockedBack = false;
                    this.knockbackTimer = 0;
                }
            });
        }
        
        // Flash effect (only if not dying)
        if (this.health > 0) {
            this.sprite.setTint(0xff0000);
            this.scene.time.delayedCall(ENEMY_CONFIG.damageFlashTime, () => {
                if (this.sprite && this.state !== ENEMY_STATES.DEAD) {
                    this.sprite.setTint(0xffffff);
                }
            });
        }
        
        if (this.health <= 0) {
            // Check if this enemy is protected from death
            if (this.scene.eventEnemyProtection && this.scene.eventEnemyProtection.isProtectedFromCleanup(this)) {
                console.log(`🛡️ Death blocked for protected enemy: ${this.characterConfig.name} (health set to 1)`);
                this.health = 1; // Keep alive with minimal health
                return;
            }
            
            this.setState(ENEMY_STATES.DEAD);
            
            // Play enemy death sound effect
            if (this.scene.audioManager) {
                this.scene.audioManager.playEnemyDeath();
            }
            
            // Visible red flash effect on death (override any damage flash)
            this.sprite.setTint(0xff0000); // Bright red flash
            this.scene.time.delayedCall(ENEMY_CONFIG.deathFlashTime, () => {
                if (this.sprite && this.state === ENEMY_STATES.DEAD) {
                    // Different death tints based on enemy type after flash
                    if (this.characterConfig.name === 'crackhead') {
                        this.sprite.setTint(0x666666); // Darker gray for crackheads
                    } else if (this.characterConfig.name === 'green_thug') {
                        this.sprite.setTint(0x556B2F); // Dark olive green for green thugs
                    } else if (this.characterConfig.name === 'black_thug') {
                        this.sprite.setTint(0x2F2F2F); // Very dark gray for black thugs
                    } else {
                        this.sprite.setTint(0x333333); // Default dark gray
                    }
                }
            });
            
            // Fade out and remove after delay
            this.scene.time.delayedCall(ENEMY_CONFIG.deathFlashTime, () => {
                if (this.sprite && this.state === ENEMY_STATES.DEAD) {
                    this.scene.tweens.add({
                        targets: this.sprite,
                        alpha: 0,
                        duration: ENEMY_CONFIG.deathLingerTime - ENEMY_CONFIG.deathFlashTime,
                        ease: 'Power2',
                        onComplete: () => {
                            // Check protection one more time before final destruction
                            if (this.scene.eventEnemyProtection && this.scene.eventEnemyProtection.isProtectedFromCleanup(this)) {
                                console.log(`🛡️ Final destruction blocked for protected enemy: ${this.characterConfig.name}`);
                                return;
                            }
                            
                            // Remove from enemies array before destroying
                            if (this.scene.enemies && Array.isArray(this.scene.enemies)) {
                                const index = this.scene.enemies.indexOf(this);
                                if (index !== -1) {
                                    this.scene.enemies.splice(index, 1);
                                }
                            }
                            this.destroy();
                        }
                    });
                }
            });
        }
    }
    
    updatePerspective() {
        // Same perspective system as player, but with base scale multiplier applied
        const normalizedY = (this.sprite.y - this.streetTopLimit) / (this.streetBottomLimit - this.streetTopLimit);
        const baseScale = ENEMY_CONFIG.minScale + (ENEMY_CONFIG.maxScale - ENEMY_CONFIG.minScale) * normalizedY;
        // Apply enemy-specific base scale multiplier
        const scale = baseScale * this.baseScaleMultiplier;
        
        this.sprite.setScale(scale);
        // Fix depth calculation: higher Y (lower on screen) should have higher depth (appear in front)
        this.sprite.setDepth(this.sprite.y);
    }
    
    // ========================================
    // AI BEHAVIOR SYSTEM
    // ========================================

    executeBehaviors() {
        // Execute all behaviors assigned to this enemy
        if (!this.behaviors || this.behaviors.length === 0) {
            return; // No behaviors assigned
        }

        this.behaviors.forEach(behaviorName => {
            const behaviorMethod = this.getBehaviorMethod(behaviorName);
            if (behaviorMethod) {
                behaviorMethod.call(this);
            }
        });
    }

    getBehaviorMethod(behaviorName) {
        // Map behavior names to actual methods
        const behaviorMap = {
            [ENEMY_BEHAVIORS.CALL_FOR_HELP]: () => {
                if (!this.hasCalledForHelp) {
                    this.callForHelp();
                    this.hasCalledForHelp = true;
                }
            },
            [ENEMY_BEHAVIORS.COORDINATE_ALLIES]: () => this.coordinateWithAllies(),
            [ENEMY_BEHAVIORS.ASSESS_PLAYER_STATE]: () => this.assessPlayerState(),
            [ENEMY_BEHAVIORS.CHECK_ENVIRONMENT]: () => this.checkEnvironment(),
            [ENEMY_BEHAVIORS.CHECK_CROWD_SIZE]: () => this.checkCrowdSize(),
            [ENEMY_BEHAVIORS.CHECK_EXPERIENCE]: () => this.checkExperience(),
            [ENEMY_BEHAVIORS.CHECK_PLAYER_HEALTH]: () => this.checkPlayerHealth(),
            [ENEMY_BEHAVIORS.CHECK_PLAYER_WEAPONS]: () => this.checkPlayerWeapons(),
            [ENEMY_BEHAVIORS.DODGE_ATTACKS]: () => {
                if (this.health > this.maxHealth * 0.5) {
                    this.checkForDodge();
                }
            }
        };

        return behaviorMap[behaviorName];
    }

    // ========================================
    // AI OPTIMIZATION METHODS
    // ========================================

    shouldRunAIBehaviors(time) {
        // Only run AI behaviors when player is within detection range
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            this.player.x, this.player.y
        );

        if (distanceToPlayer > this.detectionRange) {
            return false; // Too far away
        }

        // Throttle AI behavior frequency to prevent spam
        // Only run behaviors every 2-5 seconds per enemy
        if (!this.lastAIBehaviorTime) {
            this.lastAIBehaviorTime = time;
            return true;
        }

        const timeSinceLastBehavior = time - this.lastAIBehaviorTime;
        const behaviorInterval = 2000 + Math.random() * 3000; // 2-5 second intervals

        if (timeSinceLastBehavior >= behaviorInterval) {
            this.lastAIBehaviorTime = time;
            return true;
        }

        return false;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    getAttackHitbox() {
        // Only return hitbox if attacking, animation is locked, AND windup is complete
        if (this.state !== ENEMY_STATES.ATTACKING || !this.animationLocked || !this.canDealDamage) {
            return null;
        }
        
        // Get scaled hitbox dimensions based on current sprite scale
        const scaledHitbox = HitboxHelpers.getEnemyAttackHitbox(this.sprite);
        
        // Calculate proper offset based on facing direction (same logic as player)
        // When facing left (facingLeft = true), attack should be to the left
        // When facing right (facingLeft = false), attack should be to the right
        const offsetX = this.facingLeft ? -scaledHitbox.attackOffsetX : scaledHitbox.attackOffsetX;
        
        return {
            x: this.sprite.x + offsetX - (this.facingLeft ? scaledHitbox.attackWidth : 0),
            y: this.sprite.y + scaledHitbox.attackOffsetY,
            width: scaledHitbox.attackWidth,
            height: scaledHitbox.attackHeight
        };
    }
    
    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
        console.log(`Enemy ${this.characterConfig.name} destroyed`);
    }
    
    // Get enemy information for debugging and UI
    getEnemyInfo() {
        return {
            name: this.characterConfig.name,
            health: this.health,
            maxHealth: this.maxHealth,
            state: this.state,
            speed: this.speed,
            damage: this.playerDamage,
            attackCooldown: this.attackCooldown,
            detectionRange: this.detectionRange
        };
    }
}

// Make constants available globally for browser environment
if (typeof window !== 'undefined') {
    window.ENEMY_CONFIG = ENEMY_CONFIG;
    window.ENEMY_STATES = ENEMY_STATES;
    window.Enemy = Enemy;
}