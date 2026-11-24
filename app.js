'use strict';
(() => {
/* =====================  utilità  ===================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 1) => Number(n).toLocaleString('it-IT', { maximumFractionDigits: d });
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pkey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const dayIdx = d => (d.getDay() + 6) % 7;
const monday = d => addDays(d, -dayIdx(d));
const wkey = d => dkey(monday(d));
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const fmtLong = d => { const t = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(d); return t.charAt(0).toUpperCase() + t.slice(1); };
const fmtShort = d => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(d).replace('.', '');
const normS = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const EPS = 1e-6;

const FD = Object.fromEntries(FOODS.map(f => [f.id, f]));
const MD = Object.fromEntries(MEALS.map(m => [m.id, m]));
FOODS.forEach(f => { f.occ = 0; f._p = new Map(); f.dishes = new Set(); });
PIANO_ORIGINALE.forEach(d => MEALS.forEach(m => d[m.id].i.forEach(it => {
  const f = FD[it.f]; f.occ++; f._p.set(it.q, (f._p.get(it.q) || 0) + 1); if (it.d) f.dishes.add(it.d);
})));
FOODS.forEach(f => { f.por = [...f._p.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]); });
const unit = f => (f.u === 'pz' ? 'pz' : 'g');
const qtxt = (f, q) => (f.u === 'pz' ? `n° ${num(q)}` : `${num(q)} g`);

/* =====================  icone  ===================== */
const P = {
  oggi: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  alimenti: '<path d="M12 8c-2.2-3-7.5-2-7.5 3 0 5 3 9.5 5.2 9.5 1 0 1.3-.6 2.3-.6s1.3.6 2.3.6c2.2 0 5.2-4.500 5.200-9.500 0-5-5.300-6-7.500-3z"/><path d="M12 8c0-2.200 1.200-3.800 3.300-4.500"/>',
  settimana: '<rect x="3.500" y="5" width="17" height="15.500" rx="3.500"/><path d="M3.500 10h17M8 3v4M16 3v4"/>',
  spesa: '<path d="M5.500 8.500h13l-1.100 11.500H6.600L5.500 8.500z"/><path d="M9 8.500V7a3 3 0 016 0v1.500"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
  chl: '<path d="M15 5l-7 7 7 7"/>', chr: '<path d="M9 5l7 7-7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  swap: '<path d="M7 8h11l-3-3M17 16H6l3 3"/>',
  search: '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4 4"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/>'
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

/* =====================  stato e salvataggio  ===================== */
const KEY = 'mydiet.v1';
const defaultState = () => ({ v: 1, orari: { ...ORARI_DEFAULT }, log: [], plans: {}, pantry: {}, lastBackup: 0, created: Date.now() });

function sanitize(s) {
  const d = defaultState();
  if (!s || typeof s !== 'object') return d;
  if (s.orari && typeof s.orari === 'object') MEALS.forEach(m => { if (/^\d{1,2}:\d{2}$/.test(s.orari[m.id] || '')) d.orari[m.id] = s.orari[m.id]; });
  if (Array.isArray(s.log)) d.log = s.log.filter(e => e && FD[e.f] && MD[e.m] && /^\d{4}-\d{2}-\d{2}$/.test(e.d) && isFinite(e.q) && e.q > 0)
    .map(e => ({ id: String(e.id || uid()), d: e.d, m: e.m, f: e.f, q: +e.q, n: e.n != null && isFinite(e.n) ? +e.n : undefined, ts: +e.ts || Date.now() }));
  if (s.plans && typeof s.plans === 'object') for (const [wk, p] of Object.entries(s.plans)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(wk) || !Array.isArray(p) || p.length !== 7) continue;
    let ok = true;
    const np = p.map(day => { const o = {}; MEALS.forEach(m => { const sl = day && day[m.id]; if (!sl || !Array.isArray(sl.i)) { ok = false; return; } o[m.id] = { i: sl.i.filter(it => it && FD[it.f] && isFinite(it.q)).map(it => { const r = { f: it.f, q: +it.q }; if (it.d) r.d = String(it.d); if (it.x) r.x = 1; return r; }), l: sl.l ? 1 : 0 }; }); return o; });
    if (ok) d.plans[wk] = np;
  }
  if (s.pantry && typeof s.pantry === 'object') for (const [k, p] of Object.entries(s.pantry)) if (FD[k] && p && isFinite(p.q) && p.q > 0) d.pantry[k] = { q: +p.q, t: +p.t || 0 };
  d.lastBackup = +s.lastBackup || 0; d.created = +s.created || d.created;
  return d;
}
function load() { try { const r = localStorage.getItem(KEY); if (r) return sanitize(JSON.parse(r)); } catch (e) { /* storage non disponibile */ } return defaultState(); }
let S = load();
let memo = {};
function save() { memo = {}; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Impossibile salvare: spazio esaurito'); } }
let undoSnap = null;
function commit(fn, msg) {
  const snap = JSON.stringify(S);
  fn(); save(); render();
  if (msg) { undoSnap = snap; toast(msg, true); }
}

/* =====================  logica del piano  ===================== */
const todayKey = () => dkey(new Date());
const curWeek = () => wkey(new Date());
const planFor = wk => S.plans[wk] || PIANO_ORIGINALE;
const slotMod = (wk, di, mid) => !!S.plans[wk] && JSON.stringify(S.plans[wk][di][mid]) !== JSON.stringify(PIANO_ORIGINALE[di][mid]);
const dayMod = (wk, di) => MEALS.some(m => slotMod(wk, di, m.id));
const planMod = wk => !!S.plans[wk] && DAYS_ALL().some(di => dayMod(wk, di));
const DAYS_ALL = () => [0, 1, 2, 3, 4, 5, 6];
function editPlan(wk) { if (!S.plans[wk]) S.plans[wk] = clone(PIANO_ORIGINALE); return S.plans[wk]; }
function tidyPlan(wk) { if (S.plans[wk] && !planMod(wk)) delete S.plans[wk]; }

function autoMeal(now = new Date()) {
  const t = now.getHours() * 60 + now.getMinutes();
  let cur = 'sera';
  MEALS.forEach(m => { if (toMin(S.orari[m.id]) <= t) cur = m.id; });
  return cur;
}

/* contatori settimanali: volte (n° registrazioni) e quantità, indipendenti */
function weekEntries(wk) { const a = wk, b = dkey(addDays(pkey(wk), 6)); return S.log.filter(e => e.d >= a && e.d <= b); }
function statusOf(c) {
  if (c.qty >= c.target - EPS || c.volte > c.occ) return 'r';
  if (c.qty >= 0.75 * c.target - EPS || c.volte >= c.occ) return 'o';
  return 'g';
}
function counters(wk) {
  if (memo['c' + wk]) return memo['c' + wk];
  const m = {};
  FOODS.forEach(f => { m[f.id] = { volte: 0, qty: 0, occ: f.occ, target: f.w }; });
  weekEntries(wk).forEach(e => { const c = m[e.f]; if (c) { c.volte++; c.qty += e.q; } });
  FOODS.forEach(f => {
    const c = m[f.id];
    c.rem = Math.max(0, f.w - c.qty); c.over = Math.max(0, c.qty - f.w); c.pct = Math.min(1, c.qty / f.w);
    c.st = statusOf(c);
  });
  return (memo['c' + wk] = m);
}
const rank = { g: 0, o: 1, r: 2 };
const byPriority = C => (a, b) => {
  const ca = C[a.id], cb = C[b.id];
  if (rank[ca.st] !== rank[cb.st]) return rank[ca.st] - rank[cb.st];
  if (ca.st === 'g') { const ua = ca.volte ? 1 : 0, ub = cb.volte ? 1 : 0; if (ua !== ub) return ua - ub; }
  return (cb.rem / cb.target) - (ca.rem / ca.target) || a.n.localeCompare(b.n, 'it');
};
function caption(f, c, withTag) {
  const u = unit(f);
  const rest = c.over > 0 ? `<b>+${num(c.over)} ${u} oltre il piano</b>` : c.rem > 0 ? `<b>restano ${num(c.rem)} ${u}</b>` : '<b>esaurito</b>';
  const fr = c.volte > c.occ ? ' <b>(frequenza superata)</b>' : '';
  return `${c.volte}/${c.occ} volte · ${num(c.qty)}/${num(f.w)} ${u} · ${rest}${fr}`;
}
const consumedIn = (dk, mid, fid) => { const l = S.log.filter(e => e.d === dk && e.m === mid && e.f === fid); return l.length ? l.reduce((a, e) => a + e.q, 0) : null; };
function slotsOf(wk, fid) {
  const plan = planFor(wk), out = [];
  plan.forEach((day, di) => MEALS.forEach(m => day[m.id].i.forEach(it => {
    if (it.f === fid) out.push({ di, mid: m.id, q: it.q, moved: !PIANO_ORIGINALE[di][m.id].i.some(o => o.f === fid && o.q === it.q), done: consumedIn(dkey(addDays(pkey(wk), di)), m.id, fid) });
  })));
  return out;
}
function pantryAll() {
  if (memo.pantry) return memo.pantry;
  const used = {};
  S.log.forEach(e => { const p = S.pantry[e.f]; if (p && e.ts > p.t) used[e.f] = (used[e.f] || 0) + e.q; });
  const r = {};
  FOODS.forEach(f => { const p = S.pantry[f.id]; r[f.id] = p ? Math.max(0, p.q - (used[f.id] || 0)) : 0; });
  return (memo.pantry = r);
}

/* =====================  interfaccia: infrastruttura  ===================== */
const ui = { tab: 'oggi', date: todayKey(), meal: null, q: '', cat: -1, wOff: 0, wView: 'mio', edit: false, open: {}, sView: 'buy', sPeriod: 'now', showCovered: false, hist: {} };
const curMeal = () => ui.meal || (ui.date === todayKey() ? autoMeal() : 'colazione');
const shownWeek = () => wkey(addDays(new Date(), ui.wOff * 7));
let toastT;
function toast(msg, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-a="undo">Annulla</button>' : ''}`;
  t.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), undo ? 5500 : 2600);
}
let SC = null, sheetTok = 0;
function openSheet(title, sub, body, foot, opts = {}) {
  const L = $('#layer'); sheetTok++; L.innerHTML = '';
  L.innerHTML = `<div class="back" data-a="closesheet"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div>
    <div class="sh-head"><h2>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</h2><button class="ib" data-a="closesheet" aria-label="Chiudi">${ic('x')}</button></div>
    <div class="sh-body">${body}</div>${foot ? `<div class="sh-foot ${opts.two ? 'two' : ''}">${foot}</div>` : ''}</section>`;
  document.body.classList.add('lock');
  requestAnimationFrame(() => requestAnimationFrame(() => { const b = $('.back', L), s = $('.sheet', L); if (b) b.classList.add('open'); if (s) s.classList.add('open'); }));
}
function setBody(html) { const b = $('#layer .sh-body'); if (b) b.innerHTML = html; }
function setFoot(html, two) { const f = $('#layer .sh-foot'); if (f) { f.innerHTML = html; f.classList.toggle('two', !!two); } }
function closeSheet(instant) {
  const L = $('#layer'); if (!L.firstChild) { SC = null; return; }
  document.body.classList.remove('lock'); SC = null; const tok = ++sheetTok;
  if (instant) { L.innerHTML = ''; return; }
  $('.back', L)?.classList.remove('open'); $('.sheet', L)?.classList.remove('open');
  setTimeout(() => { if (tok === sheetTok) L.innerHTML = ''; }, 320);
}
const statusLabel = (f, c) => c.over > 0 || c.volte > c.occ ? 'Superato' : c.st === 'r' ? 'Raggiunto' : c.st === 'o' ? 'Quasi raggiunto' : 'Disponibile';

/* ---- righe ---- */
function foodRow(f, C, o = {}) {
  const c = C[f.id];
  return `<div class="row s-${c.st}" data-a="${o.row || 'openfood'}" data-f="${f.id}" ${o.w ? `data-w="${o.w}"` : ''}>
    <span class="dot"></span>
    <div class="r-main"><div class="r-t">${esc(f.n)}${c.volte === 0 && c.st === 'g' ? '<span class="tag">Da consumare</span>' : ''}</div>
      <div class="bar"><i style="width:${c.pct * 100}%"></i></div>
      <div class="r-s">${caption(f, c)}</div></div>
    ${o.plus === false ? '' : `<button class="plus" data-a="openlog" data-f="${f.id}" aria-label="Registra ${esc(f.n)}">${ic('plus')}</button>`}
  </div>`;
}
function entryRow(e, extra) {
  const f = FD[e.f];
  const q = e.n != null && f.pz ? `${num(e.n)} ${f.pz.l === 'pz' ? 'pz' : f.pz.l} · ${num(e.q)} g` : qtxt(f, e.q);
  return `<div class="row" data-a="editlog" data-id="${e.id}"><div class="r-main"><div class="r-t">${esc(f.n)}</div>${extra ? `<div class="r-s">${extra}</div>` : ''}</div><div class="r-q">${q}</div></div>`;
}
function planRow(it, o) {
  const f = FD[it.f], c = o.C[it.f], got = consumedIn(o.dk, o.mid, it.f);
  return `<div class="row s-${c.st} ${got != null ? 'is-done' : ''}" data-a="openlog" data-f="${f.id}" data-q="${it.q}" data-m="${o.mid}" data-d="${o.dk}">
    <span class="dot"></span>
    <div class="r-main"><div class="r-t">${esc(f.n)}${it.x ? '<span class="tag x">aggiunto</span>' : ''}</div>
      <div class="r-s">${got != null ? `<b style="color:var(--gt)">Registrato ${qtxt(f, got)}</b> · ` : ''}${caption(f, c)}</div></div>
    <div class="r-q">${qtxt(f, it.q)}</div>
    ${got != null ? `<span class="done">${ic('check')}</span>` : `<button class="plus" data-a="quick" data-f="${f.id}" data-q="${it.q}" data-m="${o.mid}" data-d="${o.dk}" aria-label="Registra ${esc(f.n)}">${ic('plus')}</button>`}
  </div>`;
}
function slotCard(o) {
  const sl = o.slot; let body = '';
  if (sl.l) body = '<div class="empty">Pasto libero: il piano non indica alimenti.</div>';
  else if (!sl.i.length) body = '<div class="empty">Nessun alimento previsto in questo pasto.</div>';
  else { let last; sl.i.forEach(it => { if (it.d && it.d !== last) body += `<div class="dish">${esc(it.d)}</div>`; last = it.d; body += planRow(it, o); }); }
  return `<section class="card"><div class="card-h"><span>${o.title}</span>${o.badge || ''}</div>${body}</section>`;
}
function installHint() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let dis = false; try { dis = localStorage.getItem('mydiet.hint') === '1'; } catch (e) { /* nulla */ }
  if (!ios || standalone || dis) return '';
  return `<div class="install"><div>Per usarla come app: tocca <b>Condividi</b> in Safari e poi <b>Aggiungi alla schermata Home</b>.</div><button data-a="hint" aria-label="Chiudi">${ic('x', 'sm')}</button></div>`;
}

