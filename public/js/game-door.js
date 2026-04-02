/**
 * 儀式：猫に魚を食べさせて、ゲームページ（game.html）への通行証をセットする
 */
document.addEventListener("DOMContentLoaded", () => {
    const door = document.querySelector('.admin-door');
    const fish = document.querySelector('.admin-fish');
    const cat  = document.querySelector('.admin-cat');
    
    if (!door || !fish || !cat) {
        console.error("必要な要素が見つからないニャ。HTMLのクラス名を確認してね！");
        return;
    }

    let isDragging = false;

    /**
     * ドラッグ中の動き
     */
    const handleMove = (clientX) => {
        if (!isDragging) return;

        const rect = door.getBoundingClientRect();
        const fishWidth = fish.offsetWidth;
        
        // 枠内でのマウス/指の相対座標を計算
        let offsetX = clientX - rect.left - (fishWidth / 2);

        // 移動できる限界値（左端0 〜 右端）
        const maxRange = rect.width - fishWidth - 20; 
        let moveX = Math.max(0, Math.min(offsetX, maxRange));

        // 魚の位置を更新
        fish.style.transform = `translateX(${moveX}px)`;

        const progress = moveX / maxRange;
        if (progress >= 0.9) {
            door.classList.add('is-eaten');
            door.classList.remove('is-near');
        } else if (progress >= 0.5) {
            door.classList.add('is-near');
            door.classList.remove('is-eaten');
        } else {
            door.classList.remove('is-near', 'is-eaten');
        }
    };

    /**
     * ドラッグ終了時の判定
     */
    const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;

        // 猫が満足（is-eaten）していたら合格！
        if (door.classList.contains('is-eaten')) {
            // ✨ 重要：game.js側と一致する文字列をセット
            sessionStorage.setItem('game_pass', 'cleared_cat_ritual');
            
            console.log("🐱「ごちそうさまニャ！通行証を発行したよ」");
            
            // game.html へ出発！
            window.location.href = "/game/game.html";
        } else {
            // 満足してなければ最初からやり直しニャ
            resetFish();
        }
    };

    /**
     * 魚を元の位置に戻す
     */
    const resetFish = () => {
        fish.style.transition = "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        fish.style.transform = "translateX(0px)";
        door.classList.remove('is-near', 'is-eaten');
    };

    // --- イベント登録（マウス） ---
    fish.addEventListener('mousedown', () => {
        isDragging = true;
        fish.style.transition = "none";
    });

    window.addEventListener('mousemove', (e) => {
        handleMove(e.clientX);
    });

    window.addEventListener('mouseup', stopDrag);

    // --- イベント登録（タッチ） ---
    fish.addEventListener('touchstart', (e) => {
        isDragging = true;
        fish.style.transition = "none";
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches[0]) {
            handleMove(e.touches[0].clientX);
        }
    }, { passive: false });

    window.addEventListener('touchend', stopDrag);
});