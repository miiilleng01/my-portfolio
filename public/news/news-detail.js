document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const newsId = params.get("id");
    const container = document.getElementById("news-content");

    if (!container) return;

    if (!newsId) {
        container.innerHTML = "<p class='error-msg'>記事が見つかりません。</p>";
        return;
    }

    fetch("/api/news")
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            // IDが一致する記事を探す（DBの型がBIGINTなどの場合を考慮してStringで比較）
            const item = data.find(n => String(n.id) === String(newsId));
            
            if (!item) {
                container.innerHTML = "<p class='error-msg'>指定された記事は存在しません。</p>";
                return;
            }

            // --- データの正規化（DBのカラム名に合わせて調整） ---
            const displayTitle = item.title || item.content || "お知らせ";
            const displayContent = item.content || "";
            // 日付を YYYY.MM.DD 形式に
            const rawDate = new Date(item.date);
            const displayDate = isNaN(rawDate) ? (item.date || "") : rawDate.toLocaleDateString('ja-JP').replace(/\//g, '.');

            // --- 画像ギャラリーの生成 ---
            // item.images が文字列（"{img1,img2}"）で来る場合と配列で来る場合の両方に対応
            let imagesArray = [];
            if (Array.isArray(item.images)) {
                imagesArray = item.images;
            } else if (typeof item.images === 'string') {
                // PostgreSQLの配列文字列を簡易パース
                imagesArray = item.images.replace(/{|}/g, "").split(",").filter(Boolean);
            }

            let imagesHtml = "";
            if (imagesArray.length > 0) {
                imagesHtml = `<div class="detail-gallery">`;
                imagesArray.forEach(img => {
                    // パスが http から始まらない場合は / を補完
                    const imgSrc = (img.startsWith('http') || img.startsWith('/')) ? img : `/${img}`;
                    imagesHtml += `
                        <div class="image-watermark" onclick="window.openModal('${imgSrc}')">
                            <img src="${imgSrc}" class="news-thumb" alt="news image">
                            <div class="watermark"></div>
                        </div>`;
                });
                imagesHtml += `</div>`;
            }

// --- リンクの生成（付箋スタイル・フルURL表示） ---
            let linksArray = [];
            if (item.links) {
                try {
                    if (Array.isArray(item.links)) {
                        linksArray = item.links;
                    } else if (typeof item.links === 'string') {
                        let cleanLinks = item.links.trim();
                        if (cleanLinks.startsWith('[') || cleanLinks.startsWith('{')) {
                            linksArray = JSON.parse(cleanLinks);
                        }
                    }
                } catch (e) { console.error("Links parse error:", e); }
            }

            const linksHtml = Array.isArray(linksArray) ? linksArray.map(link => {
                if (!link) return "";
                const url = typeof link === 'object' ? link.url : link;
                if (!url) return "";

                // URLがhttpから始まらない場合の補完
                const finalUrl = url.startsWith('http') ? url : `/${url}`;

                // 付箋スタイルの枠（web-link-area）として書き出す
                return `
                        <div class="web-link-area">
                            <span class="link-label">Link:</span>
                            <a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="web-url-text">
                                ${url}
                            </a>
                        </div>`;
                }).join("") : "";

            // --- 最終的な描画 ---
            // ここで debug 用に linksHtml が空かどうかチェックするコードも入れておくね
            console.log("生成されたリンクHTML:", linksHtml);

            // --- 最終的な描画 ---
            container.innerHTML = `
                <div class="detail-header">
                    <div class="detail-date">${displayDate}</div>
                    <h1 class="detail-title">${displayTitle}</h1>
                </div>
                <div class="detail-text">${displayContent.replace(/\n/g, '<br>')}</div>
                ${imagesHtml}
                <div class="detail-links">${linksHtml}</div>
            `;
        })
        .catch(err => {
            console.error("News Detail Load Error:", err);
            container.innerHTML = "<p class='error-msg'>読み込みに失敗しました。</p>";
        });
});

/**
 * モーダル表示（グローバルに公開）
 */
window.openModal = function(imgSrc) {
    const modal = document.getElementById("newsModal");
    if (!modal) return;
    
    const modalContent = modal.querySelector(".news-modal-content");
    if (!modalContent) return;

    modalContent.innerHTML = `
        <span class="news-modal-close">&times;</span>
        <div class="image-watermark modal-wrapper">
            <img src="${imgSrc}" class="modal-image-display">
            <div class="watermark"></div>
        </div>
    `;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    const closeModal = () => {
        modal.style.display = "none";
        document.body.style.overflow = "";
    };

    modalContent.querySelector(".news-modal-close").onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
};