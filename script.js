// Stato del Gioco
const gameState = {
    step: 0, // Per l'introduzione narrativa
    level: 0,
    score: 0,
    progress: 0,
    timeLeft: 10,
    gameActive: false,
    timerInterval: null
};

// Selettori DOM
const introScreen = document.getElementById('intro-screen');
const playScreen = document.getElementById('play-screen');
const gameoverScreen = document.getElementById('gameover-screen');

const introImg = document.getElementById('intro-img');
const speechBubble = document.getElementById('speech-bubble');
const storyText = document.getElementById('intro-story-text');
const nextBtn = document.getElementById('next-btn');
const startBtn = document.getElementById('start-btn');

const gameFace = document.getElementById('game-face');
const slapFlash = document.getElementById('slap-flash');
const charWrapper = document.getElementById('character-wrapper');
const levelDisplay = document.getElementById('level-display');
const scoreDisplay = document.getElementById('score-display');
const timerBar = document.getElementById('timer-bar');
const progressBar = document.getElementById('progress-bar');

const endFace = document.getElementById('end-face');
const maxLevelDisplay = document.getElementById('max-level-reached');
const finalScoreDisplay = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Mappa delle immagini del gioco
const IMAGES = {
    intro1: 'assets/intro-1.png',
    wife: 'assets/intro-wife.png',
    terrified: 'assets/intro-terrified.png',
    faces: [
        'assets/faccia-0.png',
        'assets/faccia-1.png',
        'assets/faccia-2.png',
        'assets/faccia-3.jpg',
        'assets/faccia-4.jpg',
        'assets/faccia-5.jpg'
    ]
};

// Generatore Audio (Beep & Slap) senza bisogno di file mp3 esterni
const playSound = (type) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'whistle') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'slap') {
            // Effetto rumore bianco simulato per lo schiaffo
            const bufferSize = ctx.sampleRate * 0.1;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            noise.connect(filter);
            filter.connect(gain);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            noise.start();
        } else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.8);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        }
    } catch(e) {
        console.log("Audio non supportato o interazione utente richiesta.");
    }
};

// Storia / Intro passi
const storySteps = [
    {
        text: "Marmellino adora fischiettare allegro in salotto...",
        image: IMAGES.intro1,
        bubble: "Fiuuu~ 😙♪",
        sound: 'whistle'
    },
    {
        text: "La fischio-mania continua tutto il giorno senza sosta!",
        image: IMAGES.intro1,
        bubble: "Trallallero~ 🎵",
        sound: 'whistle'
    },
    {
        text: "La moglie irrompe furiosa con il mattarello! Non ne può più!",
        image: IMAGES.wife,
        bubble: "BASTAAA!!! 😡💥",
        sound: null
    },
    {
        text: "Marmellino si accorge del pericolo imminente...",
        image: IMAGES.terrified,
        bubble: "Aiuto... 😨💦",
        sound: null
    }
];

// Gestione click sul tasto "Avanti"
nextBtn.addEventListener('click', () => {
    gameState.step++;
    if (gameState.step < storySteps.length) {
        const stepData = storySteps[gameState.step];
        storyText.innerText = stepData.text;
        introImg.src = stepData.image;
        if (stepData.bubble) {
            speechBubble.innerText = stepData.bubble;
            speechBubble.classList.remove('hidden');
        } else {
            speechBubble.classList.add('hidden');
        }
        if (stepData.sound) playSound(stepData.sound);
    } else {
        nextBtn.classList.add('hidden');
        startBtn.classList.remove('hidden');
        storyText.innerText = "Dagli una lezione prima che scada il tempo!";
    }
});

// Avvio Gioco
startBtn.addEventListener('click', () => {
    introScreen.classList.remove('active');
    playScreen.classList.add('active');
    startGame();
});

const startGame = () => {
    gameState.level = 0;
    gameState.score = 0;
    gameState.progress = 0;
    gameState.gameActive = true;
    
    startLevel();
};

const startLevel = () => {
    gameState.progress = 0;
    gameState.timeLeft = Math.max(10 - gameState.level * 0.8, 4); // Tempo cala a ogni livello
    progressBar.style.width = '0%';
    
    levelDisplay.innerText = gameState.level;
    scoreDisplay.innerText = gameState.score;
    
    // Aggiorna l'immagine in base al livello raggiunto
    const faceIndex = Math.min(gameState.level, IMAGES.faces.length - 1);
    gameFace.src = IMAGES.faces[faceIndex];

    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(updateTimer, 100);
};

const updateTimer = () => {
    gameState.timeLeft -= 0.1;
    const percent = (gameState.timeLeft / Math.max(10 - gameState.level * 0.8, 4)) * 100;
    timerBar.style.width = `${Math.max(percent, 0)}%`;

    if (gameState.timeLeft <= 0) {
        endGame();
    }
};

// Funzione Schiaffo
charWrapper.addEventListener('click', () => {
    if (!gameState.gameActive) return;

    // Effetto grafico schiaffo
    charWrapper.classList.add('slapped');
    slapFlash.style.display = 'block';
    playSound('slap');

    setTimeout(() => {
        charWrapper.classList.remove('slapped');
    }, 80);

    setTimeout(() => {
        slapFlash.style.display = 'none';
    }, 150);

    // Progresso
    const increment = 100 / (10 + gameState.level * 3); // Più difficile a ogni livello
    gameState.progress += increment;
    gameState.score += 10;
    
    scoreDisplay.innerText = gameState.score;
    progressBar.style.width = `${Math.min(gameState.progress, 100)}%`;

    if (gameState.progress >= 100) {
        levelUp();
    }
});

const levelUp = () => {
    clearInterval(gameState.timerInterval);
    gameState.level++;
    
    if (gameState.level >= IMAGES.faces.length) {
        // Vittoria Finale se supera l'ultimo livello
        endGame();
    } else {
        startLevel();
    }
};

const endGame = () => {
    gameState.gameActive = false;
    clearInterval(gameState.timerInterval);
    playSound('gameover');

    playScreen.classList.remove('active');
    gameoverScreen.classList.add('active');

    const maxFaceIndex = Math.min(gameState.level, IMAGES.faces.length - 1);
    endFace.src = IMAGES.faces[maxFaceIndex];
    maxLevelDisplay.innerText = gameState.level;
    finalScoreDisplay.innerText = gameState.score;
};

// Gioca Ancora
restartBtn.addEventListener('click', () => {
    gameoverScreen.classList.remove('active');
    introScreen.classList.add('active');
    
    // Reset Intro
    gameState.step = 0;
    introImg.src = IMAGES.intro1;
    speechBubble.innerText = "Fiuuu~ 😙♪";
    speechBubble.classList.remove('hidden');
    storyText.innerText = "Marmellino adora fischiettare allegro in salotto...";
    nextBtn.classList.remove('hidden');
    startBtn.classList.add('hidden');
});