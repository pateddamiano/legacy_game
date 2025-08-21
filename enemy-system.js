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
    spawnInterval: 1200,        // milliseconds between enemy spawns (lower = more frequent)
    maxEnemiesOnScreen: 5,      // maximum enemies allowed at once (higher = more chaos)
    spawnOffscreenDistance: 50, // how far offscreen enemies spawn (higher = more spawn time)
    
    // 💪 ENEMY STATS (base values - can be overridden per enemy type)
    health: 10,                  // strength of enemy (higher = tankier enemies)
    speed: 180,                  // enemy movement speed (player is 420, so this is ~19% player speed)
    verticalMoveSpeed: 2,       // speed for up/down movement (beat 'em up style)
    
    // 🧠 AI BEHAVIOR
    detectionRange: 800,        // distance at which enemies notice player (higher = more aggressive)
    attackRange: 140,           // distance at which enemies can attack (lower = need to get closer)
    attackCooldown: 250,       // milliseconds between enemy attacks (lower = more frequent attacks)
    deadZoneHorizontal: 60,     // prevents jittering when close to player horizontally
    deadZoneVertical: 20,       // prevents vertical jittering (smoother movement)
    
    // 🎨 VISUAL & CLEANUP
    deathLingerTime: 2000,      // how long dead enemies stay on screen (ms) - dramatic effect
    cleanupDistance: 1000,      // distance at which enemies are removed (performance optimization)
    damageFlashTime: 100,       // duration of damage flash effect (ms) - visual feedback
    
    // 📏 SCALING & SIZE
    minScale: 2.0,              // enemy scale at top of street (perspective effect)
    maxScale: 2.5,              // enemy scale at bottom of street (closer to camera)
    
    // ⚔️ COMBAT
    playerDamage: 5,           // damage enemies deal to player (higher = more punishing)
    playerFlashTime: 200,       // player damage flash duration (ms) - visual feedback
    attackWindupDelay: 300,     // delay before attack actually hits (ms) - gives player time to react
    
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
        health: 8,                    // Weak but numerous
        speed: 150,                   // Slow, shambling movement
        attackCooldown: 300,         // Slower attacks
        playerDamage: 3,             // Less damage
        attackTypes: ['jab', 'bottle_attack'],
        detectionRange: 600,         // Less aggressive - shorter detection range
        description: "Weak but numerous crackhead enemies"
    },
    
    green_thug: {
        // Medium difficulty enemy
        health: 12,                   // Medium health
        speed: 200,                   // Faster than crackhead
        attackCooldown: 250,         // Standard attack speed
        playerDamage: 6,             // Medium damage
        attackTypes: ['knife_hit'],
        detectionRange: 800,         // Standard detection range
        description: "Medium difficulty thug with knife attacks"
    },
    
    black_thug: {
        // Harder enemy type
        health: 15,                   // Higher health
        speed: 220,                   // Fast movement
        attackCooldown: 200,         // Faster attacks
        playerDamage: 7,             // Higher damage
        attackTypes: ['enemy_punch'],
        detectionRange: 1000,        // More aggressive - longer detection range
        description: "Harder thug with powerful punch attacks"
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
        
        // Create sprite
        this.sprite = scene.physics.add.sprite(x, y, `${characterConfig.name}_idle`);
        this.sprite.setScale(2.0); // Slightly smaller than player
        this.sprite.setDepth(1000 - y);
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
        
        // Spawn time for experience tracking
        this.spawnTime = scene.time.now;
        
        // Animation properties
        this.animationLocked = false;
        this.lockTimer = 0;
        this.facingLeft = true; // Start facing left (walking toward player from right)
        
        // Attack timing properties
        this.isWindingUp = false; // True during attack windup phase
        this.windupTimer = 0;     // Time remaining in windup
        this.canDealDamage = false; // True when attack can actually hit
        
        // Movement bounds (same as player)
        this.streetTopLimit = 520;
        this.streetBottomLimit = 650;
        
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
                
                console.log(`Enemy ${this.characterConfig.name} trying to play walk animation: ${walkKey}`);
                console.log(`Available animations:`, Object.keys(this.scene.anims.anims.entries));
                
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
        if (!this.player || this.state === ENEMY_STATES.DEAD) return;
        
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
        
        // Update attack windup timer
        if (this.isWindingUp && this.windupTimer > 0) {
            this.windupTimer -= delta;
            if (this.windupTimer <= 0) {
                // Windup complete, now the attack can deal damage
                this.isWindingUp = false;
                this.canDealDamage = true;
                console.log(`Enemy ${this.characterConfig.name} windup complete - attack is now active:`, {
                    isWindingUp: this.isWindingUp,
                    canDealDamage: this.canDealDamage,
                    state: this.state,
                    animationLocked: this.animationLocked
                });
            }
        }
        
        // Update perspective scaling
        this.updatePerspective();
        
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
        
        // Some enemies call for help when they first detect the player
        if (!this.hasCalledForHelp && this.characterConfig.name === 'black_thug') {
            this.callForHelp();
            this.hasCalledForHelp = true;
        }
        
        // Some enemies become more aggressive when low on health
        let currentAttackRange = this.attackRange;
        let currentAttackCooldown = this.attackCooldown;
        
        if (this.characterConfig.name === 'black_thug' && this.health < this.maxHealth * 0.3) {
            // Black thugs become more aggressive when low on health
            currentAttackRange += 20; // Attack from further away
            currentAttackCooldown *= 0.7; // Attack faster
        }
        
        // Some enemies can dodge player attacks
        if (this.characterConfig.name === 'green_thug' && this.health > this.maxHealth * 0.5) {
            // Green thugs can dodge when healthy
            this.checkForDodge();
        }
        
        // Some enemies work together
        if (this.characterConfig.name === 'black_thug') {
            // Black thugs coordinate with other black thugs
            this.coordinateWithAllies();
        }
        
        // Some enemies are aware of their environment
        if (this.characterConfig.name === 'green_thug') {
            // Green thugs are more cautious in certain situations
            this.checkEnvironment();
        }
        
        // Some enemies are aware of player state
        if (this.characterConfig.name === 'black_thug') {
            // Black thugs adjust strategy based on player state
            this.assessPlayerState();
        }
        
        // Some enemies are aware of crowd size
        if (this.characterConfig.name === 'crackhead') {
            // Crackheads are more aggressive in groups
            this.checkCrowdSize();
        }
        
        // Some enemies change behavior over time
        if (this.characterConfig.name === 'green_thug') {
            // Green thugs become more experienced over time
            this.checkExperience();
        }
        
        // Some enemies are aware of player health
        if (this.characterConfig.name === 'black_thug') {
            // Black thugs are more aggressive when player is low on health
            this.checkPlayerHealth();
        }
        
        // Some enemies are aware of player weapons
        if (this.characterConfig.name === 'green_thug') {
            // Green thugs are more cautious when player has weapons
            this.checkPlayerWeapons();
        }
        
        // Some enemies retreat when very low on health
        if (this.characterConfig.name === 'crackhead' && this.health < this.maxHealth * 0.2) {
            // Crackheads retreat when very low on health
            this.retreatFromPlayer();
            return;
        }
        
        // Check if in attack range and ready to attack
        if (distanceToPlayer <= currentAttackRange && time - this.lastAttackTime > currentAttackCooldown) {
            this.setState(ENEMY_STATES.ATTACKING);
            return;
        }
        
        // Move toward player
        this.moveTowardPlayer();
    }
    
    moveTowardPlayer() {
        const dx = this.player.x - this.sprite.x;
        const dy = this.player.y - this.sprite.y;
        
        // Add some movement variety based on enemy type
        let moveSpeed = this.speed;
        let verticalSpeed = ENEMY_CONFIG.verticalMoveSpeed;
        
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
                moveSpeed *= 0.8; // Move slower when flanking
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
        
        // Vertical movement (beat 'em up style) - improved tracking
        if (Math.abs(dy) > ENEMY_CONFIG.deadZoneVertical) {
            if (dy > 0 && this.sprite.y < this.streetBottomLimit) {
                this.sprite.y += verticalSpeed;
            } else if (dy < 0 && this.sprite.y > this.streetTopLimit) {
                this.sprite.y -= verticalSpeed;
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
        
        // Move vertically away from player
        if (dy > 0 && this.sprite.y > this.streetTopLimit) {
            this.sprite.y -= ENEMY_CONFIG.verticalMoveSpeed * 0.5;
        } else if (dy < 0 && this.sprite.y < this.streetBottomLimit) {
            this.sprite.y += ENEMY_CONFIG.verticalMoveSpeed * 0.5;
        }
        
        // Enforce street boundaries
        this.sprite.y = Math.max(this.streetTopLimit, Math.min(this.sprite.y, this.streetBottomLimit));
    }
    
    callForHelp() {
        // Black thugs can call for help when they first detect the player
        console.log(`Black thug calls for help! Player detected at distance ${Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y))}`);
        
        // This could trigger additional enemy spawning or make nearby enemies more aggressive
        // For now, just log the behavior
    }
    
    checkForDodge() {
        // Green thugs can dodge player attacks when healthy
        // This is a placeholder for future dodge mechanics
        // For now, just log the behavior
        if (Math.random() < 0.1) { // 10% chance to dodge
            console.log(`Green thug attempts to dodge!`);
        }
    }

    coordinateWithAllies() {
        // Black thugs coordinate with other black thugs
        // This is a placeholder for future cooperative behavior
        // For now, just log the behavior
        console.log(`Black thug coordinates with allies!`);
    }
    
    checkEnvironment() {
        // Green thugs check their environment for tactical advantages
        // This is a placeholder for future environmental awareness
        // For now, just log the behavior
        if (Math.random() < 0.05) { // 5% chance to check environment
            console.log(`Green thug assesses the situation!`);
        }
    }
    
    assessPlayerState() {
        // Black thugs assess the player's current state
        // This is a placeholder for future player state assessment
        // For now, just log the behavior
        if (Math.random() < 0.03) { // 3% chance to assess player
            console.log(`Black thug assesses player state!`);
        }
    }
    
    checkCrowdSize() {
        // Crackheads are more aggressive in groups
        // This is a placeholder for future crowd behavior
        // For now, just log the behavior
        if (Math.random() < 0.08) { // 8% chance to check crowd
            console.log(`Crackhead checks crowd size!`);
        }
    }
    
    checkExperience() {
        // Green thugs become more experienced over time
        const timeAlive = this.scene.time.now - this.spawnTime;
        if (timeAlive > 10000 && Math.random() < 0.02) { // After 10 seconds, 2% chance
            console.log(`Green thug gains experience! Time alive: ${Math.round(timeAlive/1000)}s`);
        }
    }
    
    checkPlayerHealth() {
        // Black thugs are more aggressive when player is low on health
        // This is a placeholder for future player health assessment
        // For now, just log the behavior
        if (Math.random() < 0.04) { // 4% chance to check player health
            console.log(`Black thug checks player health!`);
        }
    }
    
    checkPlayerWeapons() {
        // Green thugs are more cautious when player has weapons
        // This is a placeholder for future weapon awareness
        // For now, just log the behavior
        if (Math.random() < 0.06) { // 6% chance to check player weapons
            console.log(`Green thug checks player weapons!`);
        }
    }
    
    updateAttackingBehavior() {
        // Stop horizontal movement during attack
        this.sprite.setVelocityX(0);
        
        // But allow vertical movement to track player during attack
        if (this.player) {
            const dy = this.player.y - this.sprite.y;
            if (Math.abs(dy) > ENEMY_CONFIG.deadZoneVertical) {
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
        
        console.log(`Enemy ${this.characterConfig.name} starts ${attackType} attack (${windupDelay}ms windup)`);
    }
    
    takeDamage(damage = 1) {
        if (this.state === ENEMY_STATES.DEAD) return;
        
        this.health -= damage;
        console.log(`Enemy ${this.characterConfig.name} takes ${damage} damage (${this.health}/${this.maxHealth} HP)`);
        
        // Flash effect
        this.sprite.setTint(0xff0000);
        this.scene.time.delayedCall(ENEMY_CONFIG.damageFlashTime, () => {
            if (this.sprite && this.state !== ENEMY_STATES.DEAD) {
                this.sprite.setTint(0xffffff);
            }
        });
        
        if (this.health <= 0) {
            this.setState(ENEMY_STATES.DEAD);
            
            // Different death effects based on enemy type
            if (this.characterConfig.name === 'crackhead') {
                this.sprite.setTint(0x666666); // Darker gray for crackheads
            } else if (this.characterConfig.name === 'green_thug') {
                this.sprite.setTint(0x556B2F); // Dark olive green for green thugs
            } else if (this.characterConfig.name === 'black_thug') {
                this.sprite.setTint(0x2F2F2F); // Very dark gray for black thugs
            }
            
            // Remove after delay
            this.scene.time.delayedCall(ENEMY_CONFIG.deathLingerTime, () => {
                this.destroy();
            });
        }
    }
    
    updatePerspective() {
        // Same perspective system as player
        const normalizedY = (this.sprite.y - this.streetTopLimit) / (this.streetBottomLimit - this.streetTopLimit);
        const scale = ENEMY_CONFIG.minScale + (ENEMY_CONFIG.maxScale - ENEMY_CONFIG.minScale) * normalizedY;
        
        this.sprite.setScale(scale);
        this.sprite.setDepth(1000 - this.sprite.y);
    }
    
    getAttackHitbox() {
        // Debug logging to see what's happening
        console.log(`Enemy ${this.characterConfig.name} getAttackHitbox check:`, {
            state: this.state,
            animationLocked: this.animationLocked,
            canDealDamage: this.canDealDamage,
            isWindingUp: this.isWindingUp,
            windupTimer: this.windupTimer
        });
        
        // Only return hitbox if attacking, animation is locked, AND windup is complete
        if (this.state !== ENEMY_STATES.ATTACKING || !this.animationLocked || !this.canDealDamage) {
            console.log(`Enemy ${this.characterConfig.name} hitbox rejected:`, {
                stateCheck: this.state !== ENEMY_STATES.ATTACKING,
                animationCheck: !this.animationLocked,
                damageCheck: !this.canDealDamage
            });
            return null;
        }
        
        console.log(`Enemy ${this.characterConfig.name} hitbox active!`);
        
        // Return attack hitbox when attack can deal damage
        const offsetX = this.facingLeft ? -HITBOX_CONFIG.enemy.attackOffsetX : HITBOX_CONFIG.enemy.attackOffsetX;
        
        return {
            x: this.sprite.x + offsetX,
            y: this.sprite.y + HITBOX_CONFIG.enemy.attackOffsetY,
            width: HITBOX_CONFIG.enemy.attackWidth,
            height: HITBOX_CONFIG.enemy.attackHeight
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