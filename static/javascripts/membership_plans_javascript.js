// VAT AND DISCOUNTS CONSTANTS
var VAT = 0.20;
var DISCOUNT = 0.20;

// PLAN DATA: BASE MONTHLY PRICE
var plans = {
    basic: {
        label: "Basic",
        heading: ['Basic', 'Membership'],
        blurb: 'Gym floor access with off-peak and standard hours. A solid entry point for begnners.',
        price: 25,
        bullets: ['Gym floor (weights + cardio)', 'Off-peak & standard hours', 'Changing rooms']
    },

    standard: {
        label: "Standard / Full Access",
        heading: ['Standard', 'Full Access'],
        blurb: 'Full gym plus all group classes, full opening hours, locker and free induction.',
        price: 45,
        bullets: ['Full gym floor + all classes', 'Full opening hours', 'Locker access', 'Free induction session']
    },

    premium: {
        label: "Premium",
        heading: ['Premium', 'Membership'],
        blurb: 'Everything in Standard, plus premium zones, priority booking and exclusive perks.',
        price: 65,
        bullets: ['Full gym + classes + premium zones', 'Sauna, steam & functional area', 'Priority class booking', '2 guest passes / month']
    },

    student: {
        label: "Student",
        heading: ['Student', 'Plan'],
        blurb: 'Discounted standard access for verified college and university students.',
        price: 20,
        bullets: ['Standard gym + all classes', 'Valid Student ID required', 'Full opening hours', 'Locker access']
    }
};

// TRACK WHICH PLAN IS CURRELD SELECTED
var current = null;
var yearly = false;

// wire up the toggle input
document.getElementById('tog').addEventListener('change', function () {
    setYearly(this.checked);
});

// switch between monthly and yearly
function setYearly(val) {
    yearly = val;

    // keep checkbox, labels, and saving pill in sync
    document.getElementById('tog').checked = val;
    document.getElementById('lbl-mo').classList.toggle('on', !val);
    document.getElementById('lbl-yr').classList.toggle('on', val);
    document.getElementById('save-pill').classList.toggle('show', val);

    // recompute all four card price
    refreshPrices();

    // if a plan is already selected, update the summary too
    if (current) refreshSummary();
}

// update the displayed price on early card based on biling mode
function refreshPrices() {
    Object.keys(plans).forEach(function (key) {
        var base = plans[key].price;
        var monthly = yearly ? Math.round(base * (1 - DISCOUNT)) : base;

        document.getElementById('p-' + key).textContent = monthly;

        var note = document.getElementById('n-' + key);
        if (yearly) {
            // show total annual cost and how much they save
            note.textContent = '£' + (monthly * 12) + '/year . save £' + ((base - monthly) * 12);
            note.classList.add('active');
        } else {
            note.innerHTML = '&nbsp;';    // keep height stable so cards don't jump
            note.classList.remove('active');
        }
    });

    // update the small badge inside the summary header
    document.getElementById('cycle-label').textContent = yearly ? 'Annual billing' : 'monthly billing';
    document.getElementById('s-cycle').textContent = yearly ? 'Yearly' : 'Monthly';
}

// called when a user clicks a plan card 
function pick(key) {
    if (current === key) return;        // already selected do nothing

    // deselcet previously chosen card
    if (current) {
        document.querySelector('[data-key="' + current + '"]').classList.remove('picked');
        document.getElementById('b-' + current).classList.remove('active');
        document.getElementById('b-' + current).textContent = 'Select Plan';
    }

    current = key;

    // highlight the new card and update its button
    document.querySelector('[data-key="' + key + '"]').classList.add('picked');
    var btn = document.getElementById('b-' + key);
    btn.classList.add('active');
    btn.textContent = 'Selected ✔︎';

    // reveal the summary panel and fill in the numbers
    document.getElementById('summary').classList.add('show');
    refreshSummary();

    // brief toast confirmation
    flash(plans[key].label + ' plan selected');

    // Gently scroll the summary into view after the animation starts
    setTimeout(function () {
        document.getElementById('summary').scrollIntoView({ behavior: 'smooth', block: 'nearest'});
    }, 120);
}

