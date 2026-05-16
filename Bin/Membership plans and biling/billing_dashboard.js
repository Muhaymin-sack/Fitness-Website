var S = {
    // sample membership state - in a real app, this would be loaded from the server or localStorage
    status:   'active',                 
    plan:     'standard',
    cycle:    'monthly',
    start:    new Date(2024, 10, 14),       
    pauseUntil: null,
    cancelEnd:  null,
    swPick: null,
    pausePick: null
};

var PLANS = {
    basic:   { label:'Basic',    name:'Basic',    sub:'Membership', mo:25,  yr:240,
        benefits:['Gym floor (weights + cardio)','Off-peak & standard hours','Changing rooms',null,null,null] },
    standard:{ label:'Standard', name:'Standard', sub:'Full Access', mo:45,  yr:432,
        benefits:['Full gym floor access','All group classes','Full opening hours','Locker access','Free induction session',null] },
    premium: { label:'Premium',  name:'Premium',  sub:'Membership', mo:65,  yr:624,
        benefits:['Full gym + classes + premium zones','Sauna, steam & functional area','Priority class booking','2 guest passes / month','Merch & supplement discounts','Dedicated locker'] },
    student: { label:'Student',  name:'Student',  sub:'Plan',       mo:20,  yr:192,
        benefits:['Standard gym + all classes','Full opening hours','Locker access','Valid Student ID required',null,null] }
};

var HIST = [
    // sample transaction history
    {date:'14 May 2025',ref:'FC-A3X9',plan:'Standard',mo:45, st:'paid'},
    {date:'14 Feb 2025',ref:'FC-D4R5',plan:'Basic',   mo:25, st:'paid'},
    {date:'14 Nov 2024',ref:'FC-G5H3',plan:'Premium',   mo:65, st:'paid'}
];
var LIFETIME = HIST.reduce(function(s,r){return s + r.mo * 1.20;}, 0);

/* -- Load user's saved plan from localStorage -- */
function loadUserPlan() {
    if (typeof PlanConfig !== 'undefined' && PlanConfig.hasPlan()) {
        var saved = PlanConfig.loadPlan();
        if (saved && saved.plan && PLANS[saved.plan]) {
            S.plan = saved.plan;
            S.cycle = saved.cycle || 'monthly';
            S.start = new Date(saved.start);
        }
    }
}

/* -- Boot -- */
document.addEventListener('DOMContentLoaded', function(){
    loadUserPlan();
    render();
    buildTbl('tbl-recent', HIST.slice(0,3));
    buildTbl('tbl-full',   HIST);
    updateHistCount(HIST);
    buildSwGrid();
    closeFix();
});

/* -- Tab switching -- */
function goTab(id, btn){
    document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('on');});
    document.querySelectorAll('.tab').forEach(function(b){b.classList.remove('on');});
    document.getElementById('tab-'+id).classList.add('on');
    btn.classList.add('on');
}

