// ========================================
// LIVES MANAGER
// ========================================
// Handles player lives tracking and management

class LivesManager {
    constructor(scene) {
        this.scene = scene;
        this.lives = 3;
        this.maxLives = 3;
        
        console.log('❤️ LivesManager initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    initialize() {
        this.lives = this.maxLives;
        console.log(`❤️ Lives initialized: ${this.lives}`);
    }
    
    // ========================================
    // LIVES MANAGEMENT
    // ========================================
    
    loseLife() {
        if (this.lives > 0) {
            this.lives--;
            console.log(`❤️ Life lost! Remaining: ${this.lives}`);
            return this.lives;
        }
        return 0;
    }
    
    getLives() {
        return this.lives;
    }
    
    hasLives() {
        return this.lives > 0;
    }
    
    reset() {
        this.lives = this.maxLives;
        console.log(`❤️ Lives reset to: ${this.lives}`);
    }
    
    // ========================================
    // UTILITY
    // ========================================
    
    setLives(count) {
        this.lives = Math.max(0, Math.min(count, this.maxLives));
    }
}

// Make available globally
window.LivesManager = LivesManager;

