// FILTER BUTTONS
document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
        document.querySelectorAll(".filter-btn").forEach(function (b) {
            b.classList.remove("active");
        });

        e.target.classList.add("active");

        const filter = e.target.dataset.filter;
        const products = document.querySelectorAll(".product-card");

        products.forEach(function (card) {
            if (filter === "all" || card.dataset.category === filter) {
                card.style.display = "flex";
            } else {
                card.style.display = "none";
            }
        });
    });
});

// CART SIDEBAR
function toggleCart(forceOpen = false) {
    const sidebar = document.getElementById("cart-sidebar");
    const backdrop = document.getElementById("cart-backdrop");

    if (forceOpen || !sidebar.classList.contains("open")) {
        sidebar.classList.add("open");
        backdrop.classList.add("open");
        document.body.style.overflow = "hidden";
    } else {
        sidebar.classList.remove("open");
        backdrop.classList.remove("open");
        document.body.style.overflow = "";
    }
}

// CHECKOUT MODAL
function openCheckoutModal() {
    const subtotalElement = document.getElementById("cart-subtotal");
    const subtotalText = subtotalElement.textContent.replace("£", "");
    const subtotal = parseFloat(subtotalText) || 0;

    if (subtotal <= 0) {
        alert("Your cart is empty.");
        return;
    }

    const shipping = subtotal >= 50 ? 0 : 5;
    const total = subtotal + shipping;

    document.getElementById("co-subtotal").innerText = "£" + subtotal.toFixed(2);

    const shippingRow = document.getElementById("shipping-row");

    if (shipping === 0) {
        shippingRow.classList.add("free");
        document.getElementById("co-shipping").innerText = "FREE";
    } else {
        shippingRow.classList.remove("free");
        document.getElementById("co-shipping").innerText = "£" + shipping.toFixed(2);
    }

    document.getElementById("co-total").innerText = "£" + total.toFixed(2);

    toggleCart();
    document.getElementById("checkout-modal").classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeCheckoutModal() {
    document.getElementById("checkout-modal").classList.remove("open");
    document.body.style.overflow = "";
}

// PAYMENT METHOD TABS
function switchMethod(method) {
    document.querySelectorAll(".method-tab").forEach(function (tab) {
        tab.classList.remove("active");
    });

    document.querySelectorAll(".pay-panel").forEach(function (panel) {
        panel.classList.remove("active");
    });

    document.querySelector(`[onclick="switchMethod('${method}')"]`).classList.add("active");
    document.getElementById("panel-" + method).classList.add("active");
}

// CARD FORMATTING
function fmtCard(el) {
    let raw = el.value.replace(/\D/g, "").slice(0, 16);
    el.value = raw.match(/.{1,4}/g) ? raw.match(/.{1,4}/g).join(" ") : raw;
    updatePreview();
}

function fmtExpiry(el) {
    let raw = el.value.replace(/\D/g, "").slice(0, 4);

    if (raw.length > 2) {
        raw = raw.slice(0, 2) + "/" + raw.slice(2);
    }

    el.value = raw;
    updatePreview();
}

function updatePreview() {
    const num = document.getElementById("card-num").value || "•••• •••• •••• ••••";
    const name = document.getElementById("card-name").value || "YOUR NAME";
    const exp = document.getElementById("card-exp").value || "MM/YY";

    document.getElementById("prev-num").innerText = num;
    document.getElementById("prev-name").innerText = name.toUpperCase();
    document.getElementById("prev-exp").innerText = exp;
}