function render(){
    var p = PLANS[S.plan];
    var isYr = S.cycle === 'yearly';
    var mo   = isYr ? Math.round(p.mo * 0.80) : p.mo;
    var base = isYr ? mo * 12 : mo;
    var vat  = +(base * 0.20).toFixed(2);
    var tot  = +(base + vat).toFixed(2);
    var disc = isYr ? (p.mo * 12 - base) : 0;

    /* Days calculation */
    var today    = new Date();
    var cycleDays = isYr ? 365 : 30;
    var renew    = nextRenew(S.start, cycleDays);
    var daysLeft = Math.max(0, Math.ceil((renew - today) / 86400000));
    var pct      = Math.min(1, daysLeft / cycleDays);

    /* Ring colour by days remaining */
    var col = pct > 0.5 ? '#1a7a38' : pct > 0.23 ? '#8a5a00' : '#BA181B';

    var arc = document.getElementById('ring-arc');
    arc.style.stroke = col;
    setTimeout(function(){ arc.style.strokeDashoffset = 314.2 * (1 - pct); }, 80);
    document.getElementById('ring-days').textContent  = daysLeft;
    document.getElementById('ring-days').style.color  = col;

    /* Hero */
    document.getElementById('h-name').innerHTML  = p.name + '<br><span>' + p.sub + '</span>';
    var badge = document.getElementById('h-badge');
    badge.className = 'badge b-' + S.status;
    badge.textContent = S.status.charAt(0).toUpperCase() + S.status.slice(1);

    document.getElementById('h-start').textContent = fmt(S.start);
    document.getElementById('h-renew').textContent = fmt(renew);
    document.getElementById('h-price').textContent = '£' + (isYr ? (p.yr/12).toFixed(0) : p.mo);
    document.getElementById('h-cyc').textContent   = isYr ? 'mo (billed yearly)' : 'mo';

    document.getElementById('bl-left').textContent  = daysLeft + ' days remaining';
    document.getElementById('bl-right').textContent = cycleDays + '-day cycle';
    setTimeout(function(){
        var bf = document.getElementById('bar-fill');
        bf.style.width = (pct * 100) + '%';
        bf.style.background = col;
    }, 100);

    /* Next payment sidebar */
    document.getElementById('np-amt').textContent  = '£' + tot.toFixed(2);
    document.getElementById('np-due').textContent  = 'Due on ' + fmt(renew);
    document.getElementById('np-plan').textContent = p.label;
    document.getElementById('np-cyc').textContent  = isYr ? 'Yearly' : 'Monthly';
    document.getElementById('np-sub').textContent  = '£' + base.toFixed(2);
    document.getElementById('np-vat').textContent  = '£' + vat.toFixed(2);
    document.getElementById('np-tot').textContent  = '£' + tot.toFixed(2);
    var dr = document.getElementById('np-disc-row');
    if(isYr){ dr.classList.remove('hidden'); document.getElementById('np-disc').textContent = '-£'+disc.toFixed(2); }
    else     { dr.classList.add('hidden'); }

    /* Stats */
    document.getElementById('s-total').textContent   = '£' + LIFETIME.toFixed(2);
    document.getElementById('s-since').textContent   = fmt(S.start);
    document.getElementById('s-dur').textContent     = mosBetween(S.start, today) + ' months';
    document.getElementById('s-plan').textContent    = p.label;
    document.getElementById('s-billing').textContent = isYr ? 'Billed yearly' : 'Billed monthly';

    /* Countdown tiles */
    buildCountdown(daysLeft, renew);

    /* Benefits */
    buildBenefits(p.benefits);

    /* Banners */
    document.getElementById('banner-paused').classList.toggle('hidden', S.status !== 'paused');
    document.getElementById('banner-cancelled').classList.toggle('hidden', S.status !== 'cancelled');
    if(S.status === 'paused' && S.pauseUntil)
        document.getElementById('pause-until').textContent = fmt(S.pauseUntil);
    if(S.status === 'cancelled' && S.cancelEnd)
        document.getElementById('cancel-until').textContent = fmt(S.cancelEnd);

    /* Action row */
    var ar = document.getElementById('act-row');
    if(S.status === 'paused'){
        ar.innerHTML = '<button class="btn bp" onclick="reactivate()"><svg viewBox="0 0 14 14" fill="none"><path d="M2 7h10M9 4l3 3-3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>Reactivate</button>';
    } else if(S.status === 'cancelled'){
        ar.innerHTML = '<a href="membership-plans.html" class="btn bp">Choose new plan</a>';
        document.getElementById('np-amt').textContent = '—';
        document.getElementById('np-due').textContent = 'No upcoming payments';
    } else {
        ar.innerHTML =
        '<button class="btn bp" onclick="openSwitch()"><svg viewBox="0 0 14 14" fill="none"><path d="M1 4h9M7.5 1.5l3 2.5-3 2.5M13 10H4M6.5 7.5L3.5 10l3 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>Switch Plan</button>'+
        '<button class="btn bw" onclick="openPause()"><svg viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="3.5" height="10" rx=".8" fill="currentColor"/><rect x="8.5" y="2" width="3.5" height="10" rx=".8" fill="currentColor"/></svg>Pause</button>'+
        '<button class="btn bd" onclick="openCancel()"><svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>Cancel</button>';
    }
}

