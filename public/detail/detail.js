/**
 * detail.js
 * 作品詳細表示 & いいね・シェア機能
 * 役割：データは Node.js から、画像は Java サーバーから取得するニャ！
 */

// 画像や動画が置いてある Java サーバーのアドレス
const IMAGE_SERVER_URL = "https://my-portfolio-admin-vhpt.onrender.com";
// データの取得先（Node.js 自身なので空文字で OK）
const API_BASE = ""; 

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof initUI === "function") initUI();
    if (typeof initParticles === "function") initParticles();

    const urlParams = new URLSearchParams(window.location.search);
    const workId = urlParams.get('id') || window.location.hash.replace('#', '');
    
    console.log("[Debug] 取得した作品ID:", workId);

    if (!workId) {
        console.warn("IDが指定されていないため、ポートフォリオ一覧に戻ります。");
        window.location.href = '/portfolio/portfolio.html';
        return;
    }

    try {
        /**
         * 1. Node.js 側の API から全作品データを取得
         * ※ Java サーバーではなく、自分のサーバー（/api/works）に聞きに行くニャ！
         */
        const worksRes = await fetch(`${API_BASE}/api/works`);
        
        if (!worksRes.ok) throw new Error("作品データの取得に失敗しました");

        const works = await worksRes.json();

        /**
         * 2. IDが一致する作品を抽出
         */
        const work = works.find(w => String(w.id).trim() === String(workId).trim());
        
        if (work) {
            renderWorkDetail(work);
        } else {
            console.error("[Error] 一致する作品が見つかりません:", workId);
            showErrorMessage();
        }
    } catch (e) {
        console.error("[Error] データの読み込みエラー:", e);
        showErrorMessage();
    }
});

/**
 * YouTubeのURLから動画IDを抽出
 */
function getYouTubeID(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}

/**
 * 作品詳細のHTMLレンダリング
 */
function renderWorkDetail(work) {
    document.title = `${work.title} | Mii's Camvas`;
    const container = document.getElementById("work-detail");
    if (!container) return;

    // パスの補正 (画像は Java サーバーの URL をくっつけるニャ)
    const fixPath = (p) => {
        if (!p) return "";
        if (p.startsWith("http") || p.startsWith("data:")) return p;
        
        const cleanPath = p.startsWith("/") ? p : `/${p}`;
        
        if (cleanPath.startsWith("/upload/img")) {
            return `${IMAGE_SERVER_URL}${cleanPath}`;
        }
        if (cleanPath.startsWith("/img")) {
            return `${IMAGE_SERVER_URL}/upload${cleanPath}`;
        }
        return `${IMAGE_SERVER_URL}/upload/img${cleanPath}`;
    };

    const safeSrc = fixPath(work.image || work.link);
    const ext = safeSrc.split('.').pop().toLowerCase();
    const workIdStr = String(work.id);

    const likeCount = work.like_count || 0;
    const isLiked = JSON.parse(localStorage.getItem("likedWorks") || "[]").includes(workIdStr);

    // --- メディア表示の判定 ---
    let mediaHTML = "";
    const ytID = getYouTubeID(work.link);

    if (ytID) {
        mediaHTML = `
            <div class="video-container">
                <iframe src="https://www.youtube.com/embed/${ytID}?rel=0" frameborder="0" allowfullscreen></iframe>
            </div>`;
    } else if (ext === "mp4" || work.type === "movie") {
        mediaHTML = `
            <div class="video-container">
                <video src="${safeSrc}" controls autoplay muted playsinline loop class="detail-main-media"></video>
            </div>`;
    } else {
        mediaHTML = `
            <div class="image-watermark clickable-image">
                <img src="${safeSrc}" draggable="false" class="detail-main-media" alt="${work.title}">
                <div class="watermark"></div>
            </div>`;
    }

    // --- リンクエリア ---
    let linkAreaHTML = "";
    const targetLink = work.link || "";
    if (targetLink && !ytID) {
        linkAreaHTML = `
            <div class="web-link-area">
                <span class="link-label">Project Link:</span>
                <a href="${targetLink}" target="_blank" rel="noopener noreferrer" class="web-url-text">
                    ${targetLink}
                </a>
            </div>`;
    }

    // タグの生成 (Node.js からは配列で届くはずニャ)
    const tagsHTML = Array.isArray(work.tags)
        ? work.tags.map(t => `<span class="tag">#${t}</span>`).join('') 
        : "";

    container.innerHTML = `
        <div class="detail-left">${mediaHTML}</div>
        <div class="detail-right">
            <h1 class="detail-title">${work.title}</h1>
            <p class="detail-desc">${work.description || "作品の説明はありません。"}</p>
            <div class="detail-tags">${tagsHTML}</div>
            ${linkAreaHTML}
            <div class="detail-actions">
                <a href="/portfolio/portfolio.html" class="back-link">← 一覧に戻る</a>
                <button class="like-btn ${isLiked ? 'isliked' : ''}" id="detail-like" type="button">
                    ♡ <span>${likeCount}</span>
                </button>
                <button class="share-btn" id="detail-share" type="button">↗ Share</button>
            </div>
        </div>
    `;

    setupActionEvents(work, workIdStr);
}

