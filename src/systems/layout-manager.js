/**
 * LayoutManager
 * Handles calculating the game viewport to maintain a fixed aspect ratio
 * within a responsive full-screen canvas.
 */

const LayoutManager = {
    /**
     * Calculate the viewport for the game camera to maintain aspect ratio.
     * 
     * @param {number} windowWidth - Current window/canvas width
     * @param {number} windowHeight - Current window/canvas height
     * @param {number} targetWidth - The virtual width of the game (e.g. 1200)
     * @param {number} targetHeight - The virtual height of the game (e.g. 720)
     * @returns {object} { x, y, width, height, zoom } - Viewport rect and zoom level
     */
    calculateGameViewport(windowWidth, windowHeight, targetWidth, targetHeight) {
        // Check for Visual Viewport API (better for mobile with virtual keyboards/bars)
        // Prefer the larger of inner* and visualViewport to avoid toolbar-induced shrink
        // Chrome iOS sometimes reports a very small visualViewport height while toolbars animate.
        const vv = window.visualViewport;
        const availableWidth = vv ? Math.max(windowWidth, vv.width) : windowWidth;
        const availableHeight = vv ? Math.max(windowHeight, vv.height) : windowHeight;

        // Calculate how much we need to scale to fit the target dimensions
        const scaleX = availableWidth / targetWidth;
        const scaleY = availableHeight / targetHeight;
        
        // Use the smaller scale factor to ensure the entire world fits (letterbox/pillarbox)
        const scale = Math.min(scaleX, scaleY);
        
        // The viewport size in SCREEN PIXELS (how big the game appears on screen)
        const viewportWidth = Math.round(targetWidth * scale);
        const viewportHeight = Math.round(targetHeight * scale);
        
        // Center the viewport in the available space
        let x = Math.round((availableWidth - viewportWidth) / 2);
        let y = Math.round((availableHeight - viewportHeight) / 2);
        
        return {
            x,
            y,
            width: viewportWidth,
            height: viewportHeight,
            scale: scale
        };
    },

    /**
     * Apply the calculated viewport to a scene's main camera.
     * 
     * @param {Phaser.Scene} scene - The scene to update
     * @param {number} targetWidth - Virtual width
     * @param {number} targetHeight - Virtual height
     */
    applyToScene(scene, targetWidth, targetHeight) {
        if (!scene || !scene.cameras || !scene.cameras.main) {
            console.warn('📏 LayoutManager: Scene camera not ready, skipping layout.');
            return {
                x: 0,
                y: 0,
                width: targetWidth,
                height: targetHeight,
                scale: 1
            };
        }
        
        const camera = scene.cameras.main;
        const scaleWidth = scene.scale ? scene.scale.width : targetWidth;
        const scaleHeight = scene.scale ? scene.scale.height : targetHeight;
        
        // Always use window dimensions for calculation (more reliable than scale manager)
        // Use the larger of inner* vs visualViewport to avoid transient shrinking (Chrome iOS bars).
        const calcWidth = Math.max(window.innerWidth, window.visualViewport?.width || 0);
        const calcHeight = Math.max(window.innerHeight, window.visualViewport?.height || 0);
        
        const viewport = this.calculateGameViewport(calcWidth, calcHeight, targetWidth, targetHeight);

        // Skip re-apply if nothing changed to avoid resize loops
        const signature = `${viewport.x},${viewport.y},${viewport.width},${viewport.height},${viewport.scale.toFixed(4)}`;
        if (scene._lastLayoutSignature === signature) {
            return viewport;
        }
        scene._lastLayoutSignature = signature;

        // Extra diagnostics to compare platforms
        const vv = window.visualViewport;
        const canvas = scene.game && scene.game.canvas;
        console.log('📏 Layout diagnostics:', {
            window: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
            visualViewport: vv ? { width: vv.width, height: vv.height, offsetTop: vv.offsetTop, offsetLeft: vv.offsetLeft, scale: vv.scale } : null,
            devicePixelRatio: window.devicePixelRatio,
            calcWidth,
            calcHeight,
            scaleManager: scene.scale ? { width: scene.scale.width, height: scene.scale.height } : null,
            canvas: canvas ? { width: canvas.width, height: canvas.height } : null
        });
        
        // Check if event system has camera locked (should not modify during events)
        const eventCameraLocked = scene.eventCameraLocked || false;
        if (eventCameraLocked) {
            console.warn(`📏 [LAYOUT] ⚠️ LayoutManager.applyToScene called while eventCameraLocked=true!`);
            console.warn(`📏 [LAYOUT] ⚠️ This may interfere with event camera positioning!`);
            console.trace('📏 [LAYOUT] Call stack:');
        }
        
        const oldZoom = camera.zoom;
        const oldScrollX = camera.scrollX;
        const oldScrollY = camera.scrollY;
        const oldBounds = camera.getBounds();
        
        // Apply the scale as zoom so that targetWidth x targetHeight fits in the viewport
        camera.setZoom(viewport.scale);
        
        // Set camera bounds to match the virtual world size
        camera.setBounds(0, 0, targetWidth, targetHeight);
        
        // Set viewport to the calculated centered rectangle (in screen pixels)
        camera.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
        
        // Center the camera on the middle of the virtual world
        // BUT skip this if camera is locked by event system (during pans, etc.)
        // to prevent interrupting camera animations on mobile resize events
        if (!eventCameraLocked) {
            camera.centerOn(targetWidth / 2, targetHeight / 2);
        }
        
        // Log if significant changes occurred
        if (eventCameraLocked) {
            const newScrollX = camera.scrollX;
            const newScrollY = camera.scrollY;
            const newZoom = camera.zoom;
            const newBounds = camera.getBounds();
            
            if (Math.abs(oldScrollX - newScrollX) > 0.1 || Math.abs(oldScrollY - newScrollY) > 0.1) {
                console.warn(`📏 [LAYOUT] ⚠️ Scroll changed during event: (${oldScrollX.toFixed(1)}, ${oldScrollY.toFixed(1)}) → (${newScrollX.toFixed(1)}, ${newScrollY.toFixed(1)})`);
            }
            if (Math.abs(oldZoom - newZoom) > 0.001) {
                console.warn(`📏 [LAYOUT] ⚠️ Zoom changed during event: ${oldZoom.toFixed(3)} → ${newZoom.toFixed(3)}`);
            }
            if (oldBounds.width !== newBounds.width) {
                console.warn(`📏 [LAYOUT] ⚠️ Bounds changed during event: ${oldBounds.width.toFixed(1)} → ${newBounds.width.toFixed(1)}`);
            }
        }
        
        console.log(`📏 Layout updated: Viewport ${viewport.width}x${viewport.height} at (${viewport.x}, ${viewport.y}), Zoom: ${viewport.scale.toFixed(2)}`);
        
        return viewport;
    }
};

// Export for global usage
if (typeof window !== 'undefined') {
    window.LayoutManager = LayoutManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayoutManager;
}
