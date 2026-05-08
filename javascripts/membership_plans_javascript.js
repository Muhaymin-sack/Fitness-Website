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

//  recalculate all the summary billing figures
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

// // open the checkout modal - called "Proceed to Checkout"
// function checkout() {
//     if (!current) return;

//     // push the current billing figures into the model's order recap
//     var p = plans[current];
//     var base = p.price;
//     var monthly = yearly ? Math.round(base * (1 - 0.20)) : base;
//     var subtotal = yearly ? monthly * 12 : monthly;
//     var vat = parseFloat((subtotal * 0.20).toFixed(2));
//     var total = parseFloat((subtotal + vat).toFixed(2));
//     var saved = yearly ? (base * 12) - subtotal: 0;

//     // store totals globally so the receipt can access them later
//     window._order = { plan: p.label, cycle: yearly ? 'Yearly' : 'Monthly', 
//         subtotal: subtotal, vat: vat, total: total, saved: saved, bullets: p.bullets };

//     // fill the static recap column on the right side of the model
//     document.getElementById('co-plan').textContent = p.label,
// }

// checkout button hook up
function checkout() {
    if (!current) return;
    flash('Redirecting to checkout...')
}

// run once on load so prices are correct form the start
refreshPrices();