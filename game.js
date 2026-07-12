/* ============================================================
   SLAP MARMELLINO SLAP
   Canvas HTML5 responsive — touch + mouse
   ============================================================ */
'use strict';

/* ---------- Costanti di gioco ---------- */
const ROUND_TIME   = 10;     // secondi per partita
const HITS_PER_PC  = 3;      // 3 colpi = 1 Punto Cattura
const MAX_PC       = 5;      // massimo 5 PC
const MAX_HITS     = MAX_PC * HITS_PER_PC; // 15
const GLOVE_DURATION = 3.0;  // secondi di power-up guantone
const SLAP_COOLDOWN  = 0.17; // anti-spam schiaffi

const PHRASES = [
  '@#! cane',
  'porco @#!',
  'mannaggia alla @#!m',
  '@#! ufo',
  '@#! calamaro'
];

const DIFFICULTIES = [
  { name: 'FACILE',    color: '#3ecf4a', blockMin: Infinity, blockMax: Infinity, durMin: 0,    durMax: 0    },
  { name: 'MEDIA',     color: '#ffb020', blockMin: 2.0,      blockMax: 3.2,      durMin: 0.55, durMax: 0.85 },
  { name: 'DIFFICILE', color: '#ff4040', blockMin: 1.0,      blockMax: 1.9,      durMin: 0.70, durMax: 1.10 }
];

/* ---------- Metadati sprite (frame 650x500, crop dei pixel utili) ---------- */
const FRAME_W = 650, FRAME_H = 500;
const SPR = {
  bg_game:               { x: 0,   y: 68,  w: 650, h: 364 },
  bg_title:              { x: 0,   y: 68,  w: 650, h: 364 },
  fx_block:              { x: 170, y: 100, w: 310, h: 299 },
  fx_particles:          { x: 80,  y: 118, w: 490, h: 265 },
  fx_powpow:             { x: 124, y: 98,  w: 411, h: 300 },
  fx_smack:              { x: 89,  y: 112, w: 472, h: 278 },
  glove_static:          { x: 231, y: 149, w: 188, h: 206 },
  logo:                  { x: 57,  y: 106, w: 531, h: 288 },
  marmellino_block:      { x: 182, y: 27,  w: 278, h: 454 },
  marmellino_dizzy:      { x: 200, y: 28,  w: 257, h: 447 },
  marmellino_idle:       { x: 187, y: 13,  w: 283, h: 474 },
  marmellino_slap_left:  { x: 92,  y: 70,  w: 477, h: 369 },
  marmellino_slap_right: { x: 84,  y: 72,  w: 472, h: 367 },
  marmellino_yell:       { x: 192, y: 13,  w: 273, h: 456 },
  michela_arm_glove:     { x: 142, y: 172, w: 366, h: 153 },
  michela_arm_slap:      { x: 198, y: 86,  w: 255, h: 328 },
  michela_intro:         { x: 203, y: 49,  w: 242, h: 415 },
  michela_start:         { x: 214, y: 37,  w: 238, h: 437 },
  michela_victory:       { x: 209, y: 51,  w: 242, h: 403 },
  powerup_glove:         { x: 210, y: 132, w: 231, h: 231 },
  punti_cattura:         { x: 142, y: 65,  w: 367, h: 370 }
};

/* ---------- Setup canvas ---------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;

function fitCanvas() {
  // usa il viewport reale visibile: evita canvas decentrati o tagliati
  // quando il browser applica zoom o barre dinamiche (mobile/webview)
  const vv = window.visualViewport;
  const cw = Math.round(vv ? vv.width : (window.innerWidth || canvas.clientWidth));
  const ch = Math.round(vv ? vv.height : (window.innerHeight || canvas.clientHeight));
  if (!cw || !ch) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  if (canvas.style.width !== cw + 'px') canvas.style.width = cw + 'px';
  if (canvas.style.height !== ch + 'px') canvas.style.height = ch + 'px';
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  W = cw; H = ch; DPR = dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fitCanvas);
if (window.visualViewport) window.visualViewport.addEventListener('resize', fitCanvas);

/* ---------- Caricamento immagini ---------- */
const IMG = {};
let loadedCount = 0;
const names = Object.keys(SPR);
for (const n of names) {
  const im = new Image();
  im.src = 'assets/' + n + '.png';
  im.onload = () => loadedCount++;
  im.onerror = () => loadedCount++;
  IMG[n] = im;
}