// recalculate all the summary billing figures
function refreshSummary() {
    var p = plans[current];
    var base = p.price;
    var monthly = yearly ? Math.round(base * (1 - DISCOUNT)) : base;
    var subtotal = yearly ? monthly * 12 : monthly;        // full period cost before vat
    var origYear = base * 12;                              // what they'd pay withoudt discount
    var saved = yearly ? origYear - subtotal : 0;
    var vat = parseFloat((subtotal * VAT).toFixed(2));
    var total = parseFloat((subtotal + vat).toFixed(2));

    // fill in each row
    document.getElementById('s-plan').textContent = p.label;
    document.getElementById('s-base').textContent = yearly ? '£' + origYear.toFixed(2): '£' + base.toFixed(2);
    document.getElementById('s-sub').textContent = '£' + subtotal.toFixed(2);
    document.getElementById('s-vat').textContent = '£' + vat.toFixed(2);
    document.getElementById('s-total').textContent = '£' + total.toFixed(2);

    // show/hide the discount row
    var discRow = document.getElementById('disc-row');
    discRow.style.display = yearly ? 'flex': 'none';
    if (yearly) document.getElementById('s-disc').textContent = '-£' + saved.toFixed(2);

    // right column plan name, description, features bullets
    var parts = p.heading;
    document.getElementById('s-name').innerHTML = parts[0] + '<br><span>' + parts[1] + '</span>';
    document.getElementById('s-desc').textContent = p.blurb;
    document.getElementById('s-feats').innerHTML = p.bullets
        .map(function (f) { return '<li>' + f + '</li>';})
        .join('');
}

// show the slide-in toast for a few seconds
function flash(msg) {
    var t = document.getElementById('toast');
    document.getElementById('toast-text').textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2800);
}

// open the checkout modal - called "Proceed to Checkout"
function checkout() {
    if (!current) return;

    // push the current billing figures into the model's order recap
    var p = plans[current];
    var base = p.price;
    var monthly = yearly ? Math.round(base * (1 - 0.20)) : base;
    var subtotal = yearly ? monthly * 12 : monthly;
    var vat = parseFloat((subtotal * 0.20).toFixed(2));
    var total = parseFloat((subtotal + vat).toFixed(2));
    var saved = yearly ? (base * 12) - subtotal: 0;

    // store totals globally so the receipt can access them later
    window._order = { plan: p.label, cycle: yearly ? 'Yearly' : 'Monthly', 
        subtotal: subtotal, vat: vat, total: total, saved: saved, bullets: p.bullets };

    // fill the static recap column on the right side of the model
    document.getElementById('co-plan').textContent = p.label;
    document.getElementById('co-cycle').textContent = yearly ? 'Yearly' : 'Monthly';
    document.getElementById('co-sub').textContent = '£' + subtotal.toFixed(2);
    document.getElementById('co-vat').textContent = '£' + vat.toFixed(2);
    document.getElementById('co-total').textContent = '£' + total.toFixed(2);

    // show or hide the saving line
    var sr = document.getElementById('co-saved-row');
    sr.style.display = saved > 0 ? 'flex' : 'none';
    document.getElementById('co-saved').textContent = '-£' + saved.toFixed(2);

    // make sure the card tab is active when modal opens
    switchMethod('card');

    // show the overlay
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';               // prevent background scroll
}

// close the modal and restore page scroll
function closeModal() {
    document.getElementById('modal').classList.remove('open');
    document.getElementById('pay-screen').style.display = '';
    document.getElementById('done-screen').style.display = 'none';
    document.body.style.overflow = '';
}

// close if user click the dark backdorp
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('modal').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });
});