/* =====================  vista OGGI  ===================== */
function viewOggi() {
  const date = pkey(ui.date), isToday = ui.date === todayKey(), wk = wkey(date), di = dayIdx(date), mid = curMeal(), C = counters(wk), dk = ui.date;
  const orig = PIANO_ORIGINALE[di][mid], cur = planFor(wk)[di][mid], modified = JSON.stringify(orig) !== JSON.stringify(cur), auto = autoMeal();
  let h = installHint();
  h += `<header class="top"><div class="top-row"><div class="date-nav"><button class="ib" data-a="dprev" aria-label="Giorno precedente">${ic('chl')}</button><span class="date-lbl">${fmtLong(date)}</span><button class="ib" data-a="dnext" aria-label="Giorno successivo">${ic('chr')}</button></div>
    <button class="ib" data-a="settings" aria-label="Impostazioni">${ic('sliders')}</button></div>
    <h1>${MD[mid].nome}</h1>
    <div class="sub">${isToday ? (mid === auto && !ui.meal ? 'Pasto in corso, scelto in base all’orario' : mid === auto ? 'Pasto in corso' : 'Selezionato manualmente') : '<button class="smbtn" data-a="dtoday">Torna a oggi</button>'}</div></header>`;
  h += `<div class="chips">${MEALS.map(m => `<button class="chip ${m.id === mid ? 'on' : ''}" data-a="meal" data-m="${m.id}">${isToday && m.id === auto ? '<i class="nowdot"></i>' : ''}${m.nome}</button>`).join('')}</div>`;
  const o = { dk, mid, C };
  h += slotCard({ ...o, slot: orig, title: modified ? 'Piano originale del nutrizionista' : 'Previsto dal nutrizionista', badge: modified ? '<span class="badge orig">Originale</span>' : '' });
  if (modified) h += slotCard({ ...o, slot: cur, title: 'Il tuo pasto', badge: '<span class="badge mod">Modificato</span>' });
  const ents = S.log.filter(e => e.d === dk && e.m === mid).sort((a, b) => a.ts - b.ts);
  if (ents.length) h += `<section class="card"><div class="card-h"><span>Consumato in questo pasto</span><small>${ents.length}</small></div>${ents.map(e => entryRow(e)).join('')}</section>`;
  const others = S.log.filter(e => e.d === dk && e.m !== mid);
  if (others.length) {
    h += `<details class="card"><summary>Altri pasti registrati oggi <small style="color:var(--mut)">${others.length}</small></summary>${MEALS.filter(m => m.id !== mid && others.some(e => e.m === m.id)).map(m => `<div class="dish">${m.nome}</div>${others.filter(e => e.m === m.id).sort((a, b) => a.ts - b.ts).map(e => entryRow(e)).join('')}`).join('')}</details>`;
  }
  const ex = new Set([...orig.i, ...cur.i].map(i => i.f));
  h += `<h2 class="sec">Altri alimenti del piano</h2><p class="note">Alternative prese dal piano settimanale: non sono equivalenti nutrizionali, salvo dove indicato dal nutrizionista. Quelli esauriti restano in fondo.</p>`;
  CATS.forEach((cn, ci) => {
    const list = FOODS.filter(f => f.c === ci && !ex.has(f.id)).sort(byPriority(C));
    if (!list.length) return;
    h += `<section class="card"><div class="catl">${cn}</div>${list.map(f => foodRow(f, C, { row: 'openlog' })).join('')}</section>`;
  });
  const any = cur.i.length > 0;
  h += `<div class="fab"><button class="btn" data-a="${any ? 'regmeal' : 'pickany'}">${ic('plus')}${any ? 'Registra pasto' : 'Registra alimento'}</button></div>`;
  return h;
}

