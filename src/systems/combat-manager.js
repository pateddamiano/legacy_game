// ========================================
// COMBAT MANAGER
// ========================================
// Handles combat detection, hitboxes, collisions, and damage

class CombatManager {
    constructor(scene, characterManager, enemies, levelManager) {
        this.scene = scene;
        this.characterManager = characterManager;
        this.enemies = enemies;
        this.levelManager = levelManager;
        
        // Manager references (set during initialization)
        this.uiManager = null;
        this.audioManager = null;
        this.animationManager = null;
        this.player = null;
        this.streetTopLimit = 0;
        this.streetBottomLimit = 0;
        this.autoSwitchThreshold = 40;
        
        console.log('⚔️ CombatManager initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    initialize(player, animationManager, uiManager, audioManager, streetTopLimit, streetBottomLimit, autoSwitchThreshold) {
        this.player = player;
        this.animationManager = animationManager;
        this.uiManager = uiManager;
        this.audioManager = audioManager;
        this.streetTopLimit = streetTopLimit;
        this.streetBottomLimit = streetBottomLimit;
        this.autoSwitchThreshold = autoSwitchThreshold;

        console.log(`⚔️ CombatManager initialized: autoSwitchThreshold=${this.autoSwitchThreshold}, player=${!!this.player}, animationManager=${!!this.animationManager}`);
    }
    
    // ========================================
    // COMBAT DETECTION
    // ========================================
    
    update() {
        this.checkCombat();
    }
    
    checkCombat() {
        // Skip if animation manager not initialized yet
        if (!this.animationManager || !this.player) return;
        
        // CRITICAL FIX: Always use scene.enemies directly to avoid stale references
        // This ensures we always check the current enemies array, not a cached reference
        const currentEnemies = this.scene.enemies || this.enemies || [];
        
        // Update our reference if it's different (for other methods that use this.enemies)
        if (this.enemies !== currentEnemies) {
            this.enemies = currentEnemies;
        }
        
        // Check player attacks hitting enemies (both ground attacks and air kicks)
        this.checkPlayerAttacks();
        
        // Check enemy attacks hitting player
        this.checkEnemyAttacks();
    }
    
    checkPlayerAttacks() {
        if ((this.animationManager.currentState === 'attack' || this.animationManager.currentState === 'airkick') && this.animationManager.animationLocked) {
            // CRITICAL FIX: Always use scene.enemies directly
            const currentEnemies = this.scene.enemies || this.enemies || [];
            console.log(`⚔️ Checking player attacks: state=${this.animationManager.currentState}, enemies=${currentEnemies.length} (scene=${this.scene.enemies?.length || 0}, cached=${this.enemies?.length || 0})`);
            
            const playerHitbox = this.getPlayerAttackHitbox();
            if (playerHitbox) {
                // Get scaled hitbox for vertical tolerance
                const scaledHitbox = HitboxHelpers.getPlayerAttackHitbox(this.player);
                const isAirKick = this.animationManager.currentState === 'airkick';
                const verticalTolerance = isAirKick ? 
                    scaledHitbox.airkickVerticalTolerance : 
                    scaledHitbox.verticalTolerance;
                
                currentEnemies.forEach(enemy => {
                    if (enemy.state !== ENEMY_STATES.DEAD) {
                        // Check vertical distance first (street-level tolerance)
                        const verticalDistance = Math.abs(this.player.y - enemy.sprite.y);
                        
                        // Debug log for potential hits
                        if (verticalDistance <= verticalTolerance * 2 && Math.abs(this.player.x - enemy.sprite.x) < 200) {
                            console.log(`⚔️ Enemy nearby: dist=${Math.round(verticalDistance)} (tol=${verticalTolerance}), colliding=${this.isColliding(playerHitbox, enemy.sprite)}`);
                        }
                        
                        if (verticalDistance <= verticalTolerance && this.isColliding(playerHitbox, enemy.sprite)) {
                            // Only deal damage if this enemy hasn't been hit by this attack yet
                            if (!enemy.hitByCurrentAttack) {
                                // Check if enemy is protected from damage
                                if (this.scene.eventEnemyProtection && this.scene.eventEnemyProtection.isProtectedFromDamage(enemy)) {
                                    console.log(`🛡️ Combat blocked: Protected enemy cannot be damaged`);
                                    // Still mark as hit to prevent repeated attempts
                                    enemy.hitByCurrentAttack = true;
                                    return;
                                }
                                
                                enemy.takeDamage(10, this.player); // Deal 10 damage per hit, pass player for knockback
                                enemy.hitByCurrentAttack = true; // Mark as hit by this attack
                                console.log(`Player hit enemy with ${this.animationManager.currentState}! (Vertical dist: ${Math.round(verticalDistance)})`);
                                
                                // Track enemy defeat for level progression
                                if (enemy.state === ENEMY_STATES.DEAD && this.levelManager) {
                                    this.levelManager.onEnemyDefeated();
                                }
                            }
                        }
                    }
                });
            }
        }
    }
    
    checkEnemyAttacks() {
        // CRITICAL FIX: Always use scene.enemies directly
        const currentEnemies = this.scene.enemies || this.enemies || [];
        if (!currentEnemies || currentEnemies.length === 0) return;

        currentEnemies.forEach(enemy => {
            const enemyHitbox = enemy.getAttackHitbox();
            if (enemyHitbox && this.isColliding(enemyHitbox, this.player)) {
                // Only deal damage if this enemy hasn't hit the player with this attack yet
                if (!enemy.hasHitPlayer) {
                    console.log(`🎯 Enemy ${enemy.characterConfig.name} hit detected! Damage: ${enemy.playerDamage}`);
                    // Use scene.playerTakeDamage to ensure callbacks are provided for auto-switching
                    if (this.scene && this.scene.playerTakeDamage) {
                        this.scene.playerTakeDamage(enemy.playerDamage);
                    } else {
                        console.error('❌ Cannot call playerTakeDamage - scene method not available');
                    }
                    enemy.hasHitPlayer = true; // Mark that this attack has hit
                    console.log(`💥 ${enemy.characterConfig.name} enemy hit player for ${enemy.playerDamage} damage!`);
                }
            }
        });
    }
    
    // ========================================
    // HITBOX CALCULATIONS
    // ========================================
    
    getPlayerAttackHitbox() {
        if (!this.animationManager || (this.animationManager.currentState !== 'attack' && this.animationManager.currentState !== 'airkick') || !this.animationManager.animationLocked) {
            return null;
        }
        
        // Get scaled hitbox dimensions based on current sprite scale
        const scaledHitbox = HitboxHelpers.getPlayerAttackHitbox(this.player);
        
        // Use different hitbox config for air kicks vs ground attacks
        const isAirKick = this.animationManager.currentState === 'airkick';
        const config = isAirKick ? {
            width: scaledHitbox.airkickWidth,
            height: scaledHitbox.airkickHeight,
            offsetX: scaledHitbox.airkickOffsetX,
            offsetY: scaledHitbox.airkickOffsetY
        } : {
            width: scaledHitbox.attackWidth,
            height: scaledHitbox.attackHeight,
            offsetX: scaledHitbox.attackOffsetX,
            offsetY: scaledHitbox.attackOffsetY
        };
        
        // Calculate proper offset based on facing direction
        // When facing left (flipX = true), attack should be to the left
        // When facing right (flipX = false), attack should be to the right
        const offsetX = this.player.flipX ? -config.offsetX : config.offsetX;
        
        return {
            x: this.player.x + offsetX - (this.player.flipX ? config.width : 0),
            y: this.player.y + config.offsetY,
            width: config.width,
            height: config.height
        };
    }
    
    isColliding(hitbox, sprite) {
        const spriteBox = {
            x: sprite.x - sprite.width/2,
            y: sprite.y - sprite.height/2,
            width: sprite.width,
            height: sprite.height
        };
        
        return (hitbox.x < spriteBox.x + spriteBox.width &&
                hitbox.x + hitbox.width > spriteBox.x &&
                hitbox.y < spriteBox.y + spriteBox.height &&
                hitbox.y + hitbox.height > spriteBox.y);
    }
    
    // ========================================
    // DAMAGE HANDLING
    // ========================================
    
    playerTakeDamage(damage, onCharacterDown = null, onSwitchCharacter = null) {
        const activeCharName = this.characterManager.getActiveCharacterName();
        const newHealth = this.characterManager.takeDamage(activeCharName, damage);

        // Flash effect for player
        this.player.setTint(0xff0000);
        this.scene.time.delayedCall(ENEMY_CONFIG.playerFlashTime, () => {
            this.player.setTint(0xffffff);
        });

        // Check for auto-switch when health is low
        const activeCharData = this.characterManager.getActiveCharacterData();
        const healthPercent = (newHealth / activeCharData.maxHealth) * 100;

        if (healthPercent <= this.autoSwitchThreshold) {
            console.log(`🔄 Auto-switching due to low health: ${healthPercent.toFixed(1)}% (threshold: ${this.autoSwitchThreshold}%)`);
            if (onSwitchCharacter) {
                onSwitchCharacter(true);
            }
        }

        // Check for game over (both characters dead)
        if (newHealth <= 0) {
            if (onCharacterDown) {
                onCharacterDown();
            }
        }
    }
    
    // ========================================
    // CHARACTER COLLISIONS
    // ========================================
    
    checkCharacterCollisions() {
        // CRITICAL FIX: Always use scene.enemies directly
        const currentEnemies = this.scene.enemies || this.enemies || [];
        
        // Check player collision with all enemies
        if (currentEnemies && currentEnemies.length > 0) {
            currentEnemies.forEach(enemy => {
                if (!enemy.sprite || enemy.state === ENEMY_STATES.DEAD) return;
                
                // Calculate horizontal and vertical distances separately
                const deltaX = enemy.sprite.x - this.player.x;
                const deltaY = enemy.sprite.y - this.player.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // Collision radius (characters can't get closer than this) - use scaled radius
                const playerRadius = HitboxHelpers.getBodyRadius(this.player, 'player');
                const enemyRadius = HitboxHelpers.getBodyRadius(enemy.sprite, 'enemy');
                const collisionRadius = (playerRadius + enemyRadius) / 2; // Average of both radii
                
                if (distance < collisionRadius && distance > 0) {
                    // Calculate how much overlap there is
                    const overlap = collisionRadius - distance;
                    
                    // Normalize the separation vector
                    const normalX = deltaX / distance;
                    const normalY = deltaY / distance;
                    
                    // Bias heavily toward horizontal separation to prevent vertical overlap weirdness
                    const horizontalBias = 0.8; // 80% horizontal, 20% vertical
                    const verticalLimit = 0.3; // Limit vertical separation strength
                    
                    // Calculate separation with bias
                    let separationX = normalX * overlap * 0.5;
                    let separationY = normalY * overlap * 0.5 * verticalLimit;
                    
                    // If characters are very close vertically, prioritize horizontal separation
                    if (Math.abs(deltaY) < 30) {
                        separationX = Math.sign(deltaX) * overlap * 0.6; // Force stronger horizontal separation
                        separationY = 0; // No vertical separation when close vertically
                    }
                    
                    // Apply separation to player
                    const newPlayerX = this.player.x - separationX;
                    const newPlayerY = this.player.y - separationY;
                    
                    // Keep player within world bounds and prevent vertical overlap
                    if (newPlayerX >= 0 && newPlayerX <= 3600) {
                        this.player.x = newPlayerX;
                    }
                    // Only apply vertical separation if it keeps characters reasonably aligned
                    if (newPlayerY >= this.streetTopLimit && newPlayerY <= this.streetBottomLimit && 
                        Math.abs(newPlayerY - enemy.sprite.y) > 25) { // Minimum vertical separation
                        this.player.y = newPlayerY;
                        this.player.lastGroundY = newPlayerY;
                    }
                    
                    // Apply separation to enemy
                    const newEnemyX = enemy.sprite.x + separationX;
                    const newEnemyY = enemy.sprite.y + separationY;
                    
                    // Keep enemy within world bounds and prevent vertical overlap
                    if (newEnemyX >= 0 && newEnemyX <= 3600) {
                        enemy.sprite.x = newEnemyX;
                    }
                    // Only apply vertical separation if it keeps characters reasonably aligned
                    if (newEnemyY >= enemy.streetTopLimit && newEnemyY <= enemy.streetBottomLimit &&
                        Math.abs(newEnemyY - this.player.y) > 25) { // Minimum vertical separation
                        enemy.sprite.y = newEnemyY;
                    }
                }
            });
        }
        
        // Check enemy-to-enemy collisions
        // Use the same currentEnemies array we got above
        if (currentEnemies && currentEnemies.length > 0) {
            for (let i = 0; i < currentEnemies.length; i++) {
                const enemy1 = currentEnemies[i];
                if (!enemy1.sprite || enemy1.state === ENEMY_STATES.DEAD) continue;
                
                for (let j = i + 1; j < currentEnemies.length; j++) {
                    const enemy2 = currentEnemies[j];
                    if (!enemy2.sprite || enemy2.state === ENEMY_STATES.DEAD) continue;
                    
                    // Calculate horizontal and vertical distances separately
                    const deltaX = enemy2.sprite.x - enemy1.sprite.x;
                    const deltaY = enemy2.sprite.y - enemy1.sprite.y;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    
                    // Use scaled collision radius for enemy-to-enemy
                    const enemy1Radius = HitboxHelpers.getBodyRadius(enemy1.sprite, 'enemy');
                    const enemy2Radius = HitboxHelpers.getBodyRadius(enemy2.sprite, 'enemy');
                    const collisionRadius = (enemy1Radius + enemy2Radius) / 2; // Average of both radii
                    
                    if (distance < collisionRadius && distance > 0) {
                        // Calculate how much overlap there is
                        const overlap = collisionRadius - distance;
                        
                        // Normalize the separation vector
                        const normalX = deltaX / distance;
                        const normalY = deltaY / distance;
                        
                        // Bias toward horizontal separation for enemies too
                        const verticalLimit = 0.3; // Limit vertical separation strength
                        
                        // Calculate separation with bias
                        let separationX = normalX * overlap * 0.5;
                        let separationY = normalY * overlap * 0.5 * verticalLimit;
                        
                        // If enemies are very close vertically, prioritize horizontal separation
                        if (Math.abs(deltaY) < 30) {
                            separationX = Math.sign(deltaX) * overlap * 0.6; // Force stronger horizontal separation
                            separationY = 0; // No vertical separation when close vertically
                        }
                        
                        // Apply separation to enemy1
                        const newEnemy1X = enemy1.sprite.x - separationX;
                        const newEnemy1Y = enemy1.sprite.y - separationY;
                        
                        // Apply separation to enemy2
                        const newEnemy2X = enemy2.sprite.x + separationX;
                        const newEnemy2Y = enemy2.sprite.y + separationY;
                        
                        // Update positions within bounds and prevent excessive vertical overlap
                        if (newEnemy1X >= 0 && newEnemy1X <= 3600) {
                            enemy1.sprite.x = newEnemy1X;
                        }
                        // Only apply vertical separation if it keeps enemies reasonably aligned
                        if (newEnemy1Y >= enemy1.streetTopLimit && newEnemy1Y <= enemy1.streetBottomLimit &&
                            Math.abs(newEnemy1Y - enemy2.sprite.y) > 25) { // Minimum vertical separation
                            enemy1.sprite.y = newEnemy1Y;
                        }
                        
                        if (newEnemy2X >= 0 && newEnemy2X <= 3600) {
                            enemy2.sprite.x = newEnemy2X;
                        }
                        // Only apply vertical separation if it keeps enemies reasonably aligned
                        if (newEnemy2Y >= enemy2.streetTopLimit && newEnemy2Y <= enemy2.streetBottomLimit &&
                            Math.abs(newEnemy2Y - enemy1.sprite.y) > 25) { // Minimum vertical separation
                            enemy2.sprite.y = newEnemy2Y;
                        }
                    }
                }
            }
        }
    }
}

