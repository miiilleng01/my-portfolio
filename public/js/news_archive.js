document.addEventListener("DOMContentLoaded", () => {
    const newsContainer = document.getElementById("news-list");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const pageNumbers = document.getElementById("page-numbers");

    if (!newsContainer) return;

    let allNews = [];
    let currentPage = 1;
    const itemsPerPage = 30; // 1ページ30件

    fetch("/api/news")
        .then(response => response.json())
        .then(data => {
            // IDの降順（新しい順）に並べ替え
            allNews = data.sort((a, b) => b.id - a.id);
            displayNews(currentPage);
        })
        .catch(error => {
            console.error("News読み込み失敗:", error);
            newsContainer.innerHTML = "<p>お知らせの取得に失敗しました。</p>";
        });

    function displayNews(page) {
        newsContainer.innerHTML = "";
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pagedItems = allNews.slice(start, end);

        if (pagedItems.length === 0) {
            newsContainer.innerHTML = "<p>お知らせはありません。</p>";
            return;
        }

        pagedItems.forEach(item => {
            const rawDate = new Date(item.date);
            const displayDate = rawDate.toLocaleDateString('ja-JP', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).replace(/\//g, '.');

            // カテゴリバッジ（もしDBにcategoryがあれば）
            const categoryTag = item.category ? `<span class="cat-badge ${item.category.toLowerCase()}">${item.category}</span>` : "";

            const html = `
                <a href="/news/news-detail.html?id=${item.id}" class="news-item">
                    <span class="news-date">${displayDate}</span>
                    ${categoryTag}
                    <span class="news-title">${item.content || "お知らせ"}</span>
                </a>
            `;
            newsContainer.innerHTML += html;
        });

        updatePagination();
        window.scrollTo(0, 0); // ページ切り替え時に上に戻る
    }

    function updatePagination() {
        const totalPages = Math.ceil(allNews.length / itemsPerPage);
        pageNumbers.innerText = `${currentPage} / ${totalPages}`;

        // ボタンの有効・無効切り替え
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            displayNews(currentPage);
        }
    });

    nextBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(allNews.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayNews(currentPage);
        }
    });
});