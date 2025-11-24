// ========================================
// AUDIO MANAGER
// ========================================
// Centralized audio management system for music and sound effects
// Handles background music, sound effects, volume control, and muting

class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.sound = scene.sound;
        
        // Initialize configuration
        this.initializeConfig();
        
        // Initialize state
        this.currentBackgroundMusic = null;
        this.musicMuted = false;
        this.sfxMuted = false;
        
        // Looping SFX (like running sound and ambient sounds)
        this.runningSoundEffect = null;
        this.ambianceSoundEffect = null;
        this.subwayPassingSound = null;
        this.textTypingSound = null;

        // Sound effect spam prevention
        this.lastFocusTime = Date.now();
        this.isFocused = true;
        this.sfxMutedByFocusLoss = false; // Track if SFX was muted due to focus loss
        this.sfxMutedStateBeforeBlur = false; // Store original muted state before blur

        // Set up focus/blur event listeners to prevent sound spam when tabbing back
        this.setupFocusHandling();


        console.log('🎵 AudioManager initialized!');
    }
    
    initializeConfig() {
        this.config = {
            // Background music settings
            backgroundMusic: {
                enabled: true,
                volume: 0.3,
                loop: true,
                fadeInDuration: 2000, // 2 seconds fade in
                fadeOutDuration: 1000 // 1 second fade out
            },

            // Sound effects settings
            soundEffects: {
                enabled: true,
                volume: 0.5,
                // Sound effect types with individual volumes
                playerAttack: { volume: 0.4 },
                enemyHit: { volume: 0.3 },
                playerHit: { volume: 0.6 },
                enemySpawn: { volume: 0.2 },
                enemyDeath: { volume: 0.3 },
                playerJump: { volume: 0.3 },
                enemyAttack: { volume: 0.4 },
                combo: { volume: 0.5 },
                powerUp: { volume: 0.7 },
                gameOver: { volume: 0.8 }
            },

            // Sound effect spam prevention
            focusCooldown: 1000 // Cooldown after regaining focus (ms)
        };
    }
    
    // ========================================
    // BACKGROUND MUSIC METHODS
    // ========================================
    
    playBackgroundMusic(musicKey, fadeIn = true, customVolume = null) {
        // Check if the same music is already playing in the global sound manager - if so, don't restart it
        const existingSound = this.scene.sound.sounds.find(sound => sound.key === musicKey && sound.isPlaying);
        if (existingSound) {
            console.log(`🎵 Music '${musicKey}' is already playing globally, continuing...`);
            // Store reference to existing sound
            this.currentBackgroundMusic = existingSound;
            // Update volume if custom volume provided
            if (customVolume !== null) {
                existingSound.setVolume(customVolume);
            }
            return;
        }
        
        // Check if our local reference is playing
        if (this.currentBackgroundMusic && this.currentBackgroundMusic.isPlaying && this.currentBackgroundMusic.key === musicKey) {
            console.log(`🎵 Music '${musicKey}' is already playing, continuing...`);
            // Update volume if custom volume provided
            if (customVolume !== null) {
                this.currentBackgroundMusic.setVolume(customVolume);
            }
            return;
        }
        
        // Stop current music if playing different music
        if (this.currentBackgroundMusic && this.currentBackgroundMusic.isPlaying) {
            this.stopBackgroundMusic(false); // Don't fade out immediately
        }
        
        // Check if music is available and enabled
        if (!this.config.backgroundMusic.enabled || this.musicMuted) {
            console.log(`🎵 Background music disabled or muted: ${musicKey}`);
            return;
        }
        
        // Debug: Check what's in the sound cache
        console.log(`🎵 Attempting to play music: ${musicKey}`);
        console.log('🎵 Sound cache keys:', this.scene.cache.audio.entries.keys);
        console.log('🎵 Scene cache has audio:', this.scene.cache.audio.has(musicKey));
        console.log('🎵 Sound manager exists:', !!this.sound);
        
        // Check if sound exists in cache - try multiple methods
        const soundExists = this.scene.cache.audio.has(musicKey);
        if (!soundExists) {
            console.warn(`🎵 Music not found in cache: ${musicKey}. Available audio keys:`, Object.keys(this.scene.cache.audio.entries.entries));
            return;
        }
        
        // Determine volume: use custom volume if provided, otherwise use default config volume
        const targetVolume = customVolume !== null ? customVolume : this.config.backgroundMusic.volume;
        
        // Play the new music
        this.currentBackgroundMusic = this.sound.add(musicKey, {
            volume: targetVolume,
            loop: this.config.backgroundMusic.loop
        });
        
        if (fadeIn) {
            // Start at volume 0 and fade in
            this.currentBackgroundMusic.setVolume(0);
            this.currentBackgroundMusic.play();
            
            this.scene.tweens.add({
                targets: this.currentBackgroundMusic,
                volume: targetVolume,
                duration: this.config.backgroundMusic.fadeInDuration,
                ease: 'Linear'
            });
        } else {
            this.currentBackgroundMusic.play();
        }
        
        console.log(`🎵 Playing background music: ${musicKey} at volume ${Math.round(targetVolume * 100)}%`);
    }
    
    stopBackgroundMusic(fadeOut = true) {
        if (!this.currentBackgroundMusic) {
            return;
        }
        
        // Check if playing (with null check)
        if (!this.currentBackgroundMusic.isPlaying) {
            // Clean up if not playing
            try {
                this.currentBackgroundMusic.destroy();
            } catch (e) {
                // Ignore errors if already destroyed
            }
            this.currentBackgroundMusic = null;
            return;
        }
        
        // Store reference to avoid null issues during async operations
        const musicToStop = this.currentBackgroundMusic;
        this.currentBackgroundMusic = null; // Clear reference immediately to prevent double-stop
        
        if (fadeOut) {
            // Fade out then stop
            try {
                this.scene.tweens.add({
                    targets: musicToStop,
                    volume: 0,
                    duration: this.config.backgroundMusic.fadeOutDuration,
                    ease: 'Linear',
                    onComplete: () => {
                        try {
                            if (musicToStop && musicToStop.isPlaying) {
                                musicToStop.stop();
                            }
                            musicToStop.destroy();
                        } catch (e) {
                            // Ignore errors if already destroyed
                        }
                    }
                });
            } catch (error) {
                console.warn('🎵 Error fading out music:', error);
                // Fallback to immediate stop
                try {
                    musicToStop.stop();
                    musicToStop.destroy();
                } catch (e) {
                    // Ignore errors
                }
            }
        } else {
            // Immediate stop
            try {
                musicToStop.stop();
                musicToStop.destroy();
            } catch (error) {
                console.warn('🎵 Error stopping music:', error);
            }
        }
        
        console.log('🎵 Background music stopped');
    }
    
    pauseBackgroundMusic() {
        if (this.currentBackgroundMusic && this.currentBackgroundMusic.isPlaying) {
            this.currentBackgroundMusic.pause();
            console.log('⏸️ Background music paused');
        }
    }
    
    resumeBackgroundMusic() {
        if (this.currentBackgroundMusic && this.currentBackgroundMusic.isPaused) {
            this.currentBackgroundMusic.resume();
            console.log('▶️ Background music resumed');
        }
    }
    
    // ========================================
    // SOUND EFFECTS METHODS
    // ========================================
    
    playSoundEffect(sfxKey, customVolume = null) {
        // Check if SFX is enabled
        if (!this.config.soundEffects.enabled || this.sfxMuted) {
            return;
        }

        // Check focus cooldown to prevent sound spam when tabbing back
        if (this.focusCooldownEnd && Date.now() < this.focusCooldownEnd) {
            // Still in cooldown period, discard the sound
            console.log(`🎵 Discarded ${sfxKey} (focus cooldown active)`);
            return;
        }

        // Check if sound exists in cache
        if (!this.scene.cache.audio.has(sfxKey)) {
            console.warn(`🔊 Sound effect not found in cache: ${sfxKey}. Make sure to load it in preload().`);
            return;
        }

        // Determine volume (custom or from config)
        let volume = customVolume || this.config.soundEffects.volume;

        // Check for specific SFX volume settings
        if (this.config.soundEffects[sfxKey]) {
            volume = this.config.soundEffects[sfxKey].volume;
        }

        // Play the sound effect
        this.sound.play(sfxKey, {
            volume: volume
        });

        console.log(`🎵 Playing ${sfxKey}`);
    }

    
    playRandomSoundEffect(sfxArray, customVolume = null) {
        if (!sfxArray || sfxArray.length === 0) return;

        const randomSfx = sfxArray[Math.floor(Math.random() * sfxArray.length)];
        this.playSoundEffect(randomSfx, customVolume);
    }
    
    // ========================================
    // CONTROL METHODS
    // ========================================
    
    toggleBackgroundMusic() {
        this.musicMuted = !this.musicMuted;
        
        if (this.musicMuted) {
            this.stopBackgroundMusic(true);
            console.log('🔇 Background music muted');
        } else {
            console.log('🔊 Background music unmuted (call playBackgroundMusic to start)');
        }
        
        return this.musicMuted;
    }
    
    toggleSoundEffects() {
        this.sfxMuted = !this.sfxMuted;
        console.log(`🔊 Sound effects ${this.sfxMuted ? 'muted' : 'unmuted'}`);
        return this.sfxMuted;
    }
    
    // ========================================
    // VOLUME CONTROL METHODS
    // ========================================
    
    setMusicVolume(volume) {
        this.config.backgroundMusic.volume = Phaser.Math.Clamp(volume, 0, 1);
        
        if (this.currentBackgroundMusic && this.currentBackgroundMusic.isPlaying) {
            this.currentBackgroundMusic.setVolume(this.config.backgroundMusic.volume);
        }
        
        console.log(`🎵 Music volume set to: ${Math.round(volume * 100)}%`);
    }
    
    setSFXVolume(volume) {
        this.config.soundEffects.volume = Phaser.Math.Clamp(volume, 0, 1);
        console.log(`🔊 SFX volume set to: ${Math.round(volume * 100)}%`);
    }
    
    setIndividualSFXVolume(sfxKey, volume) {
        if (this.config.soundEffects[sfxKey]) {
            this.config.soundEffects[sfxKey].volume = Phaser.Math.Clamp(volume, 0, 1);
            console.log(`🔊 ${sfxKey} volume set to: ${Math.round(volume * 100)}%`);
        }
    }
    
    // ========================================
    // FOCUS MANAGEMENT (prevents sound spam when tabbing back)
    // ========================================

    setupFocusHandling() {
        // Handle visibility change (tab switching, minimizing window, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleBlur();
            } else {
                this.handleFocus();
            }
        });

        // Handle window focus/blur events
        window.addEventListener('blur', () => this.handleBlur());
        window.addEventListener('focus', () => this.handleFocus());


        console.log('🎵 Focus handling initialized');
    }

    handleBlur() {
        this.isFocused = false;
        this.lastFocusTime = Date.now();
        
        // Mute sound effects when game loses focus to prevent audio pop when returning
        if (!this.sfxMuted) {
            // Only mute if not already muted by user
            this.sfxMutedStateBeforeBlur = false; // Store that it wasn't muted
            this.sfxMuted = true;
            this.sfxMutedByFocusLoss = true;
            
            // Pause looping sound effects to prevent them from continuing
            if (this.runningSoundEffect && this.runningSoundEffect.isPlaying) {
                this.runningSoundEffect.pause();
            }
            if (this.ambianceSoundEffect && this.ambianceSoundEffect.isPlaying) {
                this.ambianceSoundEffect.pause();
            }
            if (this.subwayPassingSound && this.subwayPassingSound.isPlaying) {
                this.subwayPassingSound.pause();
            }
            if (this.textTypingSound && this.textTypingSound.isPlaying) {
                this.textTypingSound.pause();
            }
            
            console.log('🎵 Game lost focus - muting sound effects');
        } else {
            // Already muted, just track that we didn't mute it
            this.sfxMutedStateBeforeBlur = true;
            this.sfxMutedByFocusLoss = false;
        }
    }

    handleFocus() {
        const now = Date.now();
        const timeAway = now - this.lastFocusTime;

        this.isFocused = true;
        this.lastFocusTime = now;

        // Restore sound effects if we muted them due to focus loss
        if (this.sfxMutedByFocusLoss) {
            this.sfxMuted = this.sfxMutedStateBeforeBlur;
            this.sfxMutedByFocusLoss = false;
            
            // Resume looping sound effects if they were paused
            if (this.runningSoundEffect && this.runningSoundEffect.isPaused) {
                this.runningSoundEffect.resume();
            }
            if (this.ambianceSoundEffect && this.ambianceSoundEffect.isPaused) {
                this.ambianceSoundEffect.resume();
            }
            if (this.subwayPassingSound && this.subwayPassingSound.isPaused) {
                this.subwayPassingSound.resume();
            }
            if (this.textTypingSound && this.textTypingSound.isPaused) {
                this.textTypingSound.resume();
            }
            
            console.log('🎵 Game regained focus - unmuting sound effects');
        }

        // If we were away for more than the focus cooldown, apply cooldown
        if (timeAway > this.config.focusCooldown) {
            // Add a brief cooldown to prevent immediate sound spam
            this.focusCooldownEnd = now + this.config.focusCooldown;
            console.log(`🎵 Game regained focus after ${Math.round(timeAway/1000)}s - applying cooldown`);
        } else {
            console.log('🎵 Game regained focus');
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    getMusicStatus() {
        return {
            isPlaying: this.currentBackgroundMusic && this.currentBackgroundMusic.isPlaying,
            isMuted: this.musicMuted,
            volume: this.config.backgroundMusic.volume,
            currentTrack: this.currentBackgroundMusic ? this.currentBackgroundMusic.key : null
        };
    }
    
    getSFXStatus() {
        return {
            isMuted: this.sfxMuted,
            volume: this.config.soundEffects.volume,
            individualVolumes: { ...this.config.soundEffects },
            isFocused: this.isFocused
        };
    }
    
    // Cleanup method for scene destruction
    destroy() {
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleBlur);
        document.removeEventListener('visibilitychange', this.handleFocus);
        window.removeEventListener('blur', this.handleBlur);
        window.removeEventListener('focus', this.handleFocus);

        if (this.currentBackgroundMusic) {
            this.currentBackgroundMusic.stop();
            this.currentBackgroundMusic.destroy();
            this.currentBackgroundMusic = null;
        }

        // Stop running sound effect
        this.stopPlayerRunning();

        // Stop ambiance sound effect
        this.stopAmbiance();

        // Stop subway passing sound
        this.stopSubwayPassing();

        // Stop text typing sound
        this.stopTextTyping();

        console.log('🗑️ AudioManager destroyed');
    }
    
    // ========================================
    // PRESET AUDIO ACTIONS
    // ========================================
    
    // Convenient methods for common game events
    
    // Player Attack Sounds
    playPlayerPunch() {
        // Randomly pick between two punch sounds
        this.playRandomSoundEffect(['mainPunch', 'mainPunch2'], 0.25);
    }
    
    playPlayerKick() {
        this.playSoundEffect('mainKick', 0.25);
    }
    
    playPlayerAttack() {
        // Generic attack - use punch sound
        this.playPlayerPunch();
    }
    
    // Player Damage Sounds
    playPlayerDamage() {
        // Randomly pick from 4 damage sounds (reduced volume - was too loud)
        this.playRandomSoundEffect(['mainDamage1', 'mainDamage2', 'mainDamage3', 'mainDamage4'], 0.2);
    }
    
    playPlayerHit() {
        // Alias for damage
        this.playPlayerDamage();
    }
    
    // Player Jump Sound
    playPlayerJump() {
        this.playSoundEffect('mainJump', 0.2);
    }
    
    // Player Running Sound (looping)
    startPlayerRunning() {
        // Don't start if already running or if SFX is muted
        if (this.runningSoundEffect || this.sfxMuted || !this.config.soundEffects.enabled) {
            return;
        }
        
        // Check if sound exists in cache
        if (!this.scene.cache.audio.has('playerRunning')) {
            return;
        }
        
        // Create and play looping running sound
        this.runningSoundEffect = this.sound.add('playerRunning', {
            volume: 0.15,
            loop: true
        });
        this.runningSoundEffect.play();
    }
    
    stopPlayerRunning() {
        if (this.runningSoundEffect) {
            this.runningSoundEffect.stop();
            this.runningSoundEffect.destroy();
            this.runningSoundEffect = null;
        }
    }
    
    // Ambient Sound (looping background ambiance)
    startAmbiance(ambianceKey, volume = 0.2) {
        // Stop any existing ambiance
        this.stopAmbiance();
        
        // Don't start if SFX is muted
        if (this.sfxMuted || !this.config.soundEffects.enabled) {
            return;
        }
        
        // Check if sound exists in cache
        if (!this.scene.cache.audio.has(ambianceKey)) {
            console.warn(`🔊 Ambiance sound not found: ${ambianceKey}`);
            return;
        }
        
        // Create and play looping ambiance sound
        this.ambianceSoundEffect = this.sound.add(ambianceKey, {
            volume: volume,
            loop: true
        });
        this.ambianceSoundEffect.play();
        console.log(`🔊 Started ambiance: ${ambianceKey}`);
    }
    
    stopAmbiance() {
        if (this.ambianceSoundEffect) {
            this.ambianceSoundEffect.stop();
            this.ambianceSoundEffect.destroy();
            this.ambianceSoundEffect = null;
            console.log('🔊 Stopped ambiance');
        }
    }
    
    // Subway Passing Sound (looping while subway cars are visible)
    // Volume should be passed from level config, not hardcoded
    startSubwayPassing(targetVolume) {
        if (targetVolume === undefined || targetVolume === null) {
            console.warn('🔊 startSubwayPassing called without volume - should be set from level config');
            targetVolume = 0.1; // Safe fallback
        }
        // Don't start if already playing
        if (this.subwayPassingSound && this.subwayPassingSound.isPlaying) {
            return;
        }
        
        // Don't start if SFX is muted
        if (this.sfxMuted || !this.config.soundEffects.enabled) {
            return;
        }
        
        // Check if sound exists in cache
        if (!this.scene.cache.audio.has('subwayPassing')) {
            console.warn('🔊 Subway passing sound not found: subwayPassing');
            return;
        }
        
        // Store target volume for fade operations
        this.subwayPassingTargetVolume = targetVolume;
        
        // Create and play looping subway passing sound at volume 0 (will fade in)
        this.subwayPassingSound = this.sound.add('subwayPassing', {
            volume: 0, // Start at 0, will fade in
            loop: true
        });
        this.subwayPassingSound.play();
        console.log('🔊 Started subway passing sound (will fade in)');
    }
    
    fadeInSubwayPassing(duration = 1000) {
        if (!this.subwayPassingSound || !this.subwayPassingSound.isPlaying) {
            return;
        }
        
        // Use stored target volume (set from level config)
        const targetVolume = this.subwayPassingTargetVolume;
        if (targetVolume === undefined || targetVolume === null) {
            console.warn('🔊 fadeInSubwayPassing: No target volume set');
            return;
        }
        this.scene.tweens.add({
            targets: this.subwayPassingSound,
            volume: targetVolume,
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                console.log('🔊 Subway passing sound faded in');
            }
        });
    }
    
    fadeOutSubwayPassing(duration = 1000, stopAfterFade = true) {
        if (!this.subwayPassingSound || !this.subwayPassingSound.isPlaying) {
            return;
        }
        
        const soundToFade = this.subwayPassingSound;
        this.scene.tweens.add({
            targets: soundToFade,
            volume: 0,
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                console.log('🔊 Subway passing sound faded out');
                if (stopAfterFade) {
                    this.stopSubwayPassing();
                }
            }
        });
    }
    
    stopSubwayPassing() {
        if (this.subwayPassingSound) {
            // Stop any active fade tweens
            if (this.subwayPassingSound._fadeTween) {
                this.scene.tweens.killTweensOf(this.subwayPassingSound);
            }
            this.subwayPassingSound.stop();
            this.subwayPassingSound.destroy();
            this.subwayPassingSound = null;
            this.subwayPassingTargetVolume = null;
            console.log('🔊 Stopped subway passing sound');
        }
    }
    
    setSubwayPassingVolume(volume) {
        if (this.subwayPassingSound && this.subwayPassingSound.isPlaying) {
            const clampedVolume = Phaser.Math.Clamp(volume, 0, 1);
            this.subwayPassingSound.setVolume(clampedVolume);
            console.log(`🔊 Subway passing volume set to: ${Math.round(clampedVolume * 100)}%`);
        }
    }
    
    // Enemy Attack Sounds (type-specific)
    playEnemyAttack(enemyType) {
        let soundKey = null;
        
        // Map enemy type to sound
        switch(enemyType) {
            case 'crackhead':
                soundKey = 'enemyCrackheadAttack';
                break;
            case 'green_thug':
                soundKey = 'enemyGreenThugAttack';
                break;
            case 'black_thug':
                soundKey = 'enemyBlackThugAttack';
                break;
            case 'critic':
                // Boss critic uses black thug attack sound (similar punch attack)
                soundKey = 'enemyBlackThugAttack';
                break;
            default:
                console.warn(`🔊 Unknown enemy type: ${enemyType}, using crackhead sound`);
                soundKey = 'enemyCrackheadAttack';
        }
        
        this.playSoundEffect(soundKey, 0.25);
    }
    
    // Enemy Death Sounds
    playEnemyDeath() {
        // Randomly pick from 3 death sounds
        this.playRandomSoundEffect(['enemyDeath1', 'enemyDeath2', 'enemyDeath3'], 0.2);
    }
    
    playEnemyHit() {
        // Could add enemy hit sounds later, for now silent
    }
    
    playEnemySpawn() {
        // Could add enemy spawn sounds later, for now silent
    }
    
    // Weapon Sounds
    playWeaponThrow() {
        this.playSoundEffect('weaponRecordThrow', 0.3);
    }
    
    playWeaponHit() {
        // Play when weapon hits enemy
        this.playSoundEffect('weaponRecordHit', 0.4);
    }
    
    playRatingWeaponHit() {
        // Play when critic's rating weapon hits player
        this.playSoundEffect('ratingWeaponHit', 0.4);
    }
    
    // Item Pickup Sounds
    playHealthPickup() {
        this.playSoundEffect('healthPickup', 0.4);
    }
    
    playMicrophonePickup() {
        this.playSoundEffect('microphonePickup', 0.4);
    }
    
    // Other game events
    playComboSound() {
        this.playSoundEffect('combo');
    }
    
    playGameOverSound() {
        this.playSoundEffect('gameOver');
    }
    
    playGameOverMusic() {
        // Stop current background music
        if (this.currentBackgroundMusic && this.currentBackgroundMusic.isPlaying) {
            this.currentBackgroundMusic.stop();
        }
        
        // Play game over music
        if (this.scene.cache.audio.has('gameoverMusic')) {
            const music = this.sound.play('gameoverMusic', {
                volume: this.config.soundEffects.gameOver?.volume || this.config.soundEffects.volume
            });
            console.log('🎵 Playing game over music');
            return music; // Return sound object so we can listen for completion
        } else {
            console.warn('🔊 Game over music not found in cache');
            return null;
        }
    }
    
    playGameOverVoice() {
        if (this.scene.cache.audio.has('gameoverVoice')) {
            this.playSoundEffect('gameoverVoice', this.config.soundEffects.gameOver?.volume || this.config.soundEffects.volume);
            console.log('🎵 Playing game over voice');
        } else {
            console.warn('🔊 Game over voice not found in cache');
        }
    }
    
    playTryAgainSound() {
        if (this.scene.cache.audio.has('tryAgain')) {
            this.playSoundEffect('tryAgain', this.config.soundEffects.gameOver?.volume || this.config.soundEffects.volume);
            console.log('🎵 Playing try again sound');
        } else {
            console.warn('🔊 Try again sound not found in cache');
        }
    }
    
    playTryAgainStartSound() {
        if (this.scene.cache.audio.has('tryAgainStart')) {
            this.playSoundEffect('tryAgainStart', this.config.soundEffects.gameOver?.volume || this.config.soundEffects.volume);
            console.log('🎵 Playing try again start sound');
        } else {
            console.warn('🔊 Try again start sound not found in cache');
        }
    }
    
    // Dialogue typing sound (looping during typing)
    startTextTyping() {
        // Don't start if already playing
        if (this.textTypingSound && this.textTypingSound.isPlaying) {
            return;
        }
        
        // Don't start if SFX is muted
        if (this.sfxMuted || !this.config.soundEffects.enabled) {
            return;
        }
        
        // Check if sound exists in cache
        if (!this.scene.cache.audio.has('textTyping')) {
            console.warn('🔊 Text typing sound not found: textTyping');
            return;
        }
        
        // Create and play looping typing sound
        this.textTypingSound = this.sound.add('textTyping', {
            volume: 0.075,
            loop: true
        });
        this.textTypingSound.play();
        console.log('🔊 Started text typing sound');
    }
    
    stopTextTyping() {
        if (this.textTypingSound) {
            this.textTypingSound.stop();
            this.textTypingSound.destroy();
            this.textTypingSound = null;
            console.log('🔊 Stopped text typing sound');
        }
    }
    
    // ========================================
    // ADVANCED FEATURES (Future Expansion)
    // ========================================
    
    // Crossfade between two music tracks
    crossfadeMusic(newMusicKey, duration = 2000) {
        if (this.currentBackgroundMusic && this.currentBackgroundMusic.isPlaying) {
            // Fade out current music
            this.scene.tweens.add({
                targets: this.currentBackgroundMusic,
                volume: 0,
                duration: duration / 2,
                ease: 'Linear',
                onComplete: () => {
                    this.stopBackgroundMusic(false);
                    this.playBackgroundMusic(newMusicKey, true);
                }
            });
        } else {
            this.playBackgroundMusic(newMusicKey, true);
        }
    }
    
    // Change music with customizable fade out/in durations and volume
    changeMusic(musicKey, options = {}) {
        if (!musicKey) {
            console.warn('🎵 changeMusic: musicKey is required');
            return;
        }
        
        // Extract options with defaults
        const fadeOutDuration = options.fadeOutDuration !== undefined 
            ? options.fadeOutDuration 
            : this.config.backgroundMusic.fadeOutDuration;
        const fadeInDuration = options.fadeInDuration !== undefined 
            ? options.fadeInDuration 
            : this.config.backgroundMusic.fadeInDuration;
        const volume = options.volume !== undefined 
            ? options.volume 
            : null; // null means use default config volume
        
        // Check if music is available and enabled
        if (!this.config.backgroundMusic.enabled || this.musicMuted) {
            console.log(`🎵 Background music disabled or muted: ${musicKey}`);
            return;
        }
        
        // Check if sound exists in cache
        if (!this.scene.cache.audio.has(musicKey)) {
            console.warn(`🎵 Music not found in cache: ${musicKey}`);
            return;
        }
        
        // If there's current music playing, fade it out first
        if (this.currentBackgroundMusic && this.currentBackgroundMusic.isPlaying) {
            const musicToStop = this.currentBackgroundMusic;
            this.currentBackgroundMusic = null; // Clear reference immediately
            
            // Fade out current music
            this.scene.tweens.add({
                targets: musicToStop,
                volume: 0,
                duration: fadeOutDuration,
                ease: 'Linear',
                onComplete: () => {
                    try {
                        if (musicToStop && musicToStop.isPlaying) {
                            musicToStop.stop();
                        }
                        musicToStop.destroy();
                    } catch (e) {
                        // Ignore errors if already destroyed
                    }
                    // After fade out completes, start new music
                    this.playNewMusic(musicKey, fadeInDuration, volume);
                }
            });
        } else {
            // No current music, just play new music
            this.playNewMusic(musicKey, fadeInDuration, volume);
        }
        
        console.log(`🎵 Changing music to: ${musicKey} (fade out: ${fadeOutDuration}ms, fade in: ${fadeInDuration}ms)`);
    }
    
    // Helper method to play new music with fade in
    playNewMusic(musicKey, fadeInDuration, customVolume) {
        // Determine volume: use custom volume if provided, otherwise use default config volume
        const targetVolume = customVolume !== null ? customVolume : this.config.backgroundMusic.volume;
        
        // Play the new music
        this.currentBackgroundMusic = this.sound.add(musicKey, {
            volume: 0, // Start at 0 for fade in
            loop: this.config.backgroundMusic.loop
        });
        
        this.currentBackgroundMusic.play();
        
        // Fade in
        this.scene.tweens.add({
            targets: this.currentBackgroundMusic,
            volume: targetVolume,
            duration: fadeInDuration,
            ease: 'Linear',
            onComplete: () => {
                console.log(`🎵 Music ${musicKey} faded in to volume ${Math.round(targetVolume * 100)}%`);
            }
        });
    }
    
    // Set music mood (could be used for dynamic music changes)
    setMusicMood(mood) {
        const musicTracks = {
            calm: 'backgroundMusic',
            combat: 'combatMusic',
            boss: 'bossMusic',
            victory: 'victoryMusic'
        };
        
        if (musicTracks[mood]) {
            this.crossfadeMusic(musicTracks[mood]);
        }
    }
}

// Make AudioManager available globally
window.AudioManager = AudioManager;