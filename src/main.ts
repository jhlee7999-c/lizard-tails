import { Game } from './engine/Game';

console.log('Lizard.io: main.ts executing');

const init = () => {
  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
  const loadingMessage = document.getElementById('loadingMessage');
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  
  if (!startBtn || !startOverlay || !canvas) {
    const errorMsg = 'Lizard.io: Critical UI elements missing!';
    console.error(errorMsg);
    alert(errorMsg);
    return;
  }

  startBtn.onclick = () => {
    console.log('Lizard.io: Play button clicked');
    
    // UI Feedback: Disable button and show loading
    startBtn.disabled = true;
    startBtn.style.opacity = '0.5';
    if (loadingMessage) loadingMessage.style.display = 'block';

    // Delay slightly to allow UI to update before heavy initialization
    setTimeout(() => {
      try {
        console.log('Lizard.io: Initializing Game Engine...');
        const game = new Game('gameCanvas');
        
        // Final check before hiding overlay
        if (game) {
          console.log('Lizard.io: Game initialized, starting loop');
          startOverlay.style.display = 'none';
          game.loop();
        } else {
          throw new Error('Game object creation failed');
        }
      } catch (err) {
        console.error('Lizard.io: Initialization failed:', err);
        alert(`Failed to start game: ${err.message}\nCheck browser console for more details.`);
        
        // Re-enable button on failure
        startBtn.disabled = false;
        startBtn.style.opacity = '1.0';
        if (loadingMessage) loadingMessage.style.display = 'none';
      }
    }, 100);
  };
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
