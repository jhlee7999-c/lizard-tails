import { Game } from './engine/Game';

window.addEventListener('load', () => {
  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn');
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

  if (startBtn && startOverlay) {
    startBtn.addEventListener('click', () => {
      startOverlay.style.display = 'none';
      const game = new Game('gameCanvas');
      game.loop();
    });
  }
});
