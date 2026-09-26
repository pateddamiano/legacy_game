// ========================================
// UNIFIED ITEM PICKUP SYSTEM
// ========================================
// A modular system for all types of collectible items (health, score, power-ups, etc.)

// ========================================
// ITEM TYPE CONFIGURATIONS
// ========================================

const ITEM_TYPES = {
    HEALTH: {
        name: 'Health Cross',
        healAmount: 30,
        spawnInterval: 3000,        // (unused: health is dropped by defeated enemies, see healthDrop below)
        dropOnly: true,             // never spawns by itself off-screen - only dropped by enemies
        maxOnScreen: 3,
        despawnTime: 20000,
        size: 32,
        depth: 1500,                // Top layer: characters/enemies are layered by their y (400-650), so this stays in front of them all
        glowColor: 0x00ff00,        // Green glow
        magnetRange: 170,           // "sticky": the cross starts flying to the player from this far away (was 80)
        magnetSpeed: 300,
        collisionRadius: 100,       // and is collected outright inside this radius (was 60)
        bobHeight: 8,
        bobSpeed: 2000,
        spawnWhenPlayerHealthFull: false,
        points: 0,                  // No points for health
        renderType: 'graphics',     // Use graphics rendering
        // Graphics rendering function
        createGraphics: function(scene, container) {
            const graphic = scene.add.graphics();
            const size = this.size;
            const thickness = size * 0.25;
            
            // White background circle
            graphic.fillStyle(0xffffff);
            graphic.fillCircle(0, 0, size * 0.6);
            
            // Red cross
            graphic.fillStyle(0xff0000);
            // Vertical bar
            graphic.fillRect(-thickness/2, -size/2, thickness, size);
            // Horizontal bar
            graphic.fillRect(-size/2, -thickness/2, size, thickness);
            
            // Add outline for better visibility
            graphic.lineStyle(2, 0x000000);
            graphic.strokeCircle(0, 0, size * 0.6);
            
            container.add(graphic);
            return graphic;
        }
    },
    
    MICROPHONE: {
        name: 'Golden Microphone',
        spawnInterval: 2000,        // Spawn more frequently than health
        maxOnScreen: 4,             // More allowed on screen
        despawnTime: 25000,         // Last a bit longer
        size: 48,                   // Slightly larger than health
        glowColor: 0xffd700,        // Golden glow
        magnetRange: 100,           // Larger attraction range
        magnetSpeed: 400,           // Faster attraction
        collisionRadius: 50,        // Larger collision
        bobHeight: 12,              // Higher floating motion
        bobSpeed: 1500,             // Faster bobbing
        spawnWhenPlayerHealthFull: true, // Always spawn regardless of health
        points: 1,                // Points awarded when collected
        renderType: 'sprite',       // Use sprite rendering
        spriteKey: 'goldenMicrophone',
        spriteScale: 1,          // Scale down the 1024x1024 image
    }
};

// ========================================
// ITEM PICKUP CONFIGURATION
// ========================================

const ITEM_PICKUP_CONFIG = {
    // 📏 SPAWN SETTINGS
    spawnOffscreenDistance: 200,  // how far off-screen items spawn (in pixels)
    spawnLeftProbability: 0.1,    // 10% chance to spawn left, 90% right (encourages forward movement)
    
    // 🎮 GENERAL SETTINGS
    particleEffectDuration: 500,
    pickupFlashDuration: 200,
    pickupFlashScale: 1.5,
    
    // 💚 HEALTH DROPS (dropped by enemies the player defeats)
    healthDrop: {
        chance: 0.6,              // chance a defeated enemy drops one while the player is hurt (0.6 = 60%)
        lowHealthFraction: 0.6,   // "hurt" = either character is at or below this fraction of max health
        popHeight: 110,           // how high (px) the item is thrown up before it falls
        popTime: 260,             // ms going up
        fallTime: 750,           // ms falling and bouncing back to the ground
        scatter: 45,              // sideways drift (px, random direction) so it isn't hidden behind the enemy
        settleTime: 150,         // ms after landing before it can be picked up / magnetised
    }
};

// ========================================
// UNIFIED ITEM PICKUP CLASS
// ========================================

