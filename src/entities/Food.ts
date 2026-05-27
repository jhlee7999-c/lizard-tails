import { CONFIG, COLORS } from '../constants';

export class Food {
  x: number;
  y: number;
  color: string;
  radius: number = CONFIG.FOOD_RADIUS;
  value: number = 1;

  constructor(x: number, y: number, color?: string, value: number = 1) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.color = color || COLORS.FOOD[Math.floor(Math.random() * COLORS.FOOD.length)];
    if (value > 1) this.radius *= 1.5;
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    const pulse = 0.9 + Math.sin(time * 0.005) * 0.1;
    const currentRadius = this.radius * pulse;

    ctx.beginPath();
    ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
    
    // Simple glow
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, currentRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}
