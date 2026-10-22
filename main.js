'use strict';

const $ = id => document.getElementById(id);
const canvas = $('board'), ctx = canvas.getContext('2d');
const game = new Game();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEYS = {
  arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right'
};

let best = 0;
try { best = Number(localStorage.getItem('serpiente-best')) || 0; } catch { /* sin almacenamiento */ }

// ---------- Interfaz ----------
function hud(pop) {
  $('score').textContent = game.score;
  $('best').textContent = Math.max(best, game.score);
  if (pop) {
    const el = $('score');
    el.classList.remove('pop');
    void el.offsetWidth; // reinicia la animación
    el.classList.add('pop');
  }
}

function overlay(title, msg, label) {
  $('title').textContent = title;
  $('msg').textContent = msg;
  $('play').textContent = label;
  $('overlay').hidden = false;
  $('play').focus({ preventScroll: true });
}

function hideOverlay() {
  $('overlay').hidden = true;
  if (document.activeElement) document.activeElement.blur();
}

function start()  { game.start();  acc = 0; hideOverlay(); hud(); }
function resume() { game.resume(); acc = 0; hideOverlay(); }
function pause()  { if (game.status !== 'playing') return; game.pause(); overlay('Pausa', 'Pulsa espacio para continuar.', 'Continuar'); }

function finish() {
  const record = game.score > best;
  if (record) {
    best = game.score;
    try { localStorage.setItem('serpiente-best', best); } catch { /* sin almacenamiento */ }
  }
  hud();
  const won = game.status === 'won';
  overlay(won ? '¡Has ganado!' : 'Fin del juego',
    `${won ? 'Llenaste todo el tablero. ' : ''}${game.score} puntos${record && game.score ? ' · ¡Nuevo récord!' : ''}`,
    'Jugar otra vez');
}

// ---------- Entrada ----------
function input(k) {
  if (game.status === 'ready') start();
  else if (game.status === 'paused') resume();
  if (game.status === 'playing') game.turn(DIRS[k]);
}

function toggle() {
  if (game.status === 'playing') pause();
  else if (game.status === 'paused') resume();
  else start();
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (KEYS[key]) { e.preventDefault(); input(KEYS[key]); return; }
  if (key === 'p') { if (game.status === 'playing' || game.status === 'paused') toggle(); return; }
  // Si el foco está en un botón, es el propio botón quien reacciona a Espacio/Enter
  if ((key === ' ' || key === 'enter') && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); toggle(); }
});
$('play').addEventListener('click', toggle);

// Deslizar con el dedo (o arrastrar con el ratón) sobre el tablero
let sx = null, sy = null;
canvas.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
canvas.addEventListener('pointermove', e => {
  if (sx === null) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  sx = e.clientX; sy = e.clientY;
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => canvas.addEventListener(t, () => { sx = null; }));

// Se pausa sola si cambias de pestaña o ventana
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', pause);

// ---------- Dibujo ----------
const C = {};
let size = 0, cell = 0, bg = null;

// Los colores se leen del CSS (que ya resuelve el modo claro/oscuro)
const probe = document.createElement('i');
probe.style.cssText = 'position:absolute;visibility:hidden';
document.body.append(probe);
function readColors() {
  for (const k of ['a', 'b', 'snake', 'snake2', 'food', 'eye']) {
    probe.style.color = `var(--g-${k})`;
    C[k] = getComputedStyle(probe).color;
  }
}

// El fondo a cuadros se dibuja una sola vez y después solo se copia
function buildBg() {
  bg = document.createElement('canvas');
  bg.width = bg.height = canvas.width;
  const g = bg.getContext('2d');
  g.scale(canvas.width / size, canvas.width / size);
  for (let y = 0; y < game.rows; y++) {
    for (let x = 0; x < game.cols; x++) {
      g.fillStyle = (x + y) & 1 ? C.a : C.b;
      g.fillRect(x * cell, y * cell, cell, cell);
    }
  }
}

function layout() {
  size = canvas.getBoundingClientRect().width;
  if (!size) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvas.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cell = size / game.cols;
  buildBg();
}

let acc = 0, lastT = 1;
function draw(now) {
  if (!bg) return;
  ctx.drawImage(bg, 0, 0, size, size);

  if (game.food) {
    const fx = (game.food.x + .5) * cell, fy = (game.food.y + .5) * cell;
    const k = reduce ? 0 : Math.sin(now / 240) * .06;
    ctx.fillStyle = C.food;
    ctx.globalAlpha = .22;
    ctx.beginPath(); ctx.arc(fx, fy, cell * (.5 + k), 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(fx, fy, cell * .28, 0, 6.283); ctx.fill();
  }

  // Cada segmento se desliza de su posición anterior a la actual para un movimiento fluido
  if (game.status === 'playing') lastT = Math.min(acc / game.interval(), 1);
  else if (game.status !== 'paused') lastT = 1;
  const { snake: s, prev: p } = game;
  const pts = s.map((q, i) => {
    const o = p[Math.min(i, p.length - 1)];
    return [(o.x + (q.x - o.x) * lastT + .5) * cell, (o.y + (q.y - o.y) * lastT + .5) * cell];
  });

  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = C.snake2; ctx.lineWidth = cell * .8; ctx.stroke();
  ctx.strokeStyle = C.snake;  ctx.lineWidth = cell * .56; ctx.stroke();

  const [hx, hy] = pts[0], d = game.dir, px = -d.y, py = d.x;
  ctx.fillStyle = C.snake2; ctx.beginPath(); ctx.arc(hx, hy, cell * .42, 0, 6.283); ctx.fill();
  ctx.fillStyle = C.snake;  ctx.beginPath(); ctx.arc(hx, hy, cell * .34, 0, 6.283); ctx.fill();
  ctx.fillStyle = C.eye;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(hx + d.x * cell * .14 + px * side * cell * .17, hy + d.y * cell * .14 + py * side * cell * .17, cell * .09, 0, 6.283);
    ctx.fill();
  }
}

// ---------- Bucle ----------
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(now - last, 100); // evita saltos tras una pausa larga
  last = now;
  if (game.status === 'playing') {
    acc += dt;
    while (game.status === 'playing' && acc >= game.interval()) {
      const before = game.score;
      acc -= game.interval();
      game.step();
      if (game.score !== before) hud(true);
    }
    if (game.status === 'over' || game.status === 'won') finish();
  }
  draw(now);
}

readColors();
layout();
new ResizeObserver(layout).observe(canvas);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); if (size) buildBg(); });
hud();
requestAnimationFrame(t => { last = t; frame(t); });
