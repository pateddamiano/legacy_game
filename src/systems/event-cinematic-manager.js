// ========================================
// EVENT CINEMATIC MANAGER
// ========================================
// Handles cinematic darkening effects for events

class EventCinematicManager {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
        this.cinematicDarkeningEnabled = eventManager.cinematicDarkeningEnabled !== undefined ? eventManager.cinematicDarkeningEnabled : false; // Default to false
        this.darkeningMonitorTimer = null;
    }
    
    // Access darkenedSprites through eventManager to ensure same reference
    get darkenedSprites() {
        return this.eventManager.darkenedSprites;
    }
    
    set darkenedSprites(value) {
        this.eventManager.darkenedSprites = value;
    }
    
    // Access speakingExtra through eventManager
    get speakingExtra() {
        return this.eventManager.speakingExtra;
    }
    
    set speakingExtra(value) {
        this.eventManager.speakingExtra = value;
    }
    
    applyCinematicDarkening(speakerName) {
        // Check if darkening is disabled
        if (!this.cinematicDarkeningEnabled) {
            console.log(`[CINEMA-DARKEN] Cinematic darkening is DISABLED - skipping darkening effect`);
            return;
        }
        
        console.log(`🎬 Applying cinematic darkening for event (speaker: ${speakerName || 'none'})`);
        console.log(`[CINEMA-DARKEN] ========== START applyCinematicDarkening ==========`);
        console.log(`[CINEMA-DARKEN] Speaker: ${speakerName || 'none'}`);
        
        // STEP 1: FIRST, ensure player and ALL extras are bright BEFORE any darkening
        // This must happen first to prevent them from being darkened
        if (this.scene.player) {
            const playerBefore = {
                alpha: this.scene.player.alpha,
                tint: this.scene.player.tint,
                darkened: this.scene.player._cinematicDarkened,
                depth: this.scene.player.depth
            };
            console.log(`[CINEMA-DARKEN] STEP1: Player BEFORE - alpha=${playerBefore.alpha}, tint=${playerBefore.tint.toString(16)}, darkened=${playerBefore.darkened}, depth=${playerBefore.depth}`);
            
            // Ensure player is not darkened and is bright
            this.scene.player.clearTint();
            this.scene.player.setAlpha(1.0);
            this.scene.player._cinematicDarkened = false;
            // Set player depth ABOVE the dialogue overlay (which is at depth 10000) so it renders on top
            // Store original depth if not already stored
            if (this.scene.player.originalDepth === undefined) {
                this.scene.player.originalDepth = this.scene.player.depth;
            }
            this.scene.player.setDepth(10001); // Above dialogue overlay
            // Restore original values if they were stored
            if (this.scene.player.originalAlpha !== undefined) {
                this.scene.player.originalAlpha = undefined;
            }
            if (this.scene.player.originalTint !== undefined) {
                this.scene.player.originalTint = undefined;
            }
            
            const playerAfter = {
                alpha: this.scene.player.alpha,
                tint: this.scene.player.tint,
                darkened: this.scene.player._cinematicDarkened,
                depth: this.scene.player.depth
            };
            console.log(`[CINEMA-DARKEN] STEP1: Player AFTER - alpha=${playerAfter.alpha}, tint=${playerAfter.tint.toString(16)}, darkened=${playerAfter.darkened}, depth=${playerAfter.depth}`);
        } else {
            console.log(`[CINEMA-DARKEN] STEP1: Player is NULL - cannot brighten`);
        }
        
        // Keep ALL extras at full brightness (they're story characters)
        if (this.scene.extrasManager) {
            const extras = this.scene.extrasManager.extras || [];
            console.log(`[CINEMA-DARKEN] STEP1: Found ${extras.length} extras to brighten`);
            extras.forEach((extra, index) => {
                if (extra && extra.sprite) {
                    const extraBefore = {
                        alpha: extra.sprite.alpha,
                        tint: extra.sprite.tint,
                        darkened: extra.sprite._cinematicDarkened,
                        name: extra.name || 'unnamed',
                        depth: extra.sprite.depth
                    };
                    console.log(`[CINEMA-DARKEN] STEP1: Extra[${index}] "${extraBefore.name}" BEFORE - alpha=${extraBefore.alpha}, tint=${extraBefore.tint.toString(16)}, darkened=${extraBefore.darkened}, depth=${extraBefore.depth}`);
                    
                    // Ensure extra is not darkened and is bright
                    extra.sprite.clearTint();
                    extra.sprite.setAlpha(1.0);
                    extra.sprite._cinematicDarkened = false;
                    // Set extra depth ABOVE the dialogue overlay (which is at depth 10000) so it renders on top
                    // Store original depth if not already stored
                    if (extra.sprite.originalDepth === undefined) {
                        extra.sprite.originalDepth = extra.sprite.depth;
                    }
                    extra.sprite.setDepth(10001); // Above dialogue overlay
                    // Restore original values if they were stored
                    if (extra.sprite.originalAlpha !== undefined) {
                        extra.sprite.originalAlpha = undefined;
                    }
                    if (extra.sprite.originalTint !== undefined) {
                        extra.sprite.originalTint = undefined;
                    }
                    
                    const extraAfter = {
                        alpha: extra.sprite.alpha,
                        tint: extra.sprite.tint,
                        darkened: extra.sprite._cinematicDarkened,
                        depth: extra.sprite.depth
                    };
                    console.log(`[CINEMA-DARKEN] STEP1: Extra[${index}] "${extraBefore.name}" AFTER - alpha=${extraAfter.alpha}, tint=${extraAfter.tint.toString(16)}, darkened=${extraAfter.darkened}, depth=${extraAfter.depth}`);
                } else {
                    console.log(`[CINEMA-DARKEN] STEP1: Extra[${index}] is NULL or has no sprite`);
                }
            });
        } else {
            console.log(`[CINEMA-DARKEN] STEP1: ExtrasManager is NULL`);
        }
        
        // STEP 2: Rebuild darkenedSprites array from existing flags, but EXCLUDE player and extras
        // This ensures we don't lose track of already-darkened enemy sprites
        console.log(`[CINEMA-DARKEN] STEP2: Rebuilding darkenedSprites array (excluding player/extras)`);
        this.darkenedSprites = [];
        let rebuildCount = 0;
        if (this.scene.enemies && Array.isArray(this.scene.enemies)) {
            this.scene.enemies.forEach((enemy, index) => {
                if (enemy && enemy.sprite && enemy.sprite._cinematicDarkened) {
                    // Explicitly exclude player and extras from rebuild
                    if (enemy.sprite === this.scene.player) {
                        console.log(`[CINEMA-DARKEN] STEP2: Enemy[${index}] sprite is PLAYER - EXCLUDING from rebuild`);
                        return;
                    }
                    const isExtra = this.scene.extrasManager && 
                        this.scene.extrasManager.extras.some(e => e.sprite === enemy.sprite);
                    if (isExtra) {
                        console.log(`[CINEMA-DARKEN] STEP2: Enemy[${index}] sprite is EXTRA - EXCLUDING from rebuild`);
                        return;
                    }
                    this.darkenedSprites.push(enemy.sprite);
                    rebuildCount++;
                    console.log(`[CINEMA-DARKEN] STEP2: Enemy[${index}] added to darkenedSprites (rebuild)`);
                }
            });
        }
        console.log(`[CINEMA-DARKEN] STEP2: Rebuilt ${rebuildCount} enemy sprites into darkenedSprites`);
        // DO NOT rebuild extras into darkenedSprites - they should never be darkened
        
        // Find the speaking extra by matching speaker name to extra name
        if (speakerName && this.scene.extrasManager) {
            const extras = this.scene.extrasManager.extras || [];
            console.log(`🎬 Looking for speaking extra: "${speakerName}", available extras:`, extras.map(e => e?.name));
            for (const extra of extras) {
                if (extra && extra.name) {
                    const extraNameLower = extra.name.toLowerCase();
                    const speakerNameLower = speakerName.toLowerCase();
                    if (extraNameLower === speakerNameLower) {
                        this.eventManager.speakingExtra = extra.sprite;
                        console.log(`🎬 Found speaking extra: ${extra.name} (sprite: ${extra.sprite ? 'exists' : 'missing'})`);
                        break;
                    }
                }
            }
            if (!this.speakingExtra) {
                console.log(`🎬 No matching extra found for speaker: "${speakerName}"`);
            }
        }
        
        // Get dialogue manager overlay
        // NOTE: We're NOT using the overlay for darkening anymore because it darkens everything
        // including player and extras. Instead, we only darken enemies directly via their alpha/tint.
        const dialogueManager = this.scene.dialogueManager;
        if (dialogueManager && dialogueManager.overlay) {
            // Store original overlay alpha if not already stored
            if (dialogueManager.overlay.originalAlpha === undefined) {
                dialogueManager.overlay.originalAlpha = dialogueManager.overlay.alpha;
            }
            // Keep overlay visible but completely transparent (no dimming effect)
            // The actual darkening is done by darkening enemies directly
            dialogueManager.overlay.setVisible(true);
            dialogueManager.overlay.setAlpha(0.0); // Completely transparent - darkening done via enemy alpha/tint only
            console.log(`[CINEMA-DARKEN] Overlay set to alpha 0.0 (completely transparent - darkening done via enemy alpha/tint only)`);
            console.log(`[CINEMA-DARKEN] Player depth: ${this.scene.player ? this.scene.player.depth : 'N/A'}, should be 10001`);
            if (this.scene.extrasManager) {
                const extras = this.scene.extrasManager.extras || [];
                extras.forEach((extra, idx) => {
                    if (extra && extra.sprite) {
                        console.log(`[CINEMA-DARKEN] Extra[${idx}] "${extra.name || 'unnamed'}" depth: ${extra.sprite.depth}, should be 10001`);
                    }
                });
            }
        }
        
        // STEP 3: Darken all enemies (but NOT the player or any extras)
        // Add explicit checks to ensure player/extras are never darkened
        console.log(`[CINEMA-DARKEN] STEP3: Darkening enemies (excluding player/extras)`);
        let darkenedCount = 0;
        let skippedCount = 0;
        if (this.scene.enemies && Array.isArray(this.scene.enemies)) {
            console.log(`[CINEMA-DARKEN] STEP3: Processing ${this.scene.enemies.length} enemies`);
            this.scene.enemies.forEach((enemy, index) => {
                if (enemy && enemy.sprite && enemy.sprite.active) {
                    // CRITICAL: Explicitly exclude player
                    if (enemy.sprite === this.scene.player) {
                        console.warn(`[CINEMA-DARKEN] STEP3: Enemy[${index}] sprite IS PLAYER - SKIPPING darkening`);
                        skippedCount++;
                        return;
                    }
                    
                    // CRITICAL: Explicitly exclude extras
                    const isExtra = this.scene.extrasManager && 
                        this.scene.extrasManager.extras.some(e => e.sprite === enemy.sprite);
                    if (isExtra) {
                        const extraName = this.scene.extrasManager.extras.find(e => e.sprite === enemy.sprite)?.name || 'unnamed';
                        console.warn(`[CINEMA-DARKEN] STEP3: Enemy[${index}] sprite IS EXTRA "${extraName}" - SKIPPING darkening`);
                        skippedCount++;
                        return;
                    }
                    
                    // Only darken if it's actually an enemy
                    const beforeAlpha = enemy.sprite.alpha;
                    const beforeTint = enemy.sprite.tint;
                    // Store original alpha and tint state if not already stored
                    if (enemy.sprite.originalAlpha === undefined) {
                        enemy.sprite.originalAlpha = enemy.sprite.alpha;
                    }
                    if (enemy.sprite.originalTint === undefined) {
                        enemy.sprite.originalTint = enemy.sprite.tint;
                    }
                    // Darken enemy
                    enemy.sprite.setAlpha(0.3);
                    enemy.sprite.setTint(0x333333); // Dark gray tint
                    enemy.sprite._cinematicDarkened = true; // Mark as darkened by cinematic effect
                    // Add to list if not already there
                    if (this.darkenedSprites.indexOf(enemy.sprite) === -1) {
                        this.darkenedSprites.push(enemy.sprite);
                    }
                    darkenedCount++;
                    console.log(`[CINEMA-DARKEN] STEP3: Enemy[${index}] DARKENED - alpha: ${beforeAlpha} -> ${enemy.sprite.alpha}, tint: ${beforeTint.toString(16)} -> ${enemy.sprite.tint.toString(16)}`);
                } else {
                    console.log(`[CINEMA-DARKEN] STEP3: Enemy[${index}] is NULL, has no sprite, or is inactive - skipping`);
                }
            });
        } else {
            console.log(`[CINEMA-DARKEN] STEP3: No enemies array or not an array`);
        }
        console.log(`[CINEMA-DARKEN] STEP3: Darkened ${darkenedCount} enemies, skipped ${skippedCount} (player/extras)`);
        
        // STEP 4: Final safety check - ensure player and extras are still bright and not in darkenedSprites
        console.log(`[CINEMA-DARKEN] STEP4: Final safety check for player and extras`);
        if (this.scene.player) {
            const playerIndex = this.darkenedSprites.indexOf(this.scene.player);
            const playerState = {
                alpha: this.scene.player.alpha,
                tint: this.scene.player.tint,
                darkened: this.scene.player._cinematicDarkened,
                inDarkenedList: playerIndex > -1
            };
            console.log(`[CINEMA-DARKEN] STEP4: Player state - alpha=${playerState.alpha}, tint=${playerState.tint.toString(16)}, darkened=${playerState.darkened}, inList=${playerState.inDarkenedList}`);
            
            if (playerIndex > -1) {
                console.warn(`[CINEMA-DARKEN] STEP4: ⚠️ Player found in darkenedSprites at index ${playerIndex} - REMOVING`);
                this.darkenedSprites.splice(playerIndex, 1);
            }
            // Double-check player is bright
            if (this.scene.player.alpha < 1.0 || this.scene.player._cinematicDarkened) {
                console.warn(`[CINEMA-DARKEN] STEP4: ⚠️ Player was darkened (alpha=${this.scene.player.alpha}, darkened=${this.scene.player._cinematicDarkened}) - RESTORING brightness`);
                this.scene.player.clearTint();
                this.scene.player.setAlpha(1.0);
                this.scene.player._cinematicDarkened = false;
                console.log(`[CINEMA-DARKEN] STEP4: Player restored - alpha=${this.scene.player.alpha}, tint=${this.scene.player.tint.toString(16)}, darkened=${this.scene.player._cinematicDarkened}`);
            } else {
                console.log(`[CINEMA-DARKEN] STEP4: ✅ Player is bright (alpha=${this.scene.player.alpha}, darkened=${this.scene.player._cinematicDarkened})`);
            }
        } else {
            console.log(`[CINEMA-DARKEN] STEP4: Player is NULL - cannot check`);
        }
        
        if (this.scene.extrasManager) {
            const extras = this.scene.extrasManager.extras || [];
            console.log(`[CINEMA-DARKEN] STEP4: Checking ${extras.length} extras`);
            extras.forEach((extra, index) => {
                if (extra && extra.sprite) {
                    const extraIndex = this.darkenedSprites.indexOf(extra.sprite);
                    const extraState = {
                        alpha: extra.sprite.alpha,
                        tint: extra.sprite.tint,
                        darkened: extra.sprite._cinematicDarkened,
                        inDarkenedList: extraIndex > -1,
                        name: extra.name || 'unnamed'
                    };
                    console.log(`[CINEMA-DARKEN] STEP4: Extra[${index}] "${extraState.name}" state - alpha=${extraState.alpha}, tint=${extraState.tint.toString(16)}, darkened=${extraState.darkened}, inList=${extraState.inDarkenedList}`);
                    
                    if (extraIndex > -1) {
                        console.warn(`[CINEMA-DARKEN] STEP4: ⚠️ Extra "${extraState.name}" found in darkenedSprites at index ${extraIndex} - REMOVING`);
                        this.darkenedSprites.splice(extraIndex, 1);
                    }
                    // Double-check extra is bright
                    if (extra.sprite.alpha < 1.0 || extra.sprite._cinematicDarkened) {
                        console.warn(`[CINEMA-DARKEN] STEP4: ⚠️ Extra "${extraState.name}" was darkened (alpha=${extra.sprite.alpha}, darkened=${extra.sprite._cinematicDarkened}) - RESTORING brightness`);
                        extra.sprite.clearTint();
                        extra.sprite.setAlpha(1.0);
                        extra.sprite._cinematicDarkened = false;
                        console.log(`[CINEMA-DARKEN] STEP4: Extra "${extraState.name}" restored - alpha=${extra.sprite.alpha}, tint=${extra.sprite.tint.toString(16)}, darkened=${extra.sprite._cinematicDarkened}`);
                    } else {
                        console.log(`[CINEMA-DARKEN] STEP4: ✅ Extra "${extraState.name}" is bright (alpha=${extra.sprite.alpha}, darkened=${extra.sprite._cinematicDarkened})`);
                    }
                } else {
                    console.log(`[CINEMA-DARKEN] STEP4: Extra[${index}] is NULL or has no sprite`);
                }
            });
        } else {
            console.log(`[CINEMA-DARKEN] STEP4: ExtrasManager is NULL - cannot check extras`);
        }
        
        console.log(`[CINEMA-DARKEN] ========== END applyCinematicDarkening ==========`);
        console.log(`[CINEMA-DARKEN] Final darkenedSprites count: ${this.darkenedSprites.length}`);
        
        // Start monitoring player and extras to detect if they get darkened after this function
        this.startDarkeningMonitor();
    }
    
    startDarkeningMonitor() {
        // Don't start monitor if darkening is disabled
        if (!this.cinematicDarkeningEnabled) {
            console.log(`[CINEMA-DARKEN] Monitor not started - darkening is disabled`);
            return;
        }
        
        // Clear any existing monitor
        if (this.darkeningMonitorTimer) {
            this.darkeningMonitorTimer.destroy();
        }
        
        // Monitor every 100ms to check if player/extras get darkened
        let checkCount = 0;
        this.darkeningMonitorTimer = this.scene.time.addEvent({
            delay: 100,
            callback: () => {
                // Only monitor while event is active and darkening is enabled
                if (!this.eventManager.activeEvent || !this.cinematicDarkeningEnabled) {
                    if (this.darkeningMonitorTimer) {
                        this.darkeningMonitorTimer.destroy();
                        this.darkeningMonitorTimer = null;
                    }
                    return;
                }
                
                checkCount++;
                let issuesFound = false;
                
                // Check player
                if (this.scene.player) {
                    const playerAlpha = this.scene.player.alpha;
                    const playerTint = this.scene.player.tint;
                    const playerDarkened = this.scene.player._cinematicDarkened;
                    const inDarkenedList = this.darkenedSprites.indexOf(this.scene.player) > -1;
                    
                    if (playerAlpha < 1.0 || playerDarkened || inDarkenedList || playerTint !== 0xffffff) {
                        console.warn(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ⚠️ Player state changed! alpha=${playerAlpha}, tint=${playerTint.toString(16)}, darkened=${playerDarkened}, inList=${inDarkenedList}`);
                        issuesFound = true;
                        
                        // Auto-fix
                        this.scene.player.clearTint();
                        this.scene.player.setAlpha(1.0);
                        this.scene.player._cinematicDarkened = false;
                        const idx = this.darkenedSprites.indexOf(this.scene.player);
                        if (idx > -1) {
                            this.darkenedSprites.splice(idx, 1);
                        }
                        console.log(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ✅ Player auto-fixed`);
                    }
                }
                
                // Check extras
                if (this.scene.extrasManager) {
                    const extras = this.scene.extrasManager.extras || [];
                    extras.forEach((extra, index) => {
                        if (extra && extra.sprite) {
                            const extraAlpha = extra.sprite.alpha;
                            const extraTint = extra.sprite.tint;
                            const extraDarkened = extra.sprite._cinematicDarkened;
                            const inDarkenedList = this.darkenedSprites.indexOf(extra.sprite) > -1;
                            
                            if (extraAlpha < 1.0 || extraDarkened || inDarkenedList || extraTint !== 0xffffff) {
                                console.warn(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ⚠️ Extra[${index}] "${extra.name || 'unnamed'}" state changed! alpha=${extraAlpha}, tint=${extraTint.toString(16)}, darkened=${extraDarkened}, inList=${inDarkenedList}`);
                                issuesFound = true;
                                
                                // Auto-fix
                                extra.sprite.clearTint();
                                extra.sprite.setAlpha(1.0);
                                extra.sprite._cinematicDarkened = false;
                                const idx = this.darkenedSprites.indexOf(extra.sprite);
                                if (idx > -1) {
                                    this.darkenedSprites.splice(idx, 1);
                                }
                                console.log(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ✅ Extra "${extra.name || 'unnamed'}" auto-fixed`);
                            }
                        }
                    });
                }
                
                // Log status every 10 checks (1 second) if no issues, or immediately if issues found
                if (checkCount % 10 === 0 || issuesFound) {
                    if (!issuesFound) {
                        console.log(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ✅ All checks passed - player and extras still bright`);
                    }
                }
            },
            repeat: -1
        });
    }
    
    updateSpeakingExtra(speakerName) {
        // No longer needed - all extras stay bright now
        // Keeping method for compatibility but it just re-applies darkening
        console.log(`🎬 Updating speaking extra: "${speakerName}" (all extras stay bright)`);
        
        // Re-apply darkening to ensure everything is correct
        // This will ensure player and all extras stay bright
        this.applyCinematicDarkening(null);
    }
    
    removeCinematicDarkening() {
        // Check if darkening is disabled
        if (!this.cinematicDarkeningEnabled) {
            console.log(`[CINEMA-DARKEN] Cinematic darkening is DISABLED - skipping removal`);
            return;
        }
        
        console.log('🎬 Removing cinematic darkening effect');
        console.log(`[CINEMA-DARKEN] Removing darkening - restoring player/extras depth`);
        
        // Stop darkening monitor
        if (this.darkeningMonitorTimer) {
            console.log(`[CINEMA-DARKEN] Stopping darkening monitor`);
            this.darkeningMonitorTimer.destroy();
            this.darkeningMonitorTimer = null;
        }
        
        // Restore overlay opacity
        const dialogueManager = this.scene.dialogueManager;
        if (dialogueManager && dialogueManager.overlay) {
            if (dialogueManager.overlay.originalAlpha !== undefined) {
                dialogueManager.overlay.setAlpha(dialogueManager.overlay.originalAlpha);
                dialogueManager.overlay.originalAlpha = undefined;
            } else {
                dialogueManager.overlay.setAlpha(0.3); // Back to default
            }
        }
        
        // Restore player depth if it was changed
        if (this.scene.player && this.scene.player.originalDepth !== undefined) {
            console.log(`[CINEMA-DARKEN] Restoring player depth from ${this.scene.player.depth} to ${this.scene.player.originalDepth}`);
            this.scene.player.setDepth(this.scene.player.originalDepth);
            this.scene.player.originalDepth = undefined;
        }
        
        // Restore extras depth if it was changed
        if (this.scene.extrasManager) {
            const extras = this.scene.extrasManager.extras || [];
            extras.forEach(extra => {
                if (extra && extra.sprite && extra.sprite.originalDepth !== undefined) {
                    console.log(`[CINEMA-DARKEN] Restoring extra "${extra.name || 'unnamed'}" depth from ${extra.sprite.depth} to ${extra.sprite.originalDepth}`);
                    extra.sprite.setDepth(extra.sprite.originalDepth);
                    extra.sprite.originalDepth = undefined;
                }
            });
        }
        
        // Restore all darkened sprites
        this.darkenedSprites.forEach(sprite => {
            if (sprite && sprite.active && sprite._cinematicDarkened) {
                // Restore original alpha
                if (sprite.originalAlpha !== undefined) {
                    sprite.setAlpha(sprite.originalAlpha);
                    sprite.originalAlpha = undefined;
                } else {
                    sprite.setAlpha(1.0);
                }
                // Restore original tint or clear it
                if (sprite.originalTint !== undefined && sprite.originalTint !== 0xffffff) {
                    sprite.setTint(sprite.originalTint);
                    sprite.originalTint = undefined;
                } else {
                    sprite.clearTint();
                }
                // Remove marker
                sprite._cinematicDarkened = false;
            }
        });
        
        // Clear tracking
        this.eventManager.darkenedSprites = [];
        this.eventManager.speakingExtra = null;
    }
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventCinematicManager };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.EventCinematicManager = EventCinematicManager;
}

