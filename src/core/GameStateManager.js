// ========================================
// GAME STATE MANAGER
// ========================================
// Comprehensive state management for the entire game

class GameStateManager {
    constructor(scene) {
        this.scene = scene;
        
        // Current game state
        this.state = {
            // Level progression
            currentLevel: 1,
            currentLevelConfig: null,
            levelsCompleted: [],
            levelStartTime: 0,
            
            // Player state
            player: {
                characters: {
                    tireek: {
                        health: 100,
                        maxHealth: 100,
                        isActive: true,
                        regenRate: 0.5
                    },
                    tryston: {
                        health: 100,
                        maxHealth: 100,
                        isActive: false,
                        regenRate: 0.5
                    }
                },
                activeCharacter: 'tireek',
                score: 0,
                experience: 0,
                level: 1,
                unlocks: [],
                inventory: []
            },
            
            // Dialogue state
            dialogue: {
                isActive: false,
                currentDialogue: null,
                queue: [],
                isPaused: false
            },
            
            // Level transition state
            transition: {
                isTransitioning: false,
                fromLevel: null,
                toLevel: null,
                phase: null // 'fadeOut', 'cleanup', 'load', 'fadeIn'
            },
            
            // Combat state
            combat: {
                enemiesDefeated: 0,
                comboCount: 0,
                bossActive: false,
                bossDefeated: false
            },
            
            // Game flags
            flags: {
                gamePaused: false,
                godMode: false,
                debugMode: false
            }
        };
        
        console.log('🎮 GameStateManager initialized');
    }
    
    // ========================================
    // LEVEL STATE
    // ========================================
    
    setCurrentLevel(levelId, levelConfig) {
        this.state.currentLevel = levelId;
        this.state.currentLevelConfig = levelConfig;
        this.state.levelStartTime = Date.now();
        this.state.combat.enemiesDefeated = 0;
        this.state.combat.bossActive = false;
        this.state.combat.bossDefeated = false;
        
        console.log(`🎮 Current level set to: ${levelId} - ${levelConfig.name}`);
    }
    
    getCurrentLevel() {
        return this.state.currentLevel;
    }
    
    getCurrentLevelConfig() {
        return this.state.currentLevelConfig;
    }
    
    markLevelComplete(levelId) {
        if (!this.state.levelsCompleted.includes(levelId)) {
            this.state.levelsCompleted.push(levelId);
            console.log(`🎮 Level ${levelId} marked as complete`);
        }
    }
    
    isLevelComplete(levelId) {
        return this.state.levelsCompleted.includes(levelId);
    }
    
    getLevelPlayTime() {
        return Date.now() - this.state.levelStartTime;
    }
    
    // ========================================
    // PLAYER STATE
    // ========================================
    
    getPlayerState() {
        return this.state.player;
    }
    
    setActiveCharacter(characterName) {
        this.state.player.activeCharacter = characterName;
        
        // Update active status
        Object.keys(this.state.player.characters).forEach(char => {
            this.state.player.characters[char].isActive = (char === characterName);
        });
        
        console.log(`🎮 Active character set to: ${characterName}`);
    }
    
    getActiveCharacter() {
        return this.state.player.activeCharacter;
    }
    
    getCharacterState(characterName) {
        return this.state.player.characters[characterName];
    }
    
    updateCharacterHealth(characterName, health) {
        if (this.state.player.characters[characterName]) {
            this.state.player.characters[characterName].health = Math.max(0, 
                Math.min(health, this.state.player.characters[characterName].maxHealth));
        }
    }
    
    addScore(points) {
        this.state.player.score += points;
        console.log(`🎮 Score: ${this.state.player.score} (+${points})`);
    }
    
    addExperience(exp) {
        this.state.player.experience += exp;
        console.log(`🎮 Experience: ${this.state.player.experience} (+${exp})`);
    }
    
    addUnlock(unlockId) {
        if (!this.state.player.unlocks.includes(unlockId)) {
            this.state.player.unlocks.push(unlockId);
            console.log(`🎮 Unlocked: ${unlockId}`);
        }
    }
    
    hasUnlock(unlockId) {
        return this.state.player.unlocks.includes(unlockId);
    }
    
    addItem(itemId) {
        this.state.player.inventory.push(itemId);
        console.log(`🎮 Item added: ${itemId}`);
    }
    
    // ========================================
    // DIALOGUE STATE
    // ========================================
    
    setDialogueActive(isActive) {
        this.state.dialogue.isActive = isActive;
        
        // Automatically pause game when dialogue is active
        if (isActive) {
            this.pauseGame();
        }
    }
    
    isDialogueActive() {
        return this.state.dialogue.isActive;
    }
    
    setCurrentDialogue(dialogue) {
        this.state.dialogue.currentDialogue = dialogue;
    }
    
    getCurrentDialogue() {
        return this.state.dialogue.currentDialogue;
    }
    
    queueDialogue(dialogue) {
        this.state.dialogue.queue.push(dialogue);
    }
    
    dequeueDialogue() {
        return this.state.dialogue.queue.shift();
    }
    
    hasQueuedDialogue() {
        return this.state.dialogue.queue.length > 0;
    }
    
    clearDialogueQueue() {
        this.state.dialogue.queue = [];
    }
    
    // ========================================
    // TRANSITION STATE
    // ========================================
    
