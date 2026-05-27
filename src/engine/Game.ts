import { Lizard } from '../entities/Lizard';
import { Food } from '../entities/Food';
import { CONFIG, COLORS } from '../constants';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Lizard;
  private bots: Lizard[] = [];
  private foods: Food[] = [];
  private mouseX: number = 0;
  private mouseY: number = 0;
  private scoreElement: HTMLElement | null;
  private lastTime: number = 0;
  private gameOver: boolean = false;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.scoreElement = document.getElementById('score');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Initialize player in center
    this.player = new Lizard(CONFIG.WORLD_SIZE / 2, CONFIG.WORLD_SIZE / 2, COLORS.PLAYER);
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;

    this.initWorld();
    this.setupInput();
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private initWorld() {
    // Foods
    for (let i = 0; i < CONFIG.FOOD_COUNT; i++) {
      this.spawnFood();
    }

    // Bots
    for (let i = 0; i < CONFIG.BOT_COUNT; i++) {
      this.spawnBot();
    }
  }

  private spawnFood(x?: number, y?: number, value: number = 1) {
    const fx = x ?? Math.random() * CONFIG.WORLD_SIZE;
    const fy = y ?? Math.random() * CONFIG.WORLD_SIZE;
    this.foods.push(new Food(fx, fy, undefined, value));
  }

  private spawnBot() {
    const x = Math.random() * CONFIG.WORLD_SIZE;
    const y = Math.random() * CONFIG.WORLD_SIZE;
    const color = COLORS.BOTS[Math.floor(Math.random() * COLORS.BOTS.length)];
    this.bots.push(new Lizard(x, y, color, true));
  }

  private setupInput() {
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') this.player.isBoosted = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.player.isBoosted = false;
    });
  }

  private update(deltaTime: number) {
    if (this.gameOver) return;

    // 1. Update Player
    // Mouse relative to screen center (since camera follows player)
    const targetX = this.player.x + (this.mouseX - this.canvas.width / 2);
    const targetY = this.player.y + (this.mouseY - this.canvas.height / 2);
    this.player.update(targetX, targetY, deltaTime);

    // 2. Update Bots
    this.bots.forEach(bot => {
      // Simple AI: Find nearest food
      let nearestFood: Food | null = null;
      let minDist = 500;
      this.foods.forEach(f => {
        const d = Math.sqrt((f.x - bot.x) ** 2 + (f.y - bot.y) ** 2);
        if (d < minDist) {
          minDist = d;
          nearestFood = f;
        }
      });

      if (nearestFood) {
        bot.update(nearestFood.x, nearestFood.y, deltaTime);
      } else {
        // Just move straight or random
        bot.update(bot.x + Math.cos(bot.angle) * 100, bot.y + Math.sin(bot.angle) * 100, deltaTime);
      }
      
      // Boundary check for bots
      if (bot.x < 100 || bot.x > CONFIG.WORLD_SIZE - 100 || bot.y < 100 || bot.y > CONFIG.WORLD_SIZE - 100) {
        bot.update(CONFIG.WORLD_SIZE / 2, CONFIG.WORLD_SIZE / 2, deltaTime);
      }
    });

    // 3. Collision Checks
    this.checkCollisions();

    // 4. World Boundary Check
    if (this.player.x < 0 || this.player.x > CONFIG.WORLD_SIZE || 
        this.player.y < 0 || this.player.y > CONFIG.WORLD_SIZE) {
      this.doGameOver();
    }

    // 5. Update UI
    if (this.scoreElement) {
      this.scoreElement.innerText = `${this.player.score} (Length: ${this.player.segments.length})`;
    }
  }

  private checkCollisions() {
    const allLizards = [this.player, ...this.bots];

    allLizards.forEach(liz => {
      const head = liz.segments[0];

      // Food collision
      for (let i = this.foods.length - 1; i >= 0; i--) {
        const food = this.foods[i];
        const dist = Math.sqrt((head.x - food.x) ** 2 + (head.y - food.y) ** 2);
        if (dist < CONFIG.BASE_SIZE * 1.4 + food.radius) {
          liz.grow(food.value === 1 ? CONFIG.GROWTH_PER_FOOD : CONFIG.GROWTH_PER_FOOD * 2);
          this.foods.splice(i, 1);
          if (food.value === 1) this.spawnFood();
        }
      }

      // Body collision
      if (!liz.invincible) {
        allLizards.forEach(other => {
          // Don't collide with own first few segments
          const startIdx = (liz.id === other.id) ? 10 : 0;
          for (let i = startIdx; i < other.segments.length; i++) {
            const seg = other.segments[i];
            const dist = Math.sqrt((head.x - seg.x) ** 2 + (head.y - seg.y) ** 2);
            
            if (dist < 12) {
              this.handleCollision(liz);
              return;
            }
          }
        });
      }
    });
  }

  private handleCollision(liz: Lizard) {
    if (liz.segments.length <= CONFIG.MIN_SEGMENTS) {
      if (liz.isBot) {
        // Respawn bot
        this.bots = this.bots.filter(b => b.id !== liz.id);
        setTimeout(() => this.spawnBot(), 2000);
      } else {
        this.doGameOver();
      }
      return;
    }

    const removed = liz.cutTail();
    removed.forEach(seg => this.spawnFood(seg.x, seg.y, 2));
    
    if (!liz.isBot) {
      this.flashScreen();
    }
  }

  private flashScreen() {
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.5s';
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => document.body.removeChild(flash), 500);
    }, 50);
  }

  private doGameOver() {
    this.gameOver = true;
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '100';

    overlay.innerHTML = `
      <h1>Game Over</h1>
      <p>Score: ${this.player.score}</p>
      <button id="restartBtn" style="padding: 10px 20px; font-size: 1.2rem; cursor: pointer;">Restart</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById('restartBtn')?.addEventListener('click', () => location.reload());
  }

  private draw() {
    const time = performance.now();
    
    // Clear
    this.ctx.fillStyle = COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    // Camera follow
    this.ctx.translate(this.canvas.width / 2 - this.player.x, this.canvas.height / 2 - this.player.y);

    // Draw Grid
    this.drawGrid();

    // Draw World Borders
    this.ctx.strokeStyle = COLORS.BORDER;
    this.ctx.lineWidth = 5;
    this.ctx.strokeRect(0, 0, CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);

    // Draw Foods
    this.foods.forEach(f => f.draw(this.ctx, time));

    // Draw Bots
    this.bots.forEach(b => b.draw(this.ctx, time));

    // Draw Player
    this.player.draw(this.ctx, time);

    this.ctx.restore();

    // UI Layer (non-camera)
    this.drawMinimap();
  }

  private drawGrid() {
    this.ctx.strokeStyle = COLORS.GRID;
    this.ctx.lineWidth = 1;
    const size = 100;
    this.ctx.beginPath();
    for (let x = 0; x <= CONFIG.WORLD_SIZE; x += size) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CONFIG.WORLD_SIZE);
    }
    for (let y = 0; y <= CONFIG.WORLD_SIZE; y += size) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CONFIG.WORLD_SIZE, y);
    }
    this.ctx.stroke();
  }

  private drawMinimap() {
    const size = 150;
    const padding = 20;
    const x = this.canvas.width - size - padding;
    const y = padding;

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x, y, size, size);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);

    const scale = size / CONFIG.WORLD_SIZE;

    // Foods
    this.ctx.fillStyle = 'white';
    this.foods.forEach(f => {
      this.ctx.fillRect(x + f.x * scale, y + f.y * scale, 1, 1);
    });

    // Bots
    this.ctx.fillStyle = 'red';
    this.bots.forEach(b => {
      this.ctx.fillRect(x + b.x * scale, y + b.y * scale, 2, 2);
    });

    // Player
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillRect(x + this.player.x * scale, y + this.player.y * scale, 3, 3);

    // Camera view area
    const viewW = this.canvas.width * scale;
    const viewH = this.canvas.height * scale;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.strokeRect(
      x + (this.player.x - this.canvas.width/2) * scale,
      y + (this.player.y - this.canvas.height/2) * scale,
      viewW, viewH
    );
  }

  public loop(timestamp: number = 0) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }
}
