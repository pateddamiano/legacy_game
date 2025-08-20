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
    
    // 💪 ENEMY STATS
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
    
    // 🎯 AVAILABLE ATTACKS (can add more as you create new animations)
    attackTypes: ['jab', 'bottle_attack']  // Add new attack names here when you create them!
};

// Enemy class for AI-controlled characters
class Enemy {
    constructor(scene, x, y, characterConfig) {
        this.scene = scene;
        this.characterConfig = characterConfig;
        this.state = ENEMY_STATES.SPAWNING;
        
        // Create sprite
        this.sprite = scene.physics.add.sprite(x, y, `${characterConfig.name}_idle`);
        this.sprite.setScale(2.0); // Slightly smaller than player
        this.sprite.setDepth(1000 - y);
        this.sprite.setBounce(0.2);
        this.sprite.setCollideWorldBounds(true);
        
        // AI properties (using centralized config)
        this.health = ENEMY_CONFIG.health;
        this.maxHealth = ENEMY_CONFIG.health;
        this.speed = ENEMY_CONFIG.speed;
        this.attackRange = ENEMY_CONFIG.attackRange;
        this.attackCooldown = ENEMY_CONFIG.attackCooldown;
        this.lastAttackTime = 0;
        this.detectionRange = ENEMY_CONFIG.detectionRange;
        
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
        
        console.log(`Enemy ${characterConfig.name} spawned at (${x}, ${y})`);
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
                this.sprite.anims.play(`${this.characterConfig.name}_walk`, true);
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
                console.log(`Enemy ${this.characterConfig.name} windup complete - attack is now active`);
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
        
        // Check if in attack range and ready to attack
        if (distanceToPlayer <= this.attackRange && time - this.lastAttackTime > this.attackCooldown) {
            this.setState(ENEMY_STATES.ATTACKING);
            return;
        }
        
        // Move toward player
        this.moveTowardPlayer();
    }
    
    moveTowardPlayer() {
        const dx = this.player.x - this.sprite.x;
        const dy = this.player.y - this.sprite.y;
        
        // Horizontal movement
        if (Math.abs(dx) > ENEMY_CONFIG.deadZoneHorizontal) {
            if (dx > 0) {
                this.sprite.setVelocityX(this.speed);
                this.sprite.setFlipX(false); // Face right
                this.facingLeft = false;
            } else {
                this.sprite.setVelocityX(-this.speed);
                this.sprite.setFlipX(true); // Face left
                this.facingLeft = true;
            }
        } else {
            this.sprite.setVelocityX(0);
        }
        
        // Vertical movement (beat 'em up style)
        if (Math.abs(dy) > ENEMY_CONFIG.deadZoneVertical) {
            if (dy > 0 && this.sprite.y < this.streetBottomLimit) {
                this.sprite.y += ENEMY_CONFIG.verticalMoveSpeed;
            } else if (dy < 0 && this.sprite.y > this.streetTopLimit) {
                this.sprite.y -= ENEMY_CONFIG.verticalMoveSpeed;
            }
        }
        
        // Enforce street boundaries
        this.sprite.y = Math.max(this.streetTopLimit, Math.min(this.sprite.y, this.streetBottomLimit));
    }
    
    updateAttackingBehavior() {
        // Stop movement during attack
        this.sprite.setVelocity(0, 0);
    }
    
    startAttack() {
        if (this.animationLocked) return;
        
        // Choose random attack from config
        const attackType = ENEMY_CONFIG.attackTypes[Math.floor(Math.random() * ENEMY_CONFIG.attackTypes.length)];
        
        // Get animation duration
        const animConfig = this.characterConfig.animations[attackType];
        const animationDuration = (animConfig.frames / animConfig.frameRate) * 1000;
        
        // Lock animation and play attack
        this.animationLocked = true;
        this.lockTimer = animationDuration;
        this.sprite.anims.play(`${this.characterConfig.name}_${attackType}`, true);
        
        // Start attack windup - attack won't deal damage immediately
        this.isWindingUp = true;
        this.windupTimer = ENEMY_CONFIG.attackWindupDelay;
        this.canDealDamage = false;
        
        // Update last attack time
        this.lastAttackTime = this.scene.time.now;
        
        console.log(`Enemy ${this.characterConfig.name} starts ${attackType} attack (${ENEMY_CONFIG.attackWindupDelay}ms windup)`);
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
        // Only return hitbox if attacking, animation is locked, AND windup is complete
        if (this.state !== ENEMY_STATES.ATTACKING || !this.animationLocked || !this.canDealDamage) {
            return null;
        }
        
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
}