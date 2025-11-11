// ========================================
// ANIMATION SETUP MANAGER
// ========================================
// Handles character animation creation and event setup

class AnimationSetupManager {
    constructor(scene) {
        this.scene = scene;
        console.log('🎬 AnimationSetupManager initialized');
    }
    
    // ========================================
    // ANIMATION CREATION
    // ========================================
    
    createCharacterAnimations(characterConfig) {
        const charName = characterConfig.name;
        
        console.log(`Creating animations for ${charName}:`, characterConfig.animations);
        
        // Create all animations based on character config
        Object.entries(characterConfig.animations).forEach(([animName, config]) => {
            const spriteKey = `${charName}_${animName}`;
            const frameConfig = this.scene.anims.generateFrameNumbers(spriteKey, { 
                start: 0, 
                end: config.frames - 1 
            });

            console.log(`Creating animation ${spriteKey} with ${config.frames} frames at ${config.frameRate} FPS`);
            
            try {
                this.scene.anims.create({
                    key: `${charName}_${animName}`,
                    frames: frameConfig,
                    frameRate: config.frameRate,
                    repeat: config.repeat
                });
                console.log(`Successfully created animation: ${spriteKey}`);
            } catch (error) {
                console.error(`Failed to create animation ${spriteKey}:`, error);
            }
        });
        
        console.log(`Finished creating animations for ${charName}`);
    }
    
    // ========================================
    // ANIMATION EVENT SETUP
    // ========================================
    
    setupAnimationEvents(characterConfig, player, animationManager, isJumping) {
        // Remove any existing animation listeners to prevent conflicts
        player.removeAllListeners('animationcomplete');
        
        const charName = characterConfig.name;
        
        // Listen for animation complete events for current character
        player.on('animationcomplete', (animation, frame) => {
            const animKey = animation.key;
            
            // Check if it's an attack animation that just finished for current character
            if (animKey === `${charName}_jab` || 
                animKey === `${charName}_cross` || 
                animKey === `${charName}_kick` ||
                animKey === `${charName}_airkick`) {
                
                // Force reset animation state and return to idle
                animationManager.currentState = 'idle';
                animationManager.animationLocked = false;
                animationManager.lockTimer = 0;
                
                // Play idle animation (only if not jumping - airkick can complete while still in air)
                if (!isJumping) {
                    player.anims.play(`${charName}_idle`, true);
                }
                
                console.log(`Attack animation ${animKey} completed, returning to idle`);
            }
        });
    }
}