/* -- Countdown tiles -- */
function buildCountdown(days, renew){
var d = Math.floor(days / 1), h = Math.floor((days % 1) * 24);
var tiles = [
    {val: Math.floor(days / 7),  lbl:'Weeks'},
    {val: days % 7,              lbl:'Days'},
    {val: new Date().getHours(), lbl:'Hours'},
    {val: new Date().getMinutes(),lbl:'Mins'}
];
var html = tiles.map(function(t){
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;min-width:52px;text-align:center">'+
    '<div style="font-family:var(--hd);font-size:26px;font-weight:800;line-height:1;color:var(--ink)">'+
    String(t.val).padStart(2,'0')+'</div>'+
    '<div style="font-family:var(--mn);font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--gray);margin-top:2px">'+t.lbl+'</div>'+
    '</div>';
}).join('');
document.getElementById('countdown-tiles').innerHTML = html;
document.getElementById('cd-label').textContent = 'Until renewal on ' + fmt(renew);
}

/* -- Benefits grid -- */
function buildBenefits(list){
var icons = [
    '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x=".5" y="4.5" width="5.5" height="5.5" rx=".8" stroke="currentColor" stroke-width="1.1"/><rect x="7" y="4.5" width="5.5" height="5.5" rx=".8" stroke="currentColor" stroke-width="1.1"/><rect x="3.5" y="1.5" width="6" height="3" rx=".8" stroke="currentColor" stroke-width="1.1"/></svg>',
    '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.1"/><path d="M6.5 4V6.5l2 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
    '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5L8 5h3.5L9 7l1 3.5L6.5 9 4 10.5l1-3.5L2.5 5H6l.5-3.5z" fill="currentColor"/></svg>',
    '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 11V5.5a1.5 1.5 0 011.5-1.5h6A1.5 1.5 0 0111 5.5V11" stroke="currentColor" stroke-width="1.1"/><path d="M1 11h11M5 11V7.5a1.5 1.5 0 013 0V11" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
    '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="4" width="11" height="8" rx="1" stroke="currentColor" stroke-width="1.1"/><path d="M4 4V2.5a2.5 2.5 0 015 0V4" stroke="currentColor" stroke-width="1.1"/></svg>',
    '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5c-2.5 0-4.5 2-4.5 4.5 0 3 4.5 6.5 4.5 6.5s4.5-3.5 4.5-6.5c0-2.5-2-4.5-4.5-4.5z" stroke="currentColor" stroke-width="1.1"/><circle cx="6.5" cy="6" r="1.5" fill="currentColor"/></svg>'
];
var html = list.map(function(b, i){
    var on = b !== null;
    return '<div class="benefit-item'+(on?'':' off')+'">'+ icons[i%icons.length] +'<span>'+(b || 'Not included')+'</span></div>';
}).join('');
document.getElementById('benefits-grid').innerHTML = html;
}

/* -- Build history table -- */
function buildTbl(id, rows){
var h = '<thead><tr>'+['Date','Reference','Plan','Amount','Method','Status','Receipt'].map(function(x){return'<th>'+x+'</th>';}).join('')+'</tr></thead>';
var b = '<tbody>'+rows.map(function(r){
    var tot = +(r.mo * 1.20).toFixed(2);
    var sc  = r.st==='paid'?'var(--green)':'var(--red)';
    var sb  = r.st==='paid'?'var(--green-bg)':'var(--danger-bg)';
    return '<tr>'+
    '<td>'+r.date+'</td>'+
    '<td><span class="mono">'+r.ref+'</span></td>'+
    '<td>'+r.plan+'</td>'+
    '<td><span class="amt">£'+tot.toFixed(2)+'</span></td>'+
    '<td>Visa 4242</td>'+
    '<td><span style="background:'+sb+';color:'+sc+';font-family:var(--mn);font-size:10px;text-transform:uppercase;letter-spacing:.08em;padding:2px 8px;border-radius:10px">'+r.st+'</span></td>'+
    '<td><span class="dl" onclick="dlReceipt(\''+r.ref+'\',\''+r.plan+'\',\''+r.date+'\','+tot+')">'+
    '<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v6M3 5l2.5 2.5L8 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 9.5h9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>PDF</span></td>'+
    '</tr>';
}).join('')+'</tbody>';
document.getElementById(id).innerHTML = h + b;
}

