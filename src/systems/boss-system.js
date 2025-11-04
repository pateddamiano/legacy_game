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

const BOSS_CONFIG = {
    // Boss-specific defaults
    jumpOnDamageThreshold: 0.25,  // Jump after losing 25% health
    jumpCooldown: 2000,           // Minimum time between jumps (ms)
    jumpType: 'teleport',         // 'teleport' or 'physics'
    jumpDistance: 400,            // Distance to jump (pixels)
    
    // Weapon throwing
    throwWeaponCooldown: 3000,    // Minimum time between weapon throws (ms)
    throwWeaponRange: 600,       // Range at which boss will throw weapons
    
    // Phase transitions
    phases: [
        { healthPercent: 1.0, behaviors: ['chase', 'attack'] },
        { healthPercent: 0.5, behaviors: ['chase', 'attack', 'jumpOnDamage'] },
        { healthPercent: 0.25, behaviors: ['chase', 'attack', 'jumpOnDamage', 'throwWeapons'] }
    ]
};

// Boss type configurations
const BOSS_TYPE_CONFIGS = {
    critic: {
        name: 'The Critic',
        health: 100,
        speed: 200,
        attackCooldown: 300,
        playerDamage: 8,
        attackTypes: ['enemy_punch'],
        detectionRange: 2000,
        behaviors: ['jumpOnDamage', 'throwWeapons'],
        jumpType: 'teleport',
        jumpDistance: 500,
        throwWeaponType: 'rating', // Will randomly select rating_0 through rating_4
        standOnEdges: true, // Enable edge-standing behavior
        edgeMargin: 150, // Distance from camera edges
        throwWeaponCooldown: 2500, // Faster throwing than default
        jumpOnDamageThreshold: 0.2, // Jump after losing 20% health
        description: "The Critic - formidable opponent who stands on arena edges and throws rating weapons"
    }
};

// Boss class extending Enemy
class Boss extends Enemy {
    constructor(scene, x, y, characterConfig, bossConfig = {}) {
        // Call parent constructor
        super(scene, x, y, characterConfig);
        
        // Override with boss config
        const bossType = bossConfig.type || characterConfig.name;
        const typeConfig = BOSS_TYPE_CONFIGS[bossType] || {};
        const mergedConfig = { ...BOSS_CONFIG, ...typeConfig, ...bossConfig };
        
        // Boss-specific properties
        this.isBoss = true;
        this.bossName = mergedConfig.name || bossType;
        this.bossConfig = mergedConfig;
        
        // Override health with boss config
        this.health = mergedConfig.health || this.health;
        this.maxHealth = this.health;
        
        // Boss behavior flags
        this.behaviors = {
            jumpOnDamage: mergedConfig.behaviors?.includes('jumpOnDamage') || false,
            throwWeapons: mergedConfig.behaviors?.includes('throwWeapons') || false,
            chase: mergedConfig.behaviors?.includes('chase') !== false, // Default true
            attack: mergedConfig.behaviors?.includes('attack') !== false // Default true
        };
        
        // Jump tracking
        this.lastJumpTime = 0;
        this.lastHealthPercent = 1.0;
        this.jumpType = mergedConfig.jumpType || 'teleport';
        this.jumpDistance = mergedConfig.jumpDistance || 400;
        
        // Weapon throwing tracking
        this.lastThrowTime = 0;
        this.throwWeaponCooldown = mergedConfig.throwWeaponCooldown || 3000;
        this.throwWeaponRange = mergedConfig.throwWeaponRange || 600;
        this.throwWeaponType = mergedConfig.throwWeaponType || 'vinyl';
        
        // Phase tracking
        this.currentPhase = 0;
        this.phases = mergedConfig.phases || BOSS_CONFIG.phases;

        // Edge-standing behavior
        this.standOnEdges = mergedConfig.standOnEdges || false;
        this.currentEdge = null; // 'left' or 'right'
        this.edgeMargin = mergedConfig.edgeMargin || 150; // Distance from camera edge

        // Callback for boss defeat
        this.onBossDefeated = null;
        
        // Set boss state
        this.setState(BOSS_STATES.IDLE);
        
        console.log(`👹 Boss ${this.bossName} spawned at (${x}, ${y}) - Health: ${this.health}/${this.maxHealth}`);
    }
    