/**
 * いいね・シェアボタンのイベント設定
 */
function setupActionEvents(work, workId) {
    const likeBtn = document.getElementById("detail-like");
    const shareBtn = document.getElementById("detail-share");

    if (likeBtn) {
        likeBtn.onclick = async () => {
            const countEl = likeBtn.querySelector("span");
            let count = parseInt(countEl.textContent) || 0;
            let likedList = JSON.parse(localStorage.getItem("likedWorks") || "[]");
            const isNowLiked = !likeBtn.classList.contains("isliked");

            if (!isNowLiked) {
                likeBtn.classList.remove("isliked");
                count = Math.max(0, count - 1);
                likedList = likedList.filter(id => id !== workId);
            } else {
                likeBtn.classList.add("isliked");
                count++;
                if (!likedList.includes(workId)) likedList.push(workId);
                
                const heart = document.createElement("span");
                heart.className = "heart-pop"; heart.textContent = "💗";
                likeBtn.appendChild(heart); 
                setTimeout(() => heart.remove(), 900);
            }

            countEl.textContent = count;
            localStorage.setItem("likedWorks", JSON.stringify(likedList));

            // いいねの送信も Node.js 側（API_BASE）に送るニャ！
            fetch(`${API_BASE}/like`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: workId, like: isNowLiked })
            }).catch(err => console.error("Like API Error:", err));
        };
    }

    if (shareBtn) {
        shareBtn.onclick = async () => {
            const shareUrl = window.location.href;
            if (navigator.share) {
                navigator.share({ 
                    title: work.title, 
                    text: `『${work.title}』作品詳細 | Mii's Camvas`, 
                    url: shareUrl 
                }).catch(() => {});
            } else {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    const originalText = shareBtn.innerHTML;
                    shareBtn.innerHTML = "Copied!";
                    setTimeout(() => { shareBtn.innerHTML = originalText; }, 2000);
                });
            }
        };
    }
}

/**
 * エラー表示
 */
function showErrorMessage() {
    const container = document.getElementById("work-detail");
    if (!container) return;
    container.innerHTML = `
        <div style="text-align:center; padding:100px 20px;">
            <h2 style="color:#ff4fa3; font-family:'Dela Gothic One';">作品が見つかりませんでした</h2>
            <p style="color:#888; margin-bottom:20px;">URLが間違っているか、作品が削除された可能性があります。</p>
            <a href="/portfolio/portfolio.html" style="color:#fff; text-decoration:underline;">ポートフォリオ一覧へ戻る</a>
        </div>`;
}