class ItemPickup {
    // options.drop = { groundY, ...ITEM_PICKUP_CONFIG.healthDrop }: pop up out of (x, y), then fall
    // and bounce down to groundY, instead of just appearing and bobbing in place
    constructor(scene, x, y, itemType, options = {}) {
        this.scene = scene;
        this.itemType = ITEM_TYPES[itemType];
        this.typeName = itemType;
        this.active = true;
        this.magnetActive = false;
        this.dropping = false;   // true while thrown into the air; can't be collected until it lands
        
        // Create the main pickup graphic or sprite
        this.createPickupVisual(x, y);
        
        // Add glow effect
        this.createGlowEffect();
        
        // Start floating animation - or the pop-and-bounce, which starts it once landed
        if (options.drop) {
            this.startDrop(x, y, options.drop);
        } else {
            this.startBobAnimation();
        }
        
        // Set despawn timer
        this.startDespawnTimer();
        
        console.log(`✨ ${this.itemType.name} created at (${x}, ${y})`);
    }
    
    createPickupVisual(x, y) {
        // Create container for all visual elements
        this.container = this.scene.add.container(x, y);
        // Characters and enemies are depth-sorted by their y (roughly 400-650), so the old fixed 400
        // put items BEHIND everyone standing near them. Types can ask for a higher layer.
        this.container.setDepth(this.itemType.depth || 400);
        
        if (this.itemType.renderType === 'graphics') {
            // Use graphics rendering (for health cross)
            this.mainGraphic = this.itemType.createGraphics(this.scene, this.container);
        } else if (this.itemType.renderType === 'sprite') {
            // Use sprite rendering (for microphone)
            this.sprite = this.scene.add.sprite(0, 0, this.itemType.spriteKey);
            this.sprite.setScale(this.itemType.spriteScale || 1);
            this.container.add(this.sprite);
        }
        
        // Enable physics on the container
        this.scene.physics.world.enable(this.container);
        this.container.body.setSize(this.itemType.size, this.itemType.size);
        this.container.body.setImmovable(true);
    }
    
