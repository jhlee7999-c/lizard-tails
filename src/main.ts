import { Game } from './engine/Game';

console.log('Lizard.io: main.ts executing');

const init = () => {
  console.log('Lizard.io: DOM loaded');
  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn');
  
  if (!startBtn || !startOverlay) {
    console.error('Lizard.io: Required UI elements not found!');
    return;
  }

  startBtn.onclick = () => {
    console.log('Lizard.io: Start button clicked');
    try {
      startOverlay.style.display = 'none';
      const game = new Game('gameCanvas');
      game.loop();
      console.log('Lizard.io: Game loop started');
    } catch (err) {
      console.error('Lizard.io: Failed to start game:', err);
      alert('Game failed to start. Check console for details.');
    }
  };
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
