import { Lizard } from '../entities/Lizard';
import { Food } from '../entities/Food';
import { CONFIG, COLORS } from '../constants';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Lizard;
  private bots: Lizard[] = [];
  private foods: Food[] = [];
  private keys: Set<string> = new Set();
  private scoreElement: HTMLElement | null;
  private lastTime: number = 0;
  private gameOver: boolean = false;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!; // Performance optimization
    this.scoreElement = document.getElementById('score');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.player = new Lizard(CONFIG.WORLD_SIZE / 2, CONFIG.WORLD_SIZE / 2, COLORS.PLAYER);
    
    this.initWorld();
    this.setupInput();
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private initWorld() {
    for (let i = 0; i < CONFIG.FOOD_COUNT; i++) {
      this.spawnFood();
    }
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
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') this.player.isBoosted = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.player.isBoosted = false;
    });
  }

  private update(deltaTime: number) {
    if (this.gameOver) return;

    // 1. Player Keyboard Control
    let moveX = 0;
    let moveY = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveY -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveY += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;

    let targetAngle = undefined;
    if (moveX !== 0 || moveY !== 0) {
      targetAngle = Math.atan2(moveY, moveX);
    }
    
    this.player.update(deltaTime, targetAngle);

    // 2. Update Bots
    this.bots.forEach(bot => {
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
        const angle = Math.atan2(nearestFood.y - bot.y, nearestFood.x - bot.x);
        bot.update(deltaTime, angle);
      } else {
        bot.update(deltaTime);
      }
      
      if (bot.x < 100 || bot.x > CONFIG.WORLD_SIZE - 100 || bot.y < 100 || bot.y > CONFIG.WORLD_SIZE - 100) {
        const angleToCenter = Math.atan2(CONFIG.WORLD_SIZE / 2 - bot.y, CONFIG.WORLD_SIZE / 2 - bot.x);
        bot.update(deltaTime, angleToCenter);
      }
    });

    this.checkCollisions();

    if (this.player.x < 0 || this.player.x > CONFIG.WORLD_SIZE || 
        this.player.y < 0 || this.player.y > CONFIG.WORLD_SIZE) {
      this.doGameOver();
    }

    if (this.scoreElement) {
      this.scoreElement.innerText = `${this.player.score} (Length: ${this.player.segments.length})`;
    }
  }

  private checkCollisions() {
    const allLizards = [this.player, ...this.bots];

    allLizards.forEach(liz => {
      const head = liz.segments[0];
      if (!head) return;

      for (let i = this.foods.length - 1; i >= 0; i--) {
        const food = this.foods[i];
        const dist = Math.sqrt((head.x - food.x) ** 2 + (head.y - food.y) ** 2);
        if (dist < CONFIG.BASE_SIZE * 1.4 + food.radius) {
          liz.grow(food.value === 1 ? CONFIG.GROWTH_PER_FOOD : CONFIG.GROWTH_PER_FOOD * 2);
          this.foods.splice(i, 1);
          if (food.value === 1) this.spawnFood();
        }
      }

      if (!liz.invincible) {
        allLizards.forEach(other => {
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
        this.bots = this.bots.filter(b => b.id !== liz.id);
        setTimeout(() => this.spawnBot(), 2000);
      } else {
        this.doGameOver();
      }
      return;
    }

    const removed = liz.cutTail();
    removed.forEach(seg => this.spawnFood(seg.x, seg.y, 2));
    if (!liz.isBot) this.flashScreen();
  }

  private flashScreen() {
    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(255, 0, 0, 0.3)', pointerEvents: 'none', transition: 'opacity 0.5s'
    });
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => document.body.removeChild(flash), 500);
    }, 50);
  }

  private doGameOver() {
    this.gameOver = true;
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: '100'
    });

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
    this.ctx.fillStyle = COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2 - this.player.x, this.canvas.height / 2 - this.player.y);

    this.drawGrid();
    this.ctx.strokeStyle = COLORS.BORDER;
    this.ctx.lineWidth = 5;
    this.ctx.strokeRect(0, 0, CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);

    this.foods.forEach(f => f.draw(this.ctx, time));
    this.bots.forEach(b => b.draw(this.ctx, time));
    this.player.draw(this.ctx, time);

    this.ctx.restore();
    this.drawMinimap();
  }

  private drawGrid() {
    this.ctx.strokeStyle = COLORS.GRID;
    this.ctx.lineWidth = 1;
    const size = 100;
    this.ctx.beginPath();
    for (let x = 0; x <= CONFIG.WORLD_SIZE; x += size) {
      this.ctx.moveTo(x, 0); this.ctx.lineTo(x, CONFIG.WORLD_SIZE);
    }
    for (let y = 0; y <= CONFIG.WORLD_SIZE; y += size) {
      this.ctx.moveTo(0, y); this.ctx.lineTo(CONFIG.WORLD_SIZE, y);
    }
    this.ctx.stroke();
  }

  private drawMinimap() {
    const size = 150;
    const padding = 20;
    const x = this.canvas.width - size - padding;
    const y = padding;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x, y, size, size);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);

    const scale = size / CONFIG.WORLD_SIZE;
    this.ctx.fillStyle = 'white';
    this.foods.forEach(f => this.ctx.fillRect(x + f.x * scale, y + f.y * scale, 1, 1));
    this.ctx.fillStyle = 'red';
    this.bots.forEach(b => this.ctx.fillRect(x + b.x * scale, y + b.y * scale, 2, 2));
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillRect(x + this.player.x * scale, y + this.player.y * scale, 3, 3);

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
