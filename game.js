// ========================================
// GAME ENTRY POINT
// ========================================
// This file initializes Phaser and starts the game

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: GameScene
};

// Start the game
const game = new Phaser.Game(config);