/* =====================  vista ALIMENTI  ===================== */
function matches(f, q) {
  const hay = normS(f.n + ' ' + [...f.dishes].join(' '));
  return normS(q).split(/\s+/).filter(Boolean).every(t => hay.includes(t) || (t.length >= 4 && hay.includes(t.slice(0, -1))));
}
function foodDetail(f, wk) {
  const c = counters(wk)[f.id], u = unit(f), slots = slotsOf(wk, f.id);
  const hist = S.log.filter(e => e.f === f.id).sort((a, b) => b.d.localeCompare(a.d) || b.ts - a.ts);
  const showAll = ui.hist[f.id];
  const portions = f.por.map(q => { const pz = f.pz && f.u === 'g' && f.pz.g > 5 && q % f.pz.g === 0 ? ` (n° ${q / f.pz.g})` : ''; return `<span class="pc">${qtxt(f, q)}${pz}</span>`; }).join('');
  const eq = f.pz && f.u === 'g' ? `<div class="meta" style="padding:6px 0 0">Dal piano: 1 ${f.pz.l === 'pz' ? 'pezzo' : f.pz.l} = ${num(f.pz.g)} g</div>` : '';
  return `<div class="s-${c.st}">
    <div class="kv"><div><b>${c.volte}/${c.occ}</b><span>Volte</span></div><div><b>${num(c.qty)}/${num(f.w)} ${u}</b><span>Consumato</span></div>
      <div class="rem"><b>${c.over > 0 ? '+' + num(c.over) : num(c.rem)} ${u}</b><span>${c.over > 0 ? 'Oltre il piano' : 'Rimanente'}</span></div></div>
    <div class="blk" style="padding-top:0"><div class="bar big"><i style="width:${Math.min(100, c.volte / c.occ * 100)}%"></i></div><div class="meta" style="padding:0 0 6px">Frequenza settimanale</div>
      <div class="bar big"><i style="width:${c.pct * 100}%"></i></div><div class="meta" style="padding:0">Quantità settimanale</div></div>
    <div class="blk"><h3>Porzione prevista dal piano</h3><div class="pchips">${portions}</div>${eq}${f.nota ? `<div class="meta" style="padding:6px 0 0">${esc(f.nota)}</div>` : ''}</div>
    <div class="blk"><h3>Giorni e pasti previsti</h3>${slots.map(s => `<div class="li"><span>${GIORNI[s.di]} · ${MD[s.mid].nome}${s.moved ? ' <span class="tag x">spostato</span>' : ''}</span><span class="m">${s.done != null ? '✓ ' : ''}${qtxt(f, s.q)}</span></div>`).join('') || '<div class="m">Nessun pasto previsto.</div>'}</div>
    <div class="blk"><h3>Storico delle registrazioni</h3>${hist.length ? hist.slice(0, showAll ? 500 : 8).map(e => `<div class="li click" data-a="editlog" data-id="${e.id}"><span>${fmtShort(pkey(e.d))} · ${MD[e.m].nome}</span><span class="m">${qtxt(f, e.q)}</span></div>`).join('') + (hist.length > 8 && !showAll ? `<button class="smbtn" style="margin-top:8px" data-a="histall" data-f="${f.id}">Mostra tutte (${hist.length})</button>` : '') : '<div class="m">Nessuna registrazione.</div>'}</div></div>`;
}
function resultsHTML() {
  const wk = curWeek(), C = counters(wk), q = ui.q.trim();
  if (q) {
    const list = FOODS.filter(f => matches(f, q)).sort(byPriority(C)).slice(0, 12);
    if (!list.length) return `<div class="empty">Nessun alimento del piano corrisponde a «${esc(q)}».</div>`;
    return list.map(f => { const c = C[f.id]; return `<section class="card s-${c.st}"><div class="card-h"><span>${esc(f.n)}</span><span class="pill">${statusLabel(f, c)}</span></div>${foodDetail(f, wk)}<div class="btns"><button class="btn" data-a="openlog" data-f="${f.id}">${ic('plus')}Registra consumo</button></div></section>`; }).join('');
  }
  return CATS.map((cn, ci) => {
    if (ui.cat >= 0 && ui.cat !== ci) return '';
    const list = FOODS.filter(f => f.c === ci).sort((a, b) => a.n.localeCompare(b.n, 'it'));
    return `<section class="card"><div class="catl">${cn}</div>${list.map(f => foodRow(f, C)).join('')}</section>`;
  }).join('');
}
function viewAlimenti() {
  const wk = curWeek(), a = pkey(wk);
  return `<header class="top"><h1>Alimenti</h1><div class="sub">Settimana dal ${fmtShort(a)} al ${fmtShort(addDays(a, 6))}</div></header>
  <div class="searchbar"><div class="search">${ic('search', 'sm')}<input id="q" type="search" placeholder="Cerca un alimento, es. zucchine" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="search" value="${esc(ui.q)}"></div>
  <div class="chips" style="padding-bottom:4px"><button class="chip ${ui.cat < 0 ? 'on' : ''}" data-a="cat" data-c="-1">Tutti</button>${CATS.map((c, i) => `<button class="chip ${ui.cat === i ? 'on' : ''}" data-a="cat" data-c="${i}">${c}</button>`).join('')}</div></div>
  <div id="res" style="margin-top:8px">${resultsHTML()}</div>`;
}

