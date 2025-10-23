// ========================================
// WEAPON SYSTEM
// ========================================
// Manages weapons, projectiles, and weapon-based combat

// ========================================
// WEAPON CONFIGURATION
// ========================================

const WEAPON_CONFIG = {
    vinyl: {
        name: 'Vinyl Record',
        spriteKey: 'vinylWeapon',
        spinningKey: 'vinylWeaponSpinning',
        damage: 25,
        speed: 800, // Increased from 600 for faster throwing
        range: 800, // Max distance before disappearing
        cooldown: 5000, // 5 seconds in milliseconds
        size: { width: 64, height: 64 },
        hitbox: { width: 64, height: 64 }, // Increased hitbox for easier hits
        animations: {
            spinning: { frames: 4, frameRate: 20, repeat: -1 }
        },
        verticalTolerance: 120, // Increased from 60 - much more forgiving vertical distance
        collisionThreshold: 50   // Increased collision threshold for easier hits
    }
    // Add more weapons here in the future
};

// ========================================
// PROJECTILE CLASS
// ========================================

class Projectile {
    constructor(scene, x, y, weaponConfig, direction) {
        this.scene = scene;
        this.weaponConfig = weaponConfig;
        this.direction = direction; // 1 for right, -1 for left
        this.startX = x;
        this.damage = weaponConfig.damage;
        this.speed = weaponConfig.speed;
        this.range = weaponConfig.range;
        this.active = true;
        this.throwSound = null; // Store reference to the sound
        
        // Create projectile sprite
        this.sprite = scene.physics.add.sprite(x, y, weaponConfig.spinningKey);
        this.sprite.setScale(1.5); // Make it visible
        this.sprite.setDepth(500); // Above characters but below UI
        
        // Set up physics with improved hitbox
        this.sprite.body.setSize(weaponConfig.hitbox.width, weaponConfig.hitbox.height);
        this.sprite.setVelocityX(this.speed * this.direction);
        this.sprite.setVelocityY(0); // Straight horizontal throw
        
        // Debug: Show hitbox if debug mode is enabled
        if (this.scene.debugMode) {
            this.sprite.body.debugBodyColor = 0xff0000; // Red hitbox for debugging
        }
        
        // Play spinning animation
        this.sprite.anims.play(`${weaponConfig.name.toLowerCase().replace(' ', '_')}_spinning`, true);
        
        // Play throw sound and keep it playing until hit/disappear
        if (this.scene.sound && this.scene.cache.audio.has('weaponRecordThrow')) {
            this.throwSound = this.scene.sound.add('weaponRecordThrow', {
                volume: 0.3,
                loop: false
            });
            this.throwSound.play();
        }
        
        console.log(`🎯 ${weaponConfig.name} projectile created at (${x}, ${y}) going ${direction > 0 ? 'right' : 'left'}`);
    }
    
    update() {
        if (!this.active || !this.sprite.active) return;
        
        // Check if projectile has traveled too far
        const distanceTraveled = Math.abs(this.sprite.x - this.startX);
        if (distanceTraveled > this.range) {
            this.destroy();
            return;
        }
        
        // Check if projectile is out of world bounds
        if (this.sprite.x < -100 || this.sprite.x > this.scene.physics.world.bounds.width + 100) {
            this.destroy();
            return;
        }
    }
    
    destroy() {
        // Stop the throw sound if it's still playing
        if (this.throwSound && this.throwSound.isPlaying) {
            this.throwSound.stop();
        }
        
        if (this.sprite && this.sprite.active) {
            this.sprite.destroy();
        }
        this.active = false;
        
        console.log(`🎯 Projectile destroyed`);
    }
    
    // Called when projectile hits an enemy
    onHit(enemy) {
        console.log(`🎯 Projectile hit enemy for ${this.damage} damage!`);
        
        // Stop the throw sound immediately on hit
        if (this.throwSound && this.throwSound.isPlaying) {
            this.throwSound.stop();
        }
        
        this.destroy();
        return this.damage;
    }
}

// ========================================
// WEAPON MANAGER CLASS
// ========================================

class WeaponManager {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
        this.weapons = {}; // Available weapons
        this.currentWeapon = null;
        this.weaponCooldowns = {}; // Track cooldown for each weapon
        
        // UI elements for weapon display
        this.weaponUI = null;
        this.cooldownIndicator = null;
        
