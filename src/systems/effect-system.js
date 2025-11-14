// ========================================
// EFFECT SYSTEM
// ========================================
// Manages visual effects like tornado animations for character switching

// Wind effect configuration
const WIND_RADIUS = 300; // Medium radius in pixels
const WIND_BASE_FORCE = 2000; // Medium push force in pixels/second
const WIND_DURATION = 400; // Duration in milliseconds (matches tornado animation)

class EffectSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = []; // Track active effect sprites
        
        console.log('🌪️ EffectSystem initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    loadEffectAssets() {
        // Load tornado effect spritesheet
        console.log('🌪️ Loading tornado effect spritesheet...');
        this.scene.load.spritesheet('tornado', 'assets/effects/Tornado.png', {
            frameWidth: 96,
            frameHeight: 96
        });
        
        // Add load completion callback for tornado
        this.scene.load.on('filecomplete-spritesheet-tornado', (key, type, data) => {
            console.log('✅ Tornado spritesheet loaded successfully:', { key, type });
        });
    }
    
    createEffectAnimations() {
        console.log('🌪️ Creating effect animations...');
        
        // Check if spritesheet exists first
        if (!this.scene.textures.exists('tornado')) {
            console.warn('❌ Tornado spritesheet not found in textures, skipping animation creation');
            console.log('Available textures:', Object.keys(this.scene.textures.list));
            return;
        }
        
        try {
            const tornadoTexture = this.scene.textures.get('tornado');
            const endFrame = tornadoTexture.frameTotal - 1;
            
            console.log(`Generating tornado frames from 0 to ${endFrame} (total frames: ${tornadoTexture.frameTotal})`);
            
            const tornadoFrames = this.scene.anims.generateFrameNumbers('tornado', {
                start: 0,
                end: endFrame
            });
            
            const animConfig = {
                key: 'tornado_effect',
                frames: tornadoFrames,
                frameRate: 12,
                repeat: 0 // Play once
            };
            
            this.scene.anims.create(animConfig);
            
            // Verify animation was created
            if (this.scene.anims.exists('tornado_effect')) {
                console.log('✅ Successfully created tornado effect animation');
                const anim = this.scene.anims.get('tornado_effect');
                console.log('Animation details:', {
                    key: anim.key,
                    frames: anim.frames.length,
                    frameRate: anim.frameRate
                });
            } else {
                console.error('❌ Animation creation failed - animation does not exist after creation');
            }
        } catch (error) {
            console.error('❌ Failed to create tornado effect animation:', error);
            console.error('Error details:', error.message, error.stack);
        }
    }
    
    // ========================================
    // EFFECT SPAWNING
    // ========================================
    
    spawnTornadoEffect(x, y, scale, depth, onComplete) {
        // Check if animation exists
        if (!this.scene.anims.exists('tornado_effect')) {
            console.warn('⚡ Tornado animation not found, cannot spawn effect');
            if (onComplete) {
                onComplete();
            }
            return { sprite: null, duration: 0 };
        }
        
        // Create tornado effect sprite
        const tornadoSprite = this.scene.add.sprite(x, y, 'tornado');
        tornadoSprite.setScale(scale * 1.2); // Slightly larger than character
        tornadoSprite.setDepth(depth + 1); // Above character
        
        // Play tornado animation
        tornadoSprite.anims.play('tornado_effect');
        
        // Play tornado wind sound effect
        if (this.scene.audioManager) {
            this.scene.audioManager.playSoundEffect('tornadoWind', 0.4);
        }
        
        // Calculate animation duration (3 frames at 12 FPS = 3/12 = 0.25 seconds = 250ms)
        const animationDuration = (3 / 12) * 1000; // 250ms
        
        // Track active effect
        this.activeEffects.push(tornadoSprite);
        
        // Set up cleanup after animation
        this.scene.time.delayedCall(animationDuration, () => {
            this.cleanupEffect(tornadoSprite);
            if (onComplete) {
                onComplete();
            }
        });
        
        console.log('🌪️ Tornado effect spawned at', { x, y, scale, duration: animationDuration });
        
        // Apply wind effect to nearby enemies
        this.applyWindEffectToEnemies(x, y, WIND_RADIUS, WIND_BASE_FORCE, WIND_DURATION);
        
        return { sprite: tornadoSprite, duration: animationDuration };
    }
    
    // ========================================
    // WIND EFFECT
    // ========================================
    
    applyWindEffectToEnemies(x, y, radius, force, duration) {
        if (!this.scene.enemies || !Array.isArray(this.scene.enemies)) {
            return;
        }

        let affectedCount = 0;

        this.scene.enemies.forEach(enemy => {
            // Skip dead enemies
            if (!enemy || !enemy.sprite || !enemy.sprite.active || enemy.state === ENEMY_STATES.DEAD) {
                return;
            }

            // Calculate distance from tornado center to enemy
            const distance = Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y);

            // Check if enemy is within wind radius
            if (distance <= radius && distance > 0) {
                // Calculate direction away from tornado center
                const dx = enemy.sprite.x - x;
                const dy = enemy.sprite.y - y;
                
                // Normalize direction vector
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;
                
                // Calculate force based on distance (closer = stronger)
                // Inverse distance relationship: force decreases as distance increases
                const distanceFactor = 1 - (distance / radius);
                const pushbackForce = force * distanceFactor;
                
                // Calculate pushback velocity (horizontal component only for 2D side-scrolling)
                // Use normalized direction * force
                const pushbackVelocity = normalizedDx * pushbackForce;

                // Apply wind effect to enemy
                enemy.isFrozenByWind = true;
                enemy.windPushbackTimer = duration;
                enemy.windPushbackVelocity = pushbackVelocity;

                affectedCount++;
                console.log(`🌪️ Wind effect applied to ${enemy.characterConfig.name} at distance ${Math.round(distance)}px, force: ${Math.round(pushbackForce)}`);
            }
        });

        if (affectedCount > 0) {
            console.log(`🌪️ Wind effect applied to ${affectedCount} enemy/enemies`);
        }
    }
    
    // ========================================
    // CLEANUP
    // ========================================
    
    cleanupEffect(sprite) {
        if (sprite && sprite.active) {
            // Remove from active effects list
            const index = this.activeEffects.indexOf(sprite);
            if (index !== -1) {
                this.activeEffects.splice(index, 1);
            }
            
            // Destroy sprite
            sprite.destroy();
            console.log('🌪️ Tornado effect cleaned up');
        }
    }
    
    // Clean up all active effects (useful for scene transitions)
    cleanupAllEffects() {
        this.activeEffects.forEach(sprite => {
            if (sprite && sprite.active) {
                sprite.destroy();
            }
        });
        this.activeEffects = [];
        console.log('🌪️ All effects cleaned up');
    }
}

// Make EffectSystem available globally
if (typeof window !== 'undefined') {
    window.EffectSystem = EffectSystem;
}

