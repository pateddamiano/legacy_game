// ========================================
// SCENE MANAGER
// ========================================
// Centralized scene management for the entire game
// Handles scene transitions, data passing, and flow control

class SceneManager {
    constructor(game) {
        this.game = game;
        this.currentScene = null;
        this.previousScene = null;
        this.sceneHistory = [];
        
        // Scene transition effects
        this.transitionConfig = {
            duration: 500,
            fadeColor: 0x000000
        };
        
        console.log('🎬 SceneManager initialized');
    }
    
    // ========================================
    // SCENE FLOW METHODS
    // ========================================
    
    // Boot sequence
    startGame() {
        console.log('🚀 Starting game boot sequence...');
        this.transitionToScene('BootScene');
    }
    
    // Main menu flow
    goToMainMenu() {
        console.log('🏠 ===== SCENE MANAGER: GOING TO MAIN MENU =====');
        console.log('🏠 Current scene:', this.currentScene);
        console.log('🏠 Game object exists?', !!this.game);
        console.log('🏠 Available scenes:', this.game?.scene?.keys || 'No scene keys available');
        this.transitionToScene('MainMenuScene');
    }
    
    // Character selection
    goToCharacterSelect() {
        console.log('👤 Going to character selection');
        this.transitionToScene('CharacterSelectScene');
    }
    
    // Start gameplay with selected character
    startGameplay(character, levelId = 0) {
        console.log(`🎮 Starting gameplay: Level ${levelId} with ${character}`);
        
        // Update game state
        window.gameState.startNewGame(character, levelId);
        
        // For now, go directly to GameScene (we'll add intro later)
        // TODO: Add GameIntroScene here when ready
        this.startLevel(levelId, character);
    }
    
    // Go directly to level (after intro)
    startLevel(levelId, character) {
        console.log(`🎯 Starting level ${levelId}`);
        this.transitionToScene('GameScene', { 
            levelId: levelId, 
            character: character 
        });
    }
    
    // Level completion
    levelComplete(levelData) {
        console.log('🏆 Level completed!', levelData);
        
        // Update game state
        window.gameState.completeLevel(levelData);
        
        // Go to victory scene
        this.transitionToScene('VictoryScene', levelData);
    }
    
    // Boss battle
    startBossBattle(bossConfig) {
        console.log('👹 Starting boss battle:', bossConfig);
        this.transitionToScene('BossIntroScene', bossConfig);
    }
    
    // Game over
    gameOver(reason = 'defeated') {
        console.log('💀 Game over:', reason);
        this.transitionToScene('GameOverScene', { reason: reason });
    }
    
    // Settings/Options
    goToSettings() {
        console.log('⚙️ Going to settings');
        this.transitionToScene('SettingsScene');
    }
    
    // Pause game
    pauseGame() {
        if (this.currentScene === 'GameplayScene') {
            console.log('⏸️ Pausing game');
            this.game.scene.pause('GameplayScene');
            this.game.scene.launch('PauseScene');
        }
    }
    
    // Resume game
    resumeGame() {
        console.log('▶️ Resuming game');
        this.game.scene.stop('PauseScene');
        this.game.scene.resume('GameplayScene');
    }
    
    // ========================================
    // SCENE TRANSITION METHODS
    // ========================================
    
    transitionToScene(sceneKey, data = null) {
        console.log(`🎬 ===== TRANSITIONING TO SCENE: ${sceneKey} =====`);
        console.log('🎬 From scene:', this.currentScene || 'None');
        console.log('🎬 To scene:', sceneKey);
        console.log('🎬 With data:', data);
        console.log('🎬 Game object exists?', !!this.game);
        console.log('🎬 Game.scene exists?', !!this.game?.scene);
        
        // If we're already in the target scene, don't restart it
        if (this.currentScene === sceneKey) {
            console.log(`🎬 ⚠️ Already in ${sceneKey}, skipping transition`);
            return;
        }
        
        // Store scene history
        if (this.currentScene) {
            this.previousScene = this.currentScene;
            this.sceneHistory.push(this.currentScene);
        }
        
        this.currentScene = sceneKey;
        
        // Simple transition for now - can be enhanced with fade effects later
        try {
            console.log('🎬 Calling game.scene.start...');
            if (data) {
                this.game.scene.start(sceneKey, data);
            } else {
                this.game.scene.start(sceneKey);
            }
            console.log(`🎬 ✅ Scene transition successful: ${this.previousScene || 'None'} → ${sceneKey}`);
        } catch (error) {
            console.error(`🎬 ❌ Scene transition failed: ${this.previousScene || 'None'} → ${sceneKey}`, error);
        }
    }
    
