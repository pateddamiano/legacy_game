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
        spawnInterval: 3000,
        maxOnScreen: 3,
        despawnTime: 20000,
        size: 32,
        glowColor: 0x00ff00,        // Green glow
        magnetRange: 80,
        magnetSpeed: 300,
        collisionRadius: 40,
        bobHeight: 8,
        bobSpeed: 2000,
        spawnWhenPlayerHealthFull: false,
        points: 0,                  // No points for health
        sound: 'healthPickup',
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
        sound: 'microphonePickup',
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
    spawnOffscreenDistance: 50,  // how far off-screen items spawn (in pixels)
    
    // 🎮 GENERAL SETTINGS
    particleEffectDuration: 500,
    pickupFlashDuration: 200,
    pickupFlashScale: 1.5,
};

// ========================================
// UNIFIED ITEM PICKUP CLASS
// ========================================

class ItemPickup {
    constructor(scene, x, y, itemType) {
        this.scene = scene;
        this.itemType = ITEM_TYPES[itemType];
        this.typeName = itemType;
        this.active = true;
        this.magnetActive = false;
        
        // Create the main pickup graphic or sprite
        this.createPickupVisual(x, y);
        
        // Add glow effect
        this.createGlowEffect();
        
        // Start floating animation
        this.startBobAnimation();
        
        // Set despawn timer
        this.startDespawnTimer();
        
        console.log(`✨ ${this.itemType.name} created at (${x}, ${y})`);
    }
    
    createPickupVisual(x, y) {
        // Create container for all visual elements
        this.container = this.scene.add.container(x, y);
        this.container.setDepth(400); // Above characters but below UI
        
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
        if (!this.active || !this.container) return;
        
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
        
        // Handle different item type effects
        this.applyItemEffect();
        
        // Play pickup sound effect
        if (this.scene.audioManager && this.itemType.sound) {
            this.scene.audioManager.playSoundEffect(this.itemType.sound);
        }
        
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
            if (this.scene.characters) {
                // Heal Tireek
                const tireekHealAmount = Math.min(
                    this.itemType.healAmount,
                    this.scene.characters.tireek.maxHealth - this.scene.characters.tireek.health
                );
                if (tireekHealAmount > 0) {
                    this.scene.characters.tireek.health += tireekHealAmount;
                }
                
                // Heal Tryston
                const trystonHealAmount = Math.min(
                    this.itemType.healAmount,
                    this.scene.characters.tryston.maxHealth - this.scene.characters.tryston.health
                );
                if (trystonHealAmount > 0) {
                    this.scene.characters.tryston.health += trystonHealAmount;
                }
                
                // Update UI
                const activeChar = this.scene.selectedCharacter;
                this.scene.uiManager.updateHealthBar(
                    this.scene.characters[activeChar].health, 
                    this.scene.characters[activeChar].maxHealth
                );
                this.scene.uiManager.updateDualCharacterHealth(
                    this.scene.characters.tireek.health,
                    this.scene.characters.tryston.health,
                    activeChar
                );
                
                console.log(`💚 Both characters healed! Tireek: ${this.scene.characters.tireek.health}/100, Tryston: ${this.scene.characters.tryston.health}/100`);
            }
        } else if (this.typeName === 'MICROPHONE') {
            // Award points
            this.scene.playerScore += this.itemType.points;
            this.scene.uiManager.updateScoreDisplay(this.scene.playerScore);
            console.log(`🎤 Player earned ${this.itemType.points} points! Total: ${this.scene.playerScore}`);
        }
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
        
        // Initialize spawn timers for each item type
        Object.keys(ITEM_TYPES).forEach(itemType => {
            this.spawnTimers[itemType] = 0;
        });
        
        console.log('✨ ItemPickupManager initialized!');
    }
    
    update(time, delta, player) {
        // Update spawn timers for each item type
        Object.entries(ITEM_TYPES).forEach(([itemType, config]) => {
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
                
                if (distance <= pickup.itemType.collisionRadius) {
                    pickup.collect(player);
                }
            } else {
                // Remove inactive pickups
                this.pickups.splice(index, 1);
            }
        });
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
            if (!config.spawnWhenPlayerHealthFull && this.scene.characters) {
                const tireekFull = this.scene.characters.tireek.health >= this.scene.characters.tireek.maxHealth;
                const trystonFull = this.scene.characters.tryston.health >= this.scene.characters.tryston.maxHealth;
                
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
        const cameraX = this.scene.cameras.main.scrollX;
        const cameraWidth = this.scene.cameras.main.width;
        const cameraY = this.scene.cameras.main.scrollY;
        const cameraHeight = this.scene.cameras.main.height;
        
        for (let i = 0; i < maxAttempts; i++) {
            // Randomly choose left or right side of screen for horizontal spawning
            const spawnOnLeft = Math.random() < 0.5;
            let x;
            
            if (spawnOnLeft) {
                // Spawn off-screen to the left
                x = cameraX - config.spawnOffscreenDistance;
            } else {
                // Spawn off-screen to the right
                x = cameraX + cameraWidth + config.spawnOffscreenDistance;
            }
            
            // Random Y position within street bounds (but off-screen vertically if possible)
            let y;
            const streetTop = WORLD_CONFIG.streetTopLimit;
            const streetBottom = WORLD_CONFIG.streetBottomLimit;
            
            // Try to spawn off-screen vertically first, fall back to street bounds
            if (Math.random() < 0.7) {
                // 70% chance to spawn off-screen vertically
                const spawnAbove = Math.random() < 0.5;
                if (spawnAbove) {
                    y = cameraY - config.spawnOffscreenDistance;
                } else {
                    y = cameraY + cameraHeight + config.spawnOffscreenDistance;
                }
                // Clamp to street bounds
                y = Math.max(streetTop, Math.min(streetBottom, y));
            } else {
                // 30% chance to spawn within street bounds (for variety)
                y = Phaser.Math.Between(streetTop, streetBottom);
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
        console.log('✨ Cleared all item pickups');
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