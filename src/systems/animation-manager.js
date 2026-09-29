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
        // A punch pressed while a swing is playing: thrown as the next combo step as soon
        // as the swing ends (InputManager.handleAttackInput takes it). Just one - mashing
        // gives jab, cross, kick in order rather than piling up swings.
        this.bufferedAttack = false;
    }

    update(deltaTime) {
        // Update combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }

        // Update animation lock timer. The lock ALWAYS expires when its timer runs out.
        //
        // This used to return early whenever a queued attack was pending near the end of
        // the swing - which also skipped the unlock check below, and could leave the
        // player stuck "attacking" forever. Nothing may skip the unlock.
        if (this.animationLocked || this.lockTimer > 0) {
            this.lockTimer -= deltaTime;
            
            if (this.lockTimer <= 0) {
                this.lockTimer = 0;
                this.animationLocked = false;
                if (this.currentState === 'attack' || this.currentState === 'airkick' || this.currentState === 'special') {
                    this.currentState = 'idle';
                }
            }
        }
    }

    // Remember a punch pressed mid-swing. It does NOT advance the combo here: that used
    // to happen, and the queued swing was then never played - so a tap during a jab
    // silently used up the cross and the next swing jumped to the kick (or reset to
    // another jab), which looked like missing attacks.
    queueAttack() {
        if (this.currentState === 'attack' || this.currentState === 'airkick') {
            this.bufferedAttack = true;
            return true;
        }
        return false;
    }

    // True (once) if a punch was buffered; clears it
    takeBufferedAttack() {
        const buffered = this.bufferedAttack;
        this.bufferedAttack = false;
        return buffered;
    }

    clearQueue() {
        this.bufferedAttack = false;
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