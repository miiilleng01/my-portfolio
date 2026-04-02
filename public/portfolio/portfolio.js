// portfolio/portfolio.js
import { initUI, initParticles } from '../js/ui.js';
import { preventCopy } from '../js/util.js';
import { loadWorks } from '../js/works.js';

document.addEventListener("DOMContentLoaded", async () => {
    initUI();
    initParticles();
    preventCopy();

    // 1. 作品をロード (awaitで完了を待つ)
    await loadWorks();

    // 2. タグボタンを生成
    createTagButtons();

    // 3. フィルタリング実行 (初期表示)
    applyFilter();
});

/**
 * タグボタンを自動生成
 */
function createTagButtons() {
    const tagContainer = document.getElementById('tag-container');
    if (!tagContainer) return;

    // 1. 全カードからタグを回収
    const allCards = document.querySelectorAll('.card');
    const tagSet = new Set();
    allCards.forEach(card => {
        const tags = card.dataset.tags ? card.dataset.tags.split(',') : [];
        tags.forEach(t => { if(t.trim()) tagSet.add(t.trim()); });
    });

    // 2. 動的タグボタンの生成（重複防止のため中身を一度空にするのもアリ）
    // tagContainer.innerHTML = ''; // もしボタンが増えすぎるならこれを入れる
    tagSet.forEach(tag => {
        if (!tagContainer.querySelector(`[data-tag="${tag}"]`)) {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = `#${tag}`;
            btn.dataset.tag = tag;
            btn.onclick = () => { window.location.hash = encodeURIComponent(tag); };
            tagContainer.appendChild(btn);
        }
    });

    // --- 3. 「すべて表示」ボタンのイベント紐付け（ここが重要！） ---
    // tag-container の「外」にあるボタンも探せるように document から探すよ
    const allBtn = document.querySelector('.filter-btn[data-tag=""]');
    if (allBtn) {
        allBtn.onclick = (e) => {
            e.preventDefault();
            // ハッシュを空にする
            window.location.hash = "";
            // もし自動で applyFilter が走らない環境なら手動で呼ぶ
            // applyFilter(); 
        };
    }
}

/**
 * フィルタリングの核心
 */
function applyFilter() {
    const hash = decodeURIComponent(window.location.hash.replace('#', ''));
    const targetHash = (hash === 'movie') ? 'video' : hash;

    const sections = document.querySelectorAll('.section');
    const allCards = document.querySelectorAll('.card');
    const btns = document.querySelectorAll('.filter-btn');

    // --- ボタンのActive状態を更新 ---
    btns.forEach(btn => {
        // data-hash か data-tag、どっちかにある値を取る（両方なければ空文字）
        const btnVal = btn.dataset.hash || btn.dataset.tag || "";
        
        // targetHash が空（すべて表示）のとき、ボタン側も空なら active
        if (targetHash === "") {
            btn.classList.toggle('active', btnVal === "");
        } else {
            btn.classList.toggle('active', btnVal === targetHash);
        }
    });

    if (!targetHash) {
        // --- 1. すべて表示 ---
        sections.forEach(s => s.style.display = "block");
        allCards.forEach(c => c.style.display = "block");
    } else {
        // --- 2. フィルタリング実行 ---
        const isTypeFilter = Array.from(sections).some(s => s.dataset.type === targetHash);

        if (isTypeFilter) {
            // A. カテゴリ(type)での絞り込み
            sections.forEach(section => {
                const isMatch = section.dataset.type === targetHash;
                section.style.display = isMatch ? "block" : "none";
                if (isMatch) {
                    section.querySelectorAll('.card').forEach(c => c.style.display = "block");
                }
            });
        } else {
            // B. タグ(tag)での絞り込み
            allCards.forEach(card => {
                const cardTags = card.dataset.tags ? card.dataset.tags.split(',') : [];
                card.style.display = cardTags.includes(targetHash) ? "block" : "none";
            });

            // 作品が1つもないセクションを隠す
            sections.forEach(section => {
                const hasVisible = Array.from(section.querySelectorAll('.card'))
                                        .some(c => c.style.display === "block");
                section.style.display = hasVisible ? "block" : "none";
            });
        }
    }
    window.scrollTo(0, 0);
}

window.addEventListener("hashchange", applyFilter);