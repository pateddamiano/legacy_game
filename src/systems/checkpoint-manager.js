// ========================================
// CHECKPOINT MANAGER
// ========================================
// Handles automatic checkpoint generation and tracking based on level progress
// Supports percentage-based checkpoints and special event-based checkpoints

class CheckpointManager {
    constructor(scene) {
        this.scene = scene;
        
        // Checkpoint data
        this.checkpoints = []; // Array of { x, y, percentage, isEventCheckpoint, eventId }
        this.lastCheckpointIndex = 0; // Index of last checkpoint reached
        this.eventCheckpoints = new Map(); // Map of eventId -> checkpoint index
        
        // Level data
        this.worldBounds = null;
        this.levelSpawnY = 512; // Default spawn Y, will be updated from level config
        
        // Transition flag
        this.isTransitioning = false;
        
        console.log('📍 CheckpointManager initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    initialize(levelConfig, worldBounds) {
        if (!worldBounds) {
            console.warn('⚠️ CheckpointManager: No world bounds provided');
            return;
        }
        
        this.worldBounds = worldBounds;
        
        // Get spawn Y from level config or use default
        if (levelConfig && levelConfig.spawn) {
            this.levelSpawnY = levelConfig.spawn.y || 512;
        }
        
        // Generate automatic checkpoints at 0%, 25%, 50%, 75%, 100%
        this.generateCheckpoints(worldBounds);
        
        // Reset last checkpoint to start
        this.lastCheckpointIndex = 0;
        
        // Reset transition flag
        this.isTransitioning = false;
        
        console.log(`📍 CheckpointManager initialized with ${this.checkpoints.length} checkpoints`);
    }
    
    generateCheckpoints(worldBounds) {
        this.checkpoints = [];
        const worldStart = worldBounds.x || 0;
        const worldWidth = worldBounds.width || 3600;
        const worldEnd = worldStart + worldWidth;
        
        // Generate checkpoints at 0%, 25%, 50%, 75%, 100%
        const percentages = [0, 0.25, 0.5, 0.75, 1.0];
        
        percentages.forEach((percentage, index) => {
            const checkpointX = worldStart + (worldWidth * percentage);
            const checkpoint = {
                x: checkpointX,
                y: this.levelSpawnY,
                percentage: percentage,
                index: index,
                isEventCheckpoint: false,
                eventId: null
            };
            this.checkpoints.push(checkpoint);
        });
        
        console.log(`📍 Generated ${this.checkpoints.length} checkpoints:`, 
            this.checkpoints.map(cp => `${(cp.percentage * 100).toFixed(0)}%`).join(', '));
    }
    
    // ========================================
    // PROGRESS TRACKING
    // ========================================
    
    checkProgress(playerX, worldBounds) {
        // Skip checkpoint checking during level transitions
        if (this.isTransitioning) {
            return this.lastCheckpointIndex;
        }
        
        if (!worldBounds || this.checkpoints.length === 0) return;
        
        const worldStart = worldBounds.x || 0;
        const worldWidth = worldBounds.width || 3600;
        const currentProgress = (playerX - worldStart) / worldWidth;
        
        // Find the highest checkpoint the player has passed
        for (let i = this.checkpoints.length - 1; i >= 0; i--) {
            const checkpoint = this.checkpoints[i];
            if (currentProgress >= checkpoint.percentage && i > this.lastCheckpointIndex) {
                this.lastCheckpointIndex = i;
                console.log(`📍 Checkpoint reached: ${(checkpoint.percentage * 100).toFixed(0)}% (index ${i})`);
                return i;
            }
        }
        
        return this.lastCheckpointIndex;
    }
    
    // ========================================
    // CHECKPOINT ACCESS
    // ========================================
    
    getLastCheckpoint() {
        if (this.checkpoints.length === 0) {
            console.warn('⚠️ No checkpoints available');
            return null;
        }
        
        const checkpoint = this.checkpoints[this.lastCheckpointIndex];
        return {
            x: checkpoint.x,
            y: checkpoint.y
        };
    }
    
    getCheckpointByIndex(index) {
        if (index < 0 || index >= this.checkpoints.length) {
            console.warn(`⚠️ Invalid checkpoint index: ${index}`);
            return null;
        }
        
        const checkpoint = this.checkpoints[index];
        return {
            x: checkpoint.x,
            y: checkpoint.y,
            index: index
        };
    }
    
    // ========================================
    // EVENT CHECKPOINTS
    // ========================================
    
    setEventCheckpoint(eventId, position) {
        // Find or create a checkpoint at the event position
        if (!this.worldBounds) {
            console.warn('⚠️ Cannot set event checkpoint: world bounds not initialized');
            return;
        }
        
        const worldStart = this.worldBounds.x || 0;
        const worldWidth = this.worldBounds.width || 3600;
        const percentage = (position.x - worldStart) / worldWidth;
        
        // Check if there's already a checkpoint near this position (within 5%)
        let checkpointIndex = -1;
        for (let i = 0; i < this.checkpoints.length; i++) {
            const cp = this.checkpoints[i];
            if (Math.abs(cp.percentage - percentage) < 0.05) {
                // Update existing checkpoint
                checkpointIndex = i;
                this.checkpoints[i].x = position.x;
                this.checkpoints[i].y = position.y || this.levelSpawnY;
                this.checkpoints[i].isEventCheckpoint = true;
                this.checkpoints[i].eventId = eventId;
                break;
            }
        }
        
        // If no nearby checkpoint, insert a new one
        if (checkpointIndex === -1) {
            const newCheckpoint = {
                x: position.x,
                y: position.y || this.levelSpawnY,
                percentage: percentage,
                index: this.checkpoints.length,
                isEventCheckpoint: true,
                eventId: eventId
            };
            this.checkpoints.push(newCheckpoint);
            // Sort checkpoints by percentage
            this.checkpoints.sort((a, b) => a.percentage - b.percentage);
            // Re-index
            this.checkpoints.forEach((cp, idx) => {
                cp.index = idx;
            });
            checkpointIndex = newCheckpoint.index;
        }
        
        // Store event checkpoint mapping
        this.eventCheckpoints.set(eventId, checkpointIndex);
        
        // Update last checkpoint if this is ahead of current progress
        const currentProgress = (position.x - worldStart) / worldWidth;
        if (currentProgress > this.checkpoints[this.lastCheckpointIndex].percentage) {
            this.lastCheckpointIndex = checkpointIndex;
        }
        
        console.log(`📍 Event checkpoint set for ${eventId} at ${(percentage * 100).toFixed(1)}% (index ${checkpointIndex})`);
    }
    
    // ========================================
    // UTILITY
    // ========================================
    
    getCheckpointCount() {
        return this.checkpoints.length;
    }
    
    reset() {
        this.lastCheckpointIndex = 0;
        this.eventCheckpoints.clear();
    }
}

// Make available globally
window.CheckpointManager = CheckpointManager;

