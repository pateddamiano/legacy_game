// ========================================
// PLAYER SETTINGS
// ========================================
// Player-facing preferences shared by every scene, saved in this browser's
// localStorage so they survive reloads. Changed from the main menu's SETTINGS.
//
//   sfxVolume      0-1 multiplier applied to every sound effect (music is separate)
//   reduceEffects  true = no camera shake, no strobing/flashing effects, no pulsing
//                  low-health vignette (photosensitivity / motion sensitivity)

(function () {
    const STORAGE_KEY = 'legacy_game_settings';
    const DEFAULTS = { sfxVolume: 1, reduceEffects: false };

    let values = { ...DEFAULTS };
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        values = { ...DEFAULTS, ...saved };
    } catch (e) {
        // Private browsing / blocked storage: run on defaults
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        } catch (e) {}
    }

    window.GameSettings = {
        get(key) {
            return values[key];
        },
        set(key, value) {
            values[key] = value;
            save();
        },
        // Scale a sound effect's volume by the player's SFX setting
        sfx(volume = 1) {
            const v = Number(values.sfxVolume);
            return volume * (isFinite(v) ? Math.min(1, Math.max(0, v)) : 1);
        },
        reduceEffects() {
            return values.reduceEffects === true;
        }
    };
})();
