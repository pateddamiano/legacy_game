/**
 * UIScene
 * A dedicated scene for rendering UI elements on top of the game world.
 * This scene covers the entire screen, allowing UI to be placed in the
 * empty spaces (pillarbox/letterbox) outside the game viewport.
 */
class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: false });
    }

    create() {
        console.log('🖥️ UIScene created');
        
        // Apply the same layout as GameScene to keep UI aligned with game world
        this.virtualWidth = 1200;
        this.virtualHeight = 720;
        
        console.log('🔍 UI_DEBUG: Before LayoutManager');
        console.log('🔍 UI_DEBUG: Camera state before:', {
            zoom: this.cameras.main.zoom,
            scrollX: this.cameras.main.scrollX,
            scrollY: this.cameras.main.scrollY,
            x: this.cameras.main.x,
            y: this.cameras.main.y,
            width: this.cameras.main.width,
            height: this.cameras.main.height,
            bounds: this.cameras.main.getBounds()
        });
        
        const viewport = LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
        this.viewportInfo = viewport;
        
        console.log('🔍 UI_DEBUG: After LayoutManager, before clearing bounds');
        console.log('🔍 UI_DEBUG: Camera state after layout:', {
            zoom: this.cameras.main.zoom,
            scrollX: this.cameras.main.scrollX,
            scrollY: this.cameras.main.scrollY,
            x: this.cameras.main.x,
            y: this.cameras.main.y,
            width: this.cameras.main.width,
            height: this.cameras.main.height,
            bounds: this.cameras.main.getBounds()
        });
        
        // Store the zoom factor for UI scaling - we'll apply this scale to UI elements themselves
        // The camera zoom will be set to 1.0 for correct positioning, but elements need to scale
        this.uiScale = viewport.scale;
        
        // CRITICAL: Set zoom to 1.0 for UI elements - UI should render at 1:1 scale for positioning
        // But we'll scale the UI elements themselves by uiScale to match the viewport size
        this.cameras.main.setZoom(1.0);
        
        // IMPORTANT: Remove camera bounds for UI - UI elements should be able to render anywhere
        // We keep the viewport position to align with game world
        this.cameras.main.setBounds();
        
        // CRITICAL: Reset camera scroll to (0, 0) so UI coordinates work as expected
        // UI elements at (70, 60) should appear at (70, 60) in the viewport, not offset by camera scroll
        this.cameras.main.setScroll(0, 0);
        
        console.log('🔍 UI_DEBUG: After clearing bounds');
        console.log('🔍 UI_DEBUG: Final camera state:', {
            zoom: this.cameras.main.zoom,
            scrollX: this.cameras.main.scrollX,
            scrollY: this.cameras.main.scrollY,
            x: this.cameras.main.x,
            y: this.cameras.main.y,
            width: this.cameras.main.width,
            height: this.cameras.main.height,
            bounds: this.cameras.main.getBounds()
        });
        
        console.log('🔍 UI_DEBUG: Scene dimensions:', {
            'scale.width': this.scale.width,
            'scale.height': this.scale.height,
            'virtualWidth': this.virtualWidth,
            'virtualHeight': this.virtualHeight
        });
        
        // Handle window resizing
        this.scale.on('resize', (gameSize) => {
            console.log('📏 Resizing UIScene...');
            const viewport = LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
            this.viewportInfo = viewport;
            // Update UI scale factor
            this.uiScale = viewport.scale;
            // Set zoom back to 1.0 after resize (LayoutManager sets it to viewport scale)
            this.cameras.main.setZoom(1.0);
            // Clear bounds again after resize
            this.cameras.main.setBounds();
            // Reset scroll again after resize
            this.cameras.main.setScroll(0, 0);
            
            // Notify UI elements to update their scale if needed
            this.events.emit('uiScaleChanged', this.uiScale, this.viewportInfo);
        });
        
        // This scene is transparent and sits on top of GameScene
        // UIManager will add UI elements to this scene using virtual coordinates (1200x720)
        
        // Emit initial scale event so listeners can perform setup with the current viewport info
        this.events.emit('uiScaleChanged', this.uiScale, this.viewportInfo);
    }
}

if (typeof window !== 'undefined') {
    window.UIScene = UIScene;
}