/* ---------- Utility ---------- */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const FONT_COMIC = '"Comic Sans MS","Chalkboard SE","Comic Neue",cursive';
const FONT_UI = '"Arial Black","Segoe UI",Arial,sans-serif';

/* Disegna una crop centrata, con altezza data */
function drawCrop(name, cx, cy, h, opt = {}) {
  const c = SPR[name], im = IMG[name];
  if (!im.complete || !im.naturalWidth) return;
  const w = h * c.w / c.h;
  ctx.save();
  ctx.translate(cx, cy);
  if (opt.rot) ctx.rotate(opt.rot);
  if (opt.flip) ctx.scale(-1, 1);
  if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
  ctx.drawImage(im, c.x, c.y, c.w, c.h, -w / 2, -h / 2, w, h);
  ctx.restore();
  return w;
}

/* Disegna uno sprite personaggio ancorato al fondo-centro del frame 650x500,
   con scala comune: le proporzioni tra le pose restano quelle originali */
function drawFrame(name, ax, ay, scale, opt = {}) {
  const c = SPR[name], im = IMG[name];
  if (!im.complete || !im.naturalWidth) return;
  ctx.save();
  ctx.translate(ax, ay);
  if (opt.flip) ctx.scale(-1, 1);
  if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
  ctx.drawImage(im, c.x, c.y, c.w, c.h,
    (c.x - FRAME_W / 2) * scale, (c.y - FRAME_H) * scale, c.w * scale, c.h * scale);
  ctx.restore();
}

/* Sfondo in modalità "cover" (riempi tutto, ritaglia l'eccesso) */
function drawBackground(name) {
  const c = SPR[name], im = IMG[name];
  if (!im.complete || !im.naturalWidth) { ctx.fillStyle = '#1a0b2e'; ctx.fillRect(0, 0, W, H); return; }
  const scale = Math.max(W / c.w, H / c.h);
  const dw = c.w * scale, dh = c.h * scale;
  ctx.drawImage(im, c.x, c.y, c.w, c.h, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- Audio (sintetizzato, nessun file) ---------- */
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function sndSlap(hard) {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime;
  const len = 0.09, buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = ac.createBufferSource(); src.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = hard ? 700 : 1400; bp.Q.value = 0.8;
  const g = ac.createGain(); g.gain.setValueAtTime(hard ? 0.9 : 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(bp).connect(g).connect(ac.destination); src.start(t);
}
function sndThud() {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
  const g = ac.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.17);
}
function sndCoin() {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime;
  [880, 1320].forEach((f, i) => {
    const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
    o.connect(g).connect(ac.destination); o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.16);
  });
}
function sndPowerup() {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(1000, t + 0.25);
  const g = ac.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.31);
}
function sndFanfare() {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.13);
    g.gain.exponentialRampToValueAtTime(0.3, t + i * 0.13 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.13 + 0.35);
    o.connect(g).connect(ac.destination); o.start(t + i * 0.13); o.stop(t + i * 0.13 + 0.4);
  });
}
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

/* ---------- Stato di gioco ---------- */
let state = 'load';      // load | title | intro | play | end
let now = 0;             // clock globale (s)
let stateT = 0;          // tempo dall'ingresso nello stato
let play = null;
let lastFrame = performance.now();
let buttons = [];        // bottoni cliccabili dello stato corrente

function setState(s) { state = s; stateT = 0; buttons = []; }