// switch teh active payment method tab
function switchMethod(method) {
    // deactivate all tabs and hide all panels
    document.querySelectorAll('.pay-tab').forEach(function (t) { t.classList.remove('on'); });
    document.querySelectorAll('.pay-panel').forEach(function (p) { p.style.display = 'none'; });

    // active the chosen tab and show its panel
    document.querySelector('[data-method="' + method + '"]').classList.add('on');
    document.getElementById('panel-' + method).style.display = 'block';
}

// card number formating
// break input groups of 4 as user types, and prevent non-digit input
function fmtCard(el) {
    var raw = el.value.replace(/\D/g, '').slice(0, 16);   
    el.value = raw.match(/.{1,4}/g) ? raw.match(/.{1,4}/g).join(' ') : raw;
    updateCardPreview();
}

// expiry dat formatin: auto insert the slash after 2 digits
function fmtExpiry(el) {
    var raw = el.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length > 2) raw = raw.slice(0, 2) + '/' + raw.slice(2);
    el.value = raw;
    updateCardPreview();
}

// CVV: digits only, max 4 chars
function fmtCvv(el) {
    el.value = el.value.replace(/\D/g, '').slice(0, 4);
}

// update the visual card preview as the user fills in the form
function updateCardPreview() {
    var num = (document.getElementById('card-num').value || '').padEnd(19, 'ׁ・');
    var exp = (document.getElementById('card-exp').value || 'MM/YY');
    var name = (document.getElementById('card-name').value || 'YOUR NAME').toUpperCase();

    // show masked card number on the preview
    var parts = num.split(' ');
    document.getElementById('prev-num').textContent = (parts[0] || '····') + ' •••• •••• ' + (parts[3] || '····'); 
    document.getElementById('prev-exp').textContent = exp;
    document.getElementById('prev-name').textContent = name.slice(0, 22);     // limit preview name to 22 chars

    // color the preview card base on card type
    var digits = document.getElementById('card-num').value.replace(/\s/g, '');
    var band   = document.getElementById('card-band');
    if (/^4/.test(digits)) { band.style.background = '#1a1f71'; }
    else if (/^5[1-5]/.test(digits)){ band.style.background = '#eb001b'; } 
    else if (/^3[47]/.test(digits)) { band.style.background = '#2E77BC'; } 
    else { band.style.background = '#BA181B'; } 
}

// simulate card payment
function payByCard() {
    //  basic validaiton before charging
    var num = document.getElementById('card-num').value.replace(/\s/g, '');
    var exp = document.getElementById('card-exp').value;
    var cvv = document.getElementById('card-cvv').value;
    var name = document.getElementById('card-name').value.trim();

    if (num.length < 16) {showFieldError('card-num', 'Please enter a 16-digit card number.'); return;}
    if (!/^\d{2}\/\d{2}$/.test(exp)) { showFieldError('card-exp', 'Enter expiry date in MM/YY format.'); return; }
    if (cvv.length < 3) { showFieldError('card-cvv', 'Enter a valid CVV.'); return; }
    if (!name) { showFieldError('card-name', 'Enter the cardholder name.'); return; }

    simulatePay('card');
}

// show a small inline error under the relevant input
function showFieldError(id, msg) {
    var input = document.getElementById(id);
    input.classList.add('err');
    var hint = input.parentNode.querySelector('.hint') || input.nextElementSibling;
    if (hint && hint.classList.contains('hint')) hint.textContent = msg;
    input.focus();
}

// clear all field errors when the user starts typing
function clearErr(el) { el.classList.remove('err'); }

// simulate paypal redirect
function payByPayPal() {
    simulatePay('PayPal');
}

// simulate apple pay
function payByApplePay() {
    simulatePay('Apple Pay');
}

// simulate google pay
function payByGooglePay() {
    simulatePay('Google Pay');
}

