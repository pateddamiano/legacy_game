// ========================================
// ANIMATION STATE MANAGEMENT SYSTEM
// ========================================
// This file contains the AnimationStateManager class for handling complex animation states,
// combo systems, and attack buffering for player characters

// Animation State Manager
class AnimationStateManager {
    constructor(character) {
        this.character = character;
        this.currentState = 'idle';
        this.isInCombo = false;
        this.comboStep = 0;
        this.comboTimer = 0;
        this.comboTimeout = 500; // ms to reset combo (longer window for easier chaining)
        this.animationLocked = false; // Prevents interruption during certain animations
        this.lockTimer = 0;
        this.queuedAttacks = []; // Buffer for queued attacks (array for multiple)
        this.bufferWindow = 150; // ms before animation ends to allow buffering
        this.maxQueueSize = 2; // Maximum attacks that can be queued (allows up to 3-hit combo)
    }

    update(deltaTime) {
        // Update combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }

        // Update animation lock timer
        if (this.lockTimer > 0) {
            this.lockTimer -= deltaTime;
            
            // Check if we're in the buffer window and have queued attacks
            if (this.queuedAttacks.length > 0 && this.lockTimer <= this.bufferWindow) {
                const nextAttack = this.executeQueuedAttack();
                if (nextAttack) {
                    console.log("Executing buffered attack:", nextAttack);
                    return nextAttack; // Signal to game that we need to execute this attack
                }
            }
            
            if (this.lockTimer <= 0) {
                console.log("Animation lock timer expired, unlocking");
                this.animationLocked = false;
                if (this.currentState === 'attack') {
                    console.log("Resetting attack state to idle after lock timer");
                    this.currentState = 'idle';
                }
            }
        }
    }

    executeQueuedAttack() {
        if (this.queuedAttacks.length > 0) {
            const attackType = this.queuedAttacks.shift(); // Remove first attack from queue
            console.log(`Executing queued attack: ${attackType}, ${this.queuedAttacks.length} remaining in queue`);
            return attackType;
        }
        return null;
    }

    queueAttack() {
        // Only queue if we haven't reached the maximum queue size
        if (this.queuedAttacks.length >= this.maxQueueSize) {
            console.log("Queue full! Cannot queue more attacks");
            return false;
        }

        // Only queue if we're currently attacking
        if (this.currentState === 'attack' || this.currentState === 'airkick') {
            const attackType = this.startCombo();
            this.queuedAttacks.push(attackType);
            console.log(`Queued attack: ${attackType}, queue size: ${this.queuedAttacks.length}/${this.maxQueueSize}`);
            return true;
        }
        return false;
    }

    clearQueue() {
        this.queuedAttacks = [];
        console.log("Attack queue cleared");
    }

    canTransitionTo(newState) {
        // Can't interrupt locked animations
        if (this.animationLocked) return false;
        
        // Special rules for state transitions
        if (newState === 'attack' && this.isInCombo) return true;
        if (this.currentState === 'jump' && newState === 'airkick') return true;
        
        return true;
    }

    setState(newState, lockDuration = 0) {
        if (!this.canTransitionTo(newState)) return false;

        this.currentState = newState;
        if (lockDuration > 0) {
            this.animationLocked = true;
            this.lockTimer = lockDuration;
        }
        return true;
    }

    startCombo() {
        if (!this.isInCombo) {
            this.isInCombo = true;
            this.comboStep = 0;
        }
        
        this.comboStep++;
        this.comboTimer = this.comboTimeout;
        
        // Determine which attack based on combo step
        let attackType;
        switch (this.comboStep) {
            case 1: attackType = 'jab'; break;
            case 2: attackType = 'cross'; break;
            case 3: attackType = 'kick'; this.resetCombo(); break;
            default: attackType = 'jab'; this.resetCombo(); break;
        }
        
        return attackType;
    }

    resetCombo() {
        this.isInCombo = false;
        this.comboStep = 0;
        this.comboTimer = 0;
        this.clearQueue(); // Clear any queued attacks when combo resets
    }
}