/* =====================  vista SETTIMANA  ===================== */
function mealBlock(wk, di, mid, plan, mode, edit) {
  const sl = plan[di][mid], dk = dkey(addDays(pkey(wk), di)), mod = mode === 'mio' && slotMod(wk, di, mid);
  let h = `<div class="mh"><span class="grow">${MD[mid].nome}${mod ? ' <span class="badge mod">modificato</span>' : ''}</span>${edit ? `<button class="smbtn" data-a="swapmeal" data-di="${di}" data-m="${mid}">${ic('swap', 'sm')}Scambia</button><button class="smbtn" data-a="additem" data-di="${di}" data-m="${mid}" aria-label="Aggiungi alimento">${ic('plus', 'sm')}</button>` : ''}</div>`;
  if (sl.l) h += '<div class="mi"><span class="n" style="color:var(--mut)">Pasto libero</span></div>';
  else if (!sl.i.length) h += '<div class="mi"><span class="n" style="color:var(--mut)">Nessun alimento</span></div>';
  let last;
  sl.i.forEach((it, ix) => {
    const f = FD[it.f], got = mode === 'mio' ? consumedIn(dk, mid, it.f) : null;
    if (it.d && it.d !== last) h += `<div class="dish" style="padding:6px 16px 0">${esc(it.d)}</div>`;
    last = it.d;
    h += `<div class="mi ${got != null ? 'got' : ''} ${edit ? 'ed' : ''}" ${edit ? `data-a="itemact" data-di="${di}" data-m="${mid}" data-ix="${ix}"` : ''}>${got != null ? `<span class="ck">${ic('check', 'sm')}</span>` : ''}<span class="n">${esc(f.n)}${it.x ? '<span class="tag x">aggiunto</span>' : ''}</span><span class="q">${qtxt(f, it.q)}</span></div>`;
  });
  return h;
}
function dayCard(wk, di, mode, edit) {
  const plan = mode === 'orig' ? PIANO_ORIGINALE : planFor(wk), date = addDays(pkey(wk), di), isToday = dkey(date) === todayKey();
  const key = mode + wk + di, open = ui.open[key] !== undefined ? ui.open[key] : isToday;
  const n = MEALS.reduce((a, m) => a + plan[di][m.id].i.length, 0), mod = mode === 'mio' && dayMod(wk, di);
  let h = `<section class="dayc ${open ? 'open' : ''} ${isToday ? 'today' : ''}"><button class="dayh" data-a="toggleday" data-k="${key}" data-o="${open ? 1 : 0}"><div class="grow"><span class="nm">${GIORNI[di]}</span><span class="dt">${fmtShort(date)}</span></div>${mod ? '<span class="badge mod">modificato</span>' : ''}${isToday ? '<span class="badge">oggi</span>' : ''}<span class="m" style="color:var(--mut);font-size:13px">${n} alim.</span><span class="chev">${ic('chr', 'sm')}</span></button>`;
  if (open) {
    h += `<div class="daybody">${MEALS.map(m => mealBlock(wk, di, m.id, plan, mode, edit)).join('')}`;
    if (edit) h += `<div class="btns"><button class="btn sm sec2" data-a="swapday" data-di="${di}">${ic('swap', 'sm')}Scambia giornata</button></div>`;
    h += '</div>';
  }
  return h + '</section>';
}
function consView(wk, C) {
  const ents = weekEntries(wk);
  let h = '';
  if (!ents.length) h += '<div class="card"><div class="empty">Nessun alimento registrato in questa settimana.</div></div>';
  for (let di = 0; di < 7; di++) {
    const dk = dkey(addDays(pkey(wk), di)), de = ents.filter(e => e.d === dk);
    if (!de.length) continue;
    h += `<section class="card"><div class="card-h"><span>${GIORNI[di]} ${fmtShort(pkey(dk))}</span><small>${de.length} registrazioni</small></div>${MEALS.filter(m => de.some(e => e.m === m.id)).map(m => `<div class="dish">${m.nome}</div>${de.filter(e => e.m === m.id).sort((a, b) => a.ts - b.ts).map(e => entryRow(e)).join('')}`).join('')}</section>`;
  }
  const over = FOODS.filter(f => C[f.id].over > 0 || C[f.id].volte > f.occ);
  h += `<h2 class="sec">Riepilogo settimanale</h2>`;
  if (over.length) h += `<section class="card s-r"><div class="card-h"><span>Superamenti</span><small>${over.length}</small></div>${over.map(f => { const c = C[f.id]; return `<div class="row s-r" data-a="openfood" data-f="${f.id}" data-w="${wk}"><span class="dot"></span><div class="r-main"><div class="r-t">${esc(f.n)}</div><div class="r-s">${caption(f, c)}</div></div></div>`; }).join('')}</section>`;
  CATS.forEach((cn, ci) => { h += `<section class="card"><div class="catl">${cn}</div>${FOODS.filter(f => f.c === ci).sort(byPriority(C)).map(f => foodRow(f, C, { plus: false, w: wk })).join('')}</section>`; });
  return h;
}
function viewSettimana() {
  const wk = shownWeek(), a = pkey(wk), C = counters(wk), editable = wk >= curWeek(), edit = ui.edit && editable && ui.wView === 'mio';
  let tot = 0, got = 0, red = 0, ora = 0, grn = 0;
  FOODS.forEach(f => { const c = C[f.id]; tot += f.occ; got += Math.min(c.volte, f.occ); if (c.st === 'r') red++; else if (c.st === 'o') ora++; else grn++; });
  const pct = Math.round(got / tot * 100);
  let h = `<header class="top"><div class="top-row"><h1>Settimana</h1>${ui.wView === 'mio' && editable ? `<button class="smbtn" style="height:36px;padding:0 14px;font-size:15px" data-a="editmode">${ui.edit ? 'Fine' : 'Modifica'}</button>` : ''}</div></header>
  <div class="wk-nav"><button class="ib" data-a="wprev" aria-label="Settimana precedente">${ic('chl')}</button><div style="text-align:center"><b>${fmtShort(a)} – ${fmtShort(addDays(a, 6))} ${addDays(a, 6).getFullYear()}</b>${ui.wOff !== 0 ? '<div><button class="smbtn" data-a="wnow">Questa settimana</button></div>' : (wk === curWeek() ? '<div class="sub" style="font-size:13px">Settimana corrente</div>' : '')}</div><button class="ib" data-a="wnext" aria-label="Settimana successiva">${ic('chr')}</button></div>
  <section class="card sumcard"><div class="sumtop"><span style="font-weight:700">Avanzamento</span><b>${pct}%</b></div><div class="bar big"><i style="width:${pct}%;background:var(--acc)"></i></div>
    <div class="meta" style="padding:0">${got} registrazioni su ${tot} previste dal piano</div>
    <div class="stats"><span class="s-g" style="--sb:var(--g-soft);--st:var(--gt)"><b>${grn}</b>disponibili</span><span style="--sb:var(--o-soft);--st:var(--ot)"><b>${ora}</b>quasi finiti</span><span style="--sb:var(--r-soft);--st:var(--rt)"><b>${red}</b>raggiunti</span></div></section>
  <div class="seg" role="tablist"><button class="${ui.wView === 'orig' ? 'on' : ''}" data-a="wview" data-v="orig">Originale</button><button class="${ui.wView === 'mio' ? 'on' : ''}" data-a="wview" data-v="mio">Il mio piano</button><button class="${ui.wView === 'cons' ? 'on' : ''}" data-a="wview" data-v="cons">Consumato</button></div>`;
  if (ui.wView === 'cons') return h + consView(wk, C);
  if (ui.wView === 'orig') h += '<p class="note">Il piano del nutrizionista, così com’è nel PDF. Non si modifica mai.</p>';
  else if (!editable) h += '<p class="note">Settimana passata: il piano si può solo consultare.</p>';
  else h += `<p class="note">${edit ? 'Tocca un alimento per spostarlo, cambiarne la quantità o toglierlo. Scambi e spostamenti non cambiano i consumi registrati né le quantità settimanali.' : 'Qui puoi riorganizzare giorni e pasti senza toccare il piano originale né i consumi registrati.'}</p>`;
  for (let di = 0; di < 7; di++) h += dayCard(wk, di, ui.wView, edit);
  if (ui.wView === 'mio' && editable && ui.edit && planMod(wk)) h += `<button class="btn ghost" style="margin-top:6px" data-a="resetplan">Ripristina il piano originale di questa settimana</button>`;
  return h;
}

