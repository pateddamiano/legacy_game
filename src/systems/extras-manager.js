// ========================================
// EXTRAS MANAGER
// ========================================
// Spawns simple static, non-animated characters for story events

class ExtrasManager {
    constructor(scene) {
        this.scene = scene;
        this.extras = [];
        this.eventExtraMap = new Map();
    }

    spawnExtra(name, x, y, options = {}) {
        if (!window.EXTRAS_REGISTRY || !window.EXTRAS_REGISTRY[name]) {
            console.warn(`ExtrasManager: Extra '${name}' not found in registry`);
            return null;
        }

        const def = window.EXTRAS_REGISTRY[name];
        console.log(`🎭 ExtrasManager.spawnExtra: name=${name}, x=${x}, y=${y}, opts=`, options, 'def=', def);

        // Ensure nearest-neighbor filtering for crisp pixel art
        try {
            const tex = this.scene.textures.get(def.key);
            if (tex && tex.setFilter) {
                tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        } catch (e) {
            // Ignore if texture not yet available; Phaser will apply default
        }

        const sprite = this.scene.physics.add.image(Math.round(x), Math.round(y), def.key);

        // Disable gravity and world bounds collision for background elements
        sprite.setGravityY(0);
        sprite.setCollideWorldBounds(false);

        // Determine scale: allow matching player's current display height for consistency
        let scale = options.scale !== undefined ? options.scale : (def.scale || 1);
        const matchPlayer = options.matchPlayer === true || options.matchPlayerScale === true;
        if (matchPlayer && this.scene.player && sprite.height) {
            const multiplier = (typeof options.multiplier === 'number') ? options.multiplier : 1.0;
            const desiredHeight = this.scene.player.displayHeight * multiplier;
            const computedScale = desiredHeight / sprite.height;
            if (isFinite(computedScale) && computedScale > 0) {
                scale = computedScale;
            }
        }
        sprite.setScale(scale);
        console.log(`🎭 ExtrasManager.spawnExtra: sprite.height=${sprite.height}, player.displayHeight=${this.scene.player?.displayHeight}, finalScale=${scale}, displayHeight=${sprite.displayHeight}`);

        // Handle bottom positioning if specified
        if (options.bottomY !== undefined) {
            // Sprite origin is 0.5, so bottom is at current y + (displayHeight/2)
            // To have bottom at bottomY, set y = bottomY - (displayHeight/2)
            const newY = options.bottomY - (sprite.displayHeight / 2);
            sprite.setY(Math.round(newY));
            console.log(`🎭 Positioning bottom of sprite at y=${options.bottomY}, sprite y=${newY}`);
        }

        // Set depth - use custom depth if provided, otherwise default to 1000 - y
        const finalY = sprite.y; // Use the final Y position for depth calculation
        const depth = options.depth !== undefined ? options.depth : (1000 - finalY);
        sprite.setDepth(depth);

        const extra = { name, sprite };
        const index = this.extras.push(extra) - 1;

        if (options.id) {
            this.eventExtraMap.set(options.id, index);
        }

        return extra;
    }

    destroyExtraById(target) {
        let index = -1;
        if (typeof target === 'string') {
            if (target.startsWith('extra_')) {
                // special id
                if (this.eventExtraMap.has(target)) {
                    index = this.eventExtraMap.get(target);
                }
            } else {
                // treat as name lookup (destroy all of that name)
                index = this.extras.findIndex(e => e && e.name === target);
            }
        } else if (typeof target === 'number') {
            index = target;
        }

        if (index < 0 || index >= this.extras.length) return false;

        const extra = this.extras[index];
        if (extra && extra.sprite) {
            extra.sprite.destroy();
        }
        this.extras.splice(index, 1);

        // Re-map ids after removal
        for (const [key, value] of this.eventExtraMap.entries()) {
            if (value === index) {
                this.eventExtraMap.delete(key);
            } else if (value > index) {
                this.eventExtraMap.set(key, value - 1);
            }
        }
        return true;
    }

    clearAll() {
        this.extras.forEach(e => e.sprite && e.sprite.destroy());
        this.extras = [];
        this.eventExtraMap.clear();
    }

    getById(id) {
        if (!this.eventExtraMap.has(id)) return null;
        const idx = this.eventExtraMap.get(id);
        return this.extras[idx] || null;
    }
}

// Export globally
if (typeof window !== 'undefined') {
    window.ExtrasManager = ExtrasManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtrasManager;
}