/* -- History filter -- */
function filterHist(key, btn){
document.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('on');});
btn.classList.add('on');
var rows = key==='all' ? HIST : HIST.filter(function(r){
    return key==='paid' ? r.st==='paid' : r.plan.toLowerCase().includes(key);
});
buildTbl('tbl-full', rows);
updateHistCount(rows);
}
function updateHistCount(rows){
document.getElementById('hist-count').textContent = rows.length + ' transaction' + (rows.length!==1?'s':'');
}

/* -- Switch plan modal -- */
function buildSwGrid(){
var html = Object.keys(PLANS).map(function(k){
    var p = PLANS[k], curr = k===S.plan;
    return '<div class="sw-card'+(curr?' curr':'')+'" '+(curr?'':'onclick="pickSw(this,\''+k+'\','+p.mo+','+p.yr+')"')+'>'+(curr?'<div class="curr-chip">Current</div>':'')+
    '<div class="sw-name">'+p.name+'</div><div class="sw-sub">'+p.sub+'</div>'+
    '<div class="sw-price">£'+p.mo+'<span>/mo</span></div>'+
    '<div class="sw-yr">or £'+p.yr+'/yr</div></div>';
}).join('');
document.getElementById('sw-grid').innerHTML = html;
}

function openSwitch(){
S.swPick=null;
document.getElementById('sw-confirm').disabled=true;
document.getElementById('prorata-box').classList.remove('show');
buildSwGrid();
document.getElementById('ov-switch').classList.add('on');
}

function pickSw(el, key, mo, yr){
document.querySelectorAll('.sw-card').forEach(function(c){c.classList.remove('on');});
el.classList.add('on'); S.swPick=key;
document.getElementById('sw-confirm').disabled=false;

/* Pro-rata preview */
var curr = PLANS[S.plan];
var next = PLANS[key];
var isUp = next.mo > curr.mo;
var diff = Math.abs(next.mo - curr.mo);
var pb   = document.getElementById('prorata-box');
pb.classList.add('show');
pb.innerHTML = isUp
    ? '<strong>Upgrade:</strong> You will be charged a pro-rata credit of approximately <strong>£'+diff.toFixed(2)+
    '</strong> for the remaining days in your current cycle, then <strong>£'+(next.mo*1.20).toFixed(2)+
    '</strong> (inc. VAT) from today.'
    : '<strong>Downgrade:</strong> Your plan changes to <strong>'+next.name+
    '</strong> at the start of your next billing cycle. No immediate charge. You keep current access until then.';
}
function confirmSwitch(){
if(!S.swPick) return;
S.plan = S.swPick;
closeOv('ov-switch');
render();
buildSwGrid();
buildTbl('tbl-recent', HIST.slice(0,3));
toast('Switched to '+PLANS[S.plan].label+' plan. Effective from next billing cycle.','g');
}

/* -- Pause modal -- */
function openPause(){
S.pausePick=null;
document.getElementById('pause-confirm').disabled=true;
document.getElementById('pause-note').textContent='Select a duration to see your resume date.';
document.querySelectorAll('.po').forEach(function(o){o.classList.remove('on');});
document.getElementById('ov-pause').classList.add('on');
}
function pickPause(el, mo){
document.querySelectorAll('.po').forEach(function(o){o.classList.remove('on');});
el.classList.add('on'); S.pausePick=mo;
document.getElementById('pause-confirm').disabled=false;
var r=new Date(); r.setMonth(r.getMonth()+mo);
document.getElementById('pause-note').textContent='Your membership and access will resume automatically on '+fmt(r)+'. No payment will be taken during this period.';
}
function confirmPause(){
if(!S.pausePick) return;
S.status='paused';
var u=new Date(); u.setMonth(u.getMonth()+S.pausePick);
S.pauseUntil=u;
closeOv('ov-pause');
render();
toast('Membership paused until '+fmt(u)+'.','a');
}
function reactivate(){
S.status='active'; S.pauseUntil=null;
render();
toast('Membership reactivated — billing resumes next cycle.','g');
}

