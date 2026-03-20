// 🎮 VARIABLES
let currentAlbum;
let lives;
let blurLevel;
let attempts = [];
let gameOver = false;
let hintsUsed = 0;
let gameMode = "daily";

let score = 0;
let bestScore = parseInt(localStorage.getItem("bestScore")) || 0;

// 🔊 SONIDOS
const correctSound = new Audio("sounds/correct.mp3");
const wrongSound = new Audio("sounds/wrong.mp3");
const gameOverSound = new Audio("sounds/gameover.mp3");

// 🎤 ARTISTAS
const artists = [
    "Daddy Yankee","Don Omar","Tego Calderon","Vico C","Wisin y Yandel",
    "Ivy Queen","Zion y Lennox","Nicky Jam","Arcangel","Hector el Father",
    "Bad Bunny","Anuel AA","Eladio Carrion","Duki","Bryant Myers",
    "Myke Towers","Jhayco","Ozuna","J Balvin","Karol G",
    "Ñengo Flow","Cosculluela","De La Ghetto","Farruko","Rauw Alejandro",
    "Maluma","Feid","Chencho Corleone","Maldy","Young Miko",
    "Bizarrap","Natti Natasha","Becky G","Khea","Trueno",
    "Nicki Nicole","Cazzu","Paulo Londra","Miky Woodz","Noriel",
    "Brytiago","Dalex","Sech","Lunay","Justin Quiles",
    "Blessd","Ryan Castro","Neutro Shorty","Mora","Yandel"
];

// 🧠 NORMALIZAR
function normalize(text) {
    return text.toLowerCase()
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/feat.*$/g, "")
        .replace(/-.*$/g, "")
        .replace(/remix/g, "")
        .replace(/[^\w\s]/g, "")
        .trim();
}

// 🧠 IA
function similarity(a, b) {
    a = normalize(a);
    b = normalize(b);

    let longer = a.length > b.length ? a : b;
    let shorter = a.length > b.length ? b : a;

    let distance = editDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

function editDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i-1] === a[j-1]
                ? matrix[i-1][j-1]
                : Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
        }
    }
    return matrix[b.length][a.length];
}

// 📊 STATS
function saveStats(win) {
    let stats = JSON.parse(localStorage.getItem("stats")) || { played: 0, wins: 0 };
    stats.played++;
    if (win) stats.wins++;
    localStorage.setItem("stats", JSON.stringify(stats));
}

// 🔥 RACHA
function saveStreak(win) {

    if (gameMode !== "daily") return;

    const today = new Date().toISOString().slice(0,10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);

    let streak = JSON.parse(localStorage.getItem("streak")) || {
        count: 0,
        lastDate: null
    };

    if (win) {
        if (streak.lastDate === yesterday) {
            streak.count++;
        } else {
            streak.count = 1;
        }
        streak.lastDate = today;
    } else {
        streak.count = 0;
        streak.lastDate = today;
    }

    localStorage.setItem("streak", JSON.stringify(streak));
}

// 📅 DAILY
function getDailyIndex() {
    const today = new Date().toISOString().slice(0,10);
    let hash = 0;
    for (let i = 0; i < today.length; i++) hash += today.charCodeAt(i);
    return hash;
}

// 🎧 API
async function getAlbum() {

    const artist = gameMode === "daily"
        ? artists[getDailyIndex() % artists.length]
        : artists[Math.floor(Math.random() * artists.length)];

    const res = await fetch(`https://itunes.apple.com/search?term=${artist}&entity=album&limit=20`);
    const data = await res.json();

    const index = gameMode === "daily"
        ? getDailyIndex() % data.results.length
        : Math.floor(Math.random() * data.results.length);

    return data.results[index];
}

// 🏠 MODOS
function startMode(mode) {
    gameMode = mode;
    document.getElementById("homeScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "block";
    startGame();
}

// 🚀 START
async function startGame() {

    document.getElementById("endScreen").style.display = "none";

    const album = await getAlbum();

    currentAlbum = {
        name: album.collectionName,
        artist: album.artistName,
        image: album.artworkUrl100.replace("100x100","500x500")
    };

    lives = 5;
    blurLevel = 20;
    attempts = [];
    gameOver = false;
    hintsUsed = 0;
    score = 0;

    const img = document.getElementById("albumImage");
    img.src = currentAlbum.image;
    img.style.filter = `blur(${blurLevel}px)`;
    img.classList.remove("win");

    document.getElementById("guessInput").value = "";

    updateLivesUI();
    updateAttemptsUI();
    updateProgress();

    document.getElementById("stats").innerText =
        "🏆 Mejor puntuación: " + bestScore;

    let streak = JSON.parse(localStorage.getItem("streak"));
    if (streak) {
        document.getElementById("streak").innerText = "🔥 Racha: " + streak.count;
    }
}

// 🎯 CHECK
function checkGuess() {

    if (gameOver || lives <= 0) return;

    const inputBox = document.getElementById("guessInput");
    const input = inputBox.value.trim();

    if (!input) return;

    const img = document.getElementById("albumImage");
    const result = document.getElementById("result");

    // limpiar sugerencias
    document.getElementById("suggestions").innerHTML = "";

    const sim = similarity(input, currentAlbum.name);

    // 🎉 ACIERTO
    if (sim > 0.6) {

        attempts.push("🟩");
        updateAttemptsUI();

        correctSound.play();
        
        launchConfetti();

        img.style.filter = "blur(0)";
        img.classList.add("win");

        score = lives * 10;
        

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem("bestScore", bestScore);
        }

        saveStats(true);
        saveStreak(true);

        result.innerHTML = '<span class="correct-text">🎉 Correcto!</span>';

        gameOver = true;

        showEndScreen(true);
        return;
    }

    // ❌ FALLA

    attempts.push("🟥");
    updateAttemptsUI();

    wrongSound.play();

    // 🔥 ANIMACIÓN SHAKE
    inputBox.classList.add("input-error");
    setTimeout(() => inputBox.classList.remove("input-error"), 300);

    // 🧠 FEEDBACK INTELIGENTE (🔥🔥🔥)
    if (sim > 0.5) {
        result.innerText = "🔥 Muy cerca!";
    } 
    else if (sim > 0.3) {
        result.innerText = "😐 Cerca...";
    } 
    else {
        result.innerText = "❄️ Muy lejos";
    }

    // ❤️ VIDAS
    lives = Math.max(0, lives - 1);
    blurLevel -= 4;

    img.style.filter = `blur(${blurLevel}px)`;

    updateLivesUI();
    updateProgress();

    // 💀 GAME OVER
    if (lives === 0) {

        gameOverSound.play();

        saveStats(false);
        saveStreak(false);

        result.innerText = "💀 Era: " + currentAlbum.name;

        gameOver = true;

        showEndScreen(false);
    }

    // limpiar input
    inputBox.value = "";
}

