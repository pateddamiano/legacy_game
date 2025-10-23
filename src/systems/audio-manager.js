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
            }
        };
    }
    
    // ========================================
    // BACKGROUND MUSIC METHODS
    // ========================================
    
    playBackgroundMusic(musicKey, fadeIn = true) {
        // Check if the same music is already playing in the global sound manager - if so, don't restart it
        const existingSound = this.scene.sound.sounds.find(sound => sound.key === musicKey && sound.isPlaying);
        if (existingSound) {
            console.log(`🎵 Music '${musicKey}' is already playing globally, continuing...`);
            // Store reference to existing sound
            this.currentBackgroundMusic = existingSound;
            return;
        }
        
        // Check if our local reference is playing
        if (this.currentBackgroundMusic && this.currentBackgroundMusic.isPlaying && this.currentBackgroundMusic.key === musicKey) {
            console.log(`🎵 Music '${musicKey}' is already playing, continuing...`);
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
        
        // Play the new music
        this.currentBackgroundMusic = this.sound.add(musicKey, {
            volume: this.config.backgroundMusic.volume,
            loop: this.config.backgroundMusic.loop
        });
        
        if (fadeIn) {
            // Start at volume 0 and fade in
            this.currentBackgroundMusic.setVolume(0);
            this.currentBackgroundMusic.play();
            
            this.scene.tweens.add({
                targets: this.currentBackgroundMusic,
                volume: this.config.backgroundMusic.volume,
                duration: this.config.backgroundMusic.fadeInDuration,
                ease: 'Linear'
            });
        } else {
            this.currentBackgroundMusic.play();
        }
        
        console.log(`🎵 Playing background music: ${musicKey}`);
    }
    
    stopBackgroundMusic(fadeOut = true) {
        if (!this.currentBackgroundMusic || !this.currentBackgroundMusic.isPlaying) {
            return;
        }
        
        if (fadeOut) {
            // Fade out then stop
            this.scene.tweens.add({
                targets: this.currentBackgroundMusic,
                volume: 0,
                duration: this.config.backgroundMusic.fadeOutDuration,
                ease: 'Linear',
                onComplete: () => {
                    if (this.currentBackgroundMusic) {
                        this.currentBackgroundMusic.stop();
                        this.currentBackgroundMusic.destroy();
                        this.currentBackgroundMusic = null;
                    }
                }
            });
        } else {
            this.currentBackgroundMusic.stop();
            this.currentBackgroundMusic.destroy();
            this.currentBackgroundMusic = null;
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
        this.sound.play(sfxKey, { volume: volume });
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
            individualVolumes: { ...this.config.soundEffects }
        };
    }
    
    // Cleanup method for scene destruction
    destroy() {
        if (this.currentBackgroundMusic) {
            this.currentBackgroundMusic.stop();
            this.currentBackgroundMusic.destroy();
            this.currentBackgroundMusic = null;
        }
        
        // Stop running sound effect
        this.stopPlayerRunning();
        
        // Stop ambiance sound effect
        this.stopAmbiance();
        
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
        this.playSoundEffect('weaponRecordThrow', 0.3);
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