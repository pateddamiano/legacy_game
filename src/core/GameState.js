// ========================================
// GAME STATE MANAGEMENT
// ========================================
// Centralized game state management for the entire application
// Handles player progression, settings, and current game session

class GameState {
    constructor() {
        // Player progression data (persisted)
        this.player = {
            level: 1,
            experience: 0,
            unlockedCharacters: ['tireek'], // Start with Tireek unlocked
            unlockedLevels: [0], // Start with first level unlocked
            stats: {
                totalEnemiesDefeated: 0,
                totalGamesPlayed: 0,
                totalPlayTime: 0,
                bossesDefeated: [],
                highestLevelReached: 0
            },
            preferences: {
                lastSelectedCharacter: 'tireek'
            }
        };
        
        // Current game session data (temporary)
        this.currentGame = {
            levelId: 0,
            character: 'tireek',
            health: 100,
            maxHealth: 100,
            score: 0,
            lives: 3,
            startTime: null,
            enemiesDefeated: 0,
            combosPerformed: 0
        };
        
        // Game settings (persisted)
        this.settings = {
            musicVolume: 0.7,
            sfxVolume: 0.8,
            musicEnabled: true,
            sfxEnabled: true,
            difficulty: 'normal', // easy, normal, hard
            debugMode: false
        };
        
        // Load saved data if it exists
        this.loadFromStorage();
        
        console.log('🎮 GameState initialized:', this);
    }
    
    // ========================================
    // PLAYER PROGRESSION METHODS
    // ========================================
    
    unlockCharacter(characterName) {
        if (!this.player.unlockedCharacters.includes(characterName)) {
            this.player.unlockedCharacters.push(characterName);
            this.saveToStorage();
            console.log(`🎯 Character unlocked: ${characterName}`);
            return true;
        }
        return false;
    }
    
    unlockLevel(levelId) {
        if (!this.player.unlockedLevels.includes(levelId)) {
            this.player.unlockedLevels.push(levelId);
            this.player.highestLevelReached = Math.max(this.player.highestLevelReached, levelId);
            this.saveToStorage();
            console.log(`🎯 Level unlocked: ${levelId}`);
            return true;
        }
        return false;
    }
    
    addExperience(amount) {
        this.player.experience += amount;
        const oldLevel = this.player.level;
        this.player.level = Math.floor(this.player.experience / 1000) + 1; // Every 1000 XP = 1 level
        
        if (this.player.level > oldLevel) {
            console.log(`🎉 Level up! Now level ${this.player.level}`);
        }
        
        this.saveToStorage();
    }
    
    // ========================================
    // CURRENT GAME SESSION METHODS
    // ========================================
    
    startNewGame(character, levelId = 0) {
        this.currentGame = {
            levelId: levelId,
            character: character,
            health: 100,
            maxHealth: 100,
            score: 0,
            lives: 3,
            startTime: Date.now(),
            enemiesDefeated: 0,
            combosPerformed: 0
        };
        
        this.player.preferences.lastSelectedCharacter = character;
        this.player.stats.totalGamesPlayed++;
        this.saveToStorage();
        
        console.log(`🎮 New game started: Level ${levelId} with ${character}`);
    }
    
    completeLevel(levelData) {
        // Add experience based on performance
        const baseXP = 100;
        const bonusXP = Math.floor(levelData.score / 100) + (levelData.enemiesDefeated * 10);
        this.addExperience(baseXP + bonusXP);
        
        // Update stats
        this.player.stats.totalEnemiesDefeated += levelData.enemiesDefeated;
        
        // Unlock next level
        this.unlockLevel(this.currentGame.levelId + 1);
        
        console.log(`🏆 Level ${this.currentGame.levelId} completed! XP gained: ${baseXP + bonusXP}`);
    }
    
    defeatBoss(bossName) {
        if (!this.player.stats.bossesDefeated.includes(bossName)) {
            this.player.stats.bossesDefeated.push(bossName);
            this.addExperience(500); // Big XP bonus for boss
            this.saveToStorage();
            console.log(`👹 Boss defeated: ${bossName}`);
        }
    }
    
    // ========================================
    // SETTINGS METHODS
    // ========================================
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveToStorage();
        console.log('⚙️ Settings updated:', newSettings);
    }
    
    toggleMusic() {
        this.settings.musicEnabled = !this.settings.musicEnabled;
        this.saveToStorage();
        return this.settings.musicEnabled;
    }
    
    toggleSFX() {
        this.settings.sfxEnabled = !this.settings.sfxEnabled;
        this.saveToStorage();
        return this.settings.sfxEnabled;
    }
    
    // ========================================
    // PERSISTENCE METHODS
    // ========================================
    
    saveToStorage() {
        try {
            const saveData = {
                player: this.player,
                settings: this.settings,
                version: '1.0.0',
                timestamp: Date.now()
            };
            
            localStorage.setItem('legacy_game_save', JSON.stringify(saveData));
            console.log('💾 Game state saved to localStorage');
        } catch (error) {
            console.error('❌ Failed to save game state:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const saveData = localStorage.getItem('legacy_game_save');
            if (saveData) {
                const parsed = JSON.parse(saveData);
                
                // Merge saved data with defaults (in case new properties were added)
                this.player = { ...this.player, ...parsed.player };
                this.settings = { ...this.settings, ...parsed.settings };
                
                console.log('📂 Game state loaded from localStorage');
            }
        } catch (error) {
            console.error('❌ Failed to load game state:', error);
        }
    }
    
    resetProgress() {
        localStorage.removeItem('legacy_game_save');
        
        // Reset to defaults
        this.player = {
            level: 1,
            experience: 0,
            unlockedCharacters: ['tireek'],
            unlockedLevels: [0],
            stats: {
                totalEnemiesDefeated: 0,
                totalGamesPlayed: 0,
                totalPlayTime: 0,
                bossesDefeated: [],
                highestLevelReached: 0
            },
            preferences: {
                lastSelectedCharacter: 'tireek'
            }
        };
        
        console.log('🔄 Game progress reset');
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    isCharacterUnlocked(characterName) {
        return this.player.unlockedCharacters.includes(characterName);
    }
    
    isLevelUnlocked(levelId) {
        return this.player.unlockedLevels.includes(levelId);
    }
    
    getUnlockedCharacters() {
        return [...this.player.unlockedCharacters];
    }
    
    getUnlockedLevels() {
        return [...this.player.unlockedLevels];
    }
    
    getNextUnlockedLevel() {
        // Return the highest unlocked level (for continue)
        // or 0 if only tutorial is unlocked
        const maxLevel = Math.max(...this.player.unlockedLevels);
        return maxLevel >= 0 ? maxLevel : 0;
    }
    
    getStartingLevel() {
        // Always return 0 for new games (tutorial level)
        return 0;
    }
    
    // Get display-friendly stats
    getPlayerStats() {
        return {
            level: this.player.level,
            experience: this.player.experience,
            experienceToNext: (this.player.level * 1000) - this.player.experience,
            charactersUnlocked: this.player.unlockedCharacters.length,
            levelsUnlocked: this.player.unlockedLevels.length,
            totalEnemiesDefeated: this.player.stats.totalEnemiesDefeated,
            bossesDefeated: this.player.stats.bossesDefeated.length,
            gamesPlayed: this.player.stats.totalGamesPlayed
        };
    }
}

// Create global game state instance
window.gameState = new GameState();

// Make GameState class available globally
window.GameState = GameState;

console.log('🎮 GameState module loaded');