/* =====================  vista SPESA  ===================== */
function shopRows() {
  const wk = curWeek(), C = counters(wk), P = pantryAll(), next = ui.sPeriod === 'next';
  return FOODS.map(f => {
    const rem = C[f.id].rem, stock = P[f.id];
    let need, buy, have;
    if (!next) { need = rem; buy = Math.max(0, need - stock); have = Math.min(stock, need); }
    else { const free = Math.max(0, stock - rem); need = f.w; buy = Math.max(0, need - free); have = Math.min(free, need); }
    return { f, need, buy, have, stock };
  });
}
const round1 = n => Math.round(n * 10) / 10;
function viewSpesa() {
  const rows = shopRows(), P = pantryAll();
  let h = `<header class="top"><h1>Spesa</h1><div class="sub">${ui.sView === 'buy' ? 'Solo ciò che ti serve davvero' : 'Quello che hai già in casa'}</div></header>
  <div class="seg"><button class="${ui.sView === 'buy' ? 'on' : ''}" data-a="sview" data-v="buy">Da comprare</button><button class="${ui.sView === 'home' ? 'on' : ''}" data-a="sview" data-v="home">In casa</button></div>`;
  if (ui.sView === 'buy') {
    h += `<div class="seg" style="margin-top:-4px"><button class="${ui.sPeriod === 'now' ? 'on' : ''}" data-a="speriod" data-v="now">Resto di questa settimana</button><button class="${ui.sPeriod === 'next' ? 'on' : ''}" data-a="speriod" data-v="next">Settimana prossima</button></div>`;
    const buy = rows.filter(r => r.buy > EPS), cov = rows.filter(r => r.buy <= EPS && r.need > EPS);
    if (!buy.length) h += `<div class="card"><div class="empty">${cov.length ? 'Hai già tutto in casa: niente da comprare.' : 'Niente da comprare: quantità settimanali già consumate.'}</div></div>`;
    else {
      h += `<p class="note">${buy.length} alimenti da comprare. Tocca il cerchio quando li hai acquistati; tocca la riga per indicare cosa hai in casa.</p>`;
      CATS.forEach((cn, ci) => {
        const l = buy.filter(r => r.f.c === ci); if (!l.length) return;
        h += `<section class="card"><div class="catl">${cn}</div>${l.map(r => `<div class="row" data-a="stock" data-f="${r.f.id}"><button class="chk" data-a="bought" data-f="${r.f.id}" aria-label="Segna come acquistato">${ic('check', 'sm')}</button><div class="r-main"><div class="r-t">${esc(r.f.n)}</div><div class="r-s">Servono ${qtxt(r.f, round1(r.need))}${r.have > EPS ? ` · in casa ${qtxt(r.f, round1(r.have))}` : ''}</div></div><div class="r-q buy">${qtxt(r.f, round1(r.buy))}</div></div>`).join('')}</section>`;
      });
      h += `<button class="btn sec2" data-a="sharelist">${ic('share', 'sm')}Condividi la lista</button>`;
    }
    if (cov.length) {
      h += `<button class="btn ghost" style="margin-top:12px" data-a="covered">${ui.showCovered ? 'Nascondi' : 'Mostra'} gli alimenti già coperti (${cov.length})</button>`;
      if (ui.showCovered) h += `<section class="card" style="margin-top:12px">${cov.map(r => `<div class="row" data-a="stock" data-f="${r.f.id}"><span class="done" style="width:30px">${ic('check')}</span><div class="r-main"><div class="r-t">${esc(r.f.n)}</div><div class="r-s">Servono ${qtxt(r.f, round1(r.need))} · in casa ${qtxt(r.f, round1(r.stock))}</div></div></div>`).join('')}</section>`;
    }
  } else {
    h += `<p class="note">Indica le quantità che possiedi. Si scalano da sole quando registri un consumo.</p>`;
    CATS.forEach((cn, ci) => { h += `<section class="card"><div class="catl">${cn}</div>${FOODS.filter(f => f.c === ci).map(f => `<div class="row" data-a="stock" data-f="${f.id}"><div class="r-main"><div class="r-t">${esc(f.n)}</div></div><div class="r-q" style="${P[f.id] > EPS ? '' : 'color:var(--mut);font-weight:500'}">${P[f.id] > EPS ? qtxt(f, round1(P[f.id])) : '—'}</div></div>`).join('')}</section>`; });
    if (Object.keys(S.pantry).length) h += `<button class="btn danger sm" data-a="clearpantry">Svuota la dispensa</button>`;
  }
  return h;
}