    createGlowEffect() {
        // Create a pulsing glow effect with item-specific color
        this.glowGraphic = this.scene.add.graphics();
        this.glowGraphic.fillStyle(this.itemType.glowColor, 0.3);
        this.glowGraphic.fillCircle(0, 0, this.itemType.size * 0.9);
        this.container.add(this.glowGraphic);
        
        // Move glow behind the main graphic
        this.container.sendToBack(this.glowGraphic);
        
        // Pulsing glow animation
        this.glowTween = this.scene.tweens.add({
            targets: this.glowGraphic,
            alpha: 0.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    // Throw the item up, drift it sideways, then let it fall and bounce onto groundY
    startDrop(x, y, drop) {
        this.dropping = true;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const landX = x + dir * (drop.scatter * (0.5 + Math.random() * 0.5));
        
        this.container.setScale(0.4);
        this.scene.tweens.add({ targets: this.container, scale: 1, duration: drop.popTime, ease: 'Back.easeOut' });
        
        // Up (x drifts the whole way across; y is handled in two stages)
        this.dropTween = this.scene.tweens.add({
            targets: this.container,
            x: landX,
            duration: drop.popTime + drop.fallTime,
            ease: 'Sine.easeOut'
        });
        this.popTween = this.scene.tweens.add({
            targets: this.container,
            y: y - drop.popHeight,
            duration: drop.popTime,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (!this.active || !this.container) return;
                // Down: Bounce.easeOut gives the "drops and bounces a few times" motion
                this.fallTween = this.scene.tweens.add({
                    targets: this.container,
                    y: drop.groundY,
                    duration: drop.fallTime,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        if (!this.active || !this.container) return;
                        this.scene.time.delayedCall(drop.settleTime, () => {
                            if (!this.active || !this.container) return;
                            this.dropping = false;
                            this.startBobAnimation();
                        });
                    }
                });
            }
        });
    }
    
    canCollect() {
        return this.active && !this.dropping && !!this.container;
    }
    
    startBobAnimation() {
        // Floating bob animation with item-specific settings
        this.bobTween = this.scene.tweens.add({
            targets: this.container,
            y: this.container.y - this.itemType.bobHeight,
            duration: this.itemType.bobSpeed / 2,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    startDespawnTimer() {
        // Auto-despawn after configured time
        this.despawnTimer = this.scene.time.delayedCall(this.itemType.despawnTime, () => {
            this.destroy();
        });
    }
    
    update(player) {
        if (!this.active || !this.container || this.dropping) return;
        
        // Check for magnetic attraction
        const distance = Phaser.Math.Distance.Between(
            this.container.x, this.container.y,
            player.x, player.y
        );
        
        // Activate magnetic attraction if player is close
        if (distance <= this.itemType.magnetRange && !this.magnetActive) {
            this.magnetActive = true;
            this.startMagneticAttraction(player);
        }
    }
    
    startMagneticAttraction(player) {
        // Stop the bob animation when magnetizing
        if (this.bobTween) {
            this.bobTween.destroy();
        }
        
        // Create magnetic pull toward player
        this.magnetTween = this.scene.tweens.add({
            targets: this.container,
            x: player.x,
            y: player.y,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Auto-collect when reaching player
                this.collect(player);
            }
        });
    }
    
    collect(player) {
        if (!this.active) return;
        
        this.active = false;
        
        // Handle different item type effects (includes sound effects)
        this.applyItemEffect();
        
        // Create pickup effect
        this.createPickupEffect();
        
        // Remove from scene after short delay for effect
        this.scene.time.delayedCall(ITEM_PICKUP_CONFIG.pickupFlashDuration, () => {
            this.destroy();
        });
    }
    
    applyItemEffect() {
        if (this.typeName === 'HEALTH') {
            // Heal both characters (dual character system)
            if (this.scene.characterManager) {
                // Use CharacterManager's heal method for both characters
                const healAmount = this.itemType.healAmount;
                
                // Heal Tireek
                this.scene.characterManager.heal('tireek', healAmount);
                
                // Heal Tryston
                this.scene.characterManager.heal('tryston', healAmount);
                
                // Play health pickup sound
                if (this.scene.audioManager) {
                    this.scene.audioManager.playHealthPickup();
                }
                
                // Whoop + gold wave + sparkling pluses on the player
                if (this.scene.effectSystem && this.scene.effectSystem.onHealthPickup) {
                    this.scene.effectSystem.onHealthPickup();
                }
                
                const tireekHealth = this.scene.characterManager.characters.tireek.health;
                const trystonHealth = this.scene.characterManager.characters.tryston.health;
                // console.log(`💚 Both characters healed! Tireek: ${tireekHealth}/100, Tryston: ${trystonHealth}/100`);
            } else {
                console.warn('⚠️ CharacterManager not found, cannot heal player!');
            }
        } else if (this.typeName === 'MICROPHONE') {
            // Award the points now, so they count even if the level ends mid-flight; the
            // counter itself updates when the flying microphone reaches it. Worth more
            // during a hit combo (ComboSystem: x1-x5).
            const multiplier = this.scene.comboSystem ? this.scene.comboSystem.multiplier : 1;
            const points = this.itemType.points * multiplier;
            this.scene.playerScore += points;
            
            // Play microphone pickup sound
            if (this.scene.audioManager) {
                this.scene.audioManager.playMicrophonePickup();
            }
            
            if (!this.flyToScoreCounter(points)) {
                this.scene.uiManager.updateScoreDisplay(this.scene.playerScore);
            }
            
            console.log(`🎤 Player earned ${points} points (x${multiplier} combo)! Total: ${this.scene.playerScore}`);
        }
    }
    
    // The collected microphone floats up the screen, then swoops into the golden microphone
    // counter in the HUD, which swells when it lands. It is drawn in the HUD scene (so it is
    // above everything) starting exactly where the pickup was on screen. Returns false if
    // it can't be set up, and the caller just updates the counter straight away.
    flyToScoreCounter(points) {
        const scene = this.scene;
        const ui = scene.uiManager;
        const uiScene = scene.uiScene || (ui && ui.uiScene);
        const icon = ui && ui.scoreMicrophone;
        const cam = scene.cameras && scene.cameras.main;
        if (!uiScene || !uiScene.sys || !uiScene.sys.isActive() || !icon || !icon.active || !cam || !this.container) return false;
        
        // World -> HUD scene pixels (same letterbox viewport; HUD camera is zoom 1, scroll 0)
        const zoom = cam.zoom || 1;
        const x0 = (this.container.x - cam.worldView.x) * zoom;
        const y0 = (this.container.y - cam.worldView.y) * zoom;
        const startScale = (this.sprite ? this.sprite.scaleX : 1) * zoom;
        
        // Where the counter's microphone icon is, and how big it is on screen
        const m = icon.getWorldTransformMatrix();
        const target = m.transformPoint((0.5 - icon.originX) * icon.width, (0.5 - icon.originY) * icon.height);
        const endScale = Math.hypot(m.a, m.b);
        
        // Pending points are not on the counter yet: it shows playerScore minus what is still flying
        scene.pendingMicPoints = (scene.pendingMicPoints || 0) + points;
        
        // Worth more than one (a combo multiplier): pop the amount up where it was grabbed
        if (points > 1) {
            const bonus = uiScene.add.text(x0, y0 - 30 * zoom, `+${points}`, {
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontSize: `${Math.round(44 * zoom)}px`,
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: Math.max(3, Math.round(5 * zoom))
            }).setOrigin(0.5).setDepth(5001);
            uiScene.tweens.add({
                targets: bonus, y: bonus.y - 60 * zoom, alpha: 0, duration: 900, ease: 'Quad.easeOut',
                onComplete: () => bonus.destroy()
            });
        }
        
        const glow = uiScene.add.circle(x0, y0, 34 * zoom, 0xffd700, 0.35).setDepth(4999);
        const fly = uiScene.add.sprite(x0, y0, this.itemType.spriteKey).setDepth(5000).setScale(startScale);
        const cleanup = () => { glow.destroy(); fly.destroy(); };
        
        const riseTo = Math.max(28 * zoom, y0 - 150 * zoom);   // float up the screen first...
        const sway = (Math.random() < 0.5 ? -1 : 1) * 14 * zoom;
        const path = { t: 0 };
        let lastGlint = 0;
        
        uiScene.tweens.add({
            targets: [fly, glow],
            y: riseTo, x: x0 + sway,
            duration: 380, ease: 'Sine.easeOut',
            onUpdate: () => fly.setScale(startScale * (1 + 0.3 * (1 - (fly.y - riseTo) / Math.max(1, y0 - riseTo)))),
            onComplete: () => {
                // ...then swoop along a curve into the counter
                const sx = fly.x, sy = fly.y, from = fly.scaleX;
                const cx = sx + (target.x - sx) * 0.3;              // control point: up and toward the counter
                const cy = Math.min(sy, target.y) - 40 * zoom;
                uiScene.tweens.add({
                    targets: path, t: 1, duration: 520, ease: 'Cubic.easeIn',
                    onUpdate: (tw, o) => {
                        const t = o.t, u = 1 - t;
                        const px = u * u * sx + 2 * u * t * cx + t * t * target.x;
                        const py = u * u * sy + 2 * u * t * cy + t * t * target.y;
                        fly.setPosition(px, py);
                        glow.setPosition(px, py);
                        fly.setScale(from + (endScale - from) * t);
                        fly.setAngle(360 * t);
                        // a trail of little gold glints
                        const now = uiScene.time.now;
                        if (now - lastGlint > 40) {
                            lastGlint = now;
                            const star = uiScene.add.star(px, py, 4, 2 * zoom, 7 * zoom, 0xffe066).setDepth(4998);
                            uiScene.tweens.add({ targets: star, alpha: 0, scale: 0.2, duration: 300, onComplete: () => star.destroy() });
                        }
                    },
                    onComplete: () => {
                        cleanup();
                        scene.pendingMicPoints = Math.max(0, (scene.pendingMicPoints || 0) - points);
                        if (ui && ui.onMicrophoneArrived) {
                            ui.onMicrophoneArrived(scene.playerScore - scene.pendingMicPoints);
                        }
                    }
                });
            }
        });
        
        // The pickup itself is replaced by the flying copy
        this.container.setVisible(false);
        return true;
    }
    
    createPickupEffect() {
        // Create a burst effect when collected
        const particles = this.scene.add.particles(this.container.x, this.container.y, 'effect', {
            scale: { start: 0.3, end: 0 },
            speed: { min: 50, max: 150 },
            lifespan: 300,
            quantity: 8,
            alpha: { start: 1, end: 0 },
            tint: this.itemType.glowColor,
        });
        
        // Clean up particles after effect
        this.scene.time.delayedCall(ITEM_PICKUP_CONFIG.particleEffectDuration, () => {
            particles.destroy();
        });
        
        // Flash effect on pickup
        if (this.container) {
            this.scene.tweens.add({
                targets: this.container,
                scaleX: ITEM_PICKUP_CONFIG.pickupFlashScale,
                scaleY: ITEM_PICKUP_CONFIG.pickupFlashScale,
                alpha: 0,
                duration: ITEM_PICKUP_CONFIG.pickupFlashDuration,
                ease: 'Power2'
            });
        }
    }
    
    destroy() {
        this.active = false;
        
        // Clean up timers and tweens
        if (this.despawnTimer) {
            this.despawnTimer.destroy();
        }
        if (this.bobTween) {
            this.bobTween.destroy();
        }
        if (this.magnetTween) {
            this.magnetTween.destroy();
        }
        if (this.glowTween) {
            this.glowTween.destroy();
        }
        [this.dropTween, this.popTween, this.fallTween].forEach(t => { if (t) t.destroy(); });
        
        // Remove from scene
        if (this.container) {
            this.container.destroy();
        }
        
        console.log(`✨ ${this.itemType.name} destroyed`);
    }
}

// ========================================
// UNIFIED ITEM PICKUP MANAGER
// ========================================

class ItemPickupManager {
    constructor(scene) {
        this.scene = scene;
        this.pickups = [];
        this.spawnTimers = {};
        scene.pendingMicPoints = 0; // points collected but still flying to the counter
        
        // Initialize spawn timers for each item type
        Object.keys(ITEM_TYPES).forEach(itemType => {
            this.spawnTimers[itemType] = 0;
        });
        
        console.log('✨ ItemPickupManager initialized!');
    }
    
    update(time, delta, player) {
        // Update spawn timers for each item type
        Object.entries(ITEM_TYPES).forEach(([itemType, config]) => {
            if (config.dropOnly) return; // dropped by enemies, never spawned off-screen
            this.spawnTimers[itemType] += delta;
            
            if (this.spawnTimers[itemType] >= config.spawnInterval) {
                if (this.shouldSpawnItem(itemType, player)) {
                    this.spawnItem(itemType, player);
                    this.spawnTimers[itemType] = 0;
                }
            }
        });
        
        // Update all pickups
        this.pickups.forEach((pickup, index) => {
            if (pickup.active) {
                pickup.update(player);
                
                // Check for collision with player
                const distance = Phaser.Math.Distance.Between(
                    pickup.container.x, pickup.container.y,
                    player.x, player.y
                );
                
                if (pickup.canCollect() && distance <= pickup.itemType.collisionRadius) {
                    pickup.collect(player);
                }
            } else {
                // Remove inactive pickups
                this.pickups.splice(index, 1);
            }
        });
    }
    
    // "Hurt" = either character is at or below healthDrop.lowHealthFraction of their max health
    isPlayerLowOnHealth() {
        const cm = this.scene.characterManager;
        if (!cm || !cm.characters) return false;
        const cfg = ITEM_PICKUP_CONFIG.healthDrop;
        return ['tireek', 'tryston'].some(name => {
            const c = cm.characters[name];
            return c && c.maxHealth > 0 && (c.health / c.maxHealth) <= cfg.lowHealthFraction;
        });
    }
    
    // Called when the player defeats an enemy: while hurt, most kills drop a health cross
    // (bosses have their own scripted flow and never drop one)
    onEnemyKilled(enemy) {
        if (!enemy || enemy.isBoss || !enemy.sprite) return;
        const cfg = ITEM_PICKUP_CONFIG.healthDrop;
        if (!this.isPlayerLowOnHealth()) return;
        if (Math.random() >= cfg.chance) return;
        
        const max = ITEM_TYPES.HEALTH.maxOnScreen;
        if (this.pickups.filter(p => p.typeName === 'HEALTH' && p.active).length >= max) return;
        
        // Land where the enemy fell, on the street (same y-space the player walks in)
        const env = this.scene.environmentManager;
        const streetTop = env ? env.streetTopLimit : WORLD_CONFIG.streetTopLimit;
        const streetBottom = env ? env.streetBottomLimit : WORLD_CONFIG.streetBottomLimit;
        const groundY = Math.max(streetTop, Math.min(streetBottom, enemy.sprite.y));
        
        const pickup = new ItemPickup(this.scene, enemy.sprite.x, groundY - 30, 'HEALTH', {
            drop: Object.assign({}, cfg, { groundY })
        });
        this.pickups.push(pickup);
        console.log(`💚 ${enemy.characterConfig ? enemy.characterConfig.name : 'Enemy'} dropped a health cross at (${Math.round(enemy.sprite.x)}, ${Math.round(groundY)})`);
    }
    
    shouldSpawnItem(itemType, player) {
        const config = ITEM_TYPES[itemType];
        
        // Check max items on screen
        const currentCount = this.pickups.filter(p => p.typeName === itemType && p.active).length;
        if (currentCount >= config.maxOnScreen) {
            return false;
        }
        
        // Special logic for health items
        if (itemType === 'HEALTH') {
            // Don't spawn health if BOTH characters are at full health (dual character system)
            if (!config.spawnWhenPlayerHealthFull && this.scene.characterManager) {
                const tireekFull = this.scene.characterManager.characters.tireek.health >= this.scene.characterManager.characters.tireek.maxHealth;
                const trystonFull = this.scene.characterManager.characters.tryston.health >= this.scene.characterManager.characters.tryston.maxHealth;
                
                if (tireekFull && trystonFull) {
                    return false; // Both at full health, no need for pickup
                }
            }
        }
        
        return true;
    }
    
    spawnItem(itemType, player) {
        // Find valid spawn position
        const spawnPos = this.findValidSpawnPosition(player);
        if (!spawnPos) return;
        
        // Create new item pickup
        const pickup = new ItemPickup(this.scene, spawnPos.x, spawnPos.y, itemType);
        this.pickups.push(pickup);
        
        console.log(`✨ Spawned ${ITEM_TYPES[itemType].name} at (${spawnPos.x}, ${spawnPos.y}) - Total items: ${this.pickups.length}`);
    }
    
    findValidSpawnPosition(player) {
        const config = ITEM_PICKUP_CONFIG;
        const maxAttempts = 10;
        
        // Get camera bounds for off-screen spawning
        // Use virtual dimensions instead of camera.width/height to get world coordinates
        const cameraX = this.scene.cameras.main.scrollX;
        const virtualWidth = this.scene.virtualWidth || 1200;
        const virtualHeight = this.scene.virtualHeight || 720;
        const cameraWidth = virtualWidth;
        const cameraHeight = virtualHeight;
        const cameraY = this.scene.cameras.main.scrollY;
        
        for (let i = 0; i < maxAttempts; i++) {
            // Heavily favor spawning to the right to encourage forward progression
            // Use configurable probability for left spawns (default 10%)
            const spawnOnLeft = Math.random() < config.spawnLeftProbability;
            let x;
            
            if (spawnOnLeft) {
                // Spawn off-screen to the left (10% of the time)
                x = cameraX - config.spawnOffscreenDistance;
            } else {
                // Spawn off-screen to the right (90% of the time)
                x = cameraX + cameraWidth + config.spawnOffscreenDistance;
            }
            
            // Random Y position within street bounds (but off-screen vertically if possible)
            let y;
            // Use environment manager's street bounds (level-specific) instead of global config
            const streetTop = this.scene.environmentManager ? this.scene.environmentManager.streetTopLimit : WORLD_CONFIG.streetTopLimit;
            const streetBottom = this.scene.environmentManager ? this.scene.environmentManager.streetBottomLimit : WORLD_CONFIG.streetBottomLimit;
            
            // Add margin from boundaries to prevent items from spawning too close to edges
            const boundaryMargin = 50; // Margin from top/bottom boundaries
            const safeTop = streetTop + boundaryMargin;
            const safeBottom = streetBottom - boundaryMargin;
            
            // Try to spawn off-screen vertically first, fall back to street bounds
            if (Math.random() < 0.7) {
                // 70% chance to spawn off-screen vertically
                const spawnAbove = Math.random() < 0.5;
                if (spawnAbove) {
                    y = cameraY - config.spawnOffscreenDistance;
                } else {
                    y = cameraY + cameraHeight + config.spawnOffscreenDistance;
                }
                // Clamp to safe street bounds (with margin from edges)
                y = Math.max(safeTop, Math.min(safeBottom, y));
            } else {
                // 30% chance to spawn within safe street bounds (for variety)
                y = Phaser.Math.Between(safeTop, safeBottom);
            }
            
            // Return the position immediately - no distance constraints needed
            return { x, y };
        }
        
        // If no valid position found, return null
        console.log('✨ Could not find valid spawn position for item pickup');
        return null;
    }
    
    createParticleEffect() {
        // Create a simple particle effect for pickup visual
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0x00ff00);
        graphics.fillCircle(0, 0, 2);
        graphics.generateTexture('effect', 4, 4);
        graphics.destroy();
    }
    
    clearAllPickups() {
        // Clear all item pickups
        this.pickups.forEach(pickup => pickup.destroy());
        this.pickups = [];
        //console.log('✨ Cleared all item pickups');
    }
    
    getPickupCounts() {
        // Return counts of each pickup type for debugging
        const counts = {};
        Object.keys(ITEM_TYPES).forEach(itemType => {
            counts[itemType] = this.pickups.filter(p => p.typeName === itemType && p.active).length;
        });
        return counts;
    }
}