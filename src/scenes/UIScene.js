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
            // Update UI scale factor
            this.uiScale = viewport.scale;
            // Set zoom back to 1.0 after resize (LayoutManager sets it to viewport scale)
            this.cameras.main.setZoom(1.0);
            // Clear bounds again after resize
            this.cameras.main.setBounds();
            // Reset scroll again after resize
            this.cameras.main.setScroll(0, 0);
            
            // Notify UI elements to update their scale if needed
            this.events.emit('uiScaleChanged', this.uiScale);
        });
        
        // This scene is transparent and sits on top of GameScene
        // UIManager will add UI elements to this scene using virtual coordinates (1200x720)
        
        // Create fullscreen button (available during gameplay)
        this.createFullscreenButton();
    }
    
    createFullscreenButton() {
        // Show on mobile devices or if explicitly enabled
        const shouldShow = (window.DeviceManager && window.DeviceManager.isMobile) || 
                          (window.DEBUG_MODE && window.DeviceManager);
        
        if (!shouldShow) return;
        
        console.log('📱 Creating fullscreen button in UIScene...');
        
        // Position in top-left corner (virtual coordinates)
        const btnX = 100;
        const btnY = 50;
        
        // Create button background for better visibility
        const btnBg = this.add.rectangle(btnX, btnY, 180, 40, 0x000000, 0.8);
        btnBg.setStrokeStyle(2, 0xFFFFFF, 0.7);
        btnBg.setScrollFactor(0);
        btnBg.setDepth(4000); // Above other UI elements
        btnBg.setInteractive({ useHandCursor: true });
        
        // Create button text
        const fullscreenBtn = this.add.text(btnX, btnY, '[ FULLSCREEN ]', {
            fontSize: '20px',
            fill: '#FFFFFF',
            fontFamily: GAME_CONFIG.ui.fontFamily || 'VT323',
            fontStyle: 'bold'
        });
        fullscreenBtn.setOrigin(0.5);
        fullscreenBtn.setScrollFactor(0);
        fullscreenBtn.setDepth(4001);
        fullscreenBtn.setInteractive({ useHandCursor: true });
        
        // Store reference for state updates
        this.fullscreenButton = fullscreenBtn;
        this.fullscreenButtonBg = btnBg;
        
        // Toggle fullscreen on click - use game's scale manager
        const toggleFullscreen = (pointer) => {
            console.log('📱 Fullscreen button clicked');
            console.log('📱 Scale manager:', this.game.scale);
            console.log('📱 Is fullscreen:', this.game.scale.isFullscreen);
            
            try {
                const scaleManager = this.game.scale;
                
                if (scaleManager.isFullscreen) {
                    console.log('📱 Attempting to exit fullscreen...');
                    scaleManager.stopFullscreen();
                } else {
                    console.log('📱 Attempting to enter fullscreen...');
                    // Request fullscreen - Phaser will handle the API
                    scaleManager.startFullscreen();
                }
            } catch (error) {
                console.error('📱 Fullscreen error:', error);
                // Fallback to native fullscreen API
                try {
                    const element = document.getElementById('game-container') || document.documentElement;
                    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                        console.log('📱 Using native fullscreen API (enter)...');
                        if (element.requestFullscreen) {
                            element.requestFullscreen();
                        } else if (element.webkitRequestFullscreen) {
                            element.webkitRequestFullscreen();
                        } else if (element.msRequestFullscreen) {
                            element.msRequestFullscreen();
                        } else if (element.mozRequestFullScreen) {
                            element.mozRequestFullScreen();
                        }
                    } else {
                        console.log('📱 Using native fullscreen API (exit)...');
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        } else if (document.msExitFullscreen) {
                            document.msExitFullscreen();
                        } else if (document.mozCancelFullScreen) {
                            document.mozCancelFullScreen();
                        }
                    }
                } catch (fallbackError) {
                    console.error('📱 Fullscreen fallback also failed:', fallbackError);
                    alert('Fullscreen is not supported in this browser. Please use F11 or your browser\'s fullscreen option.');
                }
            }
        };
        
        btnBg.on('pointerdown', toggleFullscreen);
        fullscreenBtn.on('pointerdown', toggleFullscreen);
        
        // Update button text based on fullscreen state - use game's scale manager
        const scaleManager = this.game.scale;
        scaleManager.on('fullscreenchange', () => {
            if (this.fullscreenButton) {
                if (scaleManager.isFullscreen) {
                    this.fullscreenButton.setText('[ EXIT FULL ]');
                } else {
                    this.fullscreenButton.setText('[ FULLSCREEN ]');
                }
            }
        });
        
        // Also listen to Phaser's fullscreen events
        scaleManager.on('enterfullscreen', () => {
            if (this.fullscreenButton) {
                this.fullscreenButton.setText('[ EXIT FULL ]');
            }
        });
        
        scaleManager.on('leavefullscreen', () => {
            if (this.fullscreenButton) {
                this.fullscreenButton.setText('[ FULLSCREEN ]');
            }
        });
        
        // Check initial state
        if (scaleManager.isFullscreen) {
            fullscreenBtn.setText('[ EXIT FULL ]');
        }
        
        console.log('📱 Fullscreen button created in UIScene');
    }
}

if (typeof window !== 'undefined') {
    window.UIScene = UIScene;
}

