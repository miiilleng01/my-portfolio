// script.js
import { initUI, initParticles } from '/js/ui.js';
import { preventCopy } from '/js/util.js';
import { loadWorks } from '/js/works.js';

document.addEventListener("DOMContentLoaded", () => {
    console.log("Main script loaded"); // 動作確認用

    // 各機能を実行
    initUI();
    initParticles();
    preventCopy();
    loadWorks();
});