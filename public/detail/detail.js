// 共通UIの初期化（パスが通らない場合は適宜調整してね）
// import { initUI, initParticles } from '../js/ui.js';

document.addEventListener("DOMContentLoaded", async () => {
    // 演出系の初期化（もし関数があれば実行）
    if (typeof initUI === "function") initUI();
    if (typeof initParticles === "function") initParticles();

    // 1. URLのハッシュから作品IDを取得
    const hashId = window.location.hash.replace('#', '');
    if (!hashId) {
        window.location.href = '/portfolio/portfolio.html';
        return;
    }

    try {
        // 2. 作品データといいねデータを取得
        const [worksRes, likesRes] = await Promise.all([
            fetch("/api/works"),
            fetch("/api/likes").catch(() => ({ json: () => [] }))
        ]);
        
        const works = await worksRes.json();
        const likesData = await likesRes.json();

        // 3. IDが一致する作品を抽出（Stringで比較して型変換ミスを防止）
        const work = works.find(w => String(w.id) === String(hashId));
        
        if (work) {
            renderWorkDetail(work, likesData);
        } else {
            showErrorMessage();
        }
    } catch (e) {
        console.error("データの読み込みに失敗しました:", e);
        showErrorMessage();
    }
});

function getYouTubeID(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}

function renderWorkDetail(work, likesData) {
    document.title = `${work.title} | Mii's Camvas`;
    const container = document.getElementById("work-detail");

    const fixPath = (p) => {
        if (!p) return "";
        if (p.startsWith("http") || p.startsWith("/")) return p;
        return `/${p}`;
    };

    const safeSrc = fixPath(work.image || work.link);
    const ext = safeSrc.split('.').pop().toLowerCase();
    const workId = String(work.id);

    // いいね数の取得（キャメル・スネーク両対応）
    const likeInfo = likesData.find(l => String(l.id) === workId);
    const likeCount = likeInfo ? (likeInfo.likeCount || likeInfo.like_count || 0) : 0;
    const isLiked = JSON.parse(localStorage.getItem("likedWorks") || "[]").includes(workId);

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
                <img src="${safeSrc}" draggable="false" class="detail-main-media">
                <div class="watermark"></div>
            </div>`;
    }

    // --- リンクエリア（さっきのCSS「web-link-area」に合わせる！） ---
    let linkAreaHTML = "";
    const targetLink = work.link || "";

    if (targetLink && !ytID) {
        linkAreaHTML = `
            <div class="web-link-area">
                <span class="link-label">Link:</span>
                <a href="${targetLink}" target="_blank" rel="noopener noreferrer" class="web-url-text">
                    ${targetLink}
                </a>
            </div>`;
    }

    container.innerHTML = `
        <div class="detail-left">${mediaHTML}</div>
        <div class="detail-right">
            <h1 class="detail-title">${work.title}</h1>
            <p class="detail-desc">${work.description || "説明はありません。"}</p>
            <div class="detail-tags">
                ${(work.tags || []).map(t => `<span class="tag">#${t}</span>`).join('')}
            </div>
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

    setupActionEvents(work, workId);
}

function setupActionEvents(work, workId) {
    const likeBtn = document.getElementById("detail-like");
    const shareBtn = document.getElementById("detail-share");

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
            // ハート演出
            const heart = document.createElement("span");
            heart.className = "heart-pop"; heart.textContent = "💗";
            likeBtn.appendChild(heart); setTimeout(() => heart.remove(), 900);
        }

        countEl.textContent = count;
        localStorage.setItem("likedWorks", JSON.stringify(likedList));

        // APIパスを /api/like に統一
        fetch("/api/like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: workId, like: isNowLiked })
        }).catch(err => console.error("Like API Error:", err));
    };

    shareBtn.onclick = async () => {
        const shareUrl = window.location.href;
        if (navigator.share) {
            navigator.share({ title: work.title, text: `『${work.title}』作品詳細 | Mii's Camvas`, url: shareUrl }).catch(() => {});
        } else {
            navigator.clipboard.writeText(shareUrl).then(() => {
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = "Copied!";
                setTimeout(() => { shareBtn.innerHTML = originalText; }, 2000);
            });
        }
    };
}

function showErrorMessage() {
    document.getElementById("work-detail").innerHTML = `
        <div style="text-align:center; padding:100px 20px;">
            <h2 style="color:#ff4fa3;">作品が見つかりませんでした</h2>
            <a href="/portfolio/portfolio.html" style="color:#fff; text-decoration:underline;">一覧へ戻る</a>
        </div>`;
}