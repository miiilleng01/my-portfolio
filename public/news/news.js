document.addEventListener("DOMContentLoaded", () => {
    const newsContainer = document.getElementById("news-list");
    if (!newsContainer) return;

    fetch("/api/news")
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            newsContainer.innerHTML = ""; 

            // DBから空データが来た場合のガード
            if (!data || data.length === 0) {
                newsContainer.innerHTML = "<p>お知らせはありません。</p>";
                return;
            }

            // 最新の5件を取得
            const latestNews = data.slice(0, 5);
            
            const today = new Date();
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(today.getMonth() - 1);

            latestNews.forEach(item => {
                // DBの「date」カラムが文字列かDateオブジェクトか不明なため、安全に変換
                const rawDate = new Date(item.date);
                
                // 表示用の日付形式 (YYYY.MM.DD) に整形
                const displayDate = rawDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).replace(/\//g, '.');

                // NEWバッジ判定（1ヶ月以内）
                const isNew = rawDate > oneMonthAgo;
                const newBadge = isNew ? `<span class="new-badge">NEW</span>` : "";

                // DB
                const newsTitle = item.title || item.content || "お知らせ";

                const html = `
                    <a href="/news/news-detail.html?id=${item.id}" class="news-item">
                        <span class="news-date">${displayDate}</span>
                        ${newBadge}
                        <span class="news-title">${newsTitle}</span>
                    </a>
                `;
                newsContainer.innerHTML += html;
            });
        })
        .catch(error => {
            console.error("Newsの読み込みに失敗しました:", error);
            newsContainer.innerHTML = "<p>お知らせの取得に失敗しました。</p>";
        });
});