function newMatch() {
  const diff = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
  play = {
    diff,
    t: 0,                       // tempo trascorso in gioco
    hits: 0,
    pc: 0,
    nextBlock: rand(diff.blockMin, diff.blockMax),
    blockUntil: -1,
    arm: null,
    lastSlap: -1,
    gloveUntil: -1,
    powerup: null,
    powerupTimes: [rand(1.5, 3.5), rand(5.5, 7.0)],
    lastPcT: -99,
    reactSprite: null,
    reactUntil: -1,
    speakText: null,
    speakUntil: -1,
    fx: [],
    floats: [],
    shake: 0,
    endAt: -1,                  // fine anticipata se contatore pieno
    sideToggle: false
  };
  setState('intro');
}

function endMatch() {
  play.finalPc = clamp(Math.floor(play.hits / HITS_PER_PC), 1, MAX_PC);
  sndFanfare();
  setState('end');
}

/* ---------- Layout responsive ---------- */
function layout() {
  const minD = Math.min(W, H);
  const m = Math.max(10, minD * 0.02);
  const barH = Math.max(14, minD * 0.032);
  const uiBottom = m + barH + m * 0.5 + barH * 1.5 + m * 0.5;
  // scala di Marmellino: deve starci in altezza e in larghezza
  // (la posa di reazione, la più larga, è disegnata a 0.85: 477*0.85 ≈ 405)
  const availH = H * 0.94 - uiBottom;
  const s = Math.min(availH * 0.78 / 474, W * 0.98 / 405);
  const groundY = H * 0.90;
  return {
    m, barH, minD, uiBottom, s, groundY,
    headX: W / 2,
    headY: groundY - 474 * s * 0.72
  };
}

/* ---------- Input ---------- */
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  audio();
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;

  // bottoni
  for (const b of buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return; }
  }

  if (state === 'title') { newMatch(); return; }
  if (state === 'intro') { startPlay(); return; }
  if (state !== 'play' || play.endAt >= 0) return;

  const L = layout();

  // raccolta power-up
  if (play.powerup && !play.powerup.collected) {
    const p = play.powerup;
    const rr = L.minD * 0.14;
    if ((x - p.x) ** 2 + (y - p.y) ** 2 < rr * rr) {
      p.collected = true;
      play.powerup = null;
      play.gloveUntil = play.t + GLOVE_DURATION;
      sndPowerup();
      addFloat('GUANTONE! COLPI x2', p.x, p.y, '#ffd700');
      return;
    }
  }

  // schiaffo
  if (play.t - play.lastSlap < SLAP_COOLDOWN || play.arm) return;
  play.lastSlap = play.t;
  play.sideToggle = !play.sideToggle;
  const side = x < W / 2 ? 'left' : 'right';
  play.arm = { t: 0, side, glove: play.t < play.gloveUntil, hitDone: false };
}, { passive: false });

canvas.addEventListener('contextmenu', e => e.preventDefault());

function startPlay() {
  if (state === 'intro') setState('play');
}

/* ---------- Logica colpo ---------- */
function resolveImpact(arm) {
  const L = layout();
  const blocking = play.t < play.blockUntil;
  const hx = L.headX + (arm.side === 'left' ? -20 : 20);
  const hy = L.headY;

  if (blocking) {
    play.fx.push({ name: 'fx_block', x: hx, y: hy, t0: play.t, dur: 0.45, h: L.minD * 0.38 });
    sndThud();
    return;
  }

  const gained = arm.glove ? 2 : 1;
  const before = play.hits;
  play.hits = Math.min(MAX_HITS, play.hits + gained);
  const realGain = play.hits - before;

  // reazione testa (colpo da sinistra → testa sbatte a destra e viceversa)
  play.reactSprite = arm.side === 'left' ? 'marmellino_slap_right' : 'marmellino_slap_left';
  play.reactUntil = play.t + 0.30;

  play.fx.push({
    name: arm.glove ? 'fx_powpow' : 'fx_smack',
    x: hx, y: hy - L.minD * 0.02, t0: play.t, dur: 0.4,
    h: L.minD * (arm.glove ? 0.42 : 0.34),
    rot: rand(-0.25, 0.25)
  });
  play.shake = arm.glove ? 0.4 : 0.25;
  sndSlap(arm.glove);
  vibrate(arm.glove ? 40 : 20);

  // frase censurata
  if (play.t > play.speakUntil - 0.4 && Math.random() < 0.5) {
    play.speakText = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    play.speakUntil = play.t + 1.1;
  }

  // Punti Cattura
  const newPc = Math.floor(play.hits / HITS_PER_PC);
  if (newPc > play.pc) {
    play.pc = newPc;
    play.lastPcT = play.t;
    sndCoin();
    addFloat('+1 PC!', L.headX, L.headY - L.minD * 0.2, '#ffd700', true);
  } else if (realGain > 0) {
    addFloat(realGain === 2 ? '+2' : '+1', hx + rand(-30, 30), hy - L.minD * 0.1, '#fff');
  }

  // contatore pieno → fine anticipata
  if (play.hits >= MAX_HITS && play.endAt < 0) {
    play.endAt = play.t + 0.7;
    addFloat('CONTATORE PIENO!', W / 2, H * 0.4, '#3ecf4a', true);
  }
}

