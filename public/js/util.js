export function preventCopy() {
    document.addEventListener("contextmenu", e => {
        if (["VIDEO", "IMG"].includes(e.target.tagName)) e.preventDefault();
    });
    document.addEventListener("dragstart", e => {
        if (e.target.tagName === "IMG") e.preventDefault();
    });
}

export function showMessage(text) {
    const msg = document.createElement("div");
    msg.className = "toast";
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.classList.add("show"), 10);
    setTimeout(() => {
        msg.classList.remove("show");
        setTimeout(() => msg.remove(), 300);
    }, 2000);
}