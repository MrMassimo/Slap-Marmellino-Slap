/* ============================================================
   SLap Marmellino Slap - Logica di Gioco JavaScript
   ============================================================ */

// ------------------------------------------------------------
// STATO GLOBALE DEL GIOCO
// ------------------------------------------------------------
const gameState = {
  screen: 'intro',        // Schermata attiva: intro, menu, game, gameover
  slaps: 0,               // Conteggio totale schiaffi
  timeLeft: 30,           // Secondi rimanenti
  timerInterval: null,    // Riferimento al setInterval del timer
  level: 0,               // Livello attuale di danno (0-5)
  maxLevelReached: 0,     // Livello massimo raggiunto nella partita
  bestScore: 0,           // Miglior punteggio storico
  isPlaying: false,       // Partita in corso?
};

// Frasi censurate per il fumetto dell'intro (esattamente come richiesto)
const INSULTS = [
  "@#! cane", "@#! lupo", "@#! ufo", "@#! impestata",
  "@#! balorda", "porco @#!", "@#! maiale"
];

// Mappatura livello -> immagine volto (nomi con doppia estensione)
const FACE_IMAGES = {
  0: 'assets/faccia-0.png.png',
  1: 'assets/faccia-1.png.png',
  2: 'assets/faccia-2.png.png',
  3: 'assets/faccia-3.jpg.png',
  4: 'assets/faccia-4.jpg.png',
  5: 'assets/faccia-5.jpg.png'
};

// ------------------------------------------------------------
// RIFERIMENTI DOM
// ------------------------------------------------------------
const screens = {
  intro: document.getElementById('screen-intro'),
  menu: document.getElementById('screen-menu'),
  game: document.getElementById('screen-game'),
  gameover: document.getElementById('screen-gameover')
};

const els = {
  speechBubble: document.getElementById('speech-bubble'),
  timer: document.getElementById('timer'),
  faceImg: document.getElementById('face-img'),
  faceContainer: document.getElementById('face-container'),
  slapCount: document.getElementById('slap-count'),
  actionPoints: document.getElementById('action-points'),
  level: document.getElementById('level'),
  bestScoreValue: document.getElementById('best-score-value'),
  gameoverFace: document.getElementById('gameover-face'),
  finalSlaps: document.getElementById('final-slaps'),
  finalAction: document.getElementById('final-action'),
  finalBonus: document.getElementById('final-bonus'),
  finalTotal: document.getElementById('final-total'),
  btnPlay: document.getElementById('btn-play'),
  btnSlap: document.getElementById('btn-slap'),
  btnReplay: document.getElementById('btn-replay')
};

// ------------------------------------------------------------
// GESTIONE SCHERMATE
// ------------------------------------------------------------
function showScreen(name) {
  // Nasconde tutte le schermate
  Object.values(screens).forEach(s => s.classList.remove('active'));
  // Mostra quella richiesta
  screens[name].classList.add('active');
  gameState.screen = name;
}

// ------------------------------------------------------------
// LOCALSTORAGE - Caricamento miglior punteggio
// ------------------------------------------------------------
function loadBestScore() {
  try {
    const saved = localStorage.getItem('marmellino_best');
    gameState.bestScore = saved ? parseInt(saved, 10) : 0;
  } catch (e) {
    gameState.bestScore = 0;
  }
  els.bestScoreValue.textContent = gameState.bestScore;
}

function saveBestScore(score) {
  try {
    if (score > gameState.bestScore) {
      gameState.bestScore = score;
      localStorage.setItem('marmellino_best', score);
      els.bestScoreValue.textContent = score;
    }
  } catch (e) {
    // Ignora errori localStorage
  }
}

// ------------------------------------------------------------
// INTRO – Animazione fumetto con insulti che scorrono
// ------------------------------------------------------------
function startIntro() {
  // Scena 2: cambia il testo del fumetto ogni 300ms
  let insultIndex = 0;
  const bubbleInterval = setInterval(() => {
    insultIndex++;
    if (insultIndex < INSULTS.length) {
      els.speechBubble.textContent = INSULTS[insultIndex];
      // Forza reflow per riavviare animazione bubblePop
      els.speechBubble.style.animation = 'none';
      void els.speechBubble.offsetWidth;
      els.speechBubble.style.animation = 'bubblePop 0.3s ease-out';
    }
  }, 300);

  // Ferma il cambio testo dopo 2.1 secondi (7 frasi x 300ms)
  setTimeout(() => {
    clearInterval(bubbleInterval);
  }, 2100);

  // Passa al menu dopo 6 secondi totali
  setTimeout(() => {
    showScreen('menu');
  }, 6000);
}