/* -- Cancel modal -- */
function openCancel(){document.getElementById('ov-cancel').classList.add('on');}
function confirmCancel(){
S.status='cancelled';
var e=new Date(); e.setDate(e.getDate()+14);
S.cancelEnd=e;
closeOv('ov-cancel');
render();
toast('Membership cancelled — access continues until '+fmt(e)+'.','r');
}

/* -- Overlay helpers -- */
function closeOv(id){document.getElementById(id).classList.remove('on');}
function closeFix(){
document.querySelectorAll('.overlay').forEach(function(o){
    o.addEventListener('click',function(e){if(e.target===o)closeOv(o.id);});
});
}

/* -- Toast -- */
function toast(msg,col){
var el=document.getElementById('toast-el'),dot=document.getElementById('toast-dot');
document.getElementById('toast-txt').textContent=msg;
dot.className='td td-'+(col||'g');
el.style.borderLeftColor=col==='r'?'var(--red)':col==='a'?'var(--amber)':'var(--green)';
el.classList.add('on');
clearTimeout(el._t);
el._t=setTimeout(function(){el.classList.remove('on');},3400);
}

/* -- Receipt download -- */
function dlReceipt(ref,plan,date,tot){
var vat=+(tot/1.20*0.20).toFixed(2), sub=+(tot-vat).toFixed(2);
var h='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt '+ref+'</title>'+
    '<style>body{font-family:Georgia,serif;max-width:520px;margin:48px auto;color:#0B090A;font-size:14px;line-height:1.7}'+
    'h1{font-family:Arial,sans-serif;font-size:24px;font-weight:900;text-transform:uppercase}h1 span{color:#BA181B}'+
    '.meta{color:#6C757D;font-size:12px;margin-bottom:26px}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:18px}td{padding:8px 0;border-bottom:1px solid #e2dfdd;font-size:13px}td:last-child{text-align:right;font-family:monospace}'+
    '.tot td{font-weight:700;font-size:15px;border-bottom:2px solid #0B090A}.tot td:last-child{color:#BA181B;font-size:17px}'+
    '.foot{font-size:11px;color:#6C757D;border-top:1px solid #e2dfdd;padding-top:13px;margin-top:26px}@media print{body{margin:24px}}</style>'+
    '</head><body><h1>Fit<span>Core</span></h1><div class="meta">Payment Receipt &middot; '+date+'</div>'+
    '<table><tr><td>Order reference</td><td>'+ref+'</td></tr><tr><td>Membership plan</td><td>'+plan+'</td></tr>'+
    '<tr><td>Payment method</td><td>Visa ending 4242</td></tr><tr><td>Date</td><td>'+date+'</td></tr></table>'+
    '<table><tr><td>Subtotal (excl. VAT)</td><td>£'+sub.toFixed(2)+'</td></tr>'+
    '<tr><td>VAT (20%)</td><td>£'+vat.toFixed(2)+'</td></tr>'+
    '<tr class="tot"><td>Total paid</td><td>£'+tot.toFixed(2)+'</td></tr></table>'+
    '<div class="foot">Thank you for being a FitCore member &middot; support@fitcore.co.uk &middot; fitcore.co.uk</div>'+
    '<sc'+'ript>window.onload=function(){window.print();}<\/sc'+'ript></body></html>';
var w=window.open('','_blank');w.document.write(h);w.document.close();
}

/* -- Notification toggle -- */
function notifTog(el,label){toast(label+(el.checked?' enabled.':' disabled.'),el.checked?'g':'a');}

/* -- Date helpers -- */
function fmt(d){return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
function nextRenew(start,days){var t=new Date(),d=new Date(start);while(d<=t)d.setDate(d.getDate()+days);return d;}
function mosBetween(a,b){return(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth());}