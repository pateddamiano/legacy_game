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
    },
    // Boss rating weapons - different star ratings
    rating_0: {
        name: '0-Star Rating',
        spriteKey: 'ratingWeapon0',
        spinningKey: 'ratingWeapon0', // Static image that will rotate
        damage: 14,
        speed: 400,
        range: 600,
        cooldown: 2000,
        size: { width: 48, height: 48 },
        hitbox: { width: 48, height: 48 },
        animations: null, // Will rotate sprite instead
        verticalTolerance: 40, // Reduced from 100 to 40 for strict dodging
        collisionThreshold: 40
    },
    rating_1: {
        name: '1-Star Rating',
        spriteKey: 'ratingWeapon1',
        spinningKey: 'ratingWeapon1',
        damage: 12,
        speed: 500,
        range: 650,
        cooldown: 2000,
        size: { width: 48, height: 48 },
        hitbox: { width: 48, height: 48 },
        animations: null,
        verticalTolerance: 40, // Reduced from 100 to 40 for strict dodging
        collisionThreshold: 40
    },
    rating_2: {
        name: '2-Star Rating',
        spriteKey: 'ratingWeapon2',
        spinningKey: 'ratingWeapon2',
        damage: 10,
        speed: 500,
        range: 700,
        cooldown: 2000,
        size: { width: 48, height: 48 },
        hitbox: { width: 48, height: 48 },
        animations: null,
        verticalTolerance: 40, // Reduced from 100 to 40 for strict dodging
        collisionThreshold: 40
    },
    rating_3: {
        name: '3-Star Rating',
        spriteKey: 'ratingWeapon3',
        spinningKey: 'ratingWeapon3',
        damage: 8,
        speed: 500,
        range: 750,
        cooldown: 2000,
        size: { width: 48, height: 48 },
        hitbox: { width: 48, height: 48 },
        animations: null,
        verticalTolerance: 40, // Reduced from 100 to 40 for strict dodging
        collisionThreshold: 40
    },
    rating_4: {
        name: '4-Star Rating',
        spriteKey: 'ratingWeapon4',
        spinningKey: 'ratingWeapon4',
        damage: 6,
        speed: 500,
        range: 800,
        cooldown: 2000,
        size: { width: 48, height: 48 },
        hitbox: { width: 48, height: 48 },
        animations: null,
        verticalTolerance: 40, // Reduced from 100 to 40 for strict dodging
        collisionThreshold: 40
    }
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
        
        // Check if this is a rating weapon (boss projectile)
        const isRatingWeapon = (weaponConfig.spriteKey && weaponConfig.spriteKey.startsWith('ratingWeapon')) ||
                               (weaponConfig.name && weaponConfig.name.includes('Rating'));
        
        // Create drop shadow for rating weapons
        this.shadow = null;
        this.groundY = null; // Store ground level for shadow positioning
        if (isRatingWeapon) {
            // Calculate ground level - use the throw Y position (boss's Y position) as ground level
            // The boss's sprite Y position is where they're standing, so that's the ground level
            // For level 2 boss arena, boss spawns at y: 425, which is the ground level
            
            // MANUAL TUNING: Adjust this value to move the shadow up/down relative to the boss's center
            // Positive value moves shadow down (towards feet), negative moves it up
            const shadowYOffset = 70; 
            let groundLevel = y + shadowYOffset;
            
            // The boss's Y position is their center, but for the shadow we want it at ground level
            // Since the boss is standing on the ground, their Y position IS the ground level
            // (in a side-scrolling beat 'em up, Y position represents ground level)
            this.groundY = groundLevel;
            
            // Create a bigger shadow on the ground (at ground level where boss's feet are)
            this.shadow = scene.add.ellipse(x, groundLevel, 50, 25, 0x000000, 0.5);
            this.shadow.setDepth(groundLevel - 1); // Shadow should be below everything
            this.shadow.setScrollFactor(1); // Scroll with world
        }
        
        // Create projectile sprite
        this.sprite = scene.physics.add.sprite(x, y, weaponConfig.spinningKey);
        this.sprite.setScale(1.5); // Make it visible
        // Depth will be set dynamically based on player position
        this.isRatingWeapon = isRatingWeapon;
        
        // Set up physics with improved hitbox
        this.sprite.body.setSize(weaponConfig.hitbox.width, weaponConfig.hitbox.height);
        this.sprite.setVelocityX(this.speed * this.direction);
        this.sprite.setVelocityY(0); // Straight horizontal throw
        
        // Debug: Show hitbox if debug mode is enabled
        if (this.scene.debugMode) {
            this.sprite.body.debugBodyColor = 0xff0000; // Red hitbox for debugging
        }
        
        // Play spinning animation or add rotation for static weapons
        if (weaponConfig.animations && weaponConfig.animations.spinning) {
            // For animated weapons like vinyl records
            this.sprite.anims.play(`${weaponConfig.name.toLowerCase().replace(' ', '_')}_spinning`, true);
        } else if (weaponConfig.name.includes('Rating')) {
            // For rating weapons, add rotation tween
            this.scene.tweens.add({
                targets: this.sprite,
                angle: 360,
                duration: 500,
                repeat: -1,
                ease: 'Linear'
            });
        }

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
        
        // Update shadow position for rating weapons
        if (this.isRatingWeapon && this.shadow && this.shadow.active && this.groundY !== null) {
            // Shadow follows projectile X position, stays on ground level
            this.shadow.x = this.sprite.x;
            this.shadow.y = this.groundY; // Shadow stays at ground level (boss's feet level)
            this.shadow.setDepth(this.groundY - 1); // Shadow depth based on ground level
        }
        
        // Update depth dynamically for rating weapons based on player position
        if (this.isRatingWeapon && this.scene.player) {
            const playerSprite = this.scene.player.sprite || this.scene.player;
            if (playerSprite && playerSprite.active) {
                // If player is in front (lower Y = closer to camera), weapon goes behind
                // If player is behind (higher Y = further from camera), weapon goes in front
                const playerY = playerSprite.y;
                const weaponY = this.sprite.y;
                
                if (playerY < weaponY) {
                    // Player is in front (closer to camera), weapon goes behind
                    this.sprite.setDepth(weaponY - 10);
                } else {
                    // Player is behind (further from camera), weapon goes in front
                    this.sprite.setDepth(weaponY + 10);
                }
            } else {
                // Fallback: use Y position for depth
                this.sprite.setDepth(this.sprite.y);
            }
        }
        
        // Check if projectile has traveled too far
        const distanceTraveled = Math.abs(this.sprite.x - this.startX);
        if (distanceTraveled > this.range) {
            this.destroy();
            return;
        }
        
        // Check if projectile is out of world bounds (respect current world bounds x and width)
        const worldBounds = this.scene.physics.world.bounds;
        const leftEdge = worldBounds.x;
        const rightEdge = worldBounds.x + worldBounds.width;
        if (this.sprite.x < (leftEdge - 100) || this.sprite.x > (rightEdge + 100)) {
            this.destroy();
            return;
        }
    }
    
    handleWeaponUiScaleChanged(newScale, viewportInfo) {
        this.currentUiScale = newScale ?? this.currentUiScale;
        this.viewportInfo = viewportInfo || this.viewportInfo;
        this.positionWeaponUI();
    }

    positionWeaponUI() {
        if (!this.weaponUIContainer) return;
        const scale = this.currentUiScale ?? this.uiScene?.uiScale ?? 1;
        const posX = (this.weaponUiConfig?.x || 70) * scale;
        const posY = (this.weaponUiConfig?.y || 60) * scale;
        this.weaponUIContainer.setScale(scale);
        this.weaponUIContainer.setPosition(posX, posY);
    }
    
    destroy() {
        if (this.uiScene?.events?.off) {
            this.uiScene.events.off('uiScaleChanged', this.handleWeaponUiScaleChanged, this);
        }
        // Stop the throw sound if it's still playing
        if (this.throwSound && this.throwSound.isPlaying) {
            this.throwSound.stop();
        }
        
        // Destroy shadow if it exists
        if (this.shadow && this.shadow.active) {
            this.shadow.destroy();
            this.shadow = null;
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
    constructor(scene, uiScene = null) {
        this.scene = scene;
        this.uiScene = uiScene || scene; // Use uiScene if provided, fallback to scene
        this.projectiles = [];
        this.weapons = {}; // Available weapons
        this.currentWeapon = null;
        this.weaponCooldowns = {}; // Track cooldown for each weapon
        
        // UI elements for weapon display
        this.weaponUI = null;
        this.cooldownIndicator = null;
        this.weaponUIContainer = null;
        this.currentUiScale = this.uiScene?.uiScale ?? 1;
        this.viewportInfo = this.uiScene?.viewportInfo ?? null;
        this.weaponUiConfig = null;
        
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

        // Load boss rating weapon assets
        this.scene.load.image('ratingWeapon0', 'assets/characters/critic/spritesheets/rating_weapons/0_1frame.png');
        this.scene.load.image('ratingWeapon1', 'assets/characters/critic/spritesheets/rating_weapons/1_1frame.png');
        this.scene.load.image('ratingWeapon2', 'assets/characters/critic/spritesheets/rating_weapons/2_1frame.png');
        this.scene.load.image('ratingWeapon3', 'assets/characters/critic/spritesheets/rating_weapons/3_1frame.png');
        this.scene.load.image('ratingWeapon4', 'assets/characters/critic/spritesheets/rating_weapons/4_1frame.png');

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
        console.log('🎯 WEAPON_UI_DEBUG: ====== Weapon UI Creation ======');
        
        // Position next to health bar on the right
        // Health bar is at x: 70, width: 350, so right edge is at 420
        // Health bar center Y is approximately 60 + (46 + 38) / 2 = 102
        const healthBarX = 70;
        const healthBarWidth = 350;
        const healthBarY = 60;
        const healthBarTotalHeight = 46 + 38; // nameTextHeight + healthBarHeight
        
        const spacing = 40; // Space between health bar and weapon icon
        const radius = 45; // Increased from 35
        const centerX = healthBarX + healthBarWidth + spacing + radius; // Add radius to center the circle
        const centerY = healthBarY + (healthBarTotalHeight / 2) - 10; // Vertically centered with health bar
        this.weaponUiConfig = { x: centerX, y: centerY };
        
        console.log('🎯 WEAPON_UI_DEBUG: UI Scene state:', {
            uiSceneExists: !!this.uiScene,
            uiScale: this.uiScene?.uiScale,
            cameraZoom: this.uiScene?.cameras?.main?.zoom,
            cameraWidth: this.uiScene?.cameras?.main?.width,
            cameraHeight: this.uiScene?.cameras?.main?.height
        });
        
        // Create container for weapon UI elements (instead of group, so we can scale it)
        this.weaponUIContainer = this.uiScene.add.container(centerX, centerY);
        this.weaponUIContainer.setDepth(2000); // Match other UI elements depth (health bar, lives use 2000)
        this.weaponUIContainer.setScrollFactor(0);
        
        console.log('🎯 WEAPON_UI_DEBUG: Container created:', {
            x: this.weaponUIContainer.x,
            y: this.weaponUIContainer.y,
            depth: this.weaponUIContainer.depth,
            scrollFactor: this.weaponUIContainer.scrollFactorX,
            scaleX: this.weaponUIContainer.scaleX,
            scaleY: this.weaponUIContainer.scaleY
        });
        
        this.positionWeaponUI();

        // Keep weaponUI as a group for backward compatibility, but elements are in container
        this.weaponUI = this.uiScene.add.group();
        
        console.log('🎯 WEAPON_UI_DEBUG: Creating elements...');
        
        // Background circle for weapon icon (positioned relative to container center at 0, 0)
        const bg = this.uiScene.add.circle(0, 0, radius, 0x333333);
        bg.setStrokeStyle(4, 0x666666); // Increased stroke from 3 to 4
        bg.setScrollFactor(0);
        bg.setDepth(0); // Relative depth within container
        this.weaponUIContainer.add(bg);
        this.weaponUI.add(bg);
        console.log('🎯 WEAPON_UI_DEBUG: Background circle created:', { x: bg.x, y: bg.y, radius, visible: bg.visible });
        
        // Weapon icon (static vinyl) - positioned at container center
        this.weaponIcon = this.uiScene.add.image(0, 0, 'vinylWeapon');
        this.weaponIcon.setScale(1.4); // Increased from 0.8
        this.weaponIcon.setScrollFactor(0);
        this.weaponIcon.setDepth(1); // Relative depth within container
        this.weaponUIContainer.add(this.weaponIcon);
        this.weaponUI.add(this.weaponIcon);
        console.log('🎯 WEAPON_UI_DEBUG: Weapon icon created:', {
            x: this.weaponIcon.x,
            y: this.weaponIcon.y,
            scale: this.weaponIcon.scaleX,
            textureKey: this.weaponIcon.texture?.key,
            visible: this.weaponIcon.visible,
            alpha: this.weaponIcon.alpha
        });
        
        // Cooldown overlay (dark semi-transparent circle)
        this.cooldownOverlay = this.uiScene.add.circle(0, 0, radius, 0x000000, 0.7);
        this.cooldownOverlay.setScrollFactor(0);
        this.cooldownOverlay.setDepth(2); // Relative depth within container
        this.cooldownOverlay.setVisible(false);
        this.weaponUIContainer.add(this.cooldownOverlay);
        this.weaponUI.add(this.cooldownOverlay);
        console.log('🎯 WEAPON_UI_DEBUG: Cooldown overlay created:', { x: this.cooldownOverlay.x, y: this.cooldownOverlay.y, visible: this.cooldownOverlay.visible });
        
        // Radial progress indicator (arc that fills as cooldown progresses)
        this.cooldownProgress = this.uiScene.add.graphics();
        this.cooldownProgress.setScrollFactor(0);
        this.cooldownProgress.setDepth(3); // Relative depth within container
        this.cooldownProgress.setVisible(false);
        this.weaponUIContainer.add(this.cooldownProgress);
        this.weaponUI.add(this.cooldownProgress);
        console.log('🎯 WEAPON_UI_DEBUG: Cooldown progress graphics created:', { visible: this.cooldownProgress.visible });
        
        // Store UI position for drawing (absolute position)
        this.uiCenter = { x: centerX, y: centerY };
        this.uiRadius = radius;
        
        // Weapon key text (positioned below the icon, relative to container)
        const keyText = this.uiScene.add.text(0, radius + 10, 'Q', {
            fontSize: GAME_CONFIG.ui.fontSize.micro,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        keyText.setScrollFactor(0);
        keyText.setDepth(1); // Relative depth within container
        this.weaponUIContainer.add(keyText);
        this.weaponUI.add(keyText);
        console.log('🎯 WEAPON_UI_DEBUG: Key text created:', {
            x: keyText.x,
            y: keyText.y,
            text: keyText.text,
            visible: keyText.visible
        });
        
        console.log('🎯 WEAPON_UI_DEBUG: Container children count:', this.weaponUIContainer.list.length);
        console.log('🎯 WEAPON_UI_DEBUG: Container final state:', {
            x: this.weaponUIContainer.x,
            y: this.weaponUIContainer.y,
            scaleX: this.weaponUIContainer.scaleX,
            scaleY: this.weaponUIContainer.scaleY,
            visible: this.weaponUIContainer.visible,
            alpha: this.weaponUIContainer.alpha,
            depth: this.weaponUIContainer.depth
        });
        console.log('🎯 WEAPON_UI_DEBUG: ====== End Weapon UI Creation ======');
        
        console.log('🎯 Weapon UI created with radial progress on UIScene');
        
        if (this.uiScene?.events?.on) {
            this.uiScene.events.on('uiScaleChanged', this.handleWeaponUiScaleChanged, this);
        }
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
        // Use relative coordinates (0, 0) since cooldownProgress is inside the container
        // The container is positioned at uiCenter, so graphics should draw relative to container center
        const centerX = 0;
        const centerY = 0;
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
            
            // Check if this is a boss projectile (rating weapon)
            const weaponConfig = projectile.weaponConfig;
            const isBossProjectile = weaponConfig && (
                (weaponConfig.spriteKey && weaponConfig.spriteKey.startsWith('ratingWeapon')) ||
                (weaponConfig.name && weaponConfig.name.includes('Rating'))
            );
            
            enemies.forEach(enemy => {
                if (!enemy.sprite || !enemy.sprite.active) return;
                
                // Skip dead or dying enemies - they should not be hittable
                // Once an enemy dies (flashes red and starts fading), they should not be hit by weapons
                
                // Check if enemy is dead (state check) - this catches enemies that have died
                if (typeof ENEMY_STATES !== 'undefined' && enemy.state === ENEMY_STATES.DEAD) {
                    return; // Enemy is dead/fading, skip collision
                }
                
                // Also check if enemy health is 0 or less (safety check in case state hasn't updated yet)
                if (enemy.health !== undefined && enemy.health <= 0) {
                    return; // Enemy is dying/dead, skip collision
                }
                
                // Boss projectiles should not damage bosses (bosses can't hit themselves)
                if (isBossProjectile && enemy.isBoss) {
                    return; // Skip collision - boss projectile hitting boss
                }
                
                // Check vertical distance first (street-level tolerance)
                const verticalDistance = Math.abs(projectile.sprite.y - enemy.sprite.y);
                const currentWeaponConfig = this.weapons[this.currentWeapon];
                
                if (verticalDistance > currentWeaponConfig.verticalTolerance) {
                    return; // Skip collision if too far apart vertically
                }
                
                // Check horizontal collision with more generous threshold
                const horizontalDistance = Math.abs(projectile.sprite.x - enemy.sprite.x);
                const collisionThreshold = currentWeaponConfig.collisionThreshold || 50;
                
                // If collision detected (more forgiving horizontal distance)
                if (horizontalDistance < collisionThreshold) {
                    const damage = projectile.onHit(enemy);
                    
                    // Play weapon hit sound effect
                    if (this.scene.audioManager) {
                        this.scene.audioManager.playWeaponHit();
                    }
                    
                    // Deal damage to enemy with red flash effect
                    if (enemy.takeDamage) {
                        // Pass projectile position for knockback effect (knockback away from projectile)
                        const knockbackSource = projectile.sprite || null;
                        enemy.takeDamage(damage, knockbackSource);
                        
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
    
    // Check if boss projectiles (rating weapons) hit the player
    checkBossProjectileCollisions(player) {
        // Handle player being either a wrapper (with .sprite) or the sprite itself
        // GameScene passes the player sprite directly, while Enemy classes wrap the sprite
        const playerSprite = player.sprite || player;
        
        if (!playerSprite || !playerSprite.active) return;
        
        this.projectiles.forEach(projectile => {
            if (!projectile.active || !projectile.sprite || !projectile.sprite.active) return;
            
            // Only check rating weapons (boss projectiles)
            // Check if weapon config name or sprite key indicates it's a rating weapon
            const weaponConfig = projectile.weaponConfig;
            if (!weaponConfig) return;
            
            const isRatingWeapon = (weaponConfig.spriteKey && weaponConfig.spriteKey.startsWith('ratingWeapon')) ||
                                   (weaponConfig.name && weaponConfig.name.includes('Rating'));
            
            if (!isRatingWeapon) return;
            
            // Check vertical distance
            const verticalDistance = Math.abs(projectile.sprite.y - playerSprite.y);
            const verticalTolerance = projectile.weaponConfig.verticalTolerance || 100;
            
            if (verticalDistance > verticalTolerance) {
                return; // Skip if too far apart vertically
            }
            
            // Check horizontal collision
            const horizontalDistance = Math.abs(projectile.sprite.x - playerSprite.x);
            const collisionThreshold = projectile.weaponConfig.collisionThreshold || 40;
            
            // If collision detected
            if (horizontalDistance < collisionThreshold) {
                const damage = projectile.weaponConfig.damage || 15;
                
                // Play rating weapon hit sound effect
                if (this.scene.audioManager) {
                    this.scene.audioManager.playRatingWeaponHit();
                }
                
                // Apply knockback to player (push away from projectile)
                if (playerSprite && playerSprite.body) {
                    const knockbackForce = 400; // Knockback force in pixels/second
                    const knockbackDuration = 300; // Knockback duration in ms
                    
                    // Calculate direction: push player away from projectile
                    const dx = playerSprite.x - projectile.sprite.x;
                    const knockbackDirection = dx > 0 ? 1 : -1; // Push away from projectile
                    const knockbackVelocity = knockbackDirection * knockbackForce;
                    
                    // Set knockback flag on player to prevent input manager from overriding
                    if (playerSprite.isKnockedBack === undefined) {
                        playerSprite.isKnockedBack = false;
                    }
                    playerSprite.isKnockedBack = true;
                    playerSprite.knockbackEndTime = this.scene.time.now + knockbackDuration;
                    
                    // Apply knockback velocity
                    playerSprite.setVelocityX(knockbackVelocity);
                    
                    // Clear knockback after duration
                    this.scene.time.delayedCall(knockbackDuration, () => {
                        if (playerSprite && playerSprite.body && playerSprite.active) {
                            // Clear knockback flag
                            playerSprite.isKnockedBack = false;
                            playerSprite.knockbackEndTime = null;
                            
                            // Only clear velocity if player isn't actively moving
                            // If player is pressing movement keys, let input manager handle velocity
                            const currentVelX = playerSprite.body.velocity.x;
                            // Only reset if velocity is still from knockback (similar magnitude and direction)
                            if (Math.abs(currentVelX - knockbackVelocity) < 50) {
                                playerSprite.setVelocityX(0);
                            }
                        }
                    });
                    
                    console.log(`💥 Player knocked back by rating weapon: ${knockbackVelocity}px/s for ${knockbackDuration}ms`);
                }
                
                // Deal damage to player
                if (this.scene.playerTakeDamage) {
                    this.scene.playerTakeDamage(damage);
                    console.log(`💥 Player hit by rating weapon for ${damage} damage!`);
                }
                
                // Destroy the projectile
                projectile.destroy();
            }
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