function addFloat(text, x, y, color, big) {
  play.floats.push({ text, x, y, t0: play.t, color: color || '#fff', big: !!big });
}

/* ---------- Update ---------- */
function update(dt) {
  stateT += dt;
  if (state !== 'play') return;

  const p = play;
  p.t += dt;
  p.shake = Math.max(0, p.shake - dt * 2);

  // fine partita
  if (p.endAt >= 0 && p.t >= p.endAt) { endMatch(); return; }
  if (p.endAt < 0 && p.t >= ROUND_TIME) { endMatch(); return; }

  // parate di Marmellino (in base alla difficoltà)
  if (p.endAt < 0 && p.t >= p.nextBlock && p.t >= p.blockUntil) {
    p.blockUntil = p.t + rand(p.diff.durMin, p.diff.durMax);
    p.nextBlock = p.blockUntil + rand(p.diff.blockMin, p.diff.blockMax);
  }

  // spawn power-up
  if (!p.powerup && p.powerupTimes.length && p.t >= p.powerupTimes[0]) {
    p.powerupTimes.shift();
    p.powerup = {
      x: rand(W * 0.2, W * 0.8),
      y: rand(H * 0.26, H * 0.40),
      born: p.t,
      until: p.t + 3.5,
      collected: false
    };
  }
  if (p.powerup && p.t > p.powerup.until) p.powerup = null;

  // animazione braccio
  if (p.arm) {
    p.arm.t += dt;
    if (!p.arm.hitDone && p.arm.t >= 0.13) { p.arm.hitDone = true; resolveImpact(p.arm); }
    if (p.arm.t > 0.32) p.arm = null;
  }

  // pulizia fx e float
  p.fx = p.fx.filter(f => p.t - f.t0 < f.dur);
  p.floats = p.floats.filter(f => p.t - f.t0 < 0.9);
}

/* ---------- Render: elementi comuni ---------- */
function drawButton(label, cx, cy, w, h, fn, color) {
  const x = cx - w / 2, y = cy - h / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(x + 3, y + 5, w, h, h / 2.4); ctx.fill();
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, color || '#ff5252');
  grad.addColorStop(1, color ? color : '#d32f2f');
  ctx.fillStyle = grad;
  roundRect(x, y, w, h, h / 2.4); ctx.fill();
  ctx.lineWidth = Math.max(2, h * 0.07);
  ctx.strokeStyle = '#1a1a1a';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${h * 0.42}px ${FONT_UI}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + h * 0.02);
  ctx.restore();
  buttons.push({ x, y, w, h, fn });
}

function drawChip(text, cx, cy, h, color) {
  ctx.save();
  ctx.font = `bold ${h * 0.55}px ${FONT_UI}`;
  const tw = ctx.measureText(text).width;
  const w = tw + h * 1.3;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx - w / 2 + h * 0.55, cy, h * 0.26, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx - w / 2 + h * 0.95, cy + h * 0.03);
  ctx.restore();
  return w;
}

