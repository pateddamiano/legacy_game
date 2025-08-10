/**
 * FIRST OFF - Brooklyn Street Mini Game (Updated Version)
 * A complete JavaScript implementation featuring Tireek and Tryston
 * from rap group "++" surviving Brooklyn's urban obstacles
 * 
 * Version 2.0 - Enhanced gameplay with medium difficulty
 */

class FirstOffGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'loading'; // loading, menu, playing, paused, gameOver, victory
        this.lastFrameTime = 0;
        this.frameCount = 0;
        
        // Game configuration - Updated for medium difficulty and 2:30 duration
        this.config = {
            canvas: { width: 800, height: 600 },
            player: {
                width: 40, height: 60, speed: 5, jumpPower: -14,
                gravity: 0.6, maxHealth: 100
            },
            game: {
                duration: 150, // 2.5 minutes (2:30)
                baseSpeed: 2.5, maxSpeed: 6, // Reduced from 3-8 for medium difficulty
                bossWaveStart: 30, // Last 30 seconds
                spawnRate: 0.02, // Reduced spawn rate for medium difficulty
                microphoneSpawnRate: 0.012 // Increased microphone spawn rate
            }
        };
        
        // Game state
        this.score = 0;
        this.gameTime = this.config.game.duration;
        this.gameSpeed = 1;
        this.currentCharacter = 'tireek';
        this.highScore = this.loadHighScore();
        this.availableCharacters = ['tireek', 'tryston']; // Track living characters
        
        // Characters data - Individual health system
        this.characters = {
            tireek: {
                name: 'Tireek',
                color: '#3498db',
                secondaryColor: '#2980b9',
                superMove: 'punch',
                superMeter: 0, // Changed from cooldown to meter system
                maxSuperMeter: 100,
                maxHealth: 100,
                currentHealth: 100,
                isAlive: true,
                description: 'Powerful Punch'
            },
            tryston: {
                name: 'Tryston',
                color: '#e67e22',
                secondaryColor: '#d35400',
                superMove: 'yell',
                superMeter: 0, // Changed from cooldown to meter system
                maxSuperMeter: 100,
                maxHealth: 100,
                currentHealth: 100,
                isAlive: true,
                description: 'Knockback Yell'
            }
        };
        
        // Player object
        this.player = {
            x: 100, y: 400, width: 40, height: 60,
            velocityY: 0, onGround: false,
            isInvulnerable: false, invulnerabilityTime: 0
        };
        
        // Game objects
        this.obstacles = [];
        this.microphones = [];
        this.particles = [];
        this.backgroundElements = [];
        
        // Controls
        this.keys = {};
        this.touchControls = {};
        
        // Brooklyn street atmosphere
        this.atmosphere = {
            buildings: [],
            graffiti: [],
            streetLights: []
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupControls();
        this.generateBrooklynAtmosphere();
        this.startGameLoop();
        this.showLoadingScreen();
    }
    
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.canvas.width;
        this.canvas.height = this.config.canvas.height;
        this.canvas.id = 'firstOffCanvas';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = true;
        
        // Style canvas
        this.canvas.style.border = '3px solid #e74c3c';
        this.canvas.style.borderRadius = '10px';
        this.canvas.style.boxShadow = '0 0 30px rgba(231, 76, 60, 0.5)';
        this.canvas.style.backgroundColor = '#2c3e50';
        
        document.body.appendChild(this.canvas);
    }
    
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Touch controls setup
        this.setupTouchControls();
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    setupTouchControls() {
        const touchHandler = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touches = e.touches || [e];
            
            // Reset touch states
            this.touchControls = { left: false, right: false, jump: false, switch: false, super: false };
            
            for (let touch of touches) {
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                // Define touch areas
                if (x < 150 && y > this.canvas.height - 120) {
                    if (x < 75) this.touchControls.left = true;
                    else this.touchControls.right = true;
                } else if (x > this.canvas.width - 150 && y > this.canvas.height - 120) {
                    if (x > this.canvas.width - 75) this.touchControls.super = true;
                    else this.touchControls.switch = true;
                } else if (y > this.canvas.height - 80) {
                    this.touchControls.jump = true;
                }
            }
        };
        
        this.canvas.addEventListener('touchstart', touchHandler);
        this.canvas.addEventListener('touchmove', touchHandler);
        this.canvas.addEventListener('touchend', () => {
            this.touchControls = {};
        });
    }
    
    handleKeyDown(e) {
        const key = e.code || e.key;
        
        switch(key) {
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = true;
                break;
            case 'ArrowUp':
            case 'KeyW':
            case 'Space':
                if (key === 'Space' && this.gameState === 'playing') {
                    this.switchCharacter();
                } else {
                    this.keys.jump = true;
                }
                e.preventDefault();
                break;
            case 'Enter':
            case 'KeyX':
                this.useSuperMove();
                break;
            case 'KeyP':
                if (this.gameState === 'playing') {
                    this.gameState = 'paused';
                } else if (this.gameState === 'paused') {
                    this.gameState = 'playing';
                }
                break;
            case 'KeyR':
                if (this.gameState === 'gameOver' || this.gameState === 'victory') {
                    this.resetGame();
                }
                break;
        }
    }
    
    handleKeyUp(e) {
        const key = e.code || e.key;
        
        switch(key) {
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.keys.jump = false;
                break;
        }
    }
    
    generateBrooklynAtmosphere() {
        // Generate Brooklyn skyline
        for (let i = 0; i < 15; i++) {
            this.atmosphere.buildings.push({
                x: i * 60 - 100,
                width: 50 + Math.random() * 30,
                height: 100 + Math.random() * 150,
                color: `hsl(${200 + Math.random() * 60}, 20%, ${20 + Math.random() * 20}%)`
            });
        }
        
        // Street lights
        for (let i = 0; i < 8; i++) {
            this.atmosphere.streetLights.push({
                x: i * 120 + 50,
                y: this.canvas.height - 120,
                flickering: Math.random() > 0.8
            });
        }
        
        // Graffiti spots
        const graffiti = ['++', 'BK', 'NYC', 'FIRST OFF', 'TIREEK', 'TRYSTON'];
        for (let i = 0; i < 6; i++) {
            this.atmosphere.graffiti.push({
                x: Math.random() * this.canvas.width,
                y: this.canvas.height - 200 - Math.random() * 100,
                text: graffiti[Math.floor(Math.random() * graffiti.length)],
                color: `hsl(${Math.random() * 360}, 70%, 60%)`,
                size: 12 + Math.random() * 8
            });
        }
    }
    
    showLoadingScreen() {
        setTimeout(() => {
            this.gameState = 'menu';
        }, 2000);
    }
    
    // Enhanced character management with individual health
    switchCharacter() {
        if (this.gameState !== 'playing') return;
        
        // Find next alive character
        const currentIndex = this.availableCharacters.indexOf(this.currentCharacter);
        let nextIndex = (currentIndex + 1) % this.availableCharacters.length;
        let attempts = 0;
        
        while (!this.characters[this.availableCharacters[nextIndex]].isAlive && attempts < 2) {
            nextIndex = (nextIndex + 1) % this.availableCharacters.length;
            attempts++;
        }
        
        if (this.characters[this.availableCharacters[nextIndex]].isAlive) {
            this.currentCharacter = this.availableCharacters[nextIndex];
            
            // Visual feedback without text
            this.createParticleEffect(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                this.characters[this.currentCharacter].color,
                15,
                'switch'
            );
        }
    }
    
    useSuperMove() {
        if (this.gameState !== 'playing') return;
        
        const character = this.characters[this.currentCharacter];
        if (character.superMeter < character.maxSuperMeter) return;
        
        character.superMeter = 0; // Reset meter after use
        
        if (character.superMove === 'punch') {
            this.tireekPunch();
        } else {
            this.trystonYell();
        }
    }
    
    // Enhanced super moves that kill enemies
    tireekPunch() {
        let enemiesKilled = 0;
        
        // Kill ALL visible enemies on screen (same as Tryston now)
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            // Only kill enemies that are visible on screen
            if (obstacle.x >= -obstacle.width && obstacle.x <= this.canvas.width + obstacle.width) {
                this.obstacles.splice(i, 1);
                this.score += 15; // Higher score for super move kills
                enemiesKilled++;
                
                this.createParticleEffect(obstacle.x, obstacle.y, '#e74c3c', 12, 'explosion');
            }
        }
        
        // Screen effect without text - slightly different from Tryston for variety
        this.screenShake = 10;
        this.flashEffect = { intensity: 0.6, color: '#3498db', duration: 20 };
    }
    
    trystonYell() {
        let enemiesKilled = 0;
        
        // Kill ALL visible enemies on screen
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            // Only kill enemies that are visible on screen
            if (obstacle.x >= -obstacle.width && obstacle.x <= this.canvas.width + obstacle.width) {
                this.obstacles.splice(i, 1);
                this.score += 15;
                enemiesKilled++;
                
                this.createParticleEffect(obstacle.x, obstacle.y, '#f39c12', 10, 'explosion');
            }
        }
        
        // Strong screen shake effect
        this.screenShake = 12;
        this.flashEffect = { intensity: 0.6, color: '#e67e22', duration: 20 };
    }
    
    // Enhanced obstacle management with difficulty scaling
    spawnObstacle() {
        const types = ['vinyl', 'gangster', 'homeless'];
        
        // Difficulty scaling based on speed increase
        const difficultyMultiplier = Math.min(this.gameSpeed, 2.5); // Cap at 2.5x difficulty
        
        // Dynamic spawn weights that get more challenging as speed increases
        let weights;
        if (this.gameTime < 30) {
            // Boss wave - more aggressive enemies
            weights = [0.2, 0.5, 0.3];
        } else if (this.gameSpeed > 2) {
            // High speed - more challenging mix
            weights = [0.3, 0.5, 0.2];
        } else {
            // Normal weights
            weights = [0.4, 0.3, 0.3];
        }
        
        let type = this.weightedChoice(types, weights);
        
        const obstacle = {
            type: type,
            x: this.canvas.width + 50,
            y: this.canvas.height - 120,
            width: 35,
            height: 50,
            speed: this.config.game.baseSpeed * this.gameSpeed + Math.random() * (1.5 * difficultyMultiplier), // Speed scales with difficulty
            health: 1,
            rotation: 0
        };
        
        // Type-specific properties with difficulty scaling
        switch(type) {
            case 'vinyl':
                obstacle.width = 30;
                obstacle.height = 30;
                obstacle.y = this.canvas.height - 90;
                obstacle.rotationSpeed = (0.12 + Math.random() * 0.08) * difficultyMultiplier;
                obstacle.color = '#2c3e50';
                break;
                
            case 'gangster':
                obstacle.speed *= 1.2 + (difficultyMultiplier - 1) * 0.3; // Faster at higher difficulties
                obstacle.health = 1;
                obstacle.color = '#8e44ad';
                // Add zigzag movement at higher difficulties
                if (difficultyMultiplier > 1.5) {
                    obstacle.pattern = 'zigzag';
                    obstacle.amplitude = 15;
                    obstacle.frequency = 0.08;
                }
                break;
                
            case 'homeless':
                obstacle.speed *= 0.8 + (difficultyMultiplier - 1) * 0.2; // Less speed penalty at higher difficulties
                obstacle.width = 45;
                obstacle.color = '#95a5a6';
                break;
        }
        
        this.obstacles.push(obstacle);
    }
    
    spawnMicrophone() {
        // Don't spawn microphones when paused
        if (this.gameState === 'paused') return;
        
        this.microphones.push({
            x: this.canvas.width + 30,
            y: this.canvas.height - 180 - Math.random() * 80,
            width: 15,
            height: 25,
            speed: this.config.game.baseSpeed * this.gameSpeed * 0.8,
            bobOffset: Math.random() * Math.PI * 2,
            collected: false,
            glow: 0
        });
    }
    
    weightedChoice(items, weights) {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * total;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        
        return items[items.length - 1];
    }
    
    // Enhanced physics and collision
    updatePlayer() {
        if (this.gameState !== 'playing') return;
        
        const isLeft = this.keys.left || this.touchControls.left;
        const isRight = this.keys.right || this.touchControls.right;
        const isJump = this.keys.jump || this.touchControls.jump;
        
        // Horizontal movement
        if (isLeft && this.player.x > 0) {
            this.player.x -= this.config.player.speed;
        }
        if (isRight && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.config.player.speed;
        }
        
        // Jumping
        if (isJump && this.player.onGround) {
            this.player.velocityY = this.config.player.jumpPower;
            this.player.onGround = false;
        }
        
        // Gravity
        this.player.y += this.player.velocityY;
        this.player.velocityY += this.config.player.gravity;
        
        // Ground collision
        const groundY = this.canvas.height - this.player.height - 50;
        if (this.player.y >= groundY) {
            this.player.y = groundY;
            this.player.velocityY = 0;
            this.player.onGround = true;
        }
        
        // Update invulnerability
        if (this.player.isInvulnerable) {
            this.player.invulnerabilityTime--;
            if (this.player.invulnerabilityTime <= 0) {
                this.player.isInvulnerable = false;
            }
        }
    }
    
    updateObstacles() {
        // Don't update obstacles when paused
        if (this.gameState === 'paused') return;
        
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            // Movement patterns
            if (obstacle.pattern === 'zigzag') {
                obstacle.y += Math.sin(this.frameCount * obstacle.frequency) * obstacle.amplitude * 0.1;
            }
            
            obstacle.x -= obstacle.speed;
            
            if (obstacle.type === 'vinyl') {
                obstacle.rotation += obstacle.rotationSpeed;
            }
            
            // Remove off-screen obstacles
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
                this.score += 5;
                continue;
            }
            
            // Collision detection with enemy disappearing after hit
            if (!this.player.isInvulnerable && this.checkCollision(this.player, obstacle)) {
                this.playerHit(obstacle);
                // Remove the enemy that hit the player
                this.obstacles.splice(i, 1);
            }
        }
    }
    
    updateMicrophones() {
        // Don't update microphones when paused
        if (this.gameState === 'paused') return;
        
        for (let i = this.microphones.length - 1; i >= 0; i--) {
            const mic = this.microphones[i];
            
            mic.x -= mic.speed;
            mic.bobOffset += 0.1;
            mic.glow = Math.sin(this.frameCount * 0.1) * 0.5 + 0.5;
            
            // Remove off-screen
            if (mic.x + mic.width < 0) {
                this.microphones.splice(i, 1);
                continue;
            }
            
            // Collection
            if (this.checkCollision(this.player, mic)) {
                this.microphones.splice(i, 1);
                this.collectMicrophone();
            }
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    // Enhanced player hit system with individual character health
    playerHit(obstacle) {
        const character = this.characters[this.currentCharacter];
        const damage = 25; // Reduced damage for medium difficulty
        
        character.currentHealth -= damage;
        this.player.isInvulnerable = true;
        this.player.invulnerabilityTime = 90; // Reduced invulnerability time
        
        // Visual feedback
        this.createParticleEffect(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            '#e74c3c', 10, 'hit'
        );
        
        this.screenShake = 6;
        
        // Character death and auto-switch system
        if (character.currentHealth <= 0) {
            character.isAlive = false;
            
            // Check if any characters are still alive
            const aliveCharacters = Object.keys(this.characters).filter(
                name => this.characters[name].isAlive
            );
            
            if (aliveCharacters.length === 0) {
                // All characters dead - game over
                this.gameState = 'gameOver';
                this.saveHighScore();
            } else {
                // Auto-switch to next alive character
                const nextCharacter = aliveCharacters[0];
                this.currentCharacter = nextCharacter;
                
                // Visual feedback for character switch due to death
                this.createParticleEffect(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    this.characters[this.currentCharacter].color,
                    20, 'switch'
                );
                
                this.flashEffect = { intensity: 0.7, color: this.characters[this.currentCharacter].color, duration: 30 };
            }
        }
    }
    
    // Microphone collection only charges super meter
    collectMicrophone() {
        const character = this.characters[this.currentCharacter];
        character.superMeter = Math.min(character.maxSuperMeter, character.superMeter + 25); // Charge super meter
        this.score += 25;
        
        this.createParticleEffect(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            '#f1c40f', 15, 'collect'
        );
    }
    
    // Enhanced particle effects
    createParticleEffect(x, y, color, count, type) {
        for (let i = 0; i < count; i++) {
            let particle = {
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: color,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                size: 2 + Math.random() * 2,
                type: type
            };
            
            if (type === 'switch') {
                particle.vx *= 1.5;
                particle.vy = -Math.abs(particle.vy) * 1.5;
            } else if (type === 'collect') {
                particle.vy = -Math.abs(particle.vy) * 2;
                particle.gravity = 0.1;
            } else if (type === 'explosion') {
                particle.vx *= 2;
                particle.vy *= 2;
                particle.size *= 1.5;
            }
            
            this.particles.push(particle);
        }
    }
    
    updateParticles() {
        // Don't update particles when paused
        if (this.gameState === 'paused') return;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.gravity) {
                particle.vy += particle.gravity;
            }
            
            particle.life--;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    // Enhanced game logic with gradual speed increase and difficulty scaling
    updateGameLogic() {
        if (this.gameState !== 'playing') return;
        
        this.frameCount++;
        
        // Time progression
        this.gameTime -= 1/60;
        if (this.gameTime <= 0) {
            this.gameState = 'victory';
            this.saveHighScore();
            return;
        }
        
        // Gradual speed increase over time with difficulty scaling
        const timeProgress = 1 - (this.gameTime / this.config.game.duration);
        this.gameSpeed = 1 + timeProgress * 2; // Increased back to 2 for more challenge as speed increases
        
        // Dynamic difficulty based on speed
        const difficultyMultiplier = Math.min(this.gameSpeed, 2.5);
        
        // More controlled spawning for cohesive battlefield with difficulty scaling
        const inBossWave = this.gameTime <= this.config.game.bossWaveStart;
        const baseSpawnRate = this.config.game.spawnRate * difficultyMultiplier; // Spawn rate increases with speed
        const spawnRate = inBossWave ? baseSpawnRate * 2.2 : baseSpawnRate; // More intense boss wave
        
        // Dynamic max obstacles based on difficulty
        const maxObstacles = Math.floor(8 + (difficultyMultiplier - 1) * 4); // Up to 12 obstacles at max difficulty
        
        // Spawn obstacles with better spacing, but tighter spacing at higher difficulties
        const minSpacing = Math.max(80, 120 - (difficultyMultiplier - 1) * 20); // Tighter spacing as speed increases
        
        if (Math.random() < spawnRate && this.obstacles.length < maxObstacles) {
            // Check spacing to avoid clustering
            const lastObstacle = this.obstacles[this.obstacles.length - 1];
            if (!lastObstacle || this.canvas.width - lastObstacle.x > minSpacing) {
                this.spawnObstacle();
            }
        }
        
        // Spawn microphones - slightly more frequent at higher difficulties to help with increased challenge
        const micSpawnRate = this.config.game.microphoneSpawnRate * (1 + (difficultyMultiplier - 1) * 0.5);
        if (Math.random() < micSpawnRate) {
            this.spawnMicrophone();
        }
        
        // Update screen effects
        if (this.screenShake > 0) {
            this.screenShake--;
        }
        
        if (this.flashEffect && this.flashEffect.duration > 0) {
            this.flashEffect.duration--;
        }
    }
    
    // Enhanced rendering with better visual feedback
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Screen shake offset
        let shakeX = 0, shakeY = 0;
        if (this.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * this.screenShake;
            shakeY = (Math.random() - 0.5) * this.screenShake;
        }
        
        this.ctx.save();
        this.ctx.translate(shakeX, shakeY);
        
        if (this.gameState === 'loading') {
            this.renderLoadingScreen();
        } else if (this.gameState === 'menu') {
            this.renderMainMenu();
        } else if (this.gameState === 'playing' || this.gameState === 'paused') {
            this.renderGame();
            if (this.gameState === 'paused') {
                this.renderPauseOverlay();
            }
        } else if (this.gameState === 'gameOver') {
            this.renderGame();
            this.renderGameOverScreen();
        } else if (this.gameState === 'victory') {
            this.renderGame();
            this.renderVictoryScreen();
        }
        
        this.ctx.restore();
        
        // Flash effect
        if (this.flashEffect && this.flashEffect.duration > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.flashEffect.intensity * (this.flashEffect.duration / 20);
            this.ctx.fillStyle = this.flashEffect.color;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    }
    
    renderLoadingScreen() {
        // Background
        this.ctx.fillStyle = 'linear-gradient(135deg, #2c3e50, #34495e)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FIRST OFF', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // Subtitle
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Brooklyn Street Challenge', this.canvas.width / 2, this.canvas.height / 2 + 10);
        this.ctx.fillText('2:30 Medium Difficulty', this.canvas.width / 2, this.canvas.height / 2 + 40);
        
        // Loading bar
        const barWidth = 300;
        const barHeight = 20;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = this.canvas.height / 2 + 80;
        
        this.ctx.strokeStyle = '#ecf0f1';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        const progress = Math.min(1, this.frameCount / 120);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * progress, barHeight - 4);
        
        this.ctx.textAlign = 'left';
    }
    
    renderMainMenu() {
        // Brooklyn skyline background
        this.renderBrooklynBackground();
        
        // Overlay
        this.ctx.fillStyle = 'rgba(44, 62, 80, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FIRST OFF', this.canvas.width / 2, 120);
        
        // Game info
        this.ctx.fillStyle = '#f39c12';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('2:30 Medium Challenge', this.canvas.width / 2, 160);
        
        // Character selection
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Choose Your Character', this.canvas.width / 2, 220);
        
        // Character previews with health status
        const tireekX = this.canvas.width / 2 - 120;
        const trystonX = this.canvas.width / 2 + 120;
        const charY = 300;
        
        // Tireek
        this.ctx.fillStyle = this.characters.tireek.isAlive ? this.characters.tireek.color : '#7f8c8d';
        this.ctx.fillRect(tireekX - 30, charY - 40, 60, 80);
        this.ctx.fillStyle = this.characters.tireek.isAlive ? '#ecf0f1' : '#95a5a6';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('TIREEK', tireekX, charY + 60);
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Powerful Punch', tireekX, charY + 80);
        
        // Tryston
        this.ctx.fillStyle = this.characters.tryston.isAlive ? this.characters.tryston.color : '#7f8c8d';
        this.ctx.fillRect(trystonX - 30, charY - 40, 60, 80);
        this.ctx.fillStyle = this.characters.tryston.isAlive ? '#ecf0f1' : '#95a5a6';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('TRYSTON', trystonX, charY + 60);
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Knockback Yell', trystonX, charY + 80);
        
        // Selected character indicator
        const selectedX = this.currentCharacter === 'tireek' ? tireekX : trystonX;
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(selectedX - 35, charY - 45, 70, 90);
        
        // Instructions
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Super moves charge by collecting microphones only!', this.canvas.width / 2, 430);
        this.ctx.fillText('Enemies disappear when they hit you - survive 2:30!', this.canvas.width / 2, 450);
        this.ctx.fillText('Press SPACE to start!', this.canvas.width / 2, 490);
        
        // High Score
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, 530);
        
        this.ctx.textAlign = 'left';
        
        // Handle menu input
        if (this.keys.left || this.keys.right) {
            this.switchCharacter();
            this.keys.left = this.keys.right = false;
        }
        
        if (this.keys.jump || this.touchControls.jump) {
            this.startGame();
        }
    }
    
    renderGame() {
        // Brooklyn street background
        this.renderBrooklynBackground();
        
        // Ground
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);
        
        // Street markings
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - 25);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - 25);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Render game objects
        this.renderObstacles();
        this.renderMicrophones();
        this.renderPlayer();
        this.renderParticles();
        this.renderUI();
        
        // Boss wave indicator
        if (this.gameTime <= this.config.game.bossWaveStart && Math.floor(this.frameCount / 40) % 2) {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('FINAL WAVE!', this.canvas.width / 2, 50);
            this.ctx.textAlign = 'left';
        }
    }
    
    renderBrooklynBackground() {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.6);
        gradient.addColorStop(0, '#34495e');
        gradient.addColorStop(0.5, '#2c3e50');
        gradient.addColorStop(1, '#1a252f');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.6);
        
        // Buildings with parallax scrolling
        this.atmosphere.buildings.forEach(building => {
            this.ctx.fillStyle = building.color;
            this.ctx.fillRect(
                building.x - this.frameCount * 0.15, 
                this.canvas.height - building.height - 50,
                building.width,
                building.height
            );
            
            // Windows
            this.ctx.fillStyle = Math.random() > 0.7 ? '#f1c40f' : '#2c3e50';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < Math.floor(building.height / 20); j++) {
                    this.ctx.fillRect(
                        building.x - this.frameCount * 0.15 + 5 + i * 15,
                        this.canvas.height - building.height - 50 + 10 + j * 20,
                        8, 12
                    );
                }
            }
        });
        
        // Street lights
        this.atmosphere.streetLights.forEach(light => {
            this.ctx.fillStyle = '#7f8c8d';
            this.ctx.fillRect(light.x - this.frameCount * 0.08, light.y, 5, 100);
            
            // Light glow
            if (!light.flickering || Math.floor(this.frameCount / 12) % 2) {
                this.ctx.fillStyle = 'rgba(241, 196, 15, 0.6)';
                this.ctx.beginPath();
                this.ctx.arc(light.x - this.frameCount * 0.08 + 2.5, light.y, 12, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // Graffiti
        this.atmosphere.graffiti.forEach(graf => {
            this.ctx.fillStyle = graf.color;
            this.ctx.font = `bold ${graf.size}px Arial`;
            this.ctx.fillText(graf.text, graf.x - this.frameCount * 0.03, graf.y);
        });
    }
    
    renderPlayer() {
        const character = this.characters[this.currentCharacter];
        
        // Invulnerability flashing
        if (this.player.isInvulnerable && Math.floor(this.frameCount / 4) % 2) {
            this.ctx.globalAlpha = 0.6;
        }
        
        // Character body
        this.ctx.fillStyle = character.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Character details
        this.ctx.fillStyle = character.secondaryColor;
        this.ctx.fillRect(this.player.x + 5, this.player.y + 5, this.player.width - 10, 20);
        
        // Face
        this.ctx.fillStyle = '#f4d03f';
        this.ctx.fillRect(this.player.x + 10, this.player.y + 10, 20, 20);
        
        // Eyes
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(this.player.x + 13, this.player.y + 15, 3, 3);
        this.ctx.fillRect(this.player.x + 19, this.player.y + 15, 3, 3);
        
        // Character name
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(character.name, this.player.x + this.player.width / 2, this.player.y - 5);
        this.ctx.textAlign = 'left';
        
        this.ctx.globalAlpha = 1;
    }
    
    renderObstacles() {
        this.obstacles.forEach(obstacle => {
            this.ctx.save();
            
            if (obstacle.type === 'vinyl') {
                // Rotating vinyl record
                const centerX = obstacle.x + obstacle.width / 2;
                const centerY = obstacle.y + obstacle.height / 2;
                
                this.ctx.translate(centerX, centerY);
                this.ctx.rotate(obstacle.rotation);
                
                // Record
                this.ctx.fillStyle = obstacle.color;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, obstacle.width / 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Center hole
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Reflection lines
                this.ctx.strokeStyle = '#34495e';
                this.ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 6 + i * 3, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
                
            } else {
                // Gangster or homeless person
                this.ctx.fillStyle = obstacle.color;
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Simple character details
                this.ctx.fillStyle = '#f4d03f';
                this.ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, 15);
                
                // Type indicator
                this.ctx.fillStyle = '#ecf0f1';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                const label = obstacle.type === 'gangster' ? 'G' : 'H';
                this.ctx.fillText(label, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height + 12);
                this.ctx.textAlign = 'left';
                
                // Gangster special effects
                if (obstacle.type === 'gangster') {
                    this.ctx.strokeStyle = '#9b59b6';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(obstacle.x - 1, obstacle.y - 1, obstacle.width + 2, obstacle.height + 2);
                }
            }
            
            this.ctx.restore();
        });
    }
    
    renderMicrophones() {
        this.microphones.forEach(mic => {
            const bobY = mic.y + Math.sin(mic.bobOffset) * 8;
            
            // Enhanced glow effect
            this.ctx.save();
            this.ctx.globalAlpha = mic.glow * 0.9;
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.beginPath();
            this.ctx.arc(mic.x + mic.width / 2, bobY + mic.height / 2, 25, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
            
            // Microphone body
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillRect(mic.x, bobY, mic.width, mic.height);
            
            // Microphone head
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.beginPath();
            this.ctx.arc(mic.x + mic.width / 2, bobY + 5, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Shine
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.beginPath();
            this.ctx.arc(mic.x + mic.width / 2 - 2, bobY + 3, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderParticles() {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    renderUI() {
        // UI Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(10, 10, this.canvas.width - 20, 100);
        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(10, 10, this.canvas.width - 20, 100);
        
        // Score
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 20, 35);
        
        // Time (2:30 format)
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.ctx.fillText(`Time: ${timeStr}`, 20, 55);
        
        // Current character info
        const character = this.characters[this.currentCharacter];
        this.ctx.fillStyle = character.color;
        this.ctx.fillText(`Character: ${character.name}`, 200, 35);
        
        // Health bar for current character
        const healthBarX = 200;
        const healthBarY = 45;
        const healthBarWidth = 120;
        const healthBarHeight = 12;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        const healthPercent = character.currentHealth / character.maxHealth;
        const healthColor = healthPercent > 0.6 ? '#27ae60' : 
                           healthPercent > 0.3 ? '#f39c12' : '#e74c3c';
        
        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
        
        this.ctx.strokeStyle = '#ecf0f1';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        // Super meter (replaces cooldown)
        const superMeterX = 350;
        const superMeterY = 35;
        const superMeterWidth = 100;
        const superMeterHeight = 12;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(superMeterX, superMeterY, superMeterWidth, superMeterHeight);
        
        const superPercent = character.superMeter / character.maxSuperMeter;
        this.ctx.fillStyle = superPercent >= 1 ? '#27ae60' : character.color;
        this.ctx.fillRect(superMeterX, superMeterY, superMeterWidth * superPercent, superMeterHeight);
        
        this.ctx.strokeStyle = '#ecf0f1';
        this.ctx.strokeRect(superMeterX, superMeterY, superMeterWidth, superMeterHeight);
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Super:', superMeterX, superMeterY - 5);
        
        // Character status indicators
        let statusX = 500;
        this.ctx.font = '14px Arial';
        Object.keys(this.characters).forEach(name => {
            const char = this.characters[name];
            this.ctx.fillStyle = char.isAlive ? char.color : '#7f8c8d';
            const marker = name === this.currentCharacter ? '●' : '○';
            this.ctx.fillText(`${marker} ${char.name}`, statusX, 35);
            
            // Mini health bar
            if (char.isAlive) {
                const miniBarWidth = 40;
                const miniBarHeight = 4;
                const miniBarY = 40;
                
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.fillRect(statusX, miniBarY, miniBarWidth, miniBarHeight);
                
                const miniHealthPercent = char.currentHealth / char.maxHealth;
                this.ctx.fillStyle = char.color;
                this.ctx.fillRect(statusX, miniBarY, miniBarWidth * miniHealthPercent, miniBarHeight);
            }
            
            statusX += 90;
        });
        
        // Game speed and high score
        this.ctx.fillStyle = '#f39c12';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Speed: ${this.gameSpeed.toFixed(1)}x`, 20, 80);
        
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillText(`High: ${this.highScore}`, 200, 80);
        
        // Touch controls overlay for mobile
        if (window.innerWidth <= 768) {
            this.renderTouchControls();
        }
    }
    
    renderTouchControls() {
        const buttonSize = 50;
        const margin = 20;
        
        // Left/Right buttons
        this.drawTouchButton(margin, this.canvas.height - buttonSize - margin, buttonSize, '←', this.touchControls.left);
        this.drawTouchButton(margin + buttonSize + 10, this.canvas.height - buttonSize - margin, buttonSize, '→', this.touchControls.right);
        
        // Jump button
        this.drawTouchButton(this.canvas.width / 2 - buttonSize / 2, this.canvas.height - buttonSize - margin, buttonSize * 1.2, 'JUMP', this.touchControls.jump);
        
        // Switch/Super buttons
        this.drawTouchButton(this.canvas.width - buttonSize * 2 - margin - 10, this.canvas.height - buttonSize - margin, buttonSize, 'SWITCH', this.touchControls.switch);
        this.drawTouchButton(this.canvas.width - buttonSize - margin, this.canvas.height - buttonSize - margin, buttonSize, 'SUPER', this.touchControls.super);
    }
    
    drawTouchButton(x, y, size, text, pressed) {
        this.ctx.save();
        
        // Button background
        this.ctx.fillStyle = pressed ? 'rgba(231, 76, 60, 0.8)' : 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(x, y, size, size);
        
        // Button border
        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, size, size);
        
        // Button text
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = `bold ${size / 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x + size / 2, y + size / 2 + size / 8);
        
        this.ctx.restore();
        this.ctx.textAlign = 'left';
    }
    
    renderPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Press P to resume', this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        this.ctx.textAlign = 'left';
    }
    
    renderGameOverScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        if (this.score >= this.highScore) {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 100);
        
        this.ctx.textAlign = 'left';
    }
    
    renderVictoryScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Victory text with golden glow
        this.ctx.save();
        this.ctx.shadowColor = '#f1c40f';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('VICTORY!', this.canvas.width / 2, this.canvas.height / 2 - 80);
        this.ctx.restore();
        
        this.ctx.fillStyle = '#27ae60';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('You survived the Brooklyn streets!', this.canvas.width / 2, this.canvas.height / 2 - 30);
        this.ctx.fillText('Song fragment collected!', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        
        if (this.score >= this.highScore) {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 + 70);
        }
        
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press R to play again', this.canvas.width / 2, this.canvas.height / 2 + 120);
        
        this.ctx.textAlign = 'left';
    }
    
    // Game management
    startGame() {
        this.gameState = 'playing';
        this.resetGame();
    }
    
    resetGame() {
        this.score = 0;
        this.gameTime = this.config.game.duration;
        this.gameSpeed = 1;
        this.frameCount = 0;
        
        // Reset all characters
        Object.values(this.characters).forEach(char => {
            char.currentHealth = char.maxHealth;
            char.superMeter = 0;
            char.isAlive = true;
        });
        
        this.currentCharacter = 'tireek';
        this.availableCharacters = ['tireek', 'tryston'];
        
        // Reset player
        this.player.x = 100;
        this.player.y = this.canvas.height - 120;
        this.player.velocityY = 0;
        this.player.onGround = true;
        this.player.isInvulnerable = false;
        this.player.invulnerabilityTime = 0;
        
        // Clear arrays
        this.obstacles = [];
        this.microphones = [];
        this.particles = [];
        
        this.gameState = 'playing';
    }
    
    loadHighScore() {
        return parseInt(localStorage.getItem('firstOffHighScore') || '0');
    }
    
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('firstOffHighScore', this.highScore.toString());
        }
    }
    
    // Game loop
    startGameLoop() {
        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            
            // Update
            this.updatePlayer();
            this.updateObstacles();
            this.updateMicrophones();
            this.updateParticles();
            this.updateGameLogic();
            
            // Render
            this.render();
            
            // Continue loop
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    // Set up page styles
    document.body.style.margin = '0';
    document.body.style.padding = '20px';
    document.body.style.backgroundColor = '#2c3e50';
    document.body.style.display = 'flex';
    document.body.style.justifyContent = 'center';
    document.body.style.alignItems = 'center';
    document.body.style.minHeight = '100vh';
    document.body.style.fontFamily = 'Arial, sans-serif';
    
    // Create game instance
    const game = new FirstOffGame();
    
    // Make game globally accessible for debugging
    window.firstOffGame = game;
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.firstOffGame) {
        // Responsive adjustments could be added here
    }
});