/* =====================  schede (sheet)  ===================== */
const parseN = v => parseFloat(String(v).replace(',', '.'));
function qtyBlockG(f, q, rem, only) {
  const vals = only ? [...only] : [...f.por]; if (!only && rem > EPS && rem < Math.max(...f.por) && !vals.includes(round1(rem))) vals.push(round1(rem));
  const chips = vals.map(v => {
    const pz = f.pz && f.u === 'g' && f.pz.g >= 25 && v % f.pz.g === 0 ? ` (n° ${v / f.pz.g})` : '';
    return `<button class="chip" style="height:34px;font-size:14px;box-shadow:none;background:var(--card2)" data-a="setq" data-v="${v}">${only ? 'Settimana ' : f.por.includes(v) ? '' : 'Resto '}${qtxt(f, v)}${pz}</button>`;
  }).join('');
  return `<div class="qrow"><button class="step" data-a="step" data-dir="-1" aria-label="Meno">−</button><input class="inp" id="lq" type="text" inputmode="decimal" value="${num(q, 2).replace(/\./g, '')}" aria-label="Quantità"><span class="qunit">${unit(f)}</span><button class="step" data-a="step" data-dir="1" aria-label="Più">+</button></div>
    <div class="pchips" style="margin-top:10px">${chips}</div>`;
}
function qtyBlockPz(f, n, w) {
  return `<div class="qrow"><button class="step" data-a="stepn" data-dir="-1" aria-label="Meno">−</button><input class="inp" id="lpn" type="text" inputmode="decimal" value="${num(n, 2)}" aria-label="Numero di pezzi"><span class="qunit">${f.pz.l === 'pz' ? 'pz' : f.pz.l}</span><button class="step" data-a="stepn" data-dir="1" aria-label="Più">+</button></div>
    <div class="field"><label for="lpw">Peso reale di ogni ${f.pz.l === 'pz' ? 'pezzo' : f.pz.l} (g)</label><input class="inp" id="lpw" type="text" inputmode="decimal" value="${num(w, 2)}"></div>
    <div class="meta" style="padding:0">Totale registrato: <b id="ltot"></b></div>`;
}
function readLogQty() {
  const f = FD[SC.f];
  if (SC.mode === 'pz') { const n = parseN($('#lpn').value), w = parseN($('#lpw').value); return { q: n * w, n }; }
  return { q: parseN($('#lq').value) };
}
function updHint() {
  if (!SC || SC.type !== 'log') return;
  const f = FD[SC.f], el = $('#lhint'); if (!el) return;
  const { q, n } = readLogQty(), tot = $('#ltot');
  if (tot) tot.textContent = isFinite(q) && q > 0 ? `${num(q)} g` : '—';
  const dv = $('#ld').value; if (!/^\d{4}-\d{2}-\d{2}$/.test(dv)) return;
  const c = counters(wkey(pkey(dv)))[f.id], ed = SC.entry && wkey(pkey(SC.entry.d)) === wkey(pkey(dv)) ? SC.entry : null;
  if (!(q > 0)) { el.className = 'hint'; el.textContent = 'Inserisci una quantità maggiore di zero.'; return; }
  const nq = c.qty - (ed ? ed.q : 0) + q, nv = c.volte - (ed ? 1 : 0) + 1, u = unit(f);
  const probe = { qty: nq, volte: nv, occ: f.occ, target: f.w }, st = statusOf(probe);
  let msg;
  if (nq > f.w + EPS) msg = `Supererai di ${num(nq - f.w)} ${u} la quantità settimanale (${num(nq)}/${num(f.w)} ${u}).`;
  else if (nv > f.occ) msg = `Supererai la frequenza prevista: ${nv}/${f.occ} volte. Restano ${num(f.w - nq)} ${u}.`;
  else if (nq >= f.w - EPS) msg = `Raggiungerai la quantità settimanale (${num(nq)}/${num(f.w)} ${u}).`;
  else msg = `Dopo la registrazione: ${nv}/${f.occ} volte, restano ${num(f.w - nq)} ${u}.`;
  el.className = `hint s-${st}`; el.style.setProperty('--sb', `var(--${st === 'g' ? 'g' : st}-soft)`); el.style.setProperty('--st', `var(--${st === 'g' ? 'gt' : st + 't'})`);
  el.textContent = msg;
}
function openLog(o) {
  const f = FD[o.f]; if (!f) return;
  const ed = o.id ? S.log.find(e => e.id === o.id) : null;
  const d = ed ? ed.d : (o.d || ui.date), m = ed ? ed.m : (o.m || curMeal()), wk = wkey(pkey(d)), c = counters(wk)[f.id];
  const usePz = !!(f.pz && f.u === 'g' && ed && ed.n != null);
  SC = { type: 'log', f: f.id, id: ed ? ed.id : null, entry: ed, mode: usePz ? 'pz' : 'g' };
  const q0 = ed ? ed.q : (o.q != null ? +o.q : f.por[0]);
  const body = `<div class="hint s-${c.st}" style="margin:0 0 6px;--sb:var(--${c.st}-soft);--st:var(--${c.st === 'g' ? 'gt' : c.st + 't'})">Questa settimana: ${caption(f, c)}</div>
    ${f.pz && f.u === 'g' ? `<div class="seg"><button data-a="logmode" data-v="g" class="${usePz ? '' : 'on'}">Grammi</button><button data-a="logmode" data-v="pz" class="${usePz ? 'on' : ''}">N° ${f.pz.l === 'pz' ? 'pezzi' : f.pz.l}</button></div>` : ''}
    <div id="qblock" class="field" style="margin-top:6px">${usePz ? qtyBlockPz(f, ed.n, ed.q / ed.n) : qtyBlockG(f, q0, c.rem)}</div>
    <div class="two-f"><div class="field"><label for="lm">Pasto</label><select class="inp" id="lm">${MEALS.map(x => `<option value="${x.id}" ${x.id === m ? 'selected' : ''}>${x.nome}</option>`).join('')}</select></div>
    <div class="field"><label for="ld">Giorno</label><input class="inp" id="ld" type="date" value="${d}" style="font-size:16px"></div></div>
    <div id="lhint" class="hint"></div>${f.nota ? `<div class="meta" style="padding:10px 0 0">${esc(f.nota)}</div>` : ''}`;
  const foot = ed ? `<button class="btn danger" data-a="logdel">Elimina</button><button class="btn" data-a="logsave">Salva</button>` : `<button class="btn" data-a="logsave">Registra</button>`;
  openSheet(ed ? 'Modifica registrazione' : f.n, ed ? f.n : CATS[f.c], body, foot, { two: !!ed });
  setTimeout(updHint, 0);
}
function openRegMeal() {
  const date = pkey(ui.date), wk = wkey(date), di = dayIdx(date), mid = curMeal(), sl = planFor(wk)[di][mid];
  SC = { type: 'regmeal', wk, di, mid, items: sl.i };
  const rows = sl.i.map((it, ix) => { const f = FD[it.f], got = consumedIn(ui.date, mid, it.f);
    return `<div class="mrow"><input type="checkbox" data-ix="${ix}" ${got == null ? 'checked' : ''} aria-label="${esc(f.n)}"><div class="n">${esc(f.n)}<small>${got != null ? `già registrato ${qtxt(f, got)}` : `previsto ${qtxt(f, it.q)}`}</small></div><input class="inp" data-q="${ix}" type="text" inputmode="decimal" value="${num(it.q, 2)}" aria-label="Quantità ${esc(f.n)}"><span class="qunit" style="min-width:20px">${unit(f)}</span></div>`; }).join('');
  openSheet('Registra pasto', `${MD[mid].nome} · ${fmtLong(date)}`, `<p class="note" style="margin:6px 0">Spunta ciò che hai mangiato e correggi le quantità: ogni alimento viene registrato singolarmente.</p>${rows}`,
    `<button class="btn" data-a="regmealgo">Registra gli alimenti selezionati</button>`);
}
function openFood(fid, wk) {
  const f = FD[fid]; if (!f) return; wk = wk || curWeek(); const c = counters(wk)[fid];
  SC = { type: 'food', f: fid, wk };
  openSheet(f.n, `${CATS[f.c]} · ${statusLabel(f, c)}`, foodDetail(f, wk), `<button class="btn" data-a="openlog" data-f="${f.id}">${ic('plus')}Registra consumo</button>`);
}
function pickHTML(q) {
  const C = counters(curWeek()), list = FOODS.filter(f => !q || matches(f, q)).sort((a, b) => a.c - b.c || byPriority(C)(a, b));
  if (!list.length) return '<div class="empty">Nessun alimento trovato.</div>';
  let last = -1, h = '';
  list.forEach(f => { if (f.c !== last) { h += `<div class="sec-s" style="margin:12px 4px 6px">${CATS[f.c]}</div>`; last = f.c; } const c = C[f.id];
    h += `<button class="pick s-${c.st}" data-a="pickfood" data-f="${f.id}"><span class="dot"></span><span class="grow">${esc(f.n)}<small>${caption(f, c)}</small></span></button>`; });
  return h;
}
function openPick(title, sub, cb) {
  SC = { type: 'pick', cb };
  openSheet(title, sub, `<div class="search" style="margin:6px 0 4px">${ic('search', 'sm')}<input id="pq" type="search" placeholder="Cerca nel piano" autocomplete="off" autocapitalize="none" spellcheck="false"></div><div id="plist">${pickHTML('')}</div>`);
}
function slotPickBody() {
  const { wk, sd, srcDi, srcMid } = SC, plan = planFor(wk);
  return `<div class="chips">${GIORNI_BREVI.map((n, i) => `<button class="chip ${i === sd ? 'on' : ''}" data-a="slotday" data-di="${i}">${n}</button>`).join('')}</div>` +
    MEALS.map(m => { const sl = plan[sd][m.id], same = sd === srcDi && m.id === srcMid;
      return `<button class="pick" data-a="slotpick" data-m="${m.id}" ${same ? 'disabled' : ''}><span class="grow">${m.nome}<small>${sl.l ? 'Pasto libero' : sl.i.length ? sl.i.map(i => FD[i.f].n).join(', ') : 'Nessun alimento'}</small></span></button>`; }).join('');
}
function openSlotPicker(title, sub, wk, srcDi, srcMid, onPick) {
  SC = { type: 'slot', wk, sd: srcDi, srcDi, srcMid, onPick };
  openSheet(title, sub, slotPickBody());
}
function openPlanQty(o) {
  const f = FD[o.fid], plan = planFor(o.wk), it = o.mode === 'edit' ? plan[o.di][o.mid].i[o.ix] : null;
  SC = { type: 'planqty', ...o, f: f.id, mode: 'g' };
  openSheet(o.mode === 'edit' ? 'Cambia quantità' : 'Aggiungi al pasto', `${f.n} · ${GIORNI[o.di]}, ${MD[o.mid].nome}`,
    `<div class="field">${qtyBlockG(f, it ? it.q : f.por[0], 0)}</div><p class="note">Le quantità settimanali del piano non cambiano.</p>`,
    `<button class="btn" data-a="planqtygo">${o.mode === 'edit' ? 'Salva' : 'Aggiungi al pasto'}</button>`);
}
function openConfirm(title, msg, label, fn, danger = true) {
  SC = { type: 'confirm', fn };
  openSheet(title, '', `<p style="margin:8px 0;font-size:16px">${esc(msg)}</p>`, `<button class="btn ${danger ? 'danger' : ''}" data-a="confirmgo">${esc(label)}</button><button class="btn ghost" data-a="closesheet">Annulla</button>`);
}
function openStock(fid) {
  const f = FD[fid], cur = pantryAll()[fid];
  SC = { type: 'stock', f: fid, mode: 'g' };
  openSheet('In casa', f.n, `<p class="note" style="margin:6px 0 10px">Quanto ne hai adesso? Si scala da solo quando registri un consumo.</p><div class="field">${qtyBlockG(f, round1(cur), 0, [f.w])}</div>`,
    `<button class="btn" data-a="stockgo">Salva</button><button class="btn ghost" data-a="stockzero">Non ne ho</button>`);
}
function openSettings() {
  SC = { type: 'settings' };
  const lb = S.lastBackup ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(new Date(S.lastBackup)) : 'mai';
  const body = `<div class="sec-s">Orari dei pasti</div><p class="note" style="margin:0 4px 8px">L’app propone il pasto in base all’orario di inizio. Ordine crescente.</p>
    ${MEALS.map(m => `<div class="mrow"><div class="n">${m.nome}</div><input class="inp tin" type="time" data-t="${m.id}" value="${S.orari[m.id]}"></div>`).join('')}
    <div class="sec-s">Backup dei dati</div><p class="note" style="margin:0 4px 8px">I dati restano solo su questo iPhone. Ultimo backup: ${lb}. Esporta ogni tanto un file e salvalo in File o iCloud.</p>
    <div class="btns two" style="padding:0"><button class="btn sec2 sm" data-a="export">${ic('share', 'sm')}Esporta</button><button class="btn sec2 sm" data-a="import">Ripristina</button></div>
    <input type="file" id="rf" accept=".json,application/json" hidden>
    <div class="sec-s">Come leggere i colori</div>
    <div class="legend"><div><span class="dot" style="background:var(--g)"></span><span><b>Verde</b>: ancora disponibile nel piano settimanale.</span></div>
    <div><span class="dot" style="background:var(--o)"></span><span><b>Arancione</b>: almeno il 75% della quantità, oppure frequenza prevista raggiunta con quantità ancora da consumare.</span></div>
    <div><span class="dot" style="background:var(--r)"></span><span><b>Rosso</b>: quantità settimanale raggiunta o superata, oppure frequenza superata.</span></div></div>
    <div class="sec-s">Note sul PDF</div><ul class="nl">${NOTE_PDF.map(n => `<li><b>${esc(n[0])}</b>${esc(n[1])}</li>`).join('')}</ul>
    <div class="sec-s">Dati</div><button class="btn danger sm" data-a="wipe">Cancella tutti i dati</button>
    <p class="note" style="margin:14px 4px 0">MyDiet 1.0 · funziona offline, senza account né tracciamento.</p>`;
  openSheet('Impostazioni', 'MyDiet', body);
}

