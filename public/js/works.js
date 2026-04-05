const JAVA_URL = "https://my-portfolio-admin-vhpt.onrender.com";
const API_BASE = "";

/**
 * YouTubeのURLからIDを抽出（厳しめ判定版）
 */
function getYouTubeID(url) {
    if (!url) return null;
    // youtube.com または youtu.be が含まれている場合のみ抽出
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}

/**
 * カードのふわっと動く3Dエフェクト
 */
function applyTiltEffect(card) {
    card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = -(y - centerY) / 48;
        const rotateY = (x - centerX) / 48;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
    });
    card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
    });
}

/**
 * メイン：作品データを取得してHTMLを生成
 */
export async function loadWorks() {
    let works = [];
    try {
        // Node.js側のプロキシAPIを叩く
        const res = await fetch(`${API_BASE}/api/works`);
        works = await res.json();
    } catch (e) {
        console.error("Works fetch failed", e);
        return;
    }

    const tagSet = new Set();
    let likedWorks = [];
    try {
        likedWorks = JSON.parse(localStorage.getItem("likedWorks") || "[]");
    } catch (e) {
        likedWorks = [];
    }

    const targetPage = "/detail/detail.html";

    for (const work of works) {
        let targetType = work.type;
        if (targetType === "movie" || targetType === "video") {
            targetType = "video"; 
        }

        const container = document.querySelector(`.section[data-type="${targetType}"] .works`);
        if (!container) continue;

        const card = document.createElement("div");
        card.className = "card fadein";

       // DBのパスを賢く判定してURLを組み立てる（修正済）
        const fixPath = (path) => {
            if (!path) return "";
            // すでに http から始まっている場合はそのまま
            if (path.startsWith("http")) return path;
            
            // 先頭のスラッシュを整える（"/img/..." にする）
            const cleanPath = path.startsWith("/") ? path : `/${path}`;
            
            // もしDBのパスが既に "/upload/img" で始まっているなら、そのままURLをくっつける
            if (cleanPath.startsWith("/upload/img")) {
                return `${JAVA_URL}${cleanPath}`;
            }
            
            // もしDBのパスが "/img" で始まっているなら、"/upload" だけ足して "/upload/img/..." にする
            if (cleanPath.startsWith("/img")) {
                return `${JAVA_URL}/upload${cleanPath}`;
            }
            
            // それ以外（ファイル名だけとか）の場合は、いつものパスを挟む
            return `${JAVA_URL}/upload/img${cleanPath}`; 
        }

        const safeSrc = fixPath(work.image || work.link);
        const thumbnail = fixPath(work.thumbnail);
        const workId = String(work.id);
        
        // NEWラベル判定（1週間以内なら表示）
        let isNew = false;
        if (work.time) {
            const now = new Date();
            const workTime = new Date(work.time);
            isNew = (now - workTime) < (7 * 24 * 60 * 60 * 1000);
        }
        const newLabel = isNew ? `<span class="new">NEW</span>` : "";

        // タグ処理
        // tagsが配列ならそのまま、文字列ならバラす、それ以外なら空配列にする
        const rawTags = Array.isArray(work.tags) ? work.tags : (typeof work.tags === 'string' ? work.tags.replace(/[{}]/g, "").split(',') : []);
        const tags = rawTags.filter(tag => tag && tag.trim() !== "");
                card.dataset.tags = tags.join(",");
        card.dataset.id = workId;

        const serverLikes = work.like_count || 0;

        let contentHTML = "";
        const ytID = getYouTubeID(work.link);

        // メディア表示（YouTube / Video / Image）
        if (ytID) {
            const ytThumb = `https://img.youtube.com/vi/${ytID}/maxresdefault.jpg`;
            contentHTML += `
                <div class="image image-watermark">
                    ${newLabel}
                    <a href="${targetPage}#${workId}" class="card-media-link">
                        <img src="${ytThumb}" draggable="false" onerror="this.src='https://img.youtube.com/vi/${ytID}/mqdefault.jpg'">
                        <div class="watermark"></div>
                        <div class="play-icon-overlay">▶</div>
                    </a>
                </div>`;
        } else {
            const ext = safeSrc.split('.').pop().toLowerCase();
            if (ext === "mp4" || work.type === "movie") {
                contentHTML += `
                    <div class="image">
                        ${newLabel}
                        <a href="${targetPage}#${workId}" class="card-media-link">
                            <video src="${safeSrc}" poster="${thumbnail}" muted loop onmouseover="this.play()" onmouseout="this.pause();this.currentTime=0;"></video>
                            <div class="play-icon-overlay">▶</div>
                        </a>
                    </div>`;
            } else {
                contentHTML += `
                    <div class="image image-watermark">
                        ${newLabel}
                        <a href="${targetPage}#${workId}" class="card-media-link">
                            <img src="${safeSrc}" draggable="false">
                            <div class="watermark"></div>
                        </a>
                    </div>`;
            }
        }

        const isLiked = likedWorks.includes(workId);
        contentHTML += `
            <div class="title">${work.title || ""}</div>
            <p>${work.description || ""}</p>
            <div class="actions">
                <button class="like ${isLiked ? "isliked" : ""}" type="button">
                    ♡ <span class="like-count">${serverLikes}</span>
                </button>
                <button class="share">↗</button>
            </div>`;

        card.innerHTML = contentHTML;
        container.appendChild(card);

        applyTiltEffect(card);
        initLikeEvent(card, work, workId);
        tags.forEach(tag => tagSet.add(tag));
    }

    initMoreButtons();
    initScrollButtons();
    // もし外部にタグ生成関数があれば実行
    if (typeof createTags === "function") createTags([...tagSet]);
}

