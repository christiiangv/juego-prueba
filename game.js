'use strict';

// Lógica pura del juego: no toca el DOM, así se puede probar con Node.
const DIRS = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};

class Game {
  constructor({ cols = 20, rows = 20, rng = Math.random } = {}) {
    this.cols = cols;
    this.rows = rows;
    this.rng = rng;
    this.reset();
  }

  reset() {
    const cx = this.cols >> 1, cy = this.rows >> 1;
    this.snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    this.prev = this.snake.map(s => ({ ...s }));
    this.dir = DIRS.right;
    this.queue = [];
    this.score = 0;
    this.status = 'ready'; // ready | playing | paused | over | won
    this.food = this.spawnFood();
  }

  start()  { if (this.status !== 'ready') this.reset(); this.status = 'playing'; }
  pause()  { if (this.status === 'playing') this.status = 'paused'; }
  resume() { if (this.status === 'paused') this.status = 'playing'; }

  // Los giros se guardan en una cola (máx. 2) y se aplican uno por paso.
  // Así dos pulsaciones rápidas no pueden hacer que la serpiente se dé la vuelta sobre sí misma.
  turn(d) {
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (this.queue.length >= 2) return false;
    if (d.x === last.x && d.y === last.y) return false;
    if (d.x === -last.x && d.y === -last.y) return false;
    this.queue.push(d);
    return true;
  }

  spawnFood() {
    const total = this.cols * this.rows;
    const taken = new Set(this.snake.map(s => s.y * this.cols + s.x));
    const free = total - taken.size;
    if (free <= 0) return null;
    let n = Math.min(free - 1, Math.floor(this.rng() * free));
    for (let i = 0; i < total; i++) {
      if (taken.has(i)) continue;
      if (n-- === 0) return { x: i % this.cols, y: (i / this.cols) | 0 };
    }
    return null;
  }

  interval() { return Math.max(75, 150 - this.score * 3); } // ms por paso

  step() {
    if (this.status !== 'playing') return;
    if (this.queue.length) this.dir = this.queue.shift();

    const head = this.snake[0];
    const next = { x: head.x + this.dir.x, y: head.y + this.dir.y };
    const eats = !!this.food && next.x === this.food.x && next.y === this.food.y;

    let hit = next.x < 0 || next.y < 0 || next.x >= this.cols || next.y >= this.rows;
    // La cola se aparta en este mismo paso (salvo que crezca), así que su casilla es válida.
    const len = eats ? this.snake.length : this.snake.length - 1;
    for (let i = 0; i < len && !hit; i++) {
      hit = this.snake[i].x === next.x && this.snake[i].y === next.y;
    }
    if (hit) { this.status = 'over'; return; }

    this.prev = this.snake.map(s => ({ x: s.x, y: s.y }));
    this.snake.unshift(next);
    if (eats) {
      this.score++;
      this.food = this.spawnFood();
      if (!this.food) this.status = 'won';
    } else {
      this.snake.pop();
    }
  }
}

if (typeof module !== 'undefined') module.exports = { Game, DIRS };
