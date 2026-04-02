document.addEventListener("DOMContentLoaded", async () => {
  // URLの # 以降（ID）を取得
  const hash = location.hash.replace("#", "");
  if (!hash) return;

  // 作品データ全件取得
  let works = [];
  try {
    const res = await fetch("/api/works");
    if (!res.ok) throw new Error("Fetch failed");
    works = await res.json();
  } catch (e) {
    console.error("作品データの取得に失敗しました", e);
    return;
  }

  // IDが一致する作品を探す（Stringで比較）
  const work = works.find(w => String(w.id) === String(hash));
  if (!work) {
    console.warn("該当する作品が見つかりませんでした:", hash);
    return;
  }

  // --- 各要素の取得 ---
  const mainImg = document.getElementById("main-img");
  const titleEl = document.getElementById("title");
  const descEl = document.getElementById("description");
  const linkContainer = document.getElementById("link-container");

  // パス修正用
  const fixPath = (p) => {
    if (!p) return "";
    if (p.startsWith("http") || p.startsWith("/")) return p;
    return `/${p}`;
  };

  // --- データ反映 ---
  if (mainImg) mainImg.src = fixPath(work.image || work.link);
  if (titleEl) titleEl.textContent = work.title || "";
  if (descEl) descEl.textContent = work.description || "";

  // --- リンクエリアの生成（ここがポイント！） ---
  if (linkContainer) {
    // YouTubeかどうかを判定（YouTubeの時は詳細ページと同じくリンクを出さないなら !ytID を足してね）
    const isYouTube = work.link && (work.link.includes("youtube.com") || work.link.includes("youtu.be"));
    
    if (work.link && !isYouTube) {
      linkContainer.innerHTML = `
        <div class="web-link-area">
          <span class="link-label">Link:</span>
          <a href="${work.link}" target="_blank" rel="noopener noreferrer" class="web-url-text">
            ${work.link}
          </a>
        </div>`;
    } else {
      linkContainer.innerHTML = ""; // リンクがない、またはYouTubeの時は空にする
    }
  }

  // --- モーダル制御（そのまま） ---
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  const closeBtn = document.getElementById("close");

  if (mainImg && modal && modalImg) {
    mainImg.style.cursor = "zoom-in";
    mainImg.addEventListener("click", () => {
      modal.style.display = "flex";
      modalImg.src = mainImg.src;
      document.body.style.overflow = "hidden";
    });
  }

  if (modal && closeBtn) {
    const closeModal = () => {
      modal.style.display = "none";
      document.body.style.overflow = "";
    };
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
});