/**
 * いいねボタンのクリックイベント
 */
function initLikeEvent(card, work, workId) {
    const likeBtn = card.querySelector(".like");
    if (!likeBtn) return;

    likeBtn.addEventListener("click", () => {
        const countEl = likeBtn.querySelector(".like-count");
        let count = parseInt(countEl.textContent) || 0;
        let liked = JSON.parse(localStorage.getItem("likedWorks") || "[]");

        if (likeBtn.classList.contains("isliked")) {
            likeBtn.classList.remove("isliked");
            count--;
            liked = liked.filter(id => id !== workId);
        } else {
            likeBtn.classList.add("isliked");
            count++;
            if (!liked.includes(workId)) liked.push(workId);
            
            // ハートが飛び出す演出
            const heart = document.createElement("span");
            heart.className = "heart-pop";
            heart.textContent = "💗";
            likeBtn.appendChild(heart);
            setTimeout(() => heart.remove(), 900);
        }

        countEl.textContent = count;
        localStorage.setItem("likedWorks", JSON.stringify(liked));

        // Node.jsの「/like」エンドポイントに送信
        fetch("/like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: work.id,
                type: work.type,
                like: likeBtn.classList.contains("isliked")
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.likeCount !== undefined) countEl.textContent = data.likeCount;
        });
    });
}

/**
 * スクロールに合わせてトップの文字を動かす
 */
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const topText = document.querySelector('.top');
  if (topText) {
    topText.style.transform = `translateY(${scrolled * 0.5}px)`;
    topText.style.opacity = `${1 - scrolled / 600}`;
  }
});

/**
 * セクションごとの「more」ボタン制御
 */
function initMoreButtons() {
    const isPortfolioPage = window.location.pathname.includes("portfolio.html");

    document.querySelectorAll(".section").forEach(section => {
        const container = section.querySelector(".works");
        const cards = container.querySelectorAll(".card");
        
        if (isPortfolioPage) {
            cards.forEach(card => card.style.display = "block");
        } else if (cards.length > 5) {
            cards.forEach((card, i) => { if (i >= 5) card.style.display = "none"; });
            
            const moreBtn = document.createElement("div");
            moreBtn.className = "more-btn";
            moreBtn.textContent = "more →";
            
            const type = section.dataset.type;
            moreBtn.onclick = () => { 
                window.location.href = `/portfolio/portfolio.html#${type}`; 
            };

            container.appendChild(moreBtn);
        }
    });
}

/**
 * 横スクロールボタンの制御
 */
function initScrollButtons() {
    document.querySelectorAll(".works-wrapper").forEach(wrapper => {
        const container = wrapper.querySelector(".works");
        const leftBtn = wrapper.querySelector(".scroll-btn.left");
        const rightBtn = wrapper.querySelector(".scroll-btn.right");
        if (leftBtn) leftBtn.addEventListener("click", () => container.scrollBy({ left: -300, behavior: "smooth" }));
        if (rightBtn) rightBtn.addEventListener("click", () => container.scrollBy({ left: 300, behavior: "smooth" }));
    });
}

/**
 * シェア機能
 */
document.addEventListener("click", (e) => {
    const shareBtn = e.target.closest(".share");
    if (!shareBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const card = shareBtn.closest(".card");
    const workId = card ? card.dataset.id : "";
    const workTitle = card ? card.querySelector(".title").textContent : "作品";
    const shareUrl = `${window.location.origin}/detail/detail.html#${workId}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl)
            .then(() => { 
                if (!navigator.share) showMessage("リンクをコピーしたよ！");
            })
            .catch(() => { fallbackCopyManual(shareUrl); });
    } else {
        if (fallbackCopyManual(shareUrl) && !navigator.share) showMessage("リンクをコピーしたよ！");
    }

    if (navigator.share) {
        navigator.share({
            title: "Mii's Camvas",
            text: `『${workTitle}』 #MiisCamvas`,
            url: shareUrl
        }).catch(() => {});
    }
});

/**
 * トースト通知の表示
 */
function showMessage(text) {
    const oldMsg = document.querySelector(".copy-message");
    if (oldMsg) oldMsg.remove();

    const msg = document.createElement("div");
    msg.className = "copy-message";
    msg.textContent = text;
    
    Object.assign(msg.style, {
        position: "fixed",
        bottom: "10%",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#ff4fa3",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: "25px",
        fontSize: "14px",
        zIndex: "9999",
        boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
    });

    document.body.appendChild(msg);

    setTimeout(() => {
        msg.style.opacity = "0";
        msg.style.transition = "opacity 0.5s";
        setTimeout(() => msg.remove(), 500);
    }, 2000);
}

/**
 * クリップボードコピーのフォールバック
 */
function fallbackCopyManual(text) {
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        return false;
    }
}

/**
 * スクロール監視のアニメーション
 */
document.addEventListener("DOMContentLoaded", () => {
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  }, observerOptions);

  const revealElements = document.querySelectorAll(".reveal");
  revealElements.forEach((el) => observer.observe(el));
});
