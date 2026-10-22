const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, DIRS } = require('../js/game.js');

const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const playing = (o = {}) => { const g = new Game({ rng: () => 0, ...o }); g.start(); return g; };

test('avanza una casilla por paso', () => {
  const g = playing(), x = g.snake[0].x;
  g.step();
  assert.equal(g.snake[0].x, x + 1);
  assert.equal(g.snake.length, 3);
});

test('no permite girar 180 grados', () => {
  const g = playing();
  assert.equal(g.turn(DIRS.left), false);
  assert.equal(g.turn(DIRS.right), false);
});

test('dos giros rápidos se aplican en pasos distintos y la cola tiene límite', () => {
  const g = playing();
  assert.equal(g.turn(DIRS.up), true);
  assert.equal(g.turn(DIRS.left), true);
  assert.equal(g.turn(DIRS.down), false);
  g.step(); assert.deepEqual(g.dir, DIRS.up);
  g.step(); assert.deepEqual(g.dir, DIRS.left);
  assert.equal(g.status, 'playing');
});

test('choca con las paredes', () => {
  const g = playing();
  for (let i = 0; i < 30 && g.status === 'playing'; i++) g.step();
  assert.equal(g.status, 'over');
});

test('comer suma un punto y hace crecer', () => {
  const g = playing();
  g.food = { x: g.snake[0].x + 1, y: g.snake[0].y };
  g.step();
  assert.equal(g.score, 1);
  assert.equal(g.snake.length, 4);
  assert.ok(!g.snake.some(s => s.x === g.food.x && s.y === g.food.y));
});

test('puede entrar en la casilla que deja la cola', () => {
  const g = playing();
  g.snake = [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 2, y: 3 }];
  g.food = { x: 9, y: 9 }; g.dir = DIRS.down;
  g.step();
  assert.equal(g.status, 'playing');
});

test('choca consigo misma', () => {
  const g = playing();
  g.snake = [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }];
  g.food = { x: 9, y: 9 }; g.dir = DIRS.down;
  g.step();
  assert.equal(g.status, 'over');
});

test('gana al llenar el tablero', () => {
  const g = new Game({ cols: 3, rows: 1 });
  g.snake = [{ x: 1, y: 0 }, { x: 0, y: 0 }];
  g.food = { x: 2, y: 0 }; g.dir = DIRS.right; g.status = 'playing';
  g.step();
  assert.equal(g.status, 'won');
  assert.equal(g.food, null);
});

test('pausa y reanuda sin perder el estado', () => {
  const g = playing();
  g.pause(); const x = g.snake[0].x; g.step();
  assert.equal(g.snake[0].x, x);
  g.resume(); g.step();
  assert.equal(g.snake[0].x, x + 1);
});

test('simulación aleatoria: se cumplen las reglas en 50.000 pasos', () => {
  const rnd = seeded(7), dirs = Object.values(DIRS);
  const g = new Game({ rng: seeded(11) });
  g.start();
  for (let i = 0; i < 50000; i++) {
    if (g.status !== 'playing') g.start();
    if (rnd() < .5) g.turn(dirs[Math.floor(rnd() * 4)]);
    g.step();
    const keys = new Set(g.snake.map(s => s.y * g.cols + s.x));
    assert.equal(keys.size, g.snake.length, 'sin segmentos repetidos');
    assert.ok(g.snake.every(s => s.x >= 0 && s.y >= 0 && s.x < g.cols && s.y < g.rows), 'dentro del tablero');
    assert.equal(g.snake.length, 3 + g.score, 'longitud = 3 + puntos');
    if (g.status === 'playing') assert.ok(g.food && !keys.has(g.food.y * g.cols + g.food.x), 'comida libre');
  }
});