// ------------------------------------------------------------
// AGGIORNA IMMAGINE VOLTO in base al livello
// ------------------------------------------------------------
function updateFace(level) {
  const clampedLevel = Math.min(5, Math.max(0, level));
  els.faceImg.src = FACE_IMAGES[clampedLevel];
}

// ------------------------------------------------------------
// AGGIORNA STATISTICHE sullo schermo
// ------------------------------------------------------------
function updateGameStats() {
  els.slapCount.textContent = gameState.slaps;
  els.actionPoints.textContent = Math.floor(gameState.slaps / 10);
  els.level.textContent = gameState.level;
}

// ------------------------------------------------------------
// AGGIORNA TIMER visivo
// ------------------------------------------------------------
function updateTimerDisplay() {
  els.timer.textContent = gameState.timeLeft;
  if (gameState.timeLeft <= 5) {
    els.timer.classList.add('blink-red');
  } else {
    els.timer.classList.remove('blink-red');
  }
}

// ------------------------------------------------------------
// AZIONE SCHIAFFO!
// ------------------------------------------------------------
function doSlap() {
  if (!gameState.isPlaying) return;

  gameState.slaps++;

  // Calcola nuovo livello (ogni 10 schiaffi, max 5)
  const newLevel = Math.min(5, Math.floor(gameState.slaps / 10));
  if (newLevel !== gameState.level) {
    gameState.level = newLevel;
    if (newLevel > gameState.maxLevelReached) {
      gameState.maxLevelReached = newLevel;
    }
    // Aggiorna immagine volto
    updateFace(gameState.level);
  }

  updateGameStats();

  // --- FEEDBACK VISIVO ---
  // 1. Shake sul volto (cerchio)
  const container = els.faceContainer;
  container.classList.remove('shake');
  void container.offsetWidth; // Forza reflow per riavviare animazione
  container.classList.add('shake');

  // 2. Zoom/rinculo sul pulsante
  const btn = els.btnSlap;
  btn.classList.remove('btn-zoom');
  void btn.offsetWidth;
  btn.classList.add('btn-zoom');
}

// ------------------------------------------------------------
// AVVIA NUOVA PARTITA
// ------------------------------------------------------------
function startGame() {
  // Reset stato
  gameState.slaps = 0;
  gameState.timeLeft = 30;
  gameState.level = 0;
  gameState.maxLevelReached = 0;
  gameState.isPlaying = true;

  // Mostra schermata gioco
  showScreen('game');
  updateFace(0);
  updateGameStats();
  updateTimerDisplay();

  // Avvia il timer (setInterval come richiesto)
  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft--;
    updateTimerDisplay();

    if (gameState.timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

// ------------------------------------------------------------
// TERMINA PARTITA – Game Over
// ------------------------------------------------------------
function endGame() {
  gameState.isPlaying = false;
  clearInterval(gameState.timerInterval);
  gameState.timerInterval = null;

  // Calcolo punteggio finale
  const actionPoints = Math.floor(gameState.slaps / 10);
  const totalScore = actionPoints + gameState.maxLevelReached;

  // Salva best score
  saveBestScore(totalScore);

  // Mostra schermata Game Over
  showScreen('gameover');

  // Mostra il volto al massimo livello raggiunto
  els.gameoverFace.src = FACE_IMAGES[gameState.maxLevelReached];

  // Popola le statistiche finali
  els.finalSlaps.textContent = gameState.slaps;
  els.finalAction.textContent = actionPoints;
  els.finalBonus.textContent = '+' + gameState.maxLevelReached;
  els.finalTotal.textContent = totalScore;
}

// ------------------------------------------------------------
// EVENT LISTENERS (Touch e Click con preventDefault)
// ------------------------------------------------------------

// Pulsante Gioca dal Menu
function handlePlay(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  startGame();
}
els.btnPlay.addEventListener('click', handlePlay);
els.btnPlay.addEventListener('touchstart', handlePlay, { passive: false });

// Pulsante Schiaffo!
function handleSlap(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  doSlap();
}
els.btnSlap.addEventListener('click', handleSlap);
els.btnSlap.addEventListener('touchstart', handleSlap, { passive: false });

// Pulsante Rigio
function handleReplay(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  showScreen('menu');
}
els.btnReplay.addEventListener('click', handleReplay);
els.btnReplay.addEventListener('touchstart', handleReplay, { passive: false });

// Previeni scroll e zoom sulla pagina (mobile)
document.addEventListener('touchmove', function(e) {
  if (e.target === els.btnSlap || e.target === els.btnPlay || e.target === els.btnReplay) {
    e.preventDefault();
  }
}, { passive: false });

// Doppio tap zoom prevention
let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// ------------------------------------------------------------
// INIZIALIZZAZIONE
// ------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  loadBestScore();
  startIntro();
});