/* =====================  backup  ===================== */
async function exportBackup() {
  const data = JSON.stringify({ app: 'MyDiet', version: 1, exported: new Date().toISOString(), state: S }, null, 1);
  const name = `MyDiet-backup-${todayKey()}.json`;
  const mark = () => { S.lastBackup = Date.now(); save(); toast('Backup esportato'); };
  try {
    const file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Backup MyDiet' }); mark(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); mark();
}
function importBackup(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result), st = j && j.state ? j.state : j;
      if (!st || !Array.isArray(st.log)) throw new Error('formato');
      const ns = sanitize(st);
      openConfirm('Ripristinare il backup?', `Contiene ${ns.log.length} registrazioni. I dati attuali (${S.log.length} registrazioni) verranno sostituiti.`, 'Ripristina', () => { commit(() => { S = ns; }, 'Backup ripristinato'); closeSheet(); }, false);
    } catch (e) { toast('File non valido: non è un backup di MyDiet'); }
  };
  r.readAsText(file);
}

/* =====================  azioni  ===================== */
const stepFor = f => (f.u === 'pz' ? 1 : Math.min(...f.por) <= 30 ? 5 : 10);
const fmtIn = n => String(round1(n)).replace('.', ',');
function addEntries(list) { list.forEach(x => S.log.push({ id: uid(), d: x.d, m: x.m, f: x.f, q: x.q, n: x.n, ts: Date.now() })); }
function doSwapDays(wk, a, b) { const p = editPlan(wk); [p[a], p[b]] = [p[b], p[a]]; tidyPlan(wk); }
function doSwapMeals(wk, da, ma, db, mb) { const p = editPlan(wk), t = p[da][ma]; p[da][ma] = p[db][mb]; p[db][mb] = t; tidyPlan(wk); }
function doMove(wk, da, ma, ix, db, mb) { const p = editPlan(wk), [it] = p[da][ma].i.splice(ix, 1); p[db][mb].i.push(it); p[db][mb].l = 0; tidyPlan(wk); }

