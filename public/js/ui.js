// js/ui.js

export function initUI() {
    const hamburger = document.querySelector(".hamburger");
    const mobileMenu = document.querySelector(".mobile-menu");

    if (hamburger && mobileMenu) {
        hamburger.addEventListener("click", () => {
            // 現在の表示状態を見て切り替え
            const isFlex = mobileMenu.style.display === "flex";
            mobileMenu.style.display = isFlex ? "none" : "flex";
            console.log("Hamburger clicked"); // ログが出れば動作OK
        });

        mobileMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mobileMenu.style.display = "none";
            });
        });
    }

    // スクロールエフェクト
    window.addEventListener("scroll", () => {
        const y = window.scrollY;
        const bg = document.querySelector(".parallax-bg");
        if (bg) bg.style.transform = `translateY(${y * 0.2}px)`;

        const height = document.documentElement.scrollHeight - window.innerHeight;
        const bar = document.querySelector(".progress");
        if (bar) bar.style.width = (y / height) * 100 + "%";
    });
}

export function initParticles() {
    const canvas = document.getElementById("particles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // リサイズ対応
    const setCanvasSize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();

    let particles = [];
    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 2 + 1,
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,.5)";
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }
    draw();
}