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
            
            // Calculate target position
            let targetX = action.pan.x;
            const targetY = action.pan.y !== undefined ? action.pan.y : camera.scrollY;
            
            // If panToEntity is specified, calculate position to show entity at desired screen position
            if (action.panToEntity) {
                const entity = this.getEntity(action.panToEntity);
                if (entity) {
                    const virtualWidth = this.scene.virtualWidth || 1200;
                    // The visible world width should always be virtualWidth
                    // LayoutManager ensures virtualWidth world units always fit in the viewport
                    // However, on mobile with viewport set, we need to account for the actual camera dimensions
                    // Check if camera.width/zoom differs significantly from virtualWidth
                    const cameraWorldWidth = camera.width / camera.zoom;
                    const visibleWorldWidth = virtualWidth;
                    
                    // Debug: log if there's a discrepancy
                    if (Math.abs(cameraWorldWidth - virtualWidth) > 5) {
                        console.warn(`🎬 [PAN] Camera world width (${cameraWorldWidth.toFixed(0)}) differs from virtualWidth (${virtualWidth})`);
                    }
                    let screenPosition = action.screenPosition !== undefined ? action.screenPosition : 0.6;
                    
                    // If a hardcoded pan.x is also provided, it was tuned for zoom=1
                    // Calculate what screen position it intended, then apply that for current zoom
                    if (action.pan.x !== undefined) {
                        // At zoom=1, what screen position would the entity appear at with this pan.x?
                        // Use virtualWidth for this calculation since pan.x was tuned for the virtual coordinate system
                        const offsetAtZoom1 = entity.x - action.pan.x;
                        screenPosition = offsetAtZoom1 / virtualWidth;
                        console.log(`🎬 [PAN] Detected intended screen position from hardcoded pan.x: ${screenPosition.toFixed(3)} (${(screenPosition*100).toFixed(1)}%)`);
                    }
                    
                    // Calculate where camera should scroll for this screen position at current zoom
                    const desiredOffset = visibleWorldWidth * screenPosition;
                    targetX = entity.x - desiredOffset;
                    
                    // Get bounds and clamp
                    const bounds = camera.getBounds();
                    const minScrollX = bounds.x;
                    const maxScrollX = bounds.x + bounds.width - visibleWorldWidth;
                    targetX = Math.max(minScrollX, Math.min(maxScrollX, targetX));
                    
                    console.log(`🎬 [PAN] Pan to entity: ${action.panToEntity} at world (${entity.x}, ${entity.y})`);
                    console.log(`🎬 [PAN] Camera: width=${camera.width}, zoom=${camera.zoom.toFixed(2)}, virtualWidth=${virtualWidth}`);
                    console.log(`🎬 [PAN] Visible world width: ${visibleWorldWidth.toFixed(0)}, screen position: ${(screenPosition*100).toFixed(1)}%`);
                    console.log(`🎬 [PAN] Offset: ${desiredOffset.toFixed(0)}, calculated target: ${(entity.x - desiredOffset).toFixed(0)}, clamped: ${targetX.toFixed(0)}`);
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
                // Use camera.width (viewport width in screen pixels) divided by zoom to get visible world width
                // This accounts for viewport settings on mobile devices
                const visibleWorldWidth = camera.width / camera.zoom;
                const widthDifference = visibleWorldWidth - virtualWidth;
                adjustedWidth = bounds.width + widthDifference;
                console.log(`🎬 Responsive bounds: ${bounds.width} → ${adjustedWidth.toFixed(0)} (zoom: ${camera.zoom.toFixed(2)}, visible width: ${visibleWorldWidth.toFixed(0)})`);
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