const A = {
  tab(el) { const t = el.dataset.t; closeSheet(true); if (ui.tab === t) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; } ui.tab = t; render(); window.scrollTo(0, 0); },
  meal(el) { ui.meal = el.dataset.m; render(); },
  dprev() { ui.meal = curMeal(); ui.date = dkey(addDays(pkey(ui.date), -1)); render(); },
  dnext() { ui.meal = curMeal(); ui.date = dkey(addDays(pkey(ui.date), 1)); render(); },
  dtoday() { ui.date = todayKey(); ui.meal = null; render(); },
  hint() { try { localStorage.setItem('mydiet.hint', '1'); } catch (e) { /* nulla */ } render(); },
  settings: openSettings,
  closesheet() { const t = SC && SC.type; closeSheet(); if (t === 'settings') render(); },
  undo() { if (!undoSnap) return; S = JSON.parse(undoSnap); undoSnap = null; save(); render(); $('#toast').classList.remove('show'); },
  confirmgo() { const fn = SC && SC.fn; if (fn) fn(); },
  /* registrazione */
  openlog(el) { const d = el.dataset; openLog({ f: d.f, q: d.q, m: d.m, d: d.d }); },
  editlog(el) { openLog({ f: S.log.find(e => e.id === el.dataset.id)?.f, id: el.dataset.id }); },
  quick(el) { const d = el.dataset, f = FD[d.f]; commit(() => addEntries([{ d: d.d, m: d.m, f: f.id, q: +d.q }]), `Registrato: ${f.n} ${qtxt(f, +d.q)}`); },
  regmeal: openRegMeal,
  regmealgo() {
    const { items, mid } = SC, out = [];
    $$('#layer input[type=checkbox]').forEach(cb => { if (!cb.checked) return; const ix = +cb.dataset.ix, q = parseN($(`#layer input[data-q="${ix}"]`).value); if (q > 0) out.push({ d: ui.date, m: mid, f: items[ix].f, q }); });
    if (!out.length) { toast('Seleziona almeno un alimento'); return; }
    closeSheet(true); commit(() => addEntries(out), out.length === 1 ? `Registrato: ${FD[out[0].f].n}` : `Registrati ${out.length} alimenti`);
  },
  pickany() { openPick('Registra alimento', 'Scegli un alimento del piano', fid => openLog({ f: fid })); },
  pickfood(el) { const cb = SC && SC.cb; if (cb) cb(el.dataset.f); },
  step(el) { const f = FD[SC.f], i = $('#lq'), v = parseN(i.value) || 0; i.value = fmtIn(Math.max(0, v + (+el.dataset.dir) * stepFor(f))); updHint(); },
  stepn(el) { const i = $('#lpn'), v = parseN(i.value) || 0; i.value = fmtIn(Math.max(0, v + (+el.dataset.dir))); updHint(); },
  setq(el) { $('#lq').value = fmtIn(+el.dataset.v); updHint(); },
  logmode(el) {
    const f = FD[SC.f], to = el.dataset.v; if (to === SC.mode) return;
    const cur = readLogQty(); SC.mode = to;
    $('#qblock').innerHTML = to === 'pz' ? qtyBlockPz(f, 1, f.pz.g) : qtyBlockG(f, isFinite(cur.q) && cur.q > 0 ? cur.q : f.por[0], counters(wkey(pkey($('#ld').value || ui.date)))[f.id].rem);
    $$('#layer .seg button').forEach(b => b.classList.toggle('on', b.dataset.v === to)); updHint();
  },
  logsave() {
    const f = FD[SC.f], { q, n } = readLogQty(), d = $('#ld').value, m = $('#lm').value, id = SC.id, pzMode = SC.mode === 'pz';
    if (!(q > 0) || !isFinite(q)) { toast('Inserisci una quantità valida'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('Scegli un giorno valido'); return; }
    closeSheet(true);
    commit(() => {
      if (id) { const e = S.log.find(x => x.id === id); if (e) { e.q = q; e.m = m; e.d = d; if (pzMode && n > 0) e.n = n; else delete e.n; } }
      else addEntries([{ d, m, f: f.id, q, n: pzMode && n > 0 ? n : undefined }]);
    }, id ? 'Registrazione modificata' : `Registrato: ${f.n} ${qtxt(f, q)}`);
  },
  logdel() { const id = SC.id, f = FD[SC.f]; closeSheet(true); commit(() => { S.log = S.log.filter(e => e.id !== id); }, `Eliminato: ${f.n}`); },
  /* alimenti */
  openfood(el) { openFood(el.dataset.f, el.dataset.w); },
  histall(el) { ui.hist[el.dataset.f] = true; if (SC && SC.type === 'food') setBody(foodDetail(FD[SC.f], SC.wk)); else render(); },
  cat(el) { ui.cat = +el.dataset.c; render(); },
  /* settimana */
  wprev() { ui.wOff--; render(); }, wnext() { ui.wOff++; render(); }, wnow() { ui.wOff = 0; render(); },
  wview(el) { ui.wView = el.dataset.v; if (ui.wView !== 'mio') ui.edit = false; render(); },
  editmode() { ui.edit = !ui.edit; render(); },
  toggleday(el) { ui.open[el.dataset.k] = el.dataset.o !== '1'; render(); },
  swapday(el) {
    const di = +el.dataset.di, wk = shownWeek(), plan = planFor(wk); SC = { type: 'swapday', wk, di };
    openSheet('Scambia giornata', `${GIORNI[di]} con…`, DAYS_ALL().filter(x => x !== di).map(x => `<button class="pick" data-a="doswapday" data-dj="${x}"><span class="grow">${GIORNI[x]} ${fmtShort(addDays(pkey(wk), x))}<small>${MEALS.reduce((a, m) => a + plan[x][m.id].i.length, 0)} alimenti</small></span></button>`).join(''));
  },
  doswapday(el) { const { wk, di } = SC, dj = +el.dataset.dj; closeSheet(true); commit(() => doSwapDays(wk, di, dj), `${GIORNI[di]} ↔ ${GIORNI[dj]}`); },
  swapmeal(el) {
    const di = +el.dataset.di, m = el.dataset.m, wk = shownWeek();
    openSlotPicker('Scambia pasto', `${GIORNI[di]} · ${MD[m].nome} con…`, wk, di, m, (dj, mj) => { closeSheet(true); commit(() => doSwapMeals(wk, di, m, dj, mj), 'Pasti scambiati'); });
  },
  slotday(el) { SC.sd = +el.dataset.di; setBody(slotPickBody()); },
  slotpick(el) { SC.onPick(SC.sd, el.dataset.m); },
  additem(el) {
    const di = +el.dataset.di, mid = el.dataset.m, wk = shownWeek();
    openPick('Aggiungi alimento', `${GIORNI[di]} · ${MD[mid].nome}`, fid => openPlanQty({ wk, di, mid, fid, mode: 'add' }));
  },
  itemact(el) {
    const di = +el.dataset.di, mid = el.dataset.m, ix = +el.dataset.ix, wk = shownWeek(), it = planFor(wk)[di][mid].i[ix], f = FD[it.f];
    SC = { type: 'itemact', wk, di, mid, ix };
    openSheet(f.n, `${qtxt(f, it.q)} · ${GIORNI[di]}, ${MD[mid].nome}`,
      `<button class="pick" data-a="itemmove"><span class="grow">Sposta in un altro pasto<small>Scegli giorno e pasto di destinazione</small></span></button>
       <button class="pick" data-a="itemqty"><span class="grow">Cambia quantità<small>Solo nel piano, non tocca i consumi</small></span></button>
       <button class="pick" data-a="itemdel" style="color:var(--rt)"><span class="grow">Togli dal pasto</span></button>`);
  },
  itemmove() {
    const { wk, di, mid, ix } = SC, f = FD[planFor(wk)[di][mid].i[ix].f];
    openSlotPicker('Sposta alimento', `${f.n} in…`, wk, di, mid, (dj, mj) => { closeSheet(true); commit(() => doMove(wk, di, mid, ix, dj, mj), `${f.n} spostato`); });
  },
  itemqty() { const { wk, di, mid, ix } = SC; openPlanQty({ wk, di, mid, ix, fid: planFor(wk)[di][mid].i[ix].f, mode: 'edit' }); },
  itemdel() { const { wk, di, mid, ix } = SC; closeSheet(true); commit(() => { editPlan(wk)[di][mid].i.splice(ix, 1); tidyPlan(wk); }, 'Alimento tolto dal pasto'); },
  planqtygo() {
    const o = SC, q = parseN($('#lq').value); if (!(q > 0)) { toast('Inserisci una quantità valida'); return; }
    closeSheet(true);
    commit(() => { const p = editPlan(o.wk); if (o.mode === 'edit') p[o.di][o.mid].i[o.ix].q = q; else { p[o.di][o.mid].i.push({ f: o.fid, q, x: 1 }); p[o.di][o.mid].l = 0; } tidyPlan(o.wk); }, o.mode === 'edit' ? 'Quantità aggiornata' : `${FD[o.fid].n} aggiunto al pasto`);
  },
  resetplan() { const wk = shownWeek(); openConfirm('Ripristinare il piano?', 'Il piano di questa settimana tornerà quello del nutrizionista. I consumi registrati non vengono toccati.', 'Ripristina', () => { closeSheet(true); commit(() => { delete S.plans[wk]; }, 'Piano originale ripristinato'); }, false); },
  /* spesa */
  sview(el) { ui.sView = el.dataset.v; render(); window.scrollTo(0, 0); },
  speriod(el) { ui.sPeriod = el.dataset.v; render(); },
  covered() { ui.showCovered = !ui.showCovered; render(); },
  bought(el) { const id = el.dataset.f, r = shopRows().find(x => x.f.id === id), cur = pantryAll()[id]; commit(() => { S.pantry[id] = { q: round1(cur + r.buy), t: Date.now() }; }, `${FD[id].n}: acquistato`); },
  stock(el) { openStock(el.dataset.f); },
  stockgo() { const id = SC.f, q = parseN($('#lq').value); closeSheet(true); commit(() => { if (q > 0) S.pantry[id] = { q, t: Date.now() }; else delete S.pantry[id]; }, 'In casa aggiornato'); },
  stockzero() { const id = SC.f; closeSheet(true); commit(() => { delete S.pantry[id]; }, 'In casa aggiornato'); },
  clearpantry() { openConfirm('Svuotare la dispensa?', 'Tutte le quantità “in casa” verranno azzerate.', 'Svuota', () => { closeSheet(true); commit(() => { S.pantry = {}; }, 'Dispensa svuotata'); }); },
  async sharelist() {
    const rows = shopRows().filter(r => r.buy > EPS); let t = 'Lista della spesa MyDiet\n';
    CATS.forEach((cn, ci) => { const l = rows.filter(r => r.f.c === ci); if (l.length) t += `\n${cn}\n` + l.map(r => `- ${r.f.n}: ${qtxt(r.f, round1(r.buy))}`).join('\n') + '\n'; });
    try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(t); toast('Lista copiata'); } catch (e) { toast('Impossibile condividere la lista'); }
  },
  /* impostazioni */
  export: exportBackup,
  import() { const i = $('#rf'); if (i) i.click(); },
  wipe() { openConfirm('Cancellare tutto?', 'Registrazioni, modifiche al piano e dispensa verranno eliminate da questo iPhone. Esporta prima un backup se vuoi conservarli.', 'Cancella tutto', () => { closeSheet(true); commit(() => { S = defaultState(); ui.q = ''; }, 'Dati cancellati'); }); }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = A[el.dataset.a]; if (fn) { try { fn(el, e); } catch (err) { console.error(err); toast('Errore imprevisto'); } }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { ui.q = t.value; $('#res').innerHTML = resultsHTML(); }
  else if (t.id === 'pq') { $('#plist').innerHTML = pickHTML(t.value); }
  else if (t.id === 'lq' || t.id === 'lpn' || t.id === 'lpw') updHint();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'ld' || t.id === 'lm') updHint();
  else if (t.dataset && t.dataset.t && t.type === 'time') {
    const n = { ...S.orari, [t.dataset.t]: t.value }, ok = t.value && MEALS.every((m, i) => i === 0 || toMin(n[m.id]) > toMin(n[MEALS[i - 1].id]));
    if (!ok) { toast('Gli orari devono essere in ordine crescente'); t.value = S.orari[t.dataset.t]; return; }
    S.orari = n; save(); toast('Orari salvati');
  } else if (t.id === 'rf' && t.files && t.files[0]) { importBackup(t.files[0]); t.value = ''; }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'q') e.target.blur(); });

/* =====================  avvio  ===================== */
const VIEWS = { oggi: viewOggi, alimenti: viewAlimenti, settimana: viewSettimana, spesa: viewSpesa };
function drawTabs() {
  $('#tabbar').innerHTML = '<div class="tabs">' + [['oggi', 'Oggi'], ['alimenti', 'Alimenti'], ['settimana', 'Settimana'], ['spesa', 'Spesa']]
    .map(([k, l]) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-a="tab" data-t="${k}" aria-current="${ui.tab === k ? 'page' : 'false'}">${ic(k)}<span>${l}</span></button>`).join('') + '</div>';
}
function render() { const y = window.scrollY; $('#view').innerHTML = VIEWS[ui.tab](); drawTabs(); window.scrollTo(0, y); }

let hiddenAt = 0, lastAuto = '';
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (Date.now() - hiddenAt > 15 * 60 * 1000) { ui.meal = null; ui.date = todayKey(); ui.wOff = 0; }
  memo = {}; if (!SC) render();
});
setInterval(() => {
  if (document.hidden || SC || ui.tab !== 'oggi' || ui.meal || ui.date !== todayKey()) return;
  const k = autoMeal() + todayKey(); if (k !== lastAuto) { lastAuto = k; render(); }
}, 30000);
window.addEventListener('error', () => toast('Errore imprevisto'));

lastAuto = autoMeal() + todayKey();
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__mydiet = { get S() { return S; }, ui, counters, FOODS, A };
})();
