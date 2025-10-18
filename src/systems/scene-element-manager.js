// ========================================
// SCENE ELEMENT MANAGER
// ========================================
// Handles dynamic scene elements like moving platforms, interactive objects, and hazards

class SceneElementManager {
    constructor(scene) {
        this.scene = scene;
        this.elements = new Map();
        this.movingElements = [];
        this.interactiveElements = [];
        this.hazards = [];
        
        console.log('🎬 SceneElementManager initialized');
    }
    
    // ========================================
    // ELEMENT CREATION
    // ========================================
    
    createElementsFromConfig(elementsConfig) {
        if (!elementsConfig || elementsConfig.length === 0) {
            console.log('🎬 No scene elements to create');
            return;
        }
        
        console.log(`🎬 Creating ${elementsConfig.length} scene elements...`);
        
        elementsConfig.forEach((config, index) => {
            this.createElement(config, index);
        });
    }
    
    createElement(config, id) {
        const elementId = config.id || `element_${id}`;
        
        console.log(`🎬 Creating element: ${elementId} (type: ${config.type})`);
        
        let element;
        
        switch (config.type) {
            case 'moving_platform':
                element = this.createMovingPlatform(config);
                this.movingElements.push(element);
                break;
            case 'interactive_object':
                element = this.createInteractiveObject(config);
                this.interactiveElements.push(element);
                break;
            case 'hazard':
                element = this.createHazard(config);
                this.hazards.push(element);
                break;
            case 'decoration':
                element = this.createDecoration(config);
                break;
            default:
                console.warn(`🎬 Unknown element type: ${config.type}`);
                return;
        }
        
        if (element) {
            element.id = elementId;
            element.config = config;
            this.elements.set(elementId, element);
        }
    }
    
    // ========================================
    // MOVING PLATFORM
    // ========================================
    
    createMovingPlatform(config) {
        // Create sprite
        const sprite = this.scene.physics.add.sprite(
            config.path[0].x,
            config.path[0].y,
            config.sprite
        );
        
        sprite.setDepth(config.depth || 0);
        sprite.body.setImmovable(true);
        sprite.body.setAllowGravity(false);
        
        // Set up collision with player
        if (config.collision && this.scene.player) {
            this.scene.physics.add.collider(this.scene.player, sprite);
        }
        
        // Create path tween
        const pathPoints = config.path.map(p => ({ x: p.x, y: p.y }));
        const duration = config.duration || (Phaser.Math.Distance.Between(
            pathPoints[0].x, pathPoints[0].y,
            pathPoints[1].x, pathPoints[1].y
        ) / (config.speed || 100)) * 1000;
        
        const tween = this.scene.tweens.add({
            targets: sprite,
            x: pathPoints.map(p => p.x),
            y: pathPoints.map(p => p.y),
            duration: duration,
            ease: config.ease || 'Linear',
            repeat: config.loop ? -1 : 0,
            yoyo: config.yoyo || false,
            paused: false
        });
        
        return {
            type: 'moving_platform',
            sprite: sprite,
            tween: tween,
            path: pathPoints,
            active: true
        };
    }
    
    // ========================================
    // INTERACTIVE OBJECT
    // ========================================
    
    createInteractiveObject(config) {
        // Create sprite
        const sprite = this.scene.add.sprite(
            config.x,
            config.y,
            config.sprite
        );
        
        sprite.setDepth(config.depth || 0);
        sprite.setInteractive();
        
        // Set up interaction
        sprite.on('pointerdown', () => {
            if (config.onInteract) {
                config.onInteract(this.scene, sprite);
            }
            console.log(`🎬 Interacted with: ${config.id}`);
        });
        
        // Highlight on hover
        sprite.on('pointerover', () => {
            sprite.setTint(0xffff00);
        });
        
        sprite.on('pointerout', () => {
            sprite.clearTint();
        });
        
        return {
            type: 'interactive_object',
            sprite: sprite,
            active: true
        };
    }
    
    // ========================================
    // HAZARD
    // ========================================
    
