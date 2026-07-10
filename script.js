// Referenze DOM (Schermate)
const screenIntro = document.getElementById('screen-intro');
const screenMenu = document.getElementById('screen-menu');
const screenGame = document.getElementById('screen-game');
const screenEnd = document.getElementById('screen-end');

// Referenze DOM (Elementi UI)
const btnStart = document.getElementById('btn-start');
const btnSlap = document.getElementById('btn-slap');
const btnRestart = document.getElementById('btn-restart');
const faceSprite = document.getElementById('face-sprite');
const finalFaceSprite = document.getElementById('final-face-sprite');

// Testi HUD
const uiTimer = document.getElementById('timer');
const uiSlaps = document.getElementById('game-slaps');
const uiAp = document.getElementById('game-ap');
const uiLevel = document.getElementById('game-level');
const uiHighScore = document.getElementById('high-score-display');

// Costanti di Gioco
const GAME_DURATION = 30; // secondi
const SLAPS_PER_LEVEL = 10;
const MAX_LEVEL = 5;

// Array delle immagini per gestire PNG e JPG misti
const faceFiles = [
  'faccia-0.png',
  'faccia-1.png',
  'faccia-2.png',
  'faccia-3.jpg',
  'faccia-4.jpg',
  'faccia-5.jpg'
];

// Variabili di Stato
let slaps = 0;
let level = 0;
let actionPoints = 0;
let timeLeft = GAME_DURATION;
let gameInterval;
let isPlaying = false;
let highScore = localStorage.getItem('slavatone_highscore') || 0;

uiHighScore.innerText = highScore;

// --- FUNZIONI DI NAVIGAZIONE SCHERMATE ---
function showScreen(screenElement) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screenElement.classList.add('active');
}

// --- LOGICA INTRODUZIONE ---
const swearWords = ["@#! cane", "@#! lupo", "@#! ufo", "@#! impestata", "@#! balorda", "porco @#!", "@#! maiale"];

function runIntroSequence() {
  setTimeout(() => {
    document.getElementById('scene-1').classList.remove('show');
    document.getElementById('scene-2').classList.add('show');
    
    let wordIndex = 0;
    const bubble = document.getElementById('swear-bubble');
    const swearInterval = setInterval(() => {
      wordIndex++;
      if(wordIndex < swearWords.length) {
        bubble.innerText = swearWords[wordIndex];
      } else {
        clearInterval(swearInterval);
      }
    }, 300);
  }, 1000);

  setTimeout(() => {
    document.getElementById('scene-2').classList.remove('show');
    document.getElementById('scene-3').classList.add('show');
  }, 3000);

  setTimeout(() => {
    document.getElementById('scene-3').classList.remove('show');
    document.getElementById('scene-4').classList.add('show');
  }, 4000);

  setTimeout(() => {
    showScreen(screenMenu);
  }, 5500); 
}

// --- LOGICA DI GIOCO ---
function startGame() {
  slaps = 0;
  level = 0;
  actionPoints = 0;
  timeLeft = GAME_DURATION;
  isPlaying = true;

  updateUI();
  uiTimer.classList.remove('danger');
  
  // Imposta la faccia iniziale dall'array
  faceSprite.src = "assets/" + faceFiles[0];

  showScreen(screenGame);

  gameInterval = setInterval(() => {
    timeLeft -= 0.1; 
    
    if (timeLeft <= 5) uiTimer.classList.add('danger');
    
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame();
    }
    uiTimer.innerText = timeLeft.toFixed(1);
  }, 100);
}

function handleSlap(e) {
  if(e) e.preventDefault(); 
  if(!isPlaying) return;

  slaps++;
  
  // Calcolo Punti e Livello
  actionPoints = Math.floor(slaps / SLAPS_PER_LEVEL);
  let newLevel = Math.min(actionPoints, MAX_LEVEL);

  // Cambia immagine solo se il livello è scattato pescandola dall'array corretto
  if (newLevel !== level) {
    level = newLevel;
    faceSprite.src = "assets/" + faceFiles[level];
  }

  updateUI();
  triggerVisualFeedback();
}

function updateUI() {
  uiSlaps.innerText = slaps;
  uiAp.innerText = actionPoints;
  uiLevel.innerText = level;
}

function triggerVisualFeedback() {
  // Rinculo bottone
  btnSlap.classList.add('punch-effect');
  setTimeout(() => btnSlap.classList.remove('punch-effect'), 100);

  // Shake della faccia
  faceSprite.classList.remove('shake');
  void faceSprite.offsetWidth; 
  faceSprite.classList.add('shake');
}

function endGame() {
  isPlaying = false;
  clearInterval(gameInterval);

  // Calcolo Punteggio Finale
  const bonusLevel = level;
  const totalScore = actionPoints + bonusLevel;

  // Salva Highscore
  if(totalScore > highScore) {
    highScore = totalScore;
    localStorage.setItem('slavatone_highscore', highScore);
    uiHighScore.innerText = highScore;
  }

  // Popola schermata finale
  document.getElementById('end-slaps').innerText = slaps;
  document.getElementById('end-ap').innerText = actionPoints;
  document.getElementById('end-bonus').innerText = `+${bonusLevel}`;
  document.getElementById('end-total').innerText = totalScore;
  
  // Aggiorna faccia finale
  finalFaceSprite.src = "assets/" + faceFiles[level];

  showScreen(screenEnd);
}

// --- EVENT LISTENERS ---
btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', () => showScreen(screenMenu));

// Gestione unificata per desktop/mobile
btnSlap.addEventListener('touchstart', handleSlap, { passive: false });
btnSlap.addEventListener('mousedown', (e) => {
  if(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; 
  handleSlap(e);
});

// Avvia intro al caricamento
window.onload = runIntroSequence;
