// ========================================
// SPECIAL ATTACK (FIREBALL)
// ========================================
// A meter in the top-right HUD box (UIManager.updateSpecialDisplay) charges over time,
// faster the higher the combo (ComboSystem.multiplier): FULL_CHARGE_MS at x1, down to
// MAX_COMBO_CHARGE_MS at the top multiplier. Getting hit ends the combo, so the charge is
// kept but slows back down to the x1 rate.
//
// Full: V (or the SPECIAL touch button, which only shows up then) plays the fighter's
// special throw and releases a fireball (Tireek orange, Tryston blue) that flies straight
// along the player's lane and off the screen. Every enemy in that lane it passes dies;
// bosses lose BOSS_DAMAGE_FRACTION of their max health instead. Story enemies protected by
// EventEnemyProtection are left alone.
//
// The moment it charges, EnemySpawnManager.spawnWave sends CHARGED_WAVE_SIZE extra enemies
// in from the side the player faces, so there's a crowd for the fireball to burn through.
//
// No charging while the level 1 tutorial runs (it never allows 'special' either), during
// dialogue, or while input is off for a transition; pausing freezes it with the scene.

class SpecialAttackSystem {
    constructor(scene) {
        this.scene = scene;
        this.charge = 0;          // 0..1
        this.fireballs = [];
        this.releaseTimer = null;
        this.shown = null;        // last values sent to the HUD / touch button
        SpecialAttackSystem.createAnimations(scene);
        scene.events.once('shutdown', () => this.destroy());
    }

    // Fireball sheets: 96x96 frames stacked vertically. Called by the loading scenes.
    static loadAssets(load) {
        Object.values(SpecialAttackSystem.FIREBALLS).forEach(f => {
            load.spritesheet(f.key, f.path, { frameWidth: 96, frameHeight: 96 });
        });
    }

    // <key>_form plays once (the ball forming), then <key>_fly loops the burning frames.
    // The form starts at FORM_START_FRAME, skipping the sheet's first faint frames so the
    // ball appears in the hand right away.
    static createAnimations(scene) {
        Object.values(SpecialAttackSystem.FIREBALLS).forEach(f => {
            if (!scene.textures.exists(f.key) || scene.anims.exists(`${f.key}_fly`)) return;
            scene.anims.create({
                key: `${f.key}_form`,
                frames: scene.anims.generateFrameNumbers(f.key, { start: SpecialAttackSystem.FORM_START_FRAME, end: f.burn[0] - 1 }),
                frameRate: 20,
                repeat: 0
            });
            scene.anims.create({
                key: `${f.key}_fly`,
                frames: scene.anims.generateFrameNumbers(f.key, { start: f.burn[0], end: f.burn[1] }),
                frameRate: 16,
                repeat: -1
            });
        });
    }

    // How long a full charge takes at this combo multiplier (ms). Linear in the charge
    // RATE, so every step up the combo helps: x1 30s, x2 20s, x3 15s, x4 12s, x5 10s.
    static chargeTime(multiplier) {
        const T = SpecialAttackSystem.TUNING;
        const top = (typeof ComboSystem !== 'undefined') ? ComboSystem.MAX_MULTIPLIER : 5;
        const m = Math.max(1, Math.min(top, multiplier || 1));
        const k = (T.FULL_CHARGE_MS / T.MAX_COMBO_CHARGE_MS - 1) / (top - 1);
        return T.FULL_CHARGE_MS / (1 + k * (m - 1));
    }

    get ready() {
        return this.charge >= 1;
    }

    characterName() {
        const p = this.scene.player;
        return (p && p.characterConfig && p.characterConfig.name) || this.scene.selectedCharacter || 'tireek';
    }

    // The fireball config for the current fighter (textures and HUD / button icons use it)
    currentFireball() {
        return SpecialAttackSystem.FIREBALLS[this.characterName()] || SpecialAttackSystem.FIREBALLS.tireek;
    }

    canCharge() {
        const s = this.scene;
        if (s.tutorialAllowedActions) return false;
        if (s.inputManager && s.inputManager.disabled) return false;
        if (s.dialogueManager && typeof s.dialogueManager.isActive === 'function' && s.dialogueManager.isActive()) return false;
        return true;
    }

