import { Game } from './engine/Game';

window.addEventListener('load', () => {
  const game = new Game('gameCanvas');
  game.loop();
});
