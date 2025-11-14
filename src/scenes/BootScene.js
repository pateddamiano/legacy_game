// ========================================
// BOOT SCENE
// ========================================
// Initial loading scene that sets up core systems and transitions to preload

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log('🚀 BootScene: Starting initial boot...');
        console.log('🚀 BootScene: Camera center:', this.cameras.main.centerX, this.cameras.main.centerY);
        
        // Create loading screen background
        this.cameras.main.setBackgroundColor('#0f0f23');
        
        // Add simple loading text
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'LOADING...', {
            fontSize: GAME_CONFIG.ui.fontSize.heading,
            fill: '#00ff00',
            fontFamily: GAME_CONFIG.ui.fontFamily
        }).setOrigin(0.5);
        
        // Load only the most essential assets needed for preload scene
        // This keeps boot time minimal
        this.load.image('logo', 'assets/weapons/spritesheets/vinyl weapon.png'); // Temporary logo
        
        console.log('🚀 BootScene: Preload setup complete, waiting for assets...');
    }

    create() {
        console.log('🚀 BootScene: Boot complete, initializing core systems...');
        console.log('🚀 BootScene: Scene manager exists?', !!window.sceneManager);
        console.log('🚀 BootScene: GameState exists?', !!window.gameState);
        
        // Initialize core game systems
        this.initializeCoreServices();
        
        console.log('🚀 BootScene: Core services initialized, scene manager:', !!window.sceneManager);
        
        // Wait a moment then transition to preload
        this.time.delayedCall(500, () => {
            console.log('🚀 BootScene: Attempting transition to MainMenuScene...');
            console.log('🚀 BootScene: SceneManager available?', !!window.sceneManager);
            
            if (window.sceneManager) {
                console.log('🚀 BootScene: Using SceneManager to transition...');
                window.sceneManager.goToMainMenu();
            } else {
                console.log('🚀 BootScene: SceneManager not available, using direct scene start...');
                this.scene.start('MainMenuScene');
            }
        });
    }
    
    initializeCoreServices() {
        // Initialize scene manager with game reference
        window.sceneManager = new SceneManager(this.game);
        
        // Initialize any other core services here
        console.log('⚙️ Core services initialized');
    }
}

// Make BootScene available globally
window.BootScene = BootScene;
