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
        
        // The Negatives' take on the tornado (same 3-frame layout), played when a boss spawns in
        this.scene.load.spritesheet('negative_tornado', 'assets/effects/negative_tornado.png', {
            frameWidth: 96,
            frameHeight: 96
        });

        // Blue fire trail for the Negatives' thrown record (8 frames stacked vertically)
        this.scene.load.spritesheet('bluefire', 'assets/effects/bluefire_8frame.png', {
            frameWidth: 128,
            frameHeight: 128
        });
        
        // Add load completion callback for tornado
        this.scene.load.on('filecomplete-spritesheet-tornado', (key, type, data) => {
            console.log('✅ Tornado spritesheet loaded successfully:', { key, type });
        });
    }
    
    createEffectAnimations() {
        console.log('🌪️ Creating effect animations...');
        
        // Blue fire (looping) - used by projectiles whose weapon config has effect: 'bluefire'
        if (this.scene.textures.exists('bluefire') && !this.scene.anims.exists('bluefire_effect')) {
            const fireTexture = this.scene.textures.get('bluefire');
            this.scene.anims.create({
                key: 'bluefire_effect',
                frames: this.scene.anims.generateFrameNumbers('bluefire', { start: 0, end: fireTexture.frameTotal - 2 }),
                frameRate: 16,
                repeat: -1
            });
        }
        
        // Negative tornado (play once) - spawnTornadoEffect(..., 'negative_tornado')
        if (this.scene.textures.exists('negative_tornado') && !this.scene.anims.exists('negative_tornado_effect')) {
            const negTexture = this.scene.textures.get('negative_tornado');
            this.scene.anims.create({
                key: 'negative_tornado_effect',
                frames: this.scene.anims.generateFrameNumbers('negative_tornado', { start: 0, end: negTexture.frameTotal - 2 }),
                frameRate: 12,
                repeat: 0
            });
        }

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
    
    // variant: 'tornado' (default, the player's switch effect) or 'negative_tornado' (boss spawn-in)
    spawnTornadoEffect(x, y, scale, depth, onComplete, variant = 'tornado') {
        // Check if animation exists
        if (!this.scene.anims.exists(`${variant}_effect`)) {
            console.warn(`⚡ ${variant} animation not found, cannot spawn effect`);
            if (onComplete) {
                onComplete();
            }
            return { sprite: null, duration: 0 };
        }

        // Create tornado effect sprite
        const tornadoSprite = this.scene.add.sprite(x, y, variant);
        tornadoSprite.setScale(scale * 1.2); // Slightly larger than character
        tornadoSprite.setDepth(depth + 1); // Above character

        // Play tornado animation
        tornadoSprite.anims.play(`${variant}_effect`);
        
        // Play tornado wind sound effect
        if (this.scene.audioManager) {
            this.scene.audioManager.playSoundEffect('tornadoWind', 0.4);
        }
        
        // Calculate animation duration (3 frames at 12 FPS = 3/12 = 0.25 seconds = 250ms)
        const animationDuration = (3 / 12) * 1000; // 250ms
        
        // Track active effect
        // Store target sprite if provided (e.g. player) to follow
        if (onComplete && onComplete.target) {
            tornadoSprite.target = onComplete.target;
        }
        
        this.activeEffects.push(tornadoSprite);
        
        // Set up cleanup after animation
        this.scene.time.delayedCall(animationDuration, () => {
            this.cleanupEffect(tornadoSprite);
            if (onComplete) {
                onComplete();
            }
        });
        
        console.log('🌪️ Tornado effect spawned at', { x, y, scale, duration: animationDuration });
        
        // Apply wind effect to nearby enemies (the player's tornado only - a boss
        // spawning in shouldn't shove the other enemies around)
        if (variant === 'tornado') {
            this.applyWindEffectToEnemies(x, y, WIND_RADIUS, WIND_BASE_FORCE, WIND_DURATION);
        }
        
        return { sprite: tornadoSprite, duration: animationDuration };
    }
    
    // ========================================
    // GAME FEEL: HIT-STOP, BOSS SHAKE, DEATH JUICE, LOW-HEALTH VIGNETTE
    // ========================================
    // Tunables live in GAME_CONFIG.juice

    get juice() {
        return (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.juice) || null;
    }

    // Freeze the world for a few frames. Uses the physics and animation time scales
    // rather than world.isPaused, which dialogue, death and event pauses all toggle
    // directly - stacking on those would risk un-pausing them.
    hitStop(duration) {
        if (!duration || duration <= 0) return;
        const s = this.scene;
        const until = s.time.now + duration;
        if (this._hitStopActive && until <= this._hitStopUntil) return; // shorter than the one running
        this._hitStopUntil = until;
        if (!this._hitStopActive) {
            this._hitStopActive = true;
            this._hitStopSaved = { physics: s.physics.world.timeScale, anims: s.anims.globalTimeScale };
            s.physics.world.timeScale = 1e6;
            s.anims.globalTimeScale = 0;
        }
        // Exactly one timer owns the freeze. A longer stop requested mid-freeze replaces
        // it. Its callback must never decide "too early" and bail: Phaser timers count a
        // smoothed frame delta while time.now is the raw clock, so on an uneven frame
        // rate (phones) the timer can fire before time.now reaches `until`. The old
        // version returned in that case and, the timer being one-shot, nothing ever
        // unfroze the world - buttons still made sounds but nobody could move.
        if (this._hitStopTimer) this._hitStopTimer.remove(false);
        this._hitStopTimer = s.time.delayedCall(duration, () => this.endHitStop());
    }

    endHitStop() {
        const s = this.scene;
        if (this._hitStopTimer) {
            this._hitStopTimer.remove(false);
            this._hitStopTimer = null;
        }
        if (!this._hitStopActive) return;
        this._hitStopActive = false;
        this._hitStopUntil = 0;
        s.physics.world.timeScale = this._hitStopSaved.physics;
        s.anims.globalTimeScale = this._hitStopSaved.anims;
        // Drop the frame time that banked up while frozen, or Arcade's fixed step would
        // run catch-up steps on the next frame and lurch everything forward
        s.physics.world._elapsed = 0;
    }

    // Safety net, called every frame: if the freeze somehow outlives its timer, end it
    checkHitStop() {
        if (this._hitStopActive && this.scene.time.now >= this._hitStopUntil + 250) {
            console.warn('⏱️ Hit-stop overran its timer - ending it from update()');
            this.endHitStop();
        }
    }

    isBossFightActive() {
        const bosses = this.scene.bosses || [];
        return bosses.some(b => b && b.sprite && b.sprite.active && b.health > 0);
    }

    bossShake(kind) {
        const cfg = this.juice && this.juice.bossShake && this.juice.bossShake[kind];
        if (!cfg) return;
        if (window.GameSettings && window.GameSettings.reduceEffects()) return; // Settings: reduce flashing & shake
        this.scene.cameras.main.shake(cfg.duration, cfg.intensity);
    }

    // Called right after the player lands a hit (punch or record) on an enemy
    onEnemyHit(enemy) {
        const juice = this.juice;
        if (!juice || !enemy) return;
        const killed = enemy.isBoss ? enemy.health <= 0 : enemy.state === ENEMY_STATES.DEAD;
        const stop = juice.hitStop || {};
        this.hitStop(killed ? stop.kill : (enemy.isBoss ? stop.bossHit : stop.hit));
        if (enemy.isBoss) this.bossShake(killed ? 'defeat' : 'hit');
    }

    // Called when the player takes damage; only shakes while a boss is up
    onPlayerHurt() {
        if (this.isBossFightActive()) this.bossShake('hurt');
    }

    // Regular enemy killing blow: shove away from the hit and squash-and-stretch the body
    onEnemyDeath(enemy, source) {
        const cfg = this.juice && this.juice.enemyDeath;
        const sprite = enemy && enemy.sprite;
        if (!cfg || !sprite || !sprite.active) return;

        if (source && sprite.body) {
            const dir = sprite.x >= source.x ? 1 : -1;
            sprite.setVelocityX(dir * cfg.knockback);
            this.scene.time.delayedCall(cfg.knockbackDuration, () => {
                if (sprite.active && sprite.body) sprite.setVelocityX(0);
            });
        }

        // Enemy.update() returns early once DEAD, so perspective scaling won't fight this tween
        this.scene.tweens.add({
            targets: sprite,
            scaleX: sprite.scaleX * cfg.stretchX,
            scaleY: sprite.scaleY * cfg.squashY,
            duration: cfg.squashDuration,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }

    // Drive the vignette from the active character's health fraction (0-1). Call every frame.
    updateHealthVignette(healthFraction) {
        const cfg = this.juice && this.juice.lowHealthVignette;
        if (!cfg) return;
        const cam = this.scene.cameras.main;
        if (this._vignette === undefined) {
            // Post FX are WebGL only; remember a null so we don't retry every frame on Canvas
            const webgl = this.scene.sys.renderer && this.scene.sys.renderer.type === Phaser.WEBGL;
            this._vignette = (webgl && cam.postFX) ? cam.postFX.addVignette(0.5, 0.5, 1, 0) : null;
        }
        if (!this._vignette) return;

        // 0 above the threshold, closing in and darkening towards 0 health
        const t = Phaser.Math.Clamp(1 - healthFraction / cfg.startBelow, 0, 1);
        let strength = t * cfg.maxStrength;
        // No pulsing when the player has asked for reduced flashing
        if (t > 0 && healthFraction <= cfg.pulseBelow && !(window.GameSettings && window.GameSettings.reduceEffects())) {
            const pulse = (Math.sin((this.scene.time.now / cfg.pulsePeriod) * Math.PI * 2) + 1) / 2;
            strength += pulse * cfg.pulseStrength;
        }
        this._vignette.strength = strength;
        this._vignette.radius = 1 - t * (1 - cfg.minRadius);
    }

    // ========================================
    // PLAYER AURA (looping fire behind the player, e.g. the final boss fight)
    // ========================================
    // opts: effect (spritesheet/anim base, default 'bluefire'), hue (degrees to rotate the
    // colours - 190 turns the blue fire yellow; 0 keeps it), scale (multiple of the player's
    // height, default 1.1), offsetY (px below the player's centre for the flame base), alpha

    setPlayerAura(opts = {}) {
        const effect = opts.effect || 'bluefire';
        if (!this.scene.anims.exists(`${effect}_effect`)) {
            console.warn(`🔥 Player aura: animation ${effect}_effect not found`);
            return;
        }
        this.clearPlayerAura();

        const aura = this.scene.add.sprite(0, 0, effect);
        aura.setOrigin(0.5, 0.85);          // flame base sits near the feet
        aura.setAlpha(opts.alpha !== undefined ? opts.alpha : 0.9);
        aura.anims.play(`${effect}_effect`, true);
        // Real hue rotation (a tint would only multiply the blue towards black). WebGL only.
        if (opts.hue && aura.preFX) {
            aura.preFX.addColorMatrix().hue(opts.hue);
        }
        aura.auraOpts = { scale: opts.scale !== undefined ? opts.scale : 1.1, offsetY: opts.offsetY || 0 };
        this._playerAura = aura;
        this.updatePlayerAura();
        console.log(`🔥 Player aura on (${effect}, hue ${opts.hue || 0})`);
    }

    clearPlayerAura() {
        if (this._playerAura) {
            this._playerAura.destroy();
            this._playerAura = null;
        }
    }

    // Follows whichever character is active (survives switches) and stays just behind them
    updatePlayerAura() {
        const aura = this._playerAura;
        if (!aura || !aura.active) return;
        const player = this.scene.player;
        if (!player || !player.active) { aura.setVisible(false); return; }
        aura.setVisible(player.visible);   // hidden with the player during the switch tornado
        const targetHeight = player.displayHeight * aura.auraOpts.scale;
        aura.setScale(targetHeight / aura.height);
        aura.x = player.x;
        aura.y = player.y + player.displayHeight * 0.35 + aura.auraOpts.offsetY;
        aura.setDepth(player.depth - 1);
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
        this.endHitStop();
        this.clearPlayerAura();
        this.activeEffects.forEach(sprite => {
            if (sprite && sprite.active) {
                sprite.destroy();
            }
        });
        this.activeEffects = [];
        console.log('🌪️ All effects cleaned up');
    }
    
    update() {
        this.checkHitStop();
        this.updatePlayerAura();

        // Update effect positions to follow targets
        this.activeEffects.forEach(sprite => {
            if (sprite && sprite.active && sprite.target) {
                // If target is active and visible, follow it
                if (sprite.target.active) {
                    sprite.x = sprite.target.x;
                    sprite.y = sprite.target.y;
                    
                    // Also update wind effect center
                    // Note: We can't update the ongoing wind effect easily without refactoring applyWindEffectToEnemies
                    // but for visual consistency, the sprite moving is most important
                }
            }
        });
    }
}

// Make EffectSystem available globally
if (typeof window !== 'undefined') {
    window.EffectSystem = EffectSystem;
}