    update(delta) {
        if (this.charge < 1 && this.canCharge()) {
            const multiplier = this.scene.comboSystem ? this.scene.comboSystem.multiplier : 1;
            this.charge = Math.min(1, this.charge + delta / SpecialAttackSystem.chargeTime(multiplier));
            if (this.charge >= 1) {
                if (this.scene.audioManager) this.scene.audioManager.playSpecialCharged();
                this.sendWave();
            }
        }

        this.fireballs = this.fireballs.filter(fb => this.updateFireball(fb, delta));
        this.refreshDisplay();
    }

    // A few extra enemies from the side the player faces, so the fireball has a crowd to hit
    sendWave() {
        const s = this.scene;
        const T = SpecialAttackSystem.TUNING;
        // (typeof: a phone holding an older cached enemy-spawn-manager.js must not crash here)
        if (!s.enemySpawnManager || typeof s.enemySpawnManager.spawnWave !== 'function' || !s.player) return;
        const side = s.player.flipX ? 'left' : 'right';
        s.enemySpawnManager.spawnWave(T.CHARGED_WAVE_SIZE, side, T.CHARGED_WAVE_GAP_MS);
    }

    // HUD row + touch button, only when something they show has changed
    refreshDisplay() {
        const pct = Math.floor(this.charge * 100);
        const char = this.characterName();
        const shown = this.shown;
        if (shown && shown.pct === pct && shown.char === char) return;
        this.shown = { pct, char };
        const ui = this.scene.uiManager;
        if (ui && ui.updateSpecialDisplay) ui.updateSpecialDisplay(this.charge, this.ready, this.currentFireball().key);
    }

    // ----------------------------------------
    // Firing
    // ----------------------------------------
    // V / SPECIAL. Returns true if the throw started.
    tryFire() {
        const s = this.scene;
        const player = s.player;
        const am = s.animationManager;
        if (!this.ready || !player || !player.active || !player.visible || !am) return false;
        if (s.inputManager && !s.inputManager.isActionAllowed('special')) return false;
        if (s.isJumping || am.currentState === 'special') return false;

        const char = this.characterName();
        const animKey = `${char}_special`;
        if (!s.anims.exists(animKey)) {
            console.warn(`🔥 No ${animKey} animation - special attack unavailable`);
            return false;
        }

        this.charge = 0;
        this.refreshDisplay();

        // The throw: locked like the record throw, but its own state so it isn't a punch
        // (CombatManager only checks 'attack' / 'airkick' for melee hits)
        const T = SpecialAttackSystem.TUNING;
        const anim = s.anims.get(animKey);
        const throwMs = (anim.frames.length / anim.frameRate) * 1000;
        am.clearQueue();
        am.currentState = 'special';
        am.animationLocked = true;
        am.lockTimer = throwMs;
        player.anims.play(animKey, true);
        if (s.audioManager) s.audioManager.playPlayerAttack();

        // Release on the frame where the arm is out
        const direction = player.flipX ? -1 : 1;
        const releaseMs = (T.RELEASE_FRAME / anim.frameRate) * 1000;
        if (this.releaseTimer) this.releaseTimer.remove(false);
        this.releaseTimer = s.time.delayedCall(releaseMs, () => {
            this.releaseTimer = null;
            this.launch(direction, SpecialAttackSystem.FIREBALLS[char] || this.currentFireball(), char);
        });
        console.log(`🔥 Special attack: ${char}`);
        return true;
    }

    launch(direction, config, char) {
        const s = this.scene;
        const player = s.player;
        if (!player || !player.active || !s.textures.exists(config.key)) return;
        const T = SpecialAttackSystem.TUNING;

        const x = player.x + direction * player.displayWidth * T.SPAWN_AHEAD;
        const y = player.y - player.displayHeight * T.SPAWN_RISE;
        const sprite = s.add.sprite(x, y, config.key, SpecialAttackSystem.FORM_START_FRAME);
        sprite.setScale(T.FIREBALL_SCALE);
        sprite.setFlipX(direction < 0);
        sprite.setDepth(player.y + 1);
        sprite.play(`${config.key}_form`);
        sprite.chain(`${config.key}_fly`);

        this.fireballs.push({
            sprite,
            direction,
            laneY: player.y,  // enemies are matched against the thrower's lane, not the art's height
            hit: new Set(),
            age: 0
        });

        if (s.audioManager) s.audioManager.playSpecialFireball(char);
        if (!(window.GameSettings && window.GameSettings.reduceEffects())) {
            s.cameras.main.shake(T.SHAKE_MS, T.SHAKE_INTENSITY);
        }
    }