        console.log('🎯 WeaponManager initialized!');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    loadWeaponAssets() {
        // Load vinyl weapon assets
        this.scene.load.image('vinylWeapon', 'assets/weapons/spritesheets/vinyl weapon.png');
        this.scene.load.spritesheet('vinylWeaponSpinning', 'assets/weapons/spritesheets/vinyl weapon spinning.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        
        console.log('🎯 Loading weapon assets...');
    }
    
    createWeaponAnimations() {
        // Create spinning animation for vinyl weapon
        this.scene.anims.create({
            key: 'vinyl_record_spinning',
            frames: this.scene.anims.generateFrameNumbers('vinylWeaponSpinning', { start: 0, end: 3 }),
            frameRate: 20,
            repeat: -1
        });
        
        console.log('🎯 Weapon animations created');
    }
    
    initializeWeapons() {
        // Initialize all weapons from config
        Object.entries(WEAPON_CONFIG).forEach(([key, config]) => {
            this.weapons[key] = {
                ...config,
                key: key,
                available: true
            };
            this.weaponCooldowns[key] = 0;
        });
        
        // Set default weapon
        this.currentWeapon = 'vinyl';
        
        console.log('🎯 Weapons initialized:', Object.keys(this.weapons));
    }
    
    createWeaponUI() {
        const uiX = 20;
        const uiY = 130; // Below health bar (adjusted for larger health bars)
        const centerX = uiX + 40; // Adjusted for larger icon
        const centerY = uiY + 40; // Adjusted for larger icon
        const radius = 45; // Increased from 35
        
        // Weapon icon background
        this.weaponUI = this.scene.add.group();
        
        // Background circle for weapon icon
        const bg = this.scene.add.circle(centerX, centerY, radius, 0x333333);
        bg.setStrokeStyle(4, 0x666666); // Increased stroke from 3 to 4
        bg.setScrollFactor(0);
        bg.setDepth(1000);
        this.weaponUI.add(bg);
        
        // Weapon icon (static vinyl)
        this.weaponIcon = this.scene.add.image(centerX, centerY, 'vinylWeapon');
        this.weaponIcon.setScale(1.2); // Increased from 0.8
        this.weaponIcon.setScrollFactor(0);
        this.weaponIcon.setDepth(1001);
        this.weaponUI.add(this.weaponIcon);
        
        // Cooldown overlay (dark semi-transparent circle)
        this.cooldownOverlay = this.scene.add.circle(centerX, centerY, radius, 0x000000, 0.7);
        this.cooldownOverlay.setScrollFactor(0);
        this.cooldownOverlay.setDepth(1002);
        this.cooldownOverlay.setVisible(false);
        this.weaponUI.add(this.cooldownOverlay);
        
        // Radial progress indicator (arc that fills as cooldown progresses)
        this.cooldownProgress = this.scene.add.graphics();
        this.cooldownProgress.setScrollFactor(0);
        this.cooldownProgress.setDepth(1003);
        this.cooldownProgress.setVisible(false);
        this.weaponUI.add(this.cooldownProgress);
        
        // Store UI position for drawing
        this.uiCenter = { x: centerX, y: centerY };
        this.uiRadius = radius;
        
        // Weapon key text
        const keyText = this.scene.add.text(centerX, uiY + 65, 'Q', {
            fontSize: '14px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        keyText.setScrollFactor(0);
        keyText.setDepth(1001);
        this.weaponUI.add(keyText);
        
        console.log('🎯 Weapon UI created with radial progress');
    }
    
    // ========================================
    // WEAPON USAGE
    // ========================================
    
    canUseWeapon(weaponKey = this.currentWeapon) {
        if (!weaponKey || !this.weapons[weaponKey]) return false;
        
        const currentTime = this.scene.time.now;
        const cooldownEnd = this.weaponCooldowns[weaponKey];
        
        return currentTime >= cooldownEnd;
    }
    
    useWeapon(player, direction) {
        if (!this.canUseWeapon()) {
            console.log(`🎯 Weapon on cooldown`);
            return false;
        }
        
        const weaponConfig = this.weapons[this.currentWeapon];
        
        // Calculate throw position (in front of player)
        const offsetX = direction > 0 ? 50 : -50;
        const throwX = player.x + offsetX;
        const throwY = player.y - 10; // Slightly above center
        
        // Create projectile
        const projectile = new Projectile(this.scene, throwX, throwY, weaponConfig, direction);
        this.projectiles.push(projectile);
        
        // Start cooldown
        this.weaponCooldowns[this.currentWeapon] = this.scene.time.now + weaponConfig.cooldown;
        
        console.log(`🎯 ${weaponConfig.name} thrown! Cooldown: ${weaponConfig.cooldown}ms`);
        return true;
    }
    
    // ========================================
    // UPDATE SYSTEM
    // ========================================
    
    update() {
        // Update all projectiles
        this.projectiles = this.projectiles.filter(projectile => {
            if (projectile.active) {
                projectile.update();
                return true;
            }
            return false;
        });
        
        // Update weapon UI
        this.updateWeaponUI();
    }
    
    updateWeaponUI() {
        if (!this.weaponIcon || !this.cooldownOverlay || !this.cooldownProgress) return;
        
        const canUse = this.canUseWeapon();
        
        if (canUse) {
            // Weapon ready - normal colors
            this.weaponIcon.setTint(0xffffff);
            this.cooldownOverlay.setVisible(false);
            this.cooldownProgress.setVisible(false);
        } else {
            // Weapon on cooldown - show progress
            this.weaponIcon.setTint(0x888888);
            this.cooldownOverlay.setVisible(true);
            this.cooldownProgress.setVisible(true);
            
            // Calculate cooldown progress (0 = just started, 1 = almost ready)
            const weaponConfig = this.weapons[this.currentWeapon];
            const currentTime = this.scene.time.now;
            const cooldownEnd = this.weaponCooldowns[this.currentWeapon];
            const cooldownProgress = Math.max(0, Math.min(1, 1 - ((cooldownEnd - currentTime) / weaponConfig.cooldown)));
            
            // Draw radial progress indicator
            this.drawRadialProgress(cooldownProgress);
        }
    }
    
    drawRadialProgress(progress) {
        // Clear previous drawing
        this.cooldownProgress.clear();
        
        if (progress <= 0) return;
        
        // Draw the progress arc
        const centerX = this.uiCenter.x;
        const centerY = this.uiCenter.y;
        const radius = this.uiRadius - 4; // Slightly smaller than background circle
        
        // Calculate angle (start from top, go clockwise)
        const startAngle = -Math.PI / 2; // Start at top (-90 degrees)
        const endAngle = startAngle + (progress * 2 * Math.PI); // Progress in radians
        
        // Set style for progress arc
        this.cooldownProgress.lineStyle(6, 0x00ff00, 0.8); // Green progress line
        
        // Draw the arc
        this.cooldownProgress.beginPath();
        this.cooldownProgress.arc(centerX, centerY, radius, startAngle, endAngle, false);
        this.cooldownProgress.strokePath();
        
        // Add a subtle glow effect
        this.cooldownProgress.lineStyle(3, 0x88ff88, 0.6); // Lighter green inner line
        this.cooldownProgress.beginPath();
        this.cooldownProgress.arc(centerX, centerY, radius, startAngle, endAngle, false);
        this.cooldownProgress.strokePath();
    }
    
    // ========================================
    // COMBAT INTEGRATION
    // ========================================
    
    checkProjectileCollisions(enemies) {
        this.projectiles.forEach(projectile => {
            if (!projectile.active) return;
            
            enemies.forEach(enemy => {
                if (!enemy.sprite || !enemy.sprite.active) return;
                
                // Check vertical distance first (street-level tolerance)
                const verticalDistance = Math.abs(projectile.sprite.y - enemy.sprite.y);
                const weaponConfig = this.weapons[this.currentWeapon];
                
                if (verticalDistance > weaponConfig.verticalTolerance) {
                    return; // Skip collision if too far apart vertically
                }
                
                // Check horizontal collision with more generous threshold
                const horizontalDistance = Math.abs(projectile.sprite.x - enemy.sprite.x);
                const collisionThreshold = weaponConfig.collisionThreshold || 50;
                
                // If collision detected (more forgiving horizontal distance)
                if (horizontalDistance < collisionThreshold) {
                    const damage = projectile.onHit(enemy);
                    
                    // Deal damage to enemy with red flash effect
                    if (enemy.takeDamage) {
                        enemy.takeDamage(damage);
                        
                        // Enhanced red flash effect for weapon hits
                        enemy.sprite.setTint(0xff0000); // Bright red tint
                        enemy.sprite.setAlpha(0.8); // Slightly transparent for flash effect
                        
                        // Flash effect with multiple pulses
                        this.scene.time.delayedCall(100, () => {
                            if (enemy.sprite && enemy.sprite.active) {
                                enemy.sprite.setTint(0xffffff); // White flash
                                enemy.sprite.setAlpha(1.0);
                            }
                        });
                        
                        this.scene.time.delayedCall(200, () => {
                            if (enemy.sprite && enemy.sprite.active) {
                                enemy.sprite.setTint(0xff0000); // Red flash again
                                enemy.sprite.setAlpha(0.8);
                            }
                        });
                        
                        this.scene.time.delayedCall(300, () => {
                            if (enemy.sprite && enemy.sprite.active) {
                                enemy.sprite.clearTint(); // Remove tint
                                enemy.sprite.setAlpha(1.0); // Restore opacity
                            }
                        });
                        
                        console.log(`🎯 Enemy hit by weapon for ${damage} damage! (Vertical dist: ${Math.round(verticalDistance)}, Horizontal dist: ${Math.round(horizontalDistance)})`);
                    }
                }
            });
        });
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    getProjectileCount() {
        return this.projectiles.filter(p => p.active).length;
    }
    
    clearAllProjectiles() {
        this.projectiles.forEach(projectile => projectile.destroy());
        this.projectiles = [];
        console.log('🎯 All projectiles cleared');
    }
    
    getCurrentWeaponInfo() {
        if (!this.currentWeapon) return null;
        
        const weapon = this.weapons[this.currentWeapon];
        const canUse = this.canUseWeapon();
        const cooldownRemaining = this.weaponCooldowns[this.currentWeapon] - this.scene.time.now;
        
        return {
            name: weapon.name,
            canUse: canUse,
            cooldownRemaining: Math.max(0, cooldownRemaining),
            damage: weapon.damage
        };
    }
}

// ========================================
// EXPORTS
// ========================================

// Make classes available globally (since we're not using ES6 modules)
window.WeaponManager = WeaponManager;
window.Projectile = Projectile;
window.WEAPON_CONFIG = WEAPON_CONFIG;

console.log('🎯 Weapon system loaded');