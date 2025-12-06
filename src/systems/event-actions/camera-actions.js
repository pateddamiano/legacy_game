// ========================================
// EVENT ACTIONS: CAMERA OPERATIONS
// ========================================
// Handles all camera-related event actions

class CameraActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
        
        // Install debugging hooks to detect camera modifications from other systems
        this.installCameraHooks();
    }
    
    installCameraHooks() {
        const camera = this.scene.cameras.main;
        const self = this;
        
        // Hook camera.startFollow to detect when follow is re-enabled
        const originalStartFollow = camera.startFollow.bind(camera);
        camera.startFollow = function(...args) {
            if (self.scene.eventCameraLocked) {
                console.warn(`🎬 [CAMERA-HOOK] ⚠️ startFollow called while eventCameraLocked=true! Target: ${args[0]?.constructor?.name || 'unknown'}`);
                console.trace('🎬 [CAMERA-HOOK] Call stack:');
            } else {
                console.log(`🎬 [CAMERA-HOOK] startFollow called (eventCameraLocked=false) - Target: ${args[0]?.constructor?.name || 'unknown'}`);
            }
            return originalStartFollow.apply(this, args);
        };
        
        // Hook camera.setBounds to detect bounds changes
        const originalSetBounds = camera.setBounds.bind(camera);
        camera.setBounds = function(...args) {
            const oldBounds = camera.getBounds();
            const result = originalSetBounds.apply(this, args);
            const newBounds = camera.getBounds();
            
            if (oldBounds.width !== newBounds.width || oldBounds.x !== newBounds.x) {
                console.warn(`🎬 [CAMERA-HOOK] ⚠️ setBounds called outside camera-actions!`);
                console.warn(`🎬 [CAMERA-HOOK] ⚠️ Bounds changed: ${oldBounds.width.toFixed(1)}@${oldBounds.x} → ${newBounds.width.toFixed(1)}@${newBounds.x}`);
                console.trace('🎬 [CAMERA-HOOK] Call stack:');
            }
            return result;
        };
        
        // Hook camera.setZoom to detect zoom changes
        const originalSetZoom = camera.setZoom.bind(camera);
        camera.setZoom = function(...args) {
            const oldZoom = camera.zoom;
            const result = originalSetZoom.apply(this, args);
            const newZoom = camera.zoom;
            
            if (Math.abs(oldZoom - newZoom) > 0.001) {
                console.warn(`🎬 [CAMERA-HOOK] ⚠️ setZoom called outside camera-actions!`);
                console.warn(`🎬 [CAMERA-HOOK] ⚠️ Zoom changed: ${oldZoom.toFixed(3)} → ${newZoom.toFixed(3)}`);
                console.trace('🎬 [CAMERA-HOOK] Call stack:');
            }
            return result;
        };
        
        // Hook camera.setScroll to detect direct scroll changes
        const originalSetScroll = camera.setScroll.bind(camera);
        camera.setScroll = function(...args) {
            const oldScrollX = camera.scrollX;
            const oldScrollY = camera.scrollY;
            const result = originalSetScroll.apply(this, args);
            const newScrollX = camera.scrollX;
            const newScrollY = camera.scrollY;
            
            if (Math.abs(oldScrollX - newScrollX) > 0.1 || Math.abs(oldScrollY - newScrollY) > 0.1) {
                if (self.scene.eventCameraLocked) {
                    console.warn(`🎬 [CAMERA-HOOK] ⚠️ setScroll called while eventCameraLocked=true!`);
                    console.warn(`🎬 [CAMERA-HOOK] ⚠️ Scroll changed: (${oldScrollX.toFixed(1)}, ${oldScrollY.toFixed(1)}) → (${newScrollX.toFixed(1)}, ${newScrollY.toFixed(1)})`);
                    console.trace('🎬 [CAMERA-HOOK] Call stack:');
                }
            }
            return result;
        };
        
        console.log('🎬 [CAMERA-HOOK] Camera debugging hooks installed');
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
            
            // Calculate target position - simple X,Y coordinates
            // Zoom doesn't affect FOV - camera always sees virtualWidth (1200) world units
            // Pan targets work the same on all devices
            let targetX = action.pan.x !== undefined ? action.pan.x : camera.scrollX;
            let targetY = action.pan.y !== undefined ? action.pan.y : camera.scrollY;
            
            console.log(`🎬 [PAN] Panning to X=${targetX}, Y=${targetY}`);
            
            // Get current bounds and calculate max scroll positions
            // Zoom doesn't affect FOV - camera always sees virtualWidth (1200) world units
            const currentBounds = camera.getBounds();
            const virtualWidth = this.scene.virtualWidth || 1200;
            const virtualHeight = this.scene.virtualHeight || 720;
            const maxX = currentBounds.x + currentBounds.width - virtualWidth;
            const maxY = currentBounds.y + currentBounds.height - virtualHeight;
            
            console.log(`🎬 [PAN] 📊 CALCULATION DETAILS:`);
            console.log(`🎬 [PAN]   - virtualWidth: ${virtualWidth}, virtualHeight: ${virtualHeight} (zoom doesn't affect FOV)`);
            console.log(`🎬 [PAN]   - camera.zoom: ${camera.zoom.toFixed(3)} (rendering scale only), camera.width: ${camera.width}px, camera.height: ${camera.height}px`);
            console.log(`🎬 [PAN]   - currentBounds: x=${currentBounds.x}, width=${currentBounds.width.toFixed(1)}, height=${currentBounds.height}`);
            console.log(`🎬 [PAN]   - maxX calculation: ${currentBounds.x} + ${currentBounds.width.toFixed(1)} - ${virtualWidth} = ${maxX.toFixed(1)}`);
            console.log(`🎬 [PAN]   - targetX: ${targetX}, maxX: ${maxX.toFixed(1)}, canReach: ${targetX <= maxX}`);
            
            // Clamp targets to bounds - prevents camera from scrolling outside world
            // If target is beyond bounds, it will be clamped to the max allowed position
            
            const clampedTargetX = Phaser.Math.Clamp(targetX, currentBounds.x, maxX);
            const clampedTargetY = Phaser.Math.Clamp(targetY, currentBounds.y, maxY);
            
            if (Math.abs(clampedTargetX - targetX) > 0.1) {
                console.warn(`🎬 [PAN] ⚠️ Target X clamped: ${targetX} -> ${clampedTargetX} (diff=${(targetX - clampedTargetX).toFixed(1)})`);
                console.warn(`🎬 [PAN] ⚠️ Camera cannot scroll beyond bounds. Adjust setBounds width or pan target.`);
                console.warn(`🎬 [PAN] ⚠️ To fix: increase setBounds width by ${(targetX - maxX).toFixed(1)} or reduce pan target`);
            } else {
                console.log(`🎬 [PAN] ✅ Target X is within bounds: ${targetX} (no clamping needed)`);
            }

            console.log(`🎬 [PAN] Starting camera pan from (${currentScrollX.toFixed(0)}, ${currentScrollY.toFixed(0)}) to (${clampedTargetX.toFixed(0)}, ${clampedTargetY.toFixed(0)}) over ${duration}ms`);
            console.log(`🎬 [PAN] Camera bounds: ${JSON.stringify(currentBounds)}, zoom: ${camera.zoom}`);

            // Stop following before panning
            camera.stopFollow();
            
            const panTween = this.scene.tweens.add({
                targets: camera,
                scrollX: clampedTargetX,
                scrollY: clampedTargetY,
                duration: duration,
                ease: action.ease || 'Power2',
                onStart: () => {
                    console.log(`🎬 [PAN] ✅ Tween STARTED - Camera at (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                },
                onUpdate: () => {
                    // console.log(`🎬 [PAN] Tween update - Camera at (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                },
                onComplete: () => {
                    const finalScrollX = camera.scrollX;
                    const finalScrollY = camera.scrollY;
                    const virtualWidth = this.scene.virtualWidth || 1200;
                    const expectedTargetX = clampedTargetX;
                    
                    console.log(`🎬 [PAN] ✅ Tween COMPLETED - Camera at (${finalScrollX.toFixed(1)}, ${finalScrollY.toFixed(1)})`);
                    console.log(`🎬 [PAN] ✅ Expected target: (${expectedTargetX.toFixed(1)}, ${clampedTargetY.toFixed(1)})`);
                    console.log(`🎬 [PAN] ✅ Difference: (${(finalScrollX - expectedTargetX).toFixed(1)}, ${(finalScrollY - clampedTargetY).toFixed(1)})`);
                    console.log(`🎬 [PAN] ✅ Virtual world width: ${virtualWidth} (zoom doesn't affect FOV), camera right edge: ${(finalScrollX + virtualWidth).toFixed(1)}`);
                    
                    // Check where the critic enemy appears (known position from level config)
                    const criticEntity = this.getEntity('enemy_critic');
                    if (criticEntity) {
                        const criticScreenX = (criticEntity.x - finalScrollX) / virtualWidth;
                        console.log(`🎬 [PAN] ✅ Critic enemy at world (${criticEntity.x}, ${criticEntity.y})`);
                        console.log(`🎬 [PAN] ✅ Critic screen position: ${(criticScreenX * 100).toFixed(1)}% from left (offset: ${(criticEntity.x - finalScrollX).toFixed(1)})`);
                        console.log(`🎬 [PAN] ✅ Camera view: left=${finalScrollX.toFixed(1)}, right=${(finalScrollX + virtualWidth).toFixed(1)}, critic at ${criticEntity.x}`);
                    }
                    
                    // Start monitoring camera state for changes after pan completes
                    const startMonitoring = () => {
                        let checkCount = 0;
                        const maxChecks = 20; // Monitor for 10 seconds (20 * 500ms)
                        const initialState = {
                            scrollX: camera.scrollX,
                            scrollY: camera.scrollY,
                            zoom: camera.zoom,
                            bounds: { ...camera.getBounds() },
                            viewport: { x: camera.x, y: camera.y, width: camera.width, height: camera.height },
                            isFollowing: camera._follow !== null && camera._follow !== undefined
                        };
                        
                        console.log(`🎬 [PAN] 🔍 Starting camera state monitoring (initial state captured)`);
                        console.log(`🎬 [PAN] 🔍 Initial: scrollX=${initialState.scrollX.toFixed(1)}, zoom=${initialState.zoom.toFixed(3)}, following=${initialState.isFollowing}`);
                        
                        const monitorInterval = this.scene.time.addEvent({
                            delay: 500,
                            repeat: maxChecks - 1,
                            callback: () => {
                                checkCount++;
                                const currentState = {
                                    scrollX: camera.scrollX,
                                    scrollY: camera.scrollY,
                                    zoom: camera.zoom,
                                    bounds: { ...camera.getBounds() },
                                    viewport: { x: camera.x, y: camera.y, width: camera.width, height: camera.height },
                                    isFollowing: camera._follow !== null && camera._follow !== undefined
                                };
                                
                                const changes = [];
                                if (Math.abs(currentState.scrollX - initialState.scrollX) > 0.1) {
                                    changes.push(`scrollX: ${initialState.scrollX.toFixed(1)} → ${currentState.scrollX.toFixed(1)} (Δ${(currentState.scrollX - initialState.scrollX).toFixed(1)})`);
                                }
                                if (Math.abs(currentState.scrollY - initialState.scrollY) > 0.1) {
                                    changes.push(`scrollY: ${initialState.scrollY.toFixed(1)} → ${currentState.scrollY.toFixed(1)} (Δ${(currentState.scrollY - initialState.scrollY).toFixed(1)})`);
                                }
                                if (Math.abs(currentState.zoom - initialState.zoom) > 0.001) {
                                    changes.push(`zoom: ${initialState.zoom.toFixed(3)} → ${currentState.zoom.toFixed(3)} (Δ${(currentState.zoom - initialState.zoom).toFixed(3)})`);
                                }
                                if (currentState.bounds.width !== initialState.bounds.width || 
                                    currentState.bounds.x !== initialState.bounds.x) {
                                    changes.push(`bounds: ${initialState.bounds.width.toFixed(1)}@${initialState.bounds.x} → ${currentState.bounds.width.toFixed(1)}@${currentState.bounds.x}`);
                                }
                                if (currentState.viewport.width !== initialState.viewport.width) {
                                    changes.push(`viewport width: ${initialState.viewport.width} → ${currentState.viewport.width}`);
                                }
                                if (currentState.isFollowing !== initialState.isFollowing) {
                                    changes.push(`following: ${initialState.isFollowing} → ${currentState.isFollowing}`);
                                }
                                
                                if (changes.length > 0) {
                                    console.warn(`🎬 [PAN] 🔍 ⚠️ Camera state changed at check ${checkCount}: ${changes.join(', ')}`);
                                    
                                    // If critic entity exists, recalculate its screen position
                                    if (criticEntity) {
                                        const newCriticScreenX = (criticEntity.x - currentState.scrollX) / virtualWidth;
                                        console.warn(`🎬 [PAN] 🔍 ⚠️ Critic screen position now: ${(newCriticScreenX * 100).toFixed(1)}% from left`);
                                    }
                                } else if (checkCount % 4 === 0) {
                                    // Log every 2 seconds even if no changes
                                    console.log(`🎬 [PAN] 🔍 Check ${checkCount}/${maxChecks}: Camera stable at (${currentState.scrollX.toFixed(1)}, ${currentState.scrollY.toFixed(1)})`);
                                }
                                
                                if (checkCount >= maxChecks) {
                                    console.log(`🎬 [PAN] 🔍 Monitoring complete after ${maxChecks} checks`);
                                }
                            }
                        });
                    };
                    
                    // Start monitoring after a short delay to catch any immediate changes
                    this.scene.time.delayedCall(100, startMonitoring);
                    
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
                    camera.scrollX = clampedTargetX;
                    camera.scrollY = clampedTargetY;
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

            // Zoom only affects rendering scale, not FOV - camera always sees virtualWidth (1200) world units
            // No bounds adjustment needed - use bounds as specified
            camera.setBounds(
                bounds.x !== undefined ? bounds.x : camera.getBounds().x,
                bounds.y !== undefined ? bounds.y : camera.getBounds().y,
                bounds.width,
                bounds.height !== undefined ? bounds.height : camera.getBounds().height
            );

            const newBounds = camera.getBounds();
            const newScrollX = camera.scrollX;
            const newScrollY = camera.scrollY;

            // Clamp scroll to the new bounds to avoid negative Y or overshoot
            // Zoom doesn't affect FOV - camera always sees virtualWidth (1200) world units
            const virtualWidth = this.scene.virtualWidth || 1200;
            const virtualHeight = this.scene.virtualHeight || 720;
            const maxScrollX = newBounds.x + newBounds.width - virtualWidth;
            const maxScrollY = newBounds.y + newBounds.height - virtualHeight;
            camera.scrollX = Phaser.Math.Clamp(camera.scrollX, newBounds.x, maxScrollX);
            camera.scrollY = Phaser.Math.Clamp(camera.scrollY, newBounds.y, maxScrollY);
            
            console.log(`🎬 📏 Final bounds state:`);
            console.log(`🎬 📏   - New bounds: x=${newBounds.x}, y=${newBounds.y}, width=${newBounds.width.toFixed(1)}, height=${newBounds.height}`);
            console.log(`🎬 📏   - virtualWidth: ${virtualWidth}, virtualHeight: ${virtualHeight} (zoom doesn't affect FOV)`);
            console.log(`🎬 📏   - maxScrollX: ${maxScrollX.toFixed(1)} (${newBounds.x} + ${newBounds.width.toFixed(1)} - ${virtualWidth})`);
            console.log(`🎬 📏   - maxScrollY: ${maxScrollY.toFixed(1)}`);
            console.log(`🎬 Camera position after bounds: (${camera.scrollX}, ${camera.scrollY}) (was: ${newScrollX}, ${newScrollY})`);

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

