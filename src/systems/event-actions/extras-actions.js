// ========================================
// EVENT ACTIONS: EXTRAS OPERATIONS
// ========================================
// Handles extra spawn/destroy actions

class ExtrasActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
    }
    
    advanceAction() {
        this.eventManager.advanceAction();
    }
    
    applyCinematicDarkening(speakerName) {
        return this.eventManager.cinematicManager.applyCinematicDarkening(speakerName);
    }
    
    executeSpawnExtra(action) {
        const name = action.name;
        if (!name) {
            console.warn('🎬 SpawnExtra missing name');
            this.advanceAction();
            return;
        }
        if (!this.scene.extrasManager) {
            console.warn('🎬 ExtrasManager not available');
            this.advanceAction();
            return;
        }
        // Determine position
        let x = action.position?.x;
        let y = action.position?.y;

        // Handle camera-relative positioning (e.g., "camera.x-200")
        if (typeof x === 'string' && x.includes('camera.x')) {
            const cameraX = this.scene.cameras.main.scrollX;
            // Evaluate simple expressions like "camera.x-200"
            const expr = x.replace('camera.x', cameraX.toString());
            try {
                x = eval(expr);
            } catch (e) {
                console.warn('🎬 Failed to evaluate camera expression:', x);
                x = cameraX - 200; // fallback
            }
        }

        if (action.relativeTo === 'player' && this.scene.player) {
            const ox = action.offset?.x || 0;
            const oy = action.offset?.y || 0;
            x = this.scene.player.x + ox;
            y = this.scene.player.y + oy;
        }
        if (x === undefined || y === undefined) {
            // Fallback near player if available
            if (this.scene.player) {
                x = this.scene.player.x + 60;
                y = this.scene.player.y;
            } else {
                x = 200; y = 500;
            }
        }
        const opts = {
            id: action.id,
            scale: action.scale,
            matchPlayer: action.matchPlayer,
            matchPlayerScale: action.matchPlayerScale,
            multiplier: action.multiplier,
            depth: action.depth,
            bottomY: action.bottomY
        };
        console.log('🎬 executeSpawnExtra:', { name, x, y, opts });
        const extra = this.scene.extrasManager.spawnExtra(name, x, y, opts);
        
        // If event is active and cinematic darkening is applied, re-apply darkening to handle new extra
        // Use a small delay to ensure the extra is fully initialized
        // All extras will stay bright automatically
        if (this.eventManager.activeEvent && this.eventManager.cinematicManager.darkenedSprites.length > 0) {
            this.scene.time.delayedCall(10, () => {
                // Re-apply darkening - all extras will stay bright
                this.applyCinematicDarkening(null);
            });
        }
        if (!extra) {
            console.warn('🎬 Failed to spawn extra');
        }
        this.advanceAction();
    }

    executeDestroyExtra(action) {
        const target = action.target;
        if (!this.scene.extrasManager) {
            console.warn('🎬 ExtrasManager not available');
            this.advanceAction();
            return;
        }
        if (!target) {
            console.warn('🎬 DestroyExtra missing target');
            this.advanceAction();
            return;
        }
        this.scene.extrasManager.destroyExtraById(target);
        this.advanceAction();
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExtrasActions };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.ExtrasActions = ExtrasActions;
}

