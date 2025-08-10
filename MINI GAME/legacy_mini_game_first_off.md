
# Legacy Mini Game - "First Off"

## Game Concept

### Setting:
- **Location**: Brooklyn, New York City
- **Theme**: Urban, gritty streets inspired by New York street culture and hip-hop vibes.
- **Playable Characters**: 
  - **Tireek** and **Tryston**, members of the rap group "++".
  - Players can choose and switch between characters during the game.

### Gameplay Mechanics:
- **Objective**: Survive and reach the end to collect a fragment of the song "First Off."
- **Movement**: Players can control the movement of characters by jumping over obstacles and avoiding enemies.
- **Obstacles**: 
  - **Vinyl Records** (spinning obstacles)
  - **Gangsters** (enemies)
  - **Homeless People** (blocking your path)
- **Hit Meter**: Characters have a hit meter; too many hits result in death.
- **Super Moves**: Characters have unique super moves triggered by collecting microphones:
  - **Tireek's Super Move**: A powerful punch clearing enemies.
  - **Tryston's Super Move**: A dynamic yell knocking back enemies.
  
### Difficulty:
- **Increasing Speed**: The speed of the game increases as time progresses.
- **Multiple Boss Waves**: Near the end, enemies increase, and a "boss wave" challenge appears.

## Basic Game Code (HTML5, JavaScript)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legacy Mini Game - "First Off"</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #333; }
        canvas { display: block; }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script>
        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");

        canvas.width = 800;
        canvas.height = 600;

        // Player properties
        const player = {
            x: 100,
            y: canvas.height - 150,
            width: 50,
            height: 70,
            speed: 5,
            velocityY: 0,
            gravity: 0.5,
            jumpPower: -12,
            onGround: false
        };

        // Obstacle properties
        const obstacles = [];
        let score = 0;
        let gameTime = 180; // 3 minutes in seconds
        let gameOver = false;

        // Control keys
        const keys = {
            right: false,
            left: false,
            jump: false
        };

        // Create obstacles
        function createObstacle() {
            const size = Math.random() * 30 + 20; // random size
            const obstacle = {
                x: canvas.width,
                y: canvas.height - size,
                width: size,
                height: size,
                speed: 2 + Math.random() * 3
            };
            obstacles.push(obstacle);
        }

        // Update player position and state
        function updatePlayer() {
            if (keys.right) {
                player.x += player.speed;
            }
            if (keys.left) {
                player.x -= player.speed;
            }
            if (keys.jump && player.onGround) {
                player.velocityY = player.jumpPower;
                player.onGround = false;
            }

            player.y += player.velocityY;
            if (player.y > canvas.height - player.height) {
                player.y = canvas.height - player.height;
                player.onGround = true;
            } else {
                player.velocityY += player.gravity;
            }
        }

        // Update obstacle positions
        function updateObstacles() {
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obs = obstacles[i];
                obs.x -= obs.speed;
                if (obs.x + obs.width < 0) {
                    obstacles.splice(i, 1);
                    score++;
                }

                // Collision detection
                if (player.x < obs.x + obs.width && player.x + player.width > obs.x &&
                    player.y < obs.y + obs.height && player.y + player.height > obs.y) {
                    gameOver = true;
                }
            }
        }

        // Draw game elements
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw player
            ctx.fillStyle = "blue";
            ctx.fillRect(player.x, player.y, player.width, player.height);

            // Draw obstacles
            ctx.fillStyle = "red";
            obstacles.forEach(obs => ctx.fillRect(obs.x, obs.y, obs.width, obs.height));

            // Draw score and timer
            ctx.fillStyle = "white";
            ctx.font = "20px Arial";
            ctx.fillText("Score: " + score, 10, 30);
            ctx.fillText("Time: " + gameTime, canvas.width - 100, 30);

            if (gameOver) {
                ctx.fillStyle = "red";
                ctx.font = "50px Arial";
                ctx.fillText("GAME OVER!", canvas.width / 2 - 150, canvas.height / 2);
            }
        }

        // Update game
        function update() {
            if (!gameOver) {
                updatePlayer();
                updateObstacles();
                gameTime--;

                if (gameTime <= 0) {
                    gameOver = true;
                }

                // Create new obstacles
                if (Math.random() < 0.02) {
                    createObstacle();
                }
            }

            draw();
            requestAnimationFrame(update);
        }

        // Handle key events
        window.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") keys.right = true;
            if (e.key === "ArrowLeft") keys.left = true;
            if (e.key === "ArrowUp") keys.jump = true;
        });

        window.addEventListener("keyup", (e) => {
            if (e.key === "ArrowRight") keys.right = false;
            if (e.key === "ArrowLeft") keys.left = false;
            if (e.key === "ArrowUp") keys.jump = false;
        });

        // Start the game
        update();

    </script>
</body>
</html>
```