// ❤️ CORAZONES
function updateLivesUI() {
    const container = document.getElementById("lives");
    container.innerHTML = "";

    for (let i = 0; i < 5; i++) {
        const heart = document.createElement("span");
        heart.innerHTML = "❤️";
        if (i >= lives) heart.classList.add("off");
        container.appendChild(heart);
    }
}

// 📊 PROGRESO
function updateProgress() {
    const maxBlur = 20;
    const progress = Math.round(((maxBlur - blurLevel) / maxBlur) * 100);

    document.getElementById("progressBar").style.width = progress + "%";
    document.getElementById("progressText").innerText =
        progress + "% descubierto";
}

// 🧩 WORDLE
function updateAttemptsUI() {
    const container = document.getElementById("attemptsContainer");
    container.innerHTML = "";

    for (let i = 0; i < 5; i++) {
        const box = document.createElement("div");
        box.classList.add("attempt-box");

        if (attempts[i] === "🟩") box.classList.add("correct");
        if (attempts[i] === "🟥") box.classList.add("wrong");

        container.appendChild(box);
    }
}

// 💡 PISTAS
function giveHint() {

    if (gameOver) return;

    const result = document.getElementById("result");

    if (hintsUsed === 0) {
        result.innerText = "🎤 Artista: " + currentAlbum.artist;
    } else if (hintsUsed === 1) {
        result.innerText = "🔤 Empieza por: " + currentAlbum.name.charAt(0);
    } else if (hintsUsed === 2) {
        result.innerText = "🔢 Letras: " + currentAlbum.name.length;
    } else {
        result.innerText = "❌ No hay más pistas";
        return;
    }

    hintsUsed++;
}

// 🏁 FINAL
function showEndScreen(win) {

    const modal = document.getElementById("endScreen");

    document.getElementById("endTitle").innerText =
        win ? "🎉 ¡Has ganado!" : "💀 Has perdido";

    document.getElementById("endMessage").innerText =
        currentAlbum.name + " | " + (win ? "+" + score : "0") + " pts";

    modal.style.display = "flex";
}

// 🏠 SALIR (FIX)
function goHome() {

    document.getElementById("homeScreen").style.display = "block";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("endScreen").style.display = "none";

    gameOver = false;
    attempts = [];
    hintsUsed = 0;
    lives = 5;

    document.getElementById("result").innerText = "";
    document.getElementById("guessInput").value = "";
    document.getElementById("suggestions").innerHTML = "";
    document.getElementById("attemptsContainer").innerHTML = "";
}

function launchConfetti() {

    const duration = 1500;
    const end = Date.now() + duration;

    const interval = setInterval(function() {

        if (Date.now() > end) {
            return clearInterval(interval);
        }

        confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 }
        });

    }, 200);
}

// 🔍 AUTOCOMPLETE
window.addEventListener("DOMContentLoaded", () => {

    const input = document.getElementById("guessInput");

    input.addEventListener("keypress", function(e) {
        if (e.key === "Enter") checkGuess();
    });

    input.addEventListener("input", async function () {

        const value = this.value;
        const suggestionsDiv = document.getElementById("suggestions");

        suggestionsDiv.innerHTML = "";

        if (!value) return;

        const response = await fetch(
            `https://itunes.apple.com/search?term=${value}&entity=album&limit=5`
        );

        const data = await response.json();

        data.results.forEach(album => {

            const div = document.createElement("div");
            div.innerText = album.collectionName;

            div.onclick = () => {
                input.value = album.collectionName;
                suggestionsDiv.innerHTML = "";
            };

            suggestionsDiv.appendChild(div);
        });
    });
});

// 📤 SHARE
function shareResult() {
    alert("Resultado copiado (simulado)");
}