function outlinedText(text, x, y, size, fill, font, align) {
  ctx.save();
  ctx.font = `bold ${size}px ${font || FONT_COMIC}`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a1a1a';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ---------- Render: stati ---------- */
function renderLoad() {
  ctx.fillStyle = '#14061f'; ctx.fillRect(0, 0, W, H);
  const p = loadedCount / names.length;
  const w = Math.min(W * 0.6, 320);
  outlinedText('SLAP MARMELLINO SLAP', W / 2, H / 2 - 50, Math.min(W * 0.05, 26), '#ffd700');
  ctx.fillStyle = '#333';
  roundRect(W / 2 - w / 2, H / 2, w, 16, 8); ctx.fill();
  ctx.fillStyle = '#ffd700';
  roundRect(W / 2 - w / 2, H / 2, w * p, 16, 8); ctx.fill();
  if (loadedCount >= names.length) setState('title');
}

function renderTitle() {
  drawBackground('bg_title');
  const minD = Math.min(W, H);

  // logo
  const logoW = Math.min(W * 0.88, H * 0.6 * (531 / 288));
  const logoH = logoW * 288 / 531;
  const bob = Math.sin(now * 2) * minD * 0.008;
  drawCrop('logo', W / 2, H * 0.26 + bob, logoH);

  // Michela che corre
  const mh = minD * 0.42;
  const mx = W / 2 + Math.sin(now * 1.2) * W * 0.02;
  drawCrop('michela_intro', mx, H * 0.66, mh);

  // invito
  const pulse = 0.75 + Math.sin(now * 5) * 0.25;
  ctx.globalAlpha = pulse;
  outlinedText('TOCCA PER GIOCARE!', W / 2, H * 0.88, Math.min(minD * 0.055, 34), '#fff');
  ctx.globalAlpha = 1;

  outlinedText('Riempi il contatore in 10 secondi!', W / 2, H * 0.94, Math.min(minD * 0.03, 17), '#ffd700');
}

function renderIntro() {
  drawBackground('bg_game');
  const minD = Math.min(W, H);
  const L = layout();
  const t = stateT;

  // Marmellino entra solo quando Michela si sposta
  const marmIn = clamp((t - 1.4) / 0.7, 0, 1);
  if (marmIn > 0) drawFrame('marmellino_idle', L.headX, L.groundY, L.s, { alpha: marmIn });

  // Michela: grande al centro, poi va in trasparenza di lato
  const fade = clamp((t - 1.4) / 0.8, 0, 1);
  const alpha = lerp(1, 0.18, fade);
  const mx = lerp(W / 2, minD * 0.09, easeOut(fade));
  const my = lerp(H * 0.55, H * 0.56, easeOut(fade));
  const mScale = lerp(minD * 0.52, minD * 0.28, easeOut(fade));
  drawCrop('michela_start', mx, my, mScale, { alpha });

  // difficoltà
  if (t > 0.25) {
    const pop = Math.min(1, (t - 0.25) * 4);
    ctx.save();
    ctx.translate(W / 2, H * 0.15);
    ctx.scale(pop, pop);
    outlinedText('DIFFICOLTÀ', 0, -minD * 0.05, minD * 0.055, '#fff');
    outlinedText(play.diff.name, 0, minD * 0.045, minD * 0.10, play.diff.color);
    ctx.restore();
  }

  // countdown
  const cd = [[2.0, '3'], [2.5, '2'], [3.0, '1'], [3.5, 'VIA!']];
  for (let i = cd.length - 1; i >= 0; i--) {
    if (t >= cd[i][0]) {
      const k = t - cd[i][0];
      if (k < 0.6 || i === cd.length - 1) {
        const sc = 1 + easeOut(Math.min(k / 0.6, 1)) * 0.6;
        ctx.save();
        ctx.globalAlpha = 1 - Math.min(k / 0.6, 1) * 0.6;
        ctx.translate(W / 2, H * 0.42);
        ctx.scale(sc, sc);
        outlinedText(cd[i][1], 0, 0, minD * 0.14, cd[i][1] === 'VIA!' ? '#3ecf4a' : '#ffd700');
        ctx.restore();
      }
      break;
    }
  }
  if (t > 0.5) {
    ctx.globalAlpha = 0.8;
    outlinedText('(tocca per saltare)', W / 2, H * 0.97, minD * 0.024, '#fff');
    ctx.globalAlpha = 1;
  }
  if (t >= 3.7) startPlay();
}

function renderPlay() {
  const p = play;
  const L = layout();
  const minD = L.minD;

  // scuotimento schermo
  ctx.save();
  if (p.shake > 0) ctx.translate(rand(-1, 1) * p.shake * minD * 0.02, rand(-1, 1) * p.shake * minD * 0.02);

  drawBackground('bg_game');

  // Michela fantasma (il giocatore) nell'angolo
  drawCrop('michela_start', minD * 0.09, H * 0.56, minD * 0.28, { alpha: 0.18 });

  // ---- Marmellino ----
  const blocking = p.t < p.blockUntil;
  let sprite = 'marmellino_idle';
  if (p.t < p.reactUntil) sprite = p.reactSprite;
  else if (blocking) sprite = 'marmellino_block';
  else if (p.t < p.speakUntil) sprite = 'marmellino_yell';

  const bob = sprite === 'marmellino_idle' ? Math.sin(p.t * 3) * L.s * 5 : 0;
  const jitter = p.diff.name === 'DIFFICILE' && sprite === 'marmellino_idle' ? Math.sin(p.t * 25) * L.s * 2 : 0;
  const isReact = sprite === 'marmellino_slap_left' || sprite === 'marmellino_slap_right';
  drawFrame(sprite, L.headX + jitter, L.groundY + bob, L.s * (isReact ? 0.85 : 1));

  // fumetto con frase censurata
  if (p.t < p.speakUntil && p.speakText) drawBubble(p.speakText, L);

  // ---- power-up guantone ----
  if (p.powerup) {
    const pu = p.powerup;
    const fl = Math.sin((p.t - pu.born) * 4) * minD * 0.012;
    const blink = pu.until - p.t < 0.8 ? (Math.sin(p.t * 18) > 0 ? 1 : 0.25) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    drawCrop('powerup_glove', pu.x, pu.y + fl, minD * 0.17, { rot: Math.sin(p.t * 3) * 0.15 });
    ctx.restore();
  }

  // ---- braccio di Michela ----
  if (p.arm) drawArm(p.arm, L);

  // ---- effetti ----
  for (const f of p.fx) {
    const k = (p.t - f.t0) / f.dur;
    ctx.save();
    ctx.globalAlpha = 1 - Math.pow(k, 2);
    drawCrop(f.name, f.x, f.y, f.h * (0.8 + k * 0.4), { rot: f.rot || 0 });
    ctx.restore();
  }

  ctx.restore(); // fine shake

  // ---- testi fluttuanti ----
  for (const f of p.floats) {
    const k = (p.t - f.t0) / 0.9;
    ctx.save();
    ctx.globalAlpha = 1 - k * k;
    outlinedText(f.text, f.x, f.y - k * minD * 0.09, minD * (f.big ? 0.055 : 0.04), f.color);
    ctx.restore();
  }

  drawHud(L);
}

function drawBubble(text, L) {
  const minD = L.minD;
  ctx.save();
  ctx.font = `bold italic ${minD * 0.036}px ${FONT_COMIC}`;
  const tw = ctx.measureText(text).width;
  const bw = tw + minD * 0.05, bh = minD * 0.07;
  const bx = clamp(L.headX + 283 * L.s * 0.55, bw / 2 + 6, W - bw / 2 - 6);
  const by = L.headY - minD * 0.14;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(2, minD * 0.006);
  roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2.6);
  ctx.fill(); ctx.stroke();
  // codina
  ctx.beginPath();
  ctx.moveTo(bx - bw * 0.18, by + bh / 2 - 2);
  ctx.lineTo(bx - bw * 0.30, by + bh / 2 + minD * 0.035);
  ctx.lineTo(bx - bw * 0.02, by + bh / 2 - 2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c62828';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx, by + bh * 0.04);
  ctx.restore();
}

function drawArm(arm, L) {
  const T = arm.t;
  // avvicinamento (0→0.13), impatto, ritorno (0.20→0.32)
  let prog;
  if (T < 0.13) prog = easeOut(T / 0.13);
  else if (T < 0.20) prog = 1;
  else prog = 1 - (T - 0.20) / 0.12;
  prog = clamp(prog, 0, 1);

  const dir = arm.side === 'left' ? 1 : -1;
  const minD = L.minD;

  if (arm.glove) {
    const h = 190 * L.s;
    const c = SPR.michela_arm_glove;
    const w = h * c.w / c.h;
    const startX = arm.side === 'left' ? -w : W + w;
    const targetX = L.headX - dir * (283 * L.s * 0.42 + w * 0.38);
    const x = lerp(startX, targetX, prog);
    drawCrop('michela_arm_glove', x, L.headY + h * 0.05, h, { flip: arm.side === 'right' });
  } else {
    const h = 350 * L.s;
    const c = SPR.michela_arm_slap;
    const w = h * c.w / c.h;
    const startX = arm.side === 'left' ? -w : W + w;
    const targetX = L.headX - dir * (283 * L.s * 0.30 + w * 0.15);
    const x = lerp(startX, targetX, prog);
    const rot = dir * lerp(-0.5, 0.1, prog);
    drawCrop('michela_arm_slap', x, L.headY + h * 0.28, h, { flip: arm.side === 'right', rot });
  }
}

function drawHud(L) {
  const p = play;
  const { m, barH, minD } = L;
  const remaining = Math.max(0, ROUND_TIME - p.t);

  // ---- barra timer ----
  const tw = W - m * 2;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(m, m, tw, barH, barH / 2); ctx.fill();
  const frac = remaining / ROUND_TIME;
  const hue = frac * 120; // verde → rosso
  ctx.fillStyle = `hsl(${hue},85%,50%)`;
  if (frac > 0.005) { roundRect(m, m, Math.max(barH, tw * frac), barH, barH / 2); ctx.fill(); }
  ctx.lineWidth = 2; ctx.strokeStyle = '#1a1a1a';
  roundRect(m, m, tw, barH, barH / 2); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${barH * 0.72}px ${FONT_UI}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(remaining.toFixed(1) + 's', W / 2, m + barH / 2 + 1);
  ctx.fillText(remaining.toFixed(1) + 's', W / 2, m + barH / 2 + 1);
  ctx.restore();

  // ---- contatore colpi (barra che si ricarica) ----
  const cy = m + barH + m * 0.5;
  const ch = barH * 1.5;
  const coinW = ch * 1.9;
  const cw = W - m * 2 - coinW;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(m, cy, cw, ch, ch / 2.6); ctx.fill();
  const fillFrac = p.hits / MAX_HITS;
  if (fillFrac > 0) {
    const grad = ctx.createLinearGradient(m, 0, m + cw, 0);
    grad.addColorStop(0, '#ff9800'); grad.addColorStop(1, '#ffd700');
    ctx.fillStyle = grad;
    roundRect(m, cy, Math.max(ch * 0.6, cw * fillFrac), ch, ch / 2.6); ctx.fill();
  }
  // tacche dei PC (ogni 3 colpi)
  for (let i = 1; i < MAX_PC; i++) {
    const x = m + cw * i / MAX_PC;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, cy + 2); ctx.lineTo(x, cy + ch - 2); ctx.stroke();
  }
  ctx.lineWidth = 2; ctx.strokeStyle = '#1a1a1a';
  roundRect(m, cy, cw, ch, ch / 2.6); ctx.stroke();
  // moneta PC + conteggio
  const pcX = m + cw + coinW / 2;
  const pop = 1 + Math.max(0, 0.35 - (p.t - p.lastPcT));
  drawCrop('punti_cattura', pcX - ch * 0.42, cy + ch / 2, ch * 1.05 * pop);
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold ${ch * 0.7}px ${FONT_UI}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = '#1a1a1a';
  ctx.strokeText('×' + p.pc, pcX + ch * 0.22, cy + ch / 2 + 1);
  ctx.fillText('×' + p.pc, pcX + ch * 0.22, cy + ch / 2 + 1);
  ctx.restore();

  // ---- chip difficoltà + guantone attivo ----
  const chipY = cy + ch + m * 0.6 + minD * 0.022;
  drawChip(p.diff.name, m + minD * 0.11, chipY, minD * 0.045, p.diff.color);
  if (p.t < p.gloveUntil) {
    const gx = W - m - minD * 0.11;
    const left = (p.gloveUntil - p.t).toFixed(1);
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(p.t * 10) * 0.3;
    drawCrop('glove_static', gx - minD * 0.045, chipY, minD * 0.055);
    outlinedText(left + 's', gx + minD * 0.028, chipY, minD * 0.032, '#ffd700', FONT_UI);
    ctx.restore();
  }
}

