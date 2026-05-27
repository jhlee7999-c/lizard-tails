import { Game } from './engine/Game';

console.log('Lizard.io: main.ts module loaded');

const startGame = () => {
  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
  const loadingMessage = document.getElementById('loadingMessage');
  
  if (!startBtn || !startOverlay) {
    console.error('Lizard.io: UI elements missing');
    return;
  }

  startBtn.addEventListener('click', () => {
    console.log('Lizard.io: Play button clicked');
    
    startBtn.style.display = 'none';
    if (loadingMessage) loadingMessage.style.display = 'block';

    // Give browser a moment to render the loading state
    setTimeout(() => {
      try {
        console.log('Lizard.io: Starting Game instance');
        const game = new Game('gameCanvas');
        
        console.log('Lizard.io: Game loop beginning');
        startOverlay.style.display = 'none';
        game.loop();
      } catch (err: any) {
        console.error('Lizard.io: Init error', err);
        alert('Initialization Error: ' + err.message);
        startBtn.style.display = 'block';
        if (loadingMessage) loadingMessage.style.display = 'none';
      }
    }, 50);
  });
};

// Start script
if (document.readyState === 'complete') {
  startGame();
} else {
  window.addEventListener('load', startGame);
}