    // Move one fireball and burn whatever it reaches. false = it's gone.
    updateFireball(fb, delta) {
        const s = this.scene;
        const T = SpecialAttackSystem.TUNING;
        const sprite = fb.sprite;
        if (!sprite || !sprite.active) return false;

        fb.age += delta;
        sprite.x += fb.direction * T.FIREBALL_SPEED * (delta / 1000);

        const view = s.cameras.main.worldView;
        const gone = fb.direction > 0 ? sprite.x > view.right + T.EXIT_MARGIN : sprite.x < view.left - T.EXIT_MARGIN;
        if (gone || fb.age > T.MAX_LIFETIME_MS) {
            sprite.destroy();
            return false;
        }

        (s.enemies || []).forEach(enemy => {
            if (!enemy || fb.hit.has(enemy)) return;
            const es = enemy.sprite;
            if (!es || !es.active) return;
            if (typeof ENEMY_STATES !== 'undefined' && enemy.state === ENEMY_STATES.DEAD) return;
            if (enemy.health !== undefined && enemy.health <= 0) return;
            if (Math.abs(es.y - fb.laneY) > T.VERTICAL_TOLERANCE) return;
            if (Math.abs(es.x - sprite.x) > T.HIT_RADIUS) return;

            fb.hit.add(enemy);
            this.burn(enemy, sprite);
        });
        return true;
    }

    burn(enemy, source) {
        const s = this.scene;
        if (s.eventEnemyProtection && s.eventEnemyProtection.isProtectedFromDamage(enemy)) return;
        if (!enemy.takeDamage) return;

        if (enemy.isBoss) {
            const max = enemy.maxHealth || enemy.health || 1;
            enemy.takeDamage(Math.ceil(max * SpecialAttackSystem.TUNING.BOSS_DAMAGE_FRACTION));
        } else {
            enemy.takeDamage(Math.max(1, enemy.health), source);
        }
        if (s.effectSystem) s.effectSystem.onEnemyHit(enemy);
        if (s.audioManager) s.audioManager.playWeaponHit();
        s.events.emit('player:recordHit', enemy); // counts toward the combo
    }

    destroy() {
        if (this.releaseTimer) { this.releaseTimer.remove(false); this.releaseTimer = null; }
        this.fireballs.forEach(fb => { if (fb.sprite && fb.sprite.active) fb.sprite.destroy(); });
        this.fireballs = [];
    }
}

// Per fighter: sheet key and path, and the looping "burning" frames (the rest is the ball
// forming before, and fizzling after, which isn't used - it flies off screen instead)
SpecialAttackSystem.FIREBALLS = {
    tireek: { key: 'tireek_fireball', path: 'assets/characters/tireek/spritesheets/special/tireek special fireball.png', burn: [3, 17] },
    tryston: { key: 'tryston_fireball', path: 'assets/characters/tryston/spritesheets/special/tryston special fireball.png', burn: [3, 21] }
};

// First sheet frame used for the forming ball (frames before it are skipped)
SpecialAttackSystem.FORM_START_FRAME = 2;

// Charge bar colour in the HUD, per fighter (their fireball's colour)
SpecialAttackSystem.HUD_COLORS = { tireek: 0xFF8C1A, tryston: 0x3FA9FF };

SpecialAttackSystem.TUNING = {
    FULL_CHARGE_MS: 30000,      // charge time with no combo (x1)
    MAX_COMBO_CHARGE_MS: 10000, // charge time at the top combo multiplier
    RELEASE_FRAME: 4,           // frame of the throw animation where the fireball leaves the hand
    FIREBALL_SPEED: 600,        // px/s
    FIREBALL_SCALE: 4,
    SPAWN_AHEAD: 0.28,          // spawn this far in front of the player (share of their width)
    SPAWN_RISE: 0.03,           // ...and this far above their centre (share of their height)
    VERTICAL_TOLERANCE: 170,    // how far up/down the street from the thrower's lane it still hits (street is 240 deep)
    HIT_RADIUS: 80,             // horizontal reach of the ball
    BOSS_DAMAGE_FRACTION: 0.25, // bosses lose this share of their max health
    EXIT_MARGIN: 150,           // px past the screen edge before it's removed
    MAX_LIFETIME_MS: 5000,
    SHAKE_MS: 180,
    SHAKE_INTENSITY: 0.006,
    CHARGED_WAVE_SIZE: 3,       // extra enemies sent in when the special charges
    CHARGED_WAVE_GAP_MS: 300    // between each of them
};

if (typeof window !== 'undefined') {
    window.SpecialAttackSystem = SpecialAttackSystem;
}