    startTransition(fromLevel, toLevel) {
        this.state.transition.isTransitioning = true;
        this.state.transition.fromLevel = fromLevel;
        this.state.transition.toLevel = toLevel;
        this.state.transition.phase = 'fadeOut';
        
        console.log(`🎮 Transition started: Level ${fromLevel} → Level ${toLevel}`);
    }
    
    setTransitionPhase(phase) {
        this.state.transition.phase = phase;
        console.log(`🎮 Transition phase: ${phase}`);
    }
    
    endTransition() {
        this.state.transition.isTransitioning = false;
        this.state.transition.fromLevel = null;
        this.state.transition.toLevel = null;
        this.state.transition.phase = null;
        
        console.log('🎮 Transition complete');
    }
    
    isTransitioning() {
        return this.state.transition.isTransitioning;
    }
    
    getTransitionPhase() {
        return this.state.transition.phase;
    }
    
    // ========================================
    // COMBAT STATE
    // ========================================
    
    incrementEnemiesDefeated() {
        this.state.combat.enemiesDefeated++;
        return this.state.combat.enemiesDefeated;
    }
    
    getEnemiesDefeated() {
        return this.state.combat.enemiesDefeated;
    }
    
    setComboCount(count) {
        this.state.combat.comboCount = count;
    }
    
    getComboCount() {
        return this.state.combat.comboCount;
    }
    
    setBossActive(isActive) {
        this.state.combat.bossActive = isActive;
        console.log(`🎮 Boss active: ${isActive}`);
    }
    
    isBossActive() {
        return this.state.combat.bossActive;
    }
    
    setBossDefeated(isDefeated) {
        this.state.combat.bossDefeated = isDefeated;
        if (isDefeated) {
            console.log('🎮 Boss defeated!');
        }
    }
    
    isBossDefeated() {
        return this.state.combat.bossDefeated;
    }
    
    // ========================================
    // GAME FLAGS
    // ========================================
    
    pauseGame() {
        this.state.flags.gamePaused = true;
    }
    
    resumeGame() {
        this.state.flags.gamePaused = false;
        
        // Also resume dialogue if it was paused
        if (this.state.dialogue.isPaused) {
            this.state.dialogue.isPaused = false;
        }
    }
    
    isGamePaused() {
        return this.state.flags.gamePaused;
    }
    
    toggleGodMode() {
        this.state.flags.godMode = !this.state.flags.godMode;
        console.log(`🎮 God Mode: ${this.state.flags.godMode ? 'ON' : 'OFF'}`);
        return this.state.flags.godMode;
    }
    
    isGodMode() {
        return this.state.flags.godMode;
    }
    
    toggleDebugMode() {
        this.state.flags.debugMode = !this.state.flags.debugMode;
        console.log(`🎮 Debug Mode: ${this.state.flags.debugMode ? 'ON' : 'OFF'}`);
        return this.state.flags.debugMode;
    }
    
    isDebugMode() {
        return this.state.flags.debugMode;
    }
    
    // ========================================
    // SAVE/LOAD
    // ========================================
    
    saveGame(slotId = 'auto') {
        const saveData = {
            timestamp: Date.now(),
            version: '1.0.0',
            state: this.state
        };
        
        try {
            localStorage.setItem(`legacy_game_save_${slotId}`, JSON.stringify(saveData));
            console.log(`🎮 Game saved to slot: ${slotId}`);
            return true;
        } catch (error) {
            console.error('🎮 Failed to save game:', error);
            return false;
        }
    }
    
    loadGame(slotId = 'auto') {
        try {
            const saveData = localStorage.getItem(`legacy_game_save_${slotId}`);
            if (saveData) {
                const parsed = JSON.parse(saveData);
                this.state = parsed.state;
                console.log(`🎮 Game loaded from slot: ${slotId}`);
                return true;
            }
        } catch (error) {
            console.error('🎮 Failed to load game:', error);
        }
        return false;
    }
    
    deleteSave(slotId = 'auto') {
        try {
            localStorage.removeItem(`legacy_game_save_${slotId}`);
            console.log(`🎮 Save deleted: ${slotId}`);
            return true;
        } catch (error) {
            console.error('🎮 Failed to delete save:', error);
            return false;
        }
    }
    
    hasSave(slotId = 'auto') {
        return localStorage.getItem(`legacy_game_save_${slotId}`) !== null;
    }
    
    // ========================================
    // RESET
    // ========================================
    
    resetToDefaults() {
        this.state = {
            currentLevel: 1,
            currentLevelConfig: null,
            levelsCompleted: [],
            levelStartTime: 0,
            player: {
                characters: {
                    tireek: {
                        health: 100,
                        maxHealth: 100,
                        isActive: true,
                        regenRate: 0.5
                    },
                    tryston: {
                        health: 100,
                        maxHealth: 100,
                        isActive: false,
                        regenRate: 0.5
                    }
                },
                activeCharacter: 'tireek',
                score: 0,
                experience: 0,
                level: 1,
                unlocks: [],
                inventory: []
            },
            dialogue: {
                isActive: false,
                currentDialogue: null,
                queue: [],
                isPaused: false
            },
            transition: {
                isTransitioning: false,
                fromLevel: null,
                toLevel: null,
                phase: null
            },
            combat: {
                enemiesDefeated: 0,
                comboCount: 0,
                bossActive: false,
                bossDefeated: false
            },
            flags: {
                gamePaused: false,
                godMode: false,
                debugMode: false
            }
        };
        
        console.log('🎮 Game state reset to defaults');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStateManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.GameStateManager = GameStateManager;
}

