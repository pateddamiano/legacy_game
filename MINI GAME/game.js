class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.gameState = 'loading'; // 'loading', 'startScreen', 'playing', 'paused', 'gameOver', 'victory'
        this.selectedCharacter = 'tireek';
        this.highScore = this.loadHighScore();
        this.score = 0;
        this.gameTime = 180; // 3 minutes
        this.gameSpeed = 1;
        this.lastTime = 0;
        
        // Characters
        this.characters = {
            tireek: {
                name: 'Tireek',
                color: '#3498db',
                superMove: 'punch',
                superCooldown: 0,
                maxHealth: 100,
                currentHealth: 100
            },
            tryston: {
                name: 'Tryston',
                color: '#e67e22',
                superMove: 'yell',
                superCooldown: 0,
                maxHealth: 100,
                currentHealth: 100
            }
        };
        
        this.currentCharacter = 'tireek';
        
        // Player properties
        this.player = {
            x: 100,
            y: this.canvas.height - 150,
            width: 40,
            height: 60,
            speed: 5,
            velocityY: 0,
            gravity: 0.6,
            jumpPower: -15,
            onGround: false,
            isInvulnerable: false,
            invulnerabilityTime: 0
        };
        
        // Game objects
        this.obstacles = [];
        this.microphones = [];
        this.particles = [];
        
        // Controls
        this.keys = {
            left: false,
            right: false,
            up: false,
            space: false,
            enter: false
        };
        
        this.initializeEventListeners();
        this.initializeTouchControls();
        this.showLoadingScreen();
        this.gameLoop();
    }
    
    initializeEventListeners() {
        window.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'ArrowLeft':
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                    this.keys.right = true;
                    break;
                case 'ArrowUp':
                    this.keys.up = true;
                    break;
                case 'Space':
                    if (!this.keys.space) {
                        this.switchCharacter();
                    }
                    this.keys.space = true;
                    e.preventDefault();
                    break;
                case 'Enter':
                    if (!this.keys.enter) {
                        this.useSuperMove();
                    }
                    this.keys.enter = true;
                    break;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'ArrowLeft':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                    this.keys.right = false;
                    break;
                case 'ArrowUp':
                    this.keys.up = false;
                    break;
                case 'Space':
                    this.keys.space = false;
                    break;
                case 'Enter':
                    this.keys.enter = false;
                    break;
            }
        });
    }
    
    initializeTouchControls() {
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const jumpBtn = document.getElementById('jumpBtn');
        const switchBtn = document.getElementById('switchBtn');
        const superBtn = document.getElementById('superBtn');
        
        const addTouchEvents = (btn, keyName, action = null) => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys[keyName] = true;
                if (action) action();
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[keyName] = false;
            });
            
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.keys[keyName] = true;
                if (action) action();
            });
            
            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.keys[keyName] = false;
            });
        };
        
        addTouchEvents(leftBtn, 'left');
        addTouchEvents(rightBtn, 'right');
        addTouchEvents(jumpBtn, 'up');
        addTouchEvents(switchBtn, 'space', () => this.switchCharacter());
        addTouchEvents(superBtn, 'enter', () => this.useSuperMove());
        
        // Character selection
        document.querySelectorAll('.character-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.character-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedCharacter = option.dataset.character;
            });
        });
        
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
    }
    
    showLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('startScreen').classList.remove('hidden');
            this.gameState = 'startScreen';
            document.getElementById('highScoreDisplay').textContent = this.highScore;
            
            // Select default character
            document.querySelector(`.character-option[data-character=\"${this.selectedCharacter}\"]`).classList.add('selected');
        }, 2000);
    }
    
    startGame() {
        document.getElementById('startScreen').classList.add('hidden');
        this.currentCharacter = this.selectedCharacter;
        this.gameState = 'playing';
        this.score = 0;
        this.gameTime = 180;
        this.gameSpeed = 1;
        
        // Reset characters health
        Object.values(this.characters).forEach(char => {
            char.currentHealth = char.maxHealth;
            char.superCooldown = 0;
        });
        
        // Reset player
        this.player.x = 100;
        this.player.y = this.canvas.height - 150;
        this.player.velocityY = 0;
        this.player.isInvulnerable = false;
        this.player.invulnerabilityTime = 0;
        
        // Clear obstacles
        this.obstacles = [];
        this.microphones = [];
        this.particles = [];
        
        this.updateUI();
    }
    
    loadHighScore() {
        return parseInt(localStorage.getItem('firstOffHighScore') || '0');
    }
    
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('firstOffHighScore', this.highScore.toString());
        }
    }"
    
    switchCharacter() {
        if (this.gameState !== 'playing') return;
        
        this.currentCharacter = this.currentCharacter === 'tireek' ? 'tryston' : 'tireek';
        this.updateUI();
        
        // Visual effect for character switch
        this.createParticles(this.player.x + this.player.width/2, this.player.y + this.player.height/2, 
                           this.characters[this.currentCharacter].color, 15);
    }
    
    useSuperMove() {
        if (this.gameState !== 'playing') return;
        
        const character = this.characters[this.currentCharacter];
        if (character.superCooldown > 0) return;
        
        character.superCooldown = 180; // 3 seconds at 60fps
        
        if (character.superMove === 'punch') {
            this.tireekPunch();
        } else if (character.superMove === 'yell') {
            this.trystonYell();
        }
    }
    
    tireekPunch() {
        // Clear enemies in front of player
        const punchRange = 150;
        const punchY = this.player.y;
        
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            if (obs.x >= this.player.x && obs.x <= this.player.x + punchRange &&
                Math.abs(obs.y - punchY) < 100) {
                this.obstacles.splice(i, 1);
                this.score += 5;
                this.createParticles(obs.x, obs.y, '#e74c3c', 10);
            }
        }
        
        // Visual effect
        this.createSuperMoveEffect('PUNCH!', '#3498db');
    }
    
    trystonYell() {
        // Knockback all enemies on screen
        this.obstacles.forEach(obs => {
            obs.x += 100; // Push enemies back
            obs.speed *= 0.5; // Slow them down temporarily
        });
        
        // Visual effect
        this.createSuperMoveEffect('YELL!', '#e67e22');
    }
    
    createSuperMoveEffect(text, color) {
        const effect = document.createElement('div');
        effect.textContent = text;
        effect.style.position = 'absolute';
        effect.style.left = '50%';
        effect.style.top = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.fontSize = '48px';
        effect.style.fontWeight = 'bold';
        effect.style.color = color;
        effect.style.textShadow = '3px 3px 6px rgba(0,0,0,0.8)';
        effect.style.pointerEvents = 'none';
        effect.style.zIndex = '1000';
        effect.className = 'super-move-effect';
        
        document.body.appendChild(effect);
        
        setTimeout(() => {
            document.body.removeChild(effect);
        }, 500);
    }
    
    createObstacle() {
        const types = ['vinyl', 'gangster', 'homeless'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const obstacle = {
            type: type,
            x: this.canvas.width,
            y: this.canvas.height - 100,
            width: 40,
            height: 60,
            speed: 3 * this.gameSpeed,
            health: 1
        };
        
        // Adjust properties based on type
        switch(type) {
            case 'vinyl':
                obstacle.width = 30;
                obstacle.height = 30;
                obstacle.y = this.canvas.height - 50;
                obstacle.rotation = 0;
                obstacle.rotationSpeed = 0.2;
                break;
            case 'gangster':
                obstacle.speed *= 1.2;
                obstacle.health = 2;
                obstacle.color = '#8e44ad';
                break;
            case 'homeless':
                obstacle.speed *= 0.8;
                obstacle.width = 50;
                obstacle.color = '#95a5a6';
                break;
        }
        
        this.obstacles.push(obstacle);
    }
    
    createMicrophone() {
        const microphone = {
            x: this.canvas.width,
            y: this.canvas.height - 200 - Math.random() * 100,
            width: 20,
            height: 30,
            speed: 2 * this.gameSpeed,
            collected: false,
            bobOffset: Math.random() * Math.PI * 2
        };
        
        this.microphones.push(microphone);
    }
    
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                color: color,
                life: 30,
                maxLife: 30
            });
        }
    }
    
    updatePlayer() {
        if (this.gameState !== 'playing') return;
        
        // Movement
        if (this.keys.left && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys.right && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
        if (this.keys.up && this.player.onGround) {
            this.player.velocityY = this.player.jumpPower;
            this.player.onGround = false;
        }
        
        // Gravity
        this.player.y += this.player.velocityY;
        this.player.velocityY += this.player.gravity;
        
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
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= obs.speed;
            
            // Update rotation for vinyl records
            if (obs.type === 'vinyl') {
                obs.rotation += obs.rotationSpeed;
            }
            
            // Remove obstacles that are off-screen
            if (obs.x + obs.width < 0) {
                this.obstacles.splice(i, 1);
                this.score++;
                continue;
            }
            
            // Collision detection
            if (!this.player.isInvulnerable &&
                this.player.x < obs.x + obs.width &&
                this.player.x + this.player.width > obs.x &&
                this.player.y < obs.y + obs.height &&
                this.player.y + this.player.height > obs.y) {
                
                this.playerHit();
            }
        }
    }
    
    updateMicrophones() {
        for (let i = this.microphones.length - 1; i >= 0; i--) {
            const mic = this.microphones[i];
            mic.x -= mic.speed;
            mic.bobOffset += 0.1;
            
            // Remove microphones that are off-screen
            if (mic.x + mic.width < 0) {
                this.microphones.splice(i, 1);
                continue;
            }
            
            // Collection detection
            if (this.player.x < mic.x + mic.width &&
                this.player.x + this.player.width > mic.x &&
                this.player.y < mic.y + mic.height &&
                this.player.y + this.player.height > mic.y) {
                
                this.microphones.splice(i, 1);
                this.collectMicrophone();
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    playerHit() {
        if (this.player.isInvulnerable) return;
        
        const character = this.characters[this.currentCharacter];
        character.currentHealth -= 20;
        
        this.player.isInvulnerable = true;
        this.player.invulnerabilityTime = 120; // 2 seconds of invulnerability
        
        this.createParticles(this.player.x + this.player.width/2, 
                           this.player.y + this.player.height/2, '#e74c3c', 8);
        
        if (character.currentHealth <= 0) {
            this.gameState = 'gameOver';
        }
        
        this.updateUI();
    }
    
    collectMicrophone() {
        const character = this.characters[this.currentCharacter];
        character.superCooldown = Math.max(0, character.superCooldown - 60);
        this.score += 10;
        
        this.createParticles(this.player.x + this.player.width/2, 
                           this.player.y + this.player.height/2, '#f1c40f', 12);
        
        this.updateUI();
    }
    
    updateGameLogic() {
        if (this.gameState !== 'playing') return;
        
        // Decrease cooldowns
        Object.values(this.characters).forEach(char => {
            if (char.superCooldown > 0) {
                char.superCooldown--;
            }
        });
        
        // Increase game speed over time
        this.gameSpeed = 1 + (180 - this.gameTime) * 0.01;
        
        // Spawn obstacles
        if (Math.random() < 0.02 * this.gameSpeed) {
            this.createObstacle();
        }
        
        // Spawn microphones
        if (Math.random() < 0.005) {
            this.createMicrophone();
        }
        
        // Update timer
        this.gameTime -= 1/60;
        if (this.gameTime <= 0) {
            this.gameState = 'victory';
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.3);
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.canvas.height * 0.3, this.canvas.width, this.canvas.height * 0.4);
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(0, this.canvas.height * 0.7, this.canvas.width, this.canvas.height * 0.3);
        
        // Draw player
        const character = this.characters[this.currentCharacter];
        this.ctx.fillStyle = this.player.isInvulnerable && Math.floor(Date.now() / 100) % 2 ? 
                            'rgba(255,255,255,0.5)' : character.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw character name above player
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(character.name, this.player.x, this.player.y - 5);
        
        // Draw obstacles
        this.obstacles.forEach(obs => {
            this.ctx.save();
            
            if (obs.type === 'vinyl') {
                this.ctx.translate(obs.x + obs.width/2, obs.y + obs.height/2);
                this.ctx.rotate(obs.rotation);
                this.ctx.fillStyle = '#2c3e50';
                this.ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.fillRect(-5, -5, 10, 10);
            } else {
                this.ctx.fillStyle = obs.color || '#e74c3c';
                this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                
                // Draw type indicator
                this.ctx.fillStyle = 'white';
                this.ctx.font = '10px Arial';
                this.ctx.fillText(obs.type[0].toUpperCase(), obs.x + 5, obs.y + 15);
            }
            
            this.ctx.restore();
        });
        
        // Draw microphones
        this.microphones.forEach(mic => {
            const bobY = mic.y + Math.sin(mic.bobOffset) * 5;
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.fillRect(mic.x, bobY, mic.width, mic.height);
            this.ctx.fillStyle = '#e67e22';
            this.ctx.fillRect(mic.x + 5, bobY + 5, 10, 20);
        });
        
        // Draw particles
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.fillRect(particle.x, particle.y, 3, 3);
        });
        
        // Draw game over screen
        if (this.gameState === 'gameOver') {
            this.saveHighScore();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2 - 50);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 20);
            
            if (this.score === this.highScore) {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width/2, this.canvas.height/2 + 50);
            }
            
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Refresh to play again', this.canvas.width/2, this.canvas.height/2 + 80);
            this.ctx.textAlign = 'left';
        }
        
        // Draw victory screen
        if (this.gameState === 'victory') {
            this.saveHighScore();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#27ae60';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('VICTORY!', this.canvas.width/2, this.canvas.height/2 - 50);
            
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('You collected the song fragment!', this.canvas.width/2, this.canvas.height/2);
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 40);
            
            if (this.score === this.highScore) {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width/2, this.canvas.height/2 + 70);
            }
            
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Refresh to play again', this.canvas.width/2, this.canvas.height/2 + 100);
            this.ctx.textAlign = 'left';
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('timer').textContent = `Time: ${Math.ceil(this.gameTime)}`;
        
        const charElement = document.getElementById('character');
        const character = this.characters[this.currentCharacter];
        charElement.textContent = `Character: ${character.name}`;
        charElement.className = `character-${this.currentCharacter}`;
        
        const hitBarFill = document.getElementById('hitBarFill');
        const healthPercent = (character.currentHealth / character.maxHealth) * 100;
        hitBarFill.style.width = `${healthPercent}%`;
        
        if (healthPercent > 60) {
            hitBarFill.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
        } else if (healthPercent > 30) {
            hitBarFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        } else {
            hitBarFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.updatePlayer();
            this.updateObstacles();
            this.updateMicrophones();
            this.updateParticles();
            this.updateGameLogic();
        } else if (this.gameState === 'loading' || this.gameState === 'startScreen') {
            // Only update particles for visual effects
            this.updateParticles();
        }
        
        this.draw();
        
        if (this.gameState === 'playing') {
            this.updateUI();
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Game();
});