    // Enhanced transition with fade effect
    fadeToScene(sceneKey, data = null) {
        const currentSceneRef = this.game.scene.getScene(this.currentScene);
        
        if (currentSceneRef) {
            // Create fade overlay
            const fadeOverlay = currentSceneRef.add.rectangle(
                currentSceneRef.cameras.main.centerX,
                currentSceneRef.cameras.main.centerY,
                currentSceneRef.cameras.main.width,
                currentSceneRef.cameras.main.height,
                this.transitionConfig.fadeColor,
                0
            );
            fadeOverlay.setDepth(10000);
            fadeOverlay.setScrollFactor(0);
            
            // Fade out current scene
            currentSceneRef.tweens.add({
                targets: fadeOverlay,
                alpha: 1,
                duration: this.transitionConfig.duration / 2,
                ease: 'Power2',
                onComplete: () => {
                    // Switch to new scene
                    this.transitionToScene(sceneKey, data);
                }
            });
        } else {
            // Fallback to simple transition
            this.transitionToScene(sceneKey, data);
        }
    }
    
    // Go back to previous scene
    goBack() {
        if (this.sceneHistory.length > 0) {
            const previousScene = this.sceneHistory.pop();
            this.transitionToScene(previousScene);
        } else {
            this.goToMainMenu();
        }
    }
    
    // ========================================
    // SCENE STATE MANAGEMENT
    // ========================================
    
    getCurrentScene() {
        return this.currentScene;
    }
    
    getPreviousScene() {
        return this.previousScene;
    }
    
    getSceneHistory() {
        return [...this.sceneHistory];
    }
    
    // Check if we're in gameplay
    isInGameplay() {
        return this.currentScene === 'GameplayScene';
    }
    
    // Check if we're in menu
    isInMenu() {
        const menuScenes = ['MainMenuScene', 'CharacterSelectScene', 'SettingsScene'];
        return menuScenes.includes(this.currentScene);
    }
    
    // ========================================
    // LEVEL PROGRESSION HELPERS
    // ========================================
    
    getNextLevel() {
        const currentLevel = window.gameState.currentGame.levelId;
        const nextLevel = currentLevel + 1;
        
        // Check if next level is unlocked
        if (window.gameState.isLevelUnlocked(nextLevel)) {
            return nextLevel;
        }
        
        return null;
    }
    
    hasNextLevel() {
        return this.getNextLevel() !== null;
    }
    
    continueToNextLevel() {
        const nextLevel = this.getNextLevel();
        if (nextLevel !== null) {
            const character = window.gameState.currentGame.character;
            this.startLevel(nextLevel, character);
            return true;
        }
        return false;
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    // Quick restart current level
    restartLevel() {
        const currentLevel = window.gameState.currentGame.levelId;
        const character = window.gameState.currentGame.character;
        this.startLevel(currentLevel, character);
    }
    
    // Exit to main menu from anywhere
    exitToMainMenu() {
        // Stop all scenes except main menu
        this.game.scene.getScenes().forEach(scene => {
            if (scene.scene.key !== 'MainMenuScene') {
                this.game.scene.stop(scene.scene.key);
            }
        });
        
        this.goToMainMenu();
    }
    
    // Emergency scene reset (for debugging)
    resetToMainMenu() {
        console.log('🔄 Emergency reset to main menu');
        this.sceneHistory = [];
        this.exitToMainMenu();
    }
    
    // Get scene data for debugging
    getDebugInfo() {
        return {
            currentScene: this.currentScene,
            previousScene: this.previousScene,
            sceneHistory: this.sceneHistory,
            gameState: window.gameState.currentGame
        };
    }
}

// Create global scene manager instance (will be initialized with game object)
window.sceneManager = null;

// Make SceneManager class available globally
window.SceneManager = SceneManager;

console.log('🎬 SceneManager module loaded');
