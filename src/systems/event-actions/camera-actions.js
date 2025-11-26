// ========================================
// EVENT ACTIONS: CAMERA OPERATIONS
// ========================================
// Handles all camera-related event actions

class CameraActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
    }
    
    advanceAction() {
        this.eventManager.advanceAction();
    }
    
    getEntity(target) {
        return this.eventManager.getEntity(target);
    }
    
    executeCamera(action) {
        const camera = this.scene.cameras.main;
        
        if (action.pan) {
            // Pan camera to position
            const duration = action.duration || 1000;
            const currentScrollX = camera.scrollX;
            const currentScrollY = camera.scrollY;
            
            // Calculate target position accounting for zoom/viewport
            let targetX = action.pan.x;
            const targetY = action.pan.y !== undefined ? action.pan.y : camera.scrollY;
            
            // If panToEntity is specified, calculate position to show that entity at desired screen position
            if (action.panToEntity) {
                const entity = this.getEntity(action.panToEntity);
                if (entity) {
                    // Use fixed virtual width for consistency - camera always "thinks" in 1200x720
                    const virtualWidth = this.scene.virtualWidth || 1200;
                    const screenPosition = action.screenPosition !== undefined ? action.screenPosition : 0.6;
                    
                    // Calculate target position in world coordinates using VIRTUAL dimensions
                    // This makes the calculation zoom-independent
                    const desiredOffset = virtualWidth * screenPosition;
                    targetX = entity.x - desiredOffset;
                    
                    // Get camera bounds and clamp
                    const bounds = camera.getBounds();
                    const minScrollX = bounds.x;
                    const maxScrollX = bounds.x + bounds.width - virtualWidth;
                    
                    // Clamp to bounds
                    targetX = Math.max(minScrollX, Math.min(maxScrollX, targetX));
                    
                    console.log(`🎬 [PAN] Pan to entity: ${action.panToEntity} at world (${entity.x}, ${entity.y})`);
                    console.log(`🎬 [PAN] Virtual width: ${virtualWidth}, screen position: ${screenPosition}, offset: ${desiredOffset.toFixed(0)}`);
                    console.log(`🎬 [PAN] Bounds: ${bounds.x} to ${bounds.width}, maxScrollX: ${maxScrollX.toFixed(0)}`);
                    console.log(`🎬 [PAN] Calculated: ${(entity.x - desiredOffset).toFixed(0)}, clamped to: ${targetX.toFixed(0)}`);
                }
            }
            
            console.log(`🎬 [PAN] Starting camera pan from (${currentScrollX.toFixed(0)}, ${currentScrollY.toFixed(0)}) to (${targetX.toFixed(0)}, ${targetY.toFixed(0)}) over ${duration}ms`);
            console.log(`🎬 [PAN] Camera bounds: ${JSON.stringify(camera.getBounds())}, zoom: ${camera.zoom}`);

            // Stop following before panning
            camera.stopFollow();
            
            const panTween = this.scene.tweens.add({
                targets: camera,
                scrollX: targetX,
                scrollY: targetY,
                duration: duration,
                ease: action.ease || 'Power2',
                onStart: () => {
                    console.log(`🎬 [PAN] ✅ Tween STARTED - Camera at (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                },
                onUpdate: () => {
                    // console.log(`🎬 [PAN] Tween update - Camera at (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                },
                onComplete: () => {
                    console.log(`🎬 [PAN] ✅ Tween COMPLETED - Camera at (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                    this.advanceAction();
                }
            });

            console.log(`🎬 [PAN] Tween created: ID=${panTween.key}, isPlaying=${panTween.isPlaying()}`);

            // Safety timeout in case tween fails
            this.scene.time.delayedCall(duration + 500, () => {
                console.log(`🎬 [PAN] Safety timeout fired - Tween state: destroyed=${panTween.isDestroyed()}, playing=${panTween.isPlaying()}`);
                if (panTween && !panTween.isDestroyed() && panTween.isPlaying()) {
                    console.warn(`🎬 [PAN] ⚠️ Camera pan tween still running after ${duration + 500}ms, forcing completion`);
                    panTween.stop();
                    camera.scrollX = targetX;
                    camera.scrollY = targetY;
                    console.log(`🎬 [PAN] Forced camera to (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                    this.advanceAction();
                } else {
                    console.log(`🎬 [PAN] Tween already completed or destroyed, safety timeout skipping`);
                }
            });
        } else if (action.stopFollow) {
            // Stop camera follow
            console.log('🎬 Stopping camera follow');
            camera.stopFollow();
            this.scene.eventCameraLocked = true; // Mark camera as locked
            this.advanceAction();
        } else if (action.setBounds) {
            // Set camera bounds
            const bounds = action.setBounds;
            const oldBounds = camera.getBounds();
            const oldScrollX = camera.scrollX;
            const oldScrollY = camera.scrollY;
            console.log(`🎬 Setting camera bounds: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`);
            console.log(`🎬 Camera position before bounds: (${oldScrollX}, ${oldScrollY}), zoom: ${camera.zoom}`);
            console.log(`🎬 Old camera bounds: ${oldBounds.x}, ${oldBounds.y}, ${oldBounds.width}x${oldBounds.height}`);

            // AUTO-ADJUST bounds for responsive display:
            // Game logic works in virtual coordinates (1200x720), but zoom scales the viewport
            // With zoom < 1 (mobile), camera sees MORE world, so maxScrollX would decrease
            // To keep maxScrollX constant (so level design works), we widen the bounds proportionally
            // Result: Camera panning "just works" the same on all devices
            let adjustedWidth = bounds.width;
            if (bounds.width && camera.zoom !== 1) {
                const virtualWidth = this.scene.virtualWidth || 1200;
                const visibleWorldWidth = virtualWidth / camera.zoom;
                const widthDifference = visibleWorldWidth - virtualWidth;
                adjustedWidth = bounds.width + widthDifference;
                console.log(`🎬 Responsive bounds: ${bounds.width} → ${adjustedWidth.toFixed(0)} (zoom: ${camera.zoom.toFixed(2)})`);
            }

            camera.setBounds(
                bounds.x !== undefined ? bounds.x : camera.getBounds().x,
                bounds.y !== undefined ? bounds.y : camera.getBounds().y,
                adjustedWidth,
                bounds.height !== undefined ? bounds.height : camera.getBounds().height
            );

            const newBounds = camera.getBounds();
            const newScrollX = camera.scrollX;
            const newScrollY = camera.scrollY;
            console.log(`🎬 New camera bounds: ${newBounds.x}, ${newBounds.y}, ${newBounds.width}x${newBounds.height}`);
            console.log(`🎬 Camera position after bounds: (${newScrollX}, ${newScrollY})`);

            // Check if camera was clamped
            if (oldScrollX !== newScrollX || oldScrollY !== newScrollY) {
                console.log(`🎬 ⚠️ Camera was clamped from (${oldScrollX}, ${oldScrollY}) to (${newScrollX}, ${newScrollY})`);
            }

            this.advanceAction();
        } else if (action.follow) {
            // Set camera follow target
            const target = action.follow === 'player' ? this.scene.player : this.getEntity(action.follow);
            if (target) {
                console.log(`🎬 Camera following: ${action.follow}`);
                camera.startFollow(target, action.followOffset !== undefined, 
                    action.followX || 0.1, action.followY || 0.1);
                this.scene.eventCameraLocked = false; // Clear camera lock when re-enabling follow
                this.advanceAction();
            } else {
                console.warn(`🎬 Could not find camera follow target: ${action.follow}`);
                this.advanceAction();
            }
        } else if (action.zoom) {
            // Zoom camera
            const duration = action.duration || 1000;
            console.log(`🎬 Zooming camera to ${action.zoom}`);
            
            this.scene.tweens.add({
                targets: camera,
                zoom: action.zoom,
                duration: duration,
                ease: action.ease || 'Power2',
                onComplete: () => {
                    this.advanceAction();
                }
            });
        } else {
            console.warn('🎬 Camera action missing pan/follow/zoom/stopFollow/setBounds');
            this.advanceAction();
        }
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CameraActions };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.CameraActions = CameraActions;
}

