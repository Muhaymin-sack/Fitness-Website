function flash(msg) {
    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toast-text");

    if (!toast || !toastText) return;

    toastText.textContent = msg;
    toast.classList.add("show");

    clearTimeout(toast._timer);

    toast._timer = setTimeout(function () {
        toast.classList.remove("show");
    }, 2800);
}