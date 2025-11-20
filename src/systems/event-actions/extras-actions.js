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
        // Log the entire action object to see what we're receiving
        console.log('🎬 [SpawnExtra] Full action object:', JSON.stringify(action, null, 2));
        
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
        
        console.log('🎬 [SpawnExtra] Raw position from action:', { x, y, position: action.position, relativeTo: action.relativeTo });

        // Convert to numbers if they're strings (JSON parsing might return strings)
        if (x !== undefined && x !== null) {
            x = typeof x === 'string' ? parseFloat(x) : Number(x);
        }
        if (y !== undefined && y !== null) {
            y = typeof y === 'string' ? parseFloat(y) : Number(y);
        }

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

        // Only override position if explicitly relative to player
        if (action.relativeTo === 'player' && this.scene.player) {
            const ox = action.offset?.x || 0;
            const oy = action.offset?.y || 0;
            console.log('🎬 [SpawnExtra] Using player-relative positioning:', { playerX: this.scene.player.x, playerY: this.scene.player.y, offsetX: ox, offsetY: oy });
            x = this.scene.player.x + ox;
            y = this.scene.player.y + oy;
        }
        
        // Only use fallback if position is truly undefined/null (not 0, which is a valid position)
        if ((x === undefined || x === null) || (y === undefined || y === null)) {
            console.warn('🎬 [SpawnExtra] Position undefined, using fallback');
            // Fallback near player if available
            if (this.scene.player) {
                x = this.scene.player.x + 60;
                y = this.scene.player.y;
            } else {
                x = 200; y = 500;
            }
        }
        
        console.log('🎬 [SpawnExtra] Final position:', { x, y });
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

