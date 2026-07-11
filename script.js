document.addEventListener("DOMContentLoaded", () => {

    // --- RIFERIMENTI DOM SCHERMATE ---
    const scrIntro = document.getElementById("screen-intro");
    const scrMenu = document.getElementById("screen-menu");
    const scrGame = document.getElementById("screen-game");
    const scrFinal = document.getElementById("screen-final");

    // --- RIFERIMENTI ELEMENTI INTRO ---
    const introBubble = document.getElementById("intro-bubble");
    const introHusband = document.getElementById("intro-husband");
    const introWife = document.getElementById("intro-wife");
    const sweatDrops = document.getElementById("sweat-drops");

    // --- RIFERIMENTI ELEMENTI GIOCO ---
    const gameTimer = document.getElementById("game-timer");
    const statSlaps = document.getElementById("stat-slaps");
    const statLevel = document.getElementById("stat-level");
    const statAp = document.getElementById("stat-ap");
    const gameFace = document.getElementById("game-face");
    const btnSlap = document.getElementById("btn-slap");
    const slapEffectsContainer = document.getElementById("slap-effects-container");

    // --- RIFERIMENTI ELEMENTI MENU & RISULTATI ---
    const btnPlay = document.getElementById("btn-play");
    const valBestScore = document.getElementById("val-best-score");
    const finalFaceImg = document.getElementById("final-face-img");
    const finalSlaps = document.getElementById("final-slaps");
    const finalAp = document.getElementById("final-ap");
    const finalLevelBonus = document.getElementById("final-level-bonus");
    const finalTotalScore = document.getElementById("final-total-score");
    const btnReplay = document.getElementById("btn-replay");

    // --- STATO DEL GIOCO ---
    let slaps = 0;
    let level = 0;
    let actionPoints = 0;
    let timeLeft = 10;
    let gameInterval = null;
    let bestScore = localStorage.getItem("slap_marmellino_best") || 0;

    const curseWords = [
        "@#! cane", 
        "@#! lupo", 
        "@#! ufo", 
        "@#! impestata", 
        "@#! balorda", 
        "porco @#!", 
        "@#! maiale"
    ];

    valBestScore.textContent = bestScore;

    playIntroSequence();

    // ========================================================
    // SYNTH SOUND EFFECT (Web Audio API)
    // ========================================================
    function playSlapSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const bufferSize = ctx.sampleRate * 0.15;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);

            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0.8, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);

            oscGain.gain.setValueAtTime(0.5, ctx.currentTime);
            oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

            osc.connect(oscGain);
            oscGain.connect(ctx.destination);

            noise.start();
            osc.start();
            
            noise.stop(ctx.currentTime + 0.15);
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.warn("Audio Context non supportato.", e);
        }
    }

    // ========================================================
    // SEQUENZA INTRO
    // ========================================================
    function playIntroSequence() {
        switchScreen(scrIntro);
        introHusband.src = "assets/intro-1.png.png";
        introHusband.classList.remove("scared-animation");
        introWife.classList.add("hidden-wife");
        introBubble.classList.add("hidden");
        sweatDrops.classList.add("hidden");

        let curseInterval = null;

        setTimeout(() => {
            introBubble.classList.remove("hidden");
            let index = 0;
            introBubble.textContent = curseWords[index];
            
            curseInterval = setInterval(() => {
                index = (index + 1) % curseWords.length;
                introBubble.textContent = curseWords[index];
            }, 350);
        }, 1000);

        setTimeout(() => {
            clearInterval(curseInterval);
            introBubble.classList.add("hidden");
            introWife.classList.remove("hidden-wife");
        }, 3500);

        setTimeout(() => {
            introHusband.src = "assets/intro-terrified.png.png";
            introHusband.classList.add("scared-animation");
            sweatDrops.classList.remove("hidden");
        }, 4500);

        setTimeout(() => {
            fadeOutAndSwitch(scrIntro, scrMenu);
        }, 5500);
    }

    // ========================================================
    // TRANSITIONS
    // ========================================================
    function switchScreen(targetScreen) {
        scrIntro.classList.add("hidden");
        scrMenu.classList.add("hidden");
        scrGame.classList.add("hidden");
        scrFinal.classList.add("hidden");
        targetScreen.classList.remove("hidden");
    }

    function fadeOutAndSwitch(currentScreen, nextScreen) {
        currentScreen.style.opacity = "0";
        setTimeout(() => {
            currentScreen.classList.add("hidden");
            currentScreen.style.opacity = "1";
            nextScreen.classList.remove("hidden");
        }, 300);
    }

    // ========================================================
    // GAMEPLAY
    // ========================================================
    function startGame() {
        slaps = 0;
        level = 0;
        actionPoints = 0;
        timeLeft = 10;

        statSlaps.textContent = slaps;
        statLevel.textContent = level;
        statAp.textContent = actionPoints;
        gameTimer.textContent = timeLeft;
        gameTimer.parentElement.classList.remove("timer-pulse");
        gameFace.src = "assets/faccia-0.png.png";
        btnSlap.disabled = false;

        switchScreen(scrGame);

        gameInterval = setInterval(() => {
            timeLeft--;
            gameTimer.textContent = timeLeft;

            if (timeLeft <= 3) {
                gameTimer.parentElement.classList.add("timer-pulse");
            }

            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    function handleSlap() {
        if (timeLeft <= 0) return;

        slaps++;
        playSlapSound();

        actionPoints = Math.floor(slaps / 10);

        let newLevel = Math.floor(slaps / 10);
        if (newLevel > 5) newLevel = 5;

        if (newLevel !== level) {
            level = newLevel;
            updateFaceImage(level);
        }

        statSlaps.textContent = slaps;
        statLevel.textContent = level;
        statAp.textContent = actionPoints;

        triggerFaceShake();
        spawnSlapVisualEffect();
    }

    // Qui ora gestiamo correttamente sia i cambi livello che la cartella assets/
    function updateFaceImage(currentLevel) {
        if (currentLevel >= 3) {
            gameFace.src = `assets/faccia-${currentLevel}.jpg.png`;
        } else {
            gameFace.src = `assets/faccia-${currentLevel}.png.png`;
        }
    }

    function triggerFaceShake() {
        gameFace.classList.remove("shake-animation");
        void gameFace.offsetWidth; 
        gameFace.classList.add("shake-animation");
    }

    function spawnSlapVisualEffect() {
        const words = ["👋 SMACK!", "⚡ POW!", "💥 BAM!", "🥋 SDENG!", "👉 SLAP!"];
        const randomWord = words[Math.floor(Math.random() * words.length)];
        
        const popup = document.createElement("div");
        popup.className = "slap-popup pop-effect";
        popup.textContent = randomWord;

        const xPos = Math.random() * 60 + 20;
        const yPos = Math.random() * 60 + 20;
        popup.style.left = `${xPos}%`;
        popup.style.top = `${yPos}%`;

        slapEffectsContainer.appendChild(popup);

        setTimeout(() => {
            popup.remove();
        }, 400);
    }

    // ========================================================
    // END GAME
    // ========================================================
    function endGame() {
        clearInterval(gameInterval);
        btnSlap.disabled = true;

        const finalScore = actionPoints + level;

        if (finalScore > bestScore) {
            bestScore = finalScore;
            localStorage.setItem("slap_marmellino_best", bestScore);
            valBestScore.textContent = bestScore;
        }

        finalSlaps.textContent = slaps;
        finalAp.textContent = actionPoints;
        finalLevelBonus.textContent = level;
        finalTotalScore.textContent = finalScore;

        if (level >= 3) {
            finalFaceImg.src = `assets/faccia-${level}.jpg.png`;
        } else {
            finalFaceImg.src = `assets/faccia-${level}.png.png`;
        }

        setTimeout(() => {
            switchScreen(scrFinal);
        }, 800);
    }

    const handleSlapEvent = (e) => {
        e.preventDefault();
        handleSlap();
    };

    btnSlap.addEventListener("touchstart", handleSlapEvent, { passive: false });
    btnSlap.addEventListener("mousedown", (e) => {
        if (e.button === 0) {
            handleSlap();
        }
    });

    btnPlay.addEventListener("click", startGame);
    
    btnReplay.addEventListener("click", () => {
        switchScreen(scrMenu);
    });

});