// shared payment simulation, showing a processing spinner then the success screen
function simulatePay(method) {
    var btn = document.getElementById('pay-btn-' + method.toLowerCase().replace(' ', ''));
    if (!btn) btn = document.querySelector('#panel-' + method.toLowerCase().replace(' ','') + ' .pay-go');

    // disable and show spinner on text while "processing"
    if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }
    
    setTimeout(function () {
        if (btn) { btn.disabled = false; }

        // generate a simple order reference
        var ref = 'FC-' + Date.now().toString(36).toUpperCase().slice(-6);
        window._order.ref = ref;
        window._order.method = method;
        window._order.date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month:'long', year:'numeric' });

        // fill the confirmaton screen
        document.getElementById('done-ref').textContent = ref;
        document.getElementById('done-plan').textContent = window._order.plan;
        document.getElementById('done-cycle').textContent = window._order.cycle;
        document.getElementById('done-method').textContent = method;
        document.getElementById('done-total').textContent = '£' + window._order.total.toFixed(2);
        document.getElementById('done-date').textContent = window._order.date;

        // swap the payment form for the success screen
        document.getElementById('pay-screen').style.display = 'none';
        document.getElementById('done-screen').style.display = 'block';

        flash('Payment successful! Welcome to .....!');
    }, 1800);
}

// receipt downlaod
// builds a clean printable HTML receipt and opens it in a new tab,
// and triggers window.print() so the user can save it as pdf
function downloadReceipt() {
    var o = window._order;
    
    var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
        '<title>Fitness Receipt ' + o.ref + '</title>' +
        '<style>' +
            'body{font-family:Georgia,serif;max-width:560px;margin:48px auto;color:#0B090A;font-size:14px;line-height:1.7}' +
            'h1{font-family:Arial,sans-serif;font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px}' +
            'h1 span{color:#BA181B}' +
            '.meta{color:#6C757D;font-size:12px;margin-bottom:32px}' +
            'table{width:100%;border-collapse:collapse;margin-bottom:24px}' +
            'td{padding:9px 0;border-bottom:1px solid #e2dfdd;font-size:13px}' +
            'td:last-child{text-align:right;font-family:monospace}' +
            '.total td{font-weight:700;font-size:15px;border-bottom:2px solid #0B090A}' +
            '.total td:last-child{color:#BA181B;font-size:18px}' +
            '.foot{margin-top:36px;font-size:11px;color:#6C757D;border-top:1px solid #e2dfdd;padding-top:16px}' +
            '@media print{body{margin:24px}}' +
        '</style></head><body>' +
        '<h1>Fit<span>Core</span></h1>' +
        '<div class="meta">Official Payment Receipt &nbsp;·&nbsp; ' + o.date + '</div>' +
        '<table>' +
            '<tr><td>Order reference</td><td>' + o.ref + '</td></tr>' +
            '<tr><td>Membership plan</td><td>' + o.plan + '</td></tr>' +
            '<tr><td>Billing cycle</td><td>' + o.cycle + '</td></tr>' +
            '<tr><td>Payment method</td><td>' + o.method + '</td></tr>' +
        '</table>' +
        '<table>' +
            '<tr><td>Subtotal</td><td>£' + o.subtotal.toFixed(2) + '</td></tr>' +
            (o.saved > 0 ? '<tr><td>Annual discount (20%)</td><td>–£' + o.saved.toFixed(2) + '</td></tr>' : '') +
            '<tr><td>VAT (20%)</td><td>£' + o.vat.toFixed(2) + '</td></tr>' +
            '<tr class="total"><td>Total paid</td><td>£' + o.total.toFixed(2) + '</td></tr>' +
        '</table>' +
        '<div class="foot">Thank you for joining to our team. Please keep this receipt for your records. ' +
            'For any queries contact support@fitness.co.uk &nbsp;·&nbsp; fitness.co.uk</div>' +
        '<script>window.onload=function(){window.print();}<\/script>' +
        '</body></html>';

    // oen the receipt in a new tab
    var win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// run once on load so prices are correct form the start
refreshPrices();