import { CONFIG } from '../constants';

export interface Point {
  x: number;
  y: number;
}

export class Lizard {
  x: number;
  y: number;
  angle: number = 0;
  speed: number = CONFIG.BASE_SPEED;
  score: number = 0;
  segments: Point[] = [];
  targetLength: number = CONFIG.INITIAL_SEGMENTS;
  color: string;
  isBoosted: boolean = false;
  invincible: boolean = false;
  isBot: boolean = false;
  id: string;

  private boostTimer: number = 0;

  constructor(x: number, y: number, color: string, isBot: boolean = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.isBot = isBot;
    this.id = Math.random().toString(36).substr(2, 9);

    for (let i = 0; i < CONFIG.INITIAL_SEGMENTS; i++) {
      this.segments.push({ x, y });
    }
  }

  // Updated to accept target angle directly or keyboard inputs
  update(deltaTime: number, targetAngle?: number) {
    // 1. Smooth rotation
    if (targetAngle !== undefined) {
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.angle += angleDiff * CONFIG.ROTATION_SPEED;
    }

    // 2. Movement
    this.speed = this.isBoosted && this.segments.length > CONFIG.MIN_SEGMENTS 
      ? CONFIG.BOOST_SPEED 
      : CONFIG.BASE_SPEED;
    
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // 3. Segments trail logic
    this.segments.unshift({ x: this.x, y: this.y });
    
    if (this.segments.length > this.targetLength) {
      this.segments.pop();
    }

    // 4. Boost consumption
    if (this.isBoosted && this.segments.length > CONFIG.MIN_SEGMENTS) {
      this.boostTimer += deltaTime;
      if (this.boostTimer >= 500) {
        this.targetLength = Math.max(CONFIG.MIN_SEGMENTS, this.targetLength - 1);
        this.boostTimer = 0;
      }
    } else {
      this.boostTimer = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    if (this.invincible && Math.floor(time / 100) % 2 === 0) return;

    const baseSize = CONFIG.BASE_SIZE;

    // Draw body segments
    for (let i = this.segments.length - 1; i > 0; i--) {
      const seg = this.segments[i];
      const progress = i / this.segments.length;
      const radius = baseSize * (1 - progress * 0.7);

      ctx.beginPath();
      ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      if (i > 0) {
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fill();
      }
      ctx.closePath();

      if ([4, 8, 12, 16].includes(i)) {
        this.drawLegs(ctx, seg, i, time);
      }
    }

    // Draw head
    const head = this.segments[0];
    const headRadius = baseSize * 1.4;
    
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    const eyeOffset = headRadius * 0.5;
    const eyeRadius = headRadius * 0.25;
    const pupilRadius = eyeRadius * 0.5;

    const drawEye = (side: number) => {
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(eyeOffset * 0.8, side * eyeOffset, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(eyeOffset * 1.0, side * eyeOffset, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
    };

    drawEye(1);
    drawEye(-1);

    ctx.restore();
  }

  private drawLegs(ctx: CanvasRenderingContext2D, seg: Point, index: number, time: number) {
    const legLength = 12;
    const speedFactor = this.speed / CONFIG.BASE_SPEED;
    const oscillation = Math.sin(time * 0.01 * speedFactor + index) * 4;
    
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const drawLeg = (side: number) => {
      const legAngle = this.angle + (side * Math.PI / 2);
      const startX = seg.x;
      const startY = seg.y;
      const endX = startX + Math.cos(legAngle) * (legLength + oscillation);
      const endY = startY + Math.sin(legAngle) * (legLength + oscillation);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    };

    drawLeg(1);
    drawLeg(-1);
  }

  grow(value: number = 3) {
    this.targetLength += value;
    this.score += 10;
  }

  cutTail() {
    if (this.segments.length <= CONFIG.MIN_SEGMENTS) return [];
    
    const cutLength = Math.floor(this.segments.length / 2);
    const removed = this.segments.splice(this.segments.length - cutLength, cutLength);
    this.targetLength = this.segments.length;
    this.score = Math.floor(this.score / 2);
    
    this.invincible = true;
    setTimeout(() => this.invincible = false, CONFIG.INVINCIBILITY_DURATION);
    
    return removed;
  }
}
