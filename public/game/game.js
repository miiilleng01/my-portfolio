// --- 0. セキュリティ・検問システム ---
if (sessionStorage.getItem('game_pass') !== 'cleared_cat_ritual') {
    alert("不届きものめ！正規のルートから出直すべし");
    window.location.href = "/index.html";
}

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-display');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');

// --- 1. 画面サイズに合わせてキャンバスを調整 ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (player) {
        player.x = canvas.width / 2;
        player.y = canvas.height - 150;
    }
}

// --- 2. 放置タイマーシステム (30分) ---
let idleTimer;
const IDLE_LIMIT = 30 * 60 * 1000;

function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (gameActive) {
        idleTimer = setTimeout(() => {
            alert("30分間操作がなかったため、強制退出となりました。");
            window.location.href = "/index.html";
        }, IDLE_LIMIT);
    }
}

// マウスとタッチの両方でタイマーリセット
window.addEventListener('mousemove', resetIdleTimer);
window.addEventListener('touchstart', resetIdleTimer);

// --- 3. 画像のプリロード ---
const imgCat = new Image(); imgCat.src = '/img/game/cat.png';
const imgFish = new Image(); imgFish.src = '/img/game/fish.png';
const imgPoison = new Image(); imgPoison.src = '/img/game/poison.png';

// ゲーム変数
let score = 10;
let gameActive = false;
let startTime;
const items = [];
const bullets = [];
const player = { x: 0, y: window.innerHeight - 150, size: 50 };

// 初期設定の呼び出し
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

/**
 * 🚀 ゲーム開始！
 */
function startGame() {
    if (gameActive) return;
    
    startScreen.style.display = 'none';
    gameActive = true;
    startTime = Date.now();
    resetIdleTimer();
    spawnItem();
    autoShoot();
    update();
}

/**
 * ✨ ボタンにクリック＆タッチイベントを登録！
 */
if (startButton) {
    startButton.addEventListener('click', startGame);
    // スマホでの誤作動防止と反応速度アップ
    startButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startGame();
    }, { passive: false });
}

// 自動連射
const SHOOT_INTERVAL = 200;
function autoShoot() {
    if (!gameActive) return;
    bullets.push({ x: player.x, y: player.y, speed: 10 });
    setTimeout(autoShoot, SHOOT_INTERVAL);
}

// アイテム生成
function spawnItem() {
    if (!gameActive) return;
    const isPoison = Math.random() < 0.3;
    items.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: -60,
        type: isPoison ? 'poison' : 'fish',
        speed: 2 + Math.random() * 3,
        width: isPoison ? 30 : 50
    });
    setTimeout(spawnItem, 800 + Math.random() * 1000);
}

// --- 4. 操作システム（PC & スマホ） ---

// マウス操作
window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left;
});

// スマホ用のタッチ操作を追加
window.addEventListener('touchmove', (e) => {
    // 画面スクロールを禁止して操作しやすくする
    if (gameActive) e.preventDefault(); 
    const rect = canvas.getBoundingClientRect();
    // 指一本目の位置を取得
    player.x = e.touches[0].clientX - rect.left;
    resetIdleTimer();
}, { passive: false });

// --- 5. メインループ ---
function update() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 弾の処理
    bullets.forEach((b, bi) => {
        b.y -= b.speed;
        ctx.fillStyle = "#ffff00";
        ctx.fillRect(b.x - 2, b.y, 4, 15);
        if (b.y < 0) bullets.splice(bi, 1);
    });

    // アイテムの処理
    items.forEach((item, ii) => {
        item.y += item.speed;
        const targetImg = item.type === 'fish' ? imgFish : imgPoison;
        
        if (targetImg.complete) {
            const ratio = targetImg.naturalHeight / targetImg.naturalWidth;
            const drawW = item.width;
            const drawH = item.width * ratio;
            ctx.drawImage(targetImg, item.x - drawW / 2, item.y, drawW, drawH);

            if (item.type === 'fish') {
                bullets.forEach((b, bi) => {
                    const dist = Math.hypot(b.x - item.x, b.y - (item.y + drawH / 2));
                    if (dist < drawW / 2 + 5) {
                        score += 5;
                        items.splice(ii, 1);
                        bullets.splice(bi, 1);
                        updateScore();
                    }
                });
            } else {
                const distToCat = Math.hypot(player.x - item.x, (player.y + 25) - (item.y + drawH / 2));
                if (distToCat < (player.size / 2)) {
                    score -= 5;
                    items.splice(ii, 1);
                    updateScore();
                }
            }
        }
        if (item.y > canvas.height) items.splice(ii, 1);
    });

    // 猫の描画
    if (imgCat.complete) {
        const ratio = imgCat.naturalHeight / imgCat.naturalWidth;
        const drawW = player.size;
        const drawH = player.size * ratio;
        ctx.drawImage(imgCat, player.x - drawW / 2, player.y, drawW, drawH);
    }

    checkStatus();
    requestAnimationFrame(update);
}

function updateScore() {
    scoreEl.innerText = `Point: ${score}`;
}

function checkStatus() {
    if (score >= 50) {
        gameActive = false;
        clearTimeout(idleTimer);
        const clearTime = ((Date.now() - startTime) / 1000).toFixed(2);
        showResult("MISSION COMPLETE", `クリアタイム: ${clearTime}秒`);
    } else if (score <= 0) {
        gameActive = false;
        clearTimeout(idleTimer);
        alert("GAME OVER!");
        window.location.href = "/index.html";
    }
}

function showResult(title, message) {
    const resultDiv = document.createElement('div');
    resultDiv.style.position = 'absolute';
    resultDiv.style.top = '50%';
    resultDiv.style.left = '50%';
    resultDiv.style.transform = 'translate(-50%, -50%)';
    resultDiv.style.textAlign = 'center';
    resultDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    resultDiv.style.padding = '40px';
    resultDiv.style.border = '4px solid #00ffcc';
    resultDiv.style.borderRadius = '20px';
    resultDiv.style.zIndex = '100';
    resultDiv.style.color = '#fff';

    resultDiv.innerHTML = `
        <h1 style="font-size: 3rem; margin: 0; color: #00ffcc;">${title}</h1>
        <div style="font-size: 1.5rem; margin: 20px 0;">${message}</div>
        <button onclick="location.reload()" style="
            background: #00ffcc; color: #000; border: none; padding: 10px 20px; 
            font-size: 1.2rem; cursor: pointer; font-weight: bold;
        ">もう一度遊ぶ</button>
        <button onclick="location.href='/index.html'" style="
            background: transparent; color: #00ffcc; border: 2px solid #00ffcc; 
            padding: 10px 20px; font-size: 1.2rem; cursor: pointer; margin-left: 10px;
        ">戻る</button>
    `;
    document.body.appendChild(resultDiv);
}
