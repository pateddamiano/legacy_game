// ========================================
// COMBO SYSTEM
// ========================================
// From x3 a gold flame burns behind the player, brighter at x4 and x5 (EffectSystem).
//
// Every hit the player lands (punch, kick, air kick or record - the 'player:punchHit' /
// 'player:recordHit' signals from CombatManager and WeaponManager) builds the combo; any
// damage to the player ('player:hurt', CombatManager.playerTakeDamage) ends it. Hits during
// the level 1 tutorial (while GameScene.tutorialAllowedActions is set) don't count.
//
// The multiplier goes up one step every HITS_PER_LEVEL hits, up to MAX_MULTIPLIER:
// 0-4 hits x1, 5-9 x2, ... 20+ x5. Golden microphones picked up are worth their points
// times the multiplier (ItemPickupSystem). Shown under the microphone counter by
// UIManager.updateComboDisplay.

class ComboSystem {
    constructor(scene) {
        this.scene = scene;
        this.hits = 0;

        this._onHit = () => this.addHit();
        this._onHurt = () => this.reset();
        scene.events.on('player:punchHit', this._onHit);
        scene.events.on('player:recordHit', this._onHit);
        scene.events.on('player:hurt', this._onHurt);
        scene.events.once('shutdown', () => this.destroy());
    }

    get multiplier() {
        return Math.min(ComboSystem.MAX_MULTIPLIER, 1 + Math.floor(this.hits / ComboSystem.HITS_PER_LEVEL));
    }

    addHit() {
        if (this.scene.tutorialAllowedActions) return; // no combo off the level 1 tutorial's dummies
        const before = this.multiplier;
        this.hits++;
        const ui = this.scene.uiManager;
        if (ui) ui.updateComboDisplay(this.hits, this.multiplier, this.multiplier > before);
        // Fire behind the player from x3 up (EffectSystem.setComboFlame)
        if (this.multiplier !== before && this.scene.effectSystem) this.scene.effectSystem.setComboFlame(this.multiplier);
    }

    reset() {
        if (this.hits === 0) return;
        this.hits = 0;
        const ui = this.scene.uiManager;
        if (ui) ui.updateComboDisplay(0, 1, false, true);
        if (this.scene.effectSystem) this.scene.effectSystem.setComboFlame(1);
    }

    destroy() {
        this.scene.events.off('player:punchHit', this._onHit);
        this.scene.events.off('player:recordHit', this._onHit);
        this.scene.events.off('player:hurt', this._onHurt);
    }
}

ComboSystem.HITS_PER_LEVEL = 5;  // hits for each step up in the multiplier
ComboSystem.MAX_MULTIPLIER = 5;

if (typeof window !== 'undefined') {
    window.ComboSystem = ComboSystem;
}