function renderEnd() {
  drawBackground('bg_game');
  ctx.fillStyle = 'rgba(10,0,25,0.72)';
  ctx.fillRect(0, 0, W, H);
  const minD = Math.min(W, H);
  const t = stateT;
  const p = play;

  // personaggi
  const chH = minD * 0.36;
  drawCrop('marmellino_dizzy', W * 0.24, H * 0.40, chH);
  drawCrop('michela_victory', W * 0.76, H * 0.40, chH);

  // titolo
  const popT = Math.min(1, t * 3);
  ctx.save();
  ctx.translate(W / 2, H * 0.12);
  ctx.scale(easeOut(popT), easeOut(popT));
  outlinedText('PARTITA FINITA!', 0, 0, Math.min(minD * 0.07, 44), '#ffd700');
  ctx.restore();

  // monete PC guadagnate
  const coinS = Math.min(minD * 0.13, W / (MAX_PC + 1) * 0.7);
  const totalW = p.finalPc * coinS * 1.15;
  for (let i = 0; i < p.finalPc; i++) {
    const show = t > 0.5 + i * 0.22;
    if (!show) continue;
    const k = Math.min(1, (t - 0.5 - i * 0.22) * 4);
    const x = W / 2 - totalW / 2 + coinS * 1.15 * i + coinS * 0.575;
    drawCrop('punti_cattura', x, H * 0.60, coinS * (0.5 + easeOut(k) * 0.5), { alpha: k });
  }

  outlinedText(`HAI GUADAGNATO ${p.finalPc} ${p.finalPc === 1 ? 'PUNTO' : 'PUNTI'} CATTURA!`,
    W / 2, H * 0.70, Math.min(minD * 0.042, 26), '#fff');
  ctx.globalAlpha = 0.85;
  outlinedText(`${p.hits} colpi a segno — difficoltà ${p.diff.name}`,
    W / 2, H * 0.755, Math.min(minD * 0.03, 18), p.diff.color);
  ctx.globalAlpha = 1;

  // bottoni
  const bw = Math.min(W * 0.38, 230), bh = Math.min(minD * 0.09, 56);
  drawButton('RIGIOCA', W / 2 - bw * 0.56, H * 0.87, bw, bh, () => newMatch());
  drawButton('MENU', W / 2 + bw * 0.56, H * 0.87, bw, bh, () => setState('title'), '#5c6bc0');
}

/* ---------- Main loop ---------- */
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastFrame) / 1000);
  lastFrame = ts;
  now += dt;

  fitCanvas();
  buttons = [];
  update(dt);

  ctx.clearRect(0, 0, W, H);
  switch (state) {
    case 'load':  renderLoad();  break;
    case 'title': renderTitle(); break;
    case 'intro': renderIntro(); break;
    case 'play':  renderPlay();  break;
    case 'end':   renderEnd();   break;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