    setState(newState) {
        // Call parent state setter
        super.setState(newState);
        
        // Boss-specific state handling
        switch (newState) {
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
        // Update phase based on health
        this.updatePhase();
        
        // Call parent update
        super.update(time, delta);
        
        // Skip boss-specific updates if dead or dying
        if (this.state === BOSS_STATES.DEAD || this.state === BOSS_STATES.DYING) {
            return;
        }
        
        // Boss-specific behavior updates
        if (this.state === BOSS_STATES.JUMPING) {
            this.updateJump(delta);
        } else if (this.state === BOSS_STATES.THROWING) {
            this.updateThrow(delta);
        } else {
            // Edge-standing behavior
            if (this.standOnEdges) {
                this.updateEdgeStanding();
            }

            // Update weapon throwing if enabled
            if (this.behaviors.throwWeapons && this.player) {
                this.updateWeaponThrowing(time, delta);
            }
        }
    }
    
    updatePhase() {
        const healthPercent = this.health / this.maxHealth;
        
        // Find current phase based on health
        for (let i = this.phases.length - 1; i >= 0; i--) {
            if (healthPercent <= this.phases[i].healthPercent) {
                if (this.currentPhase !== i) {
                    this.currentPhase = i;
                    const phaseBehaviors = this.phases[i].behaviors || [];
                    this.behaviors.jumpOnDamage = phaseBehaviors.includes('jumpOnDamage');
                    this.behaviors.throwWeapons = phaseBehaviors.includes('throwWeapons');
                    console.log(`👹 Boss ${this.bossName} entered phase ${i + 1} (${(healthPercent * 100).toFixed(0)}% health)`);
                }
                break;
            }
        }
    }
    
    takeDamage(damage = 1) {
        const healthBefore = this.health;
        
        console.log(`👹 [BOSS_DAMAGE] Boss ${this.bossName} taking ${damage} damage. Health: ${healthBefore} -> ${healthBefore - damage}`);
        
        // Call parent takeDamage
        super.takeDamage(damage);
        
        console.log(`👹 [BOSS_DAMAGE] After takeDamage, health is now: ${this.health}/${this.maxHealth}`);
        
        // Check for jump-on-damage behavior
        if (this.behaviors.jumpOnDamage && this.state !== BOSS_STATES.JUMPING && this.state !== BOSS_STATES.DYING) {
            const healthPercent = this.health / this.maxHealth;
            const healthLost = this.lastHealthPercent - healthPercent;
            
            // Check if we've lost enough health to trigger jump
            if (healthLost >= this.bossConfig.jumpOnDamageThreshold) {
                const timeSinceLastJump = this.scene.time.now - this.lastJumpTime;
                if (timeSinceLastJump >= this.bossConfig.jumpCooldown) {
                    this.executeBossJump();
                }
            }
            
            this.lastHealthPercent = healthPercent;
        }
        
        // Check for boss defeat
        if (this.health <= 0 && healthBefore > 0) {
            console.log(`👹 [BOSS_DAMAGE] ⚠️ BOSS DEFEATED! Health dropped from ${healthBefore} to ${this.health}`);
            this.onBossDefeat();
        }
    }
    
    executeBossJump() {
        if (!this.player || !this.sprite) return;

        console.log(`👹 Boss ${this.bossName} executing jump to opposite arena side`);

        this.lastJumpTime = this.scene.time.now;
        this.setState(BOSS_STATES.JUMPING);

        // For edge-standing bosses, jump to the opposite edge of the arena
        const camera = this.scene.cameras.main;
        const cameraLeft = camera.scrollX + this.edgeMargin;
        const cameraRight = camera.scrollX + camera.width - this.edgeMargin;

        let targetX;
        if (this.currentEdge === 'left') {
            // Currently on left edge, jump to right edge
            targetX = cameraRight;
            this.currentEdge = 'right';
        } else {
            // Currently on right edge (or default), jump to left edge
            targetX = cameraLeft;
            this.currentEdge = 'left';
        }

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
                    this.setState(BOSS_STATES.WALKING);
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
                                this.setState(BOSS_STATES.WALKING);
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
        
        // Check if boss is not already attacking or jumping
        if (this.state === BOSS_STATES.ATTACKING || this.state === BOSS_STATES.JUMPING) {
            return;
        }
        
        // Throw weapon
        this.executeBossThrow();
    }
    
    executeBossThrow() {
        if (!this.player || !this.sprite || !this.scene.weaponManager) return;

        console.log(`👹 Boss ${this.bossName} throwing rating weapon`);

        this.lastThrowTime = this.scene.time.now;
        this.setState(BOSS_STATES.THROWING);

        // Determine throw direction
        const direction = this.sprite.x < this.player.x ? 1 : -1;

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

        // Return to idle state after throw (since edge-standing bosses stay on edges)
        this.scene.time.delayedCall(500, () => {
            if (this.sprite && this.state === BOSS_STATES.THROWING) {
                this.setState(BOSS_STATES.IDLE);
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

            // Smooth movement to edge
            const moveSpeed = this.speed * 0.5; // Slower movement to edges
            const distance = Math.abs(this.sprite.x - targetX);

            if (distance > 10) { // Only move if not already at edge
                const direction = targetX > this.sprite.x ? 1 : -1;
                this.sprite.setVelocityX(direction * moveSpeed);

                // Face the player
                this.sprite.setFlipX(direction < 0);
            } else {
                // Stop moving when at edge
                this.sprite.setVelocityX(0);
                this.setState(BOSS_STATES.IDLE);
            }
        } else {
            // Already on correct edge, stop moving
            this.sprite.setVelocityX(0);
            this.setState(BOSS_STATES.IDLE);
        }
    }
    
    onBossDefeat() {
        console.log(`👹 Boss ${this.bossName} defeated!`);
        console.log(`👹 Stack trace:`, new Error().stack);
        
        // Set to dying state
        this.setState(BOSS_STATES.DYING);
        
        // Trigger callback if set
        if (this.onBossDefeated) {
            this.onBossDefeated(this);
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
    window.BOSS_CONFIG = BOSS_CONFIG;
    window.BOSS_TYPE_CONFIGS = BOSS_TYPE_CONFIGS;
}