    createHazard(config) {
        // Create sprite or zone
        let hazard;
        
        if (config.sprite) {
            hazard = this.scene.physics.add.sprite(
                config.x,
                config.y,
                config.sprite
            );
        } else {
            hazard = this.scene.physics.add.zone(
                config.x,
                config.y,
                config.width || 64,
                config.height || 64
            );
        }
        
        hazard.setDepth(config.depth || -50);
        
        // Set up collision with player
        if (this.scene.player) {
            this.scene.physics.add.overlap(this.scene.player, hazard, () => {
                if (config.damage && this.scene.playerTakeDamage) {
                    this.scene.playerTakeDamage(config.damage);
                }
                
                if (config.onHit) {
                    config.onHit(this.scene, this.scene.player);
                }
            });
        }
        
        // Animation if specified
        if (config.animation) {
            hazard.play(config.animation);
        }
        
        return {
            type: 'hazard',
            sprite: hazard,
            damage: config.damage || 10,
            active: true
        };
    }
    
    // ========================================
    // DECORATION
    // ========================================
    
    createDecoration(config) {
        const sprite = this.scene.add.sprite(
            config.x,
            config.y,
            config.sprite
        );
        
        sprite.setDepth(config.depth || -200);
        sprite.setScrollFactor(config.scrollFactor || 1.0);
        
        // Animation if specified
        if (config.animation) {
            sprite.play(config.animation);
        }
        
        return {
            type: 'decoration',
            sprite: sprite,
            active: true
        };
    }
    
    // ========================================
    // UPDATE
    // ========================================
    
    update(time, delta) {
        // Update moving elements
        this.movingElements.forEach(element => {
            if (element.active && element.sprite && element.sprite.body) {
                // Platform carries player if standing on it
                if (this.scene.player && element.sprite.body) {
                    const playerOnPlatform = this.scene.physics.overlap(
                        this.scene.player,
                        element.sprite
                    );
                    
                    if (playerOnPlatform && this.scene.player.body.touching.down) {
                        // Move player with platform
                        const velocityX = element.sprite.body.velocity.x;
                        this.scene.player.x += velocityX * (delta / 1000);
                    }
                }
            }
        });
        
        // Update hazards (pulsing effects, animations, etc.)
        this.hazards.forEach(element => {
            if (element.active && element.config.pulseEffect) {
                // Add pulsing alpha effect
                element.sprite.alpha = 0.5 + Math.sin(time / 200) * 0.3;
            }
        });
    }
    
    // ========================================
    // ELEMENT MANAGEMENT
    // ========================================
    
    getElement(elementId) {
        return this.elements.get(elementId);
    }
    
    removeElement(elementId) {
        const element = this.elements.get(elementId);
        if (element) {
            element.active = false;
            
            if (element.sprite) {
                element.sprite.destroy();
            }
            
            if (element.tween) {
                element.tween.remove();
            }
            
            this.elements.delete(elementId);
            
            // Remove from type-specific arrays
            this.movingElements = this.movingElements.filter(e => e.id !== elementId);
            this.interactiveElements = this.interactiveElements.filter(e => e.id !== elementId);
            this.hazards = this.hazards.filter(e => e.id !== elementId);
            
            console.log(`🎬 Removed element: ${elementId}`);
        }
    }
    
    pauseElement(elementId) {
        const element = this.elements.get(elementId);
        if (element) {
            element.active = false;
            
            if (element.tween) {
                element.tween.pause();
            }
            
            if (element.sprite && element.sprite.anims) {
                element.sprite.anims.pause();
            }
        }
    }
    
    resumeElement(elementId) {
        const element = this.elements.get(elementId);
        if (element) {
            element.active = true;
            
            if (element.tween) {
                element.tween.resume();
            }
            
            if (element.sprite && element.sprite.anims) {
                element.sprite.anims.resume();
            }
        }
    }
    
    pauseAll() {
        this.elements.forEach((element, id) => {
            this.pauseElement(id);
        });
    }
    
    resumeAll() {
        this.elements.forEach((element, id) => {
            this.resumeElement(id);
        });
    }
    
    // ========================================
    // CLEANUP
    // ========================================
    
    clearAll() {
        console.log('🎬 Clearing all scene elements');
        
        this.elements.forEach((element, id) => {
            if (element.sprite) {
                element.sprite.destroy();
            }
            
            if (element.tween) {
                element.tween.remove();
            }
        });
        
        this.elements.clear();
        this.movingElements = [];
        this.interactiveElements = [];
        this.hazards = [];
    }
    
    destroy() {
        this.clearAll();
        console.log('🎬 SceneElementManager destroyed');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneElementManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SceneElementManager = SceneElementManager;
}

