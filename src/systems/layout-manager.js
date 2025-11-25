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
        let availableWidth = windowWidth;
        let availableHeight = windowHeight;
        
        if (window.visualViewport) {
            availableWidth = window.visualViewport.width;
            availableHeight = window.visualViewport.height;
        }

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
        // Prefer visualViewport for mobile, fall back to window.inner* for desktop
        let calcWidth = window.innerWidth;
        let calcHeight = window.innerHeight;
        
        if (window.visualViewport) {
            calcWidth = window.visualViewport.width;
            calcHeight = window.visualViewport.height;
        }
        
        const viewport = this.calculateGameViewport(calcWidth, calcHeight, targetWidth, targetHeight);
        
        // Apply the scale as zoom so that targetWidth x targetHeight fits in the viewport
        camera.setZoom(viewport.scale);
        
        // Set camera bounds to match the virtual world size
        camera.setBounds(0, 0, targetWidth, targetHeight);
        
        // Set viewport to the calculated centered rectangle (in screen pixels)
        camera.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
        
        // Center the camera on the middle of the virtual world
        camera.centerOn(targetWidth / 2, targetHeight / 2);
        
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
