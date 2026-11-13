const CSS = `
:root{--bg:#f7f6f2;--card:#fff;--tx:#1f1e1c;--mut:#6b6a66;--bd:#e3e1da;--ac:#185fa5;--acbg:#e6f1fb}
@media(prefers-color-scheme:dark){:root{--bg:#1b1b1a;--card:#262625;--tx:#eceae4;--mut:#a3a19a;--bd:#3a3a38;--ac:#85b7eb;--acbg:#0c447c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
a{color:var(--ac);text-decoration:none}main{max-width:980px;margin:0 auto;padding:12px 14px 48px}
nav{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0 14px}
nav a{padding:6px 12px;border:1px solid var(--bd);border-radius:8px;color:var(--mut);font-size:14px}
nav a.on{background:var(--acbg);color:var(--ac);border-color:transparent;font-weight:500}
nav .brand{border:0;color:var(--tx);font-weight:500;padding-left:0}
h1{font-size:20px;font-weight:500;margin:6px 0}h2{font-size:15px;font-weight:500;margin:22px 0 8px;color:var(--mut)}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin-bottom:12px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
@media(min-width:700px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.kpi{background:var(--bg);border-radius:8px;padding:9px 11px}.kpi small{display:block;color:var(--mut);font-size:12px}.kpi b{font-size:18px;font-weight:500}
.sub{color:var(--mut);font-size:13px}.row{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap}
th,td{padding:6px 8px;text-align:right;border-top:1px solid var(--bd)}th:first-child,td:first-child{text-align:left}
th{color:var(--mut);font-weight:400;border-top:0;font-size:12px}td.n{color:var(--mut)}
.tag{display:inline-block;font-size:11px;padding:1px 8px;border-radius:6px;background:var(--acbg);color:var(--ac);margin-right:6px}
.news p{margin:3px 0}.news .d{color:var(--mut);font-size:12px}
.muted{color:var(--mut)}label.chk{display:inline-flex;gap:6px;align-items:center;margin:0 12px 6px 0;font-size:14px}
button{font:inherit;padding:6px 14px;border:1px solid var(--bd);border-radius:8px;background:var(--card);color:var(--tx);cursor:pointer}
`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 1) => (v === null || v === undefined || v === '' ? '–' : Number(v).toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (v, d = 1) => (v === null || v === undefined ? '–' : num(v, d) + ' %');
const dt = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('.') : '–');

function layout(title, active, body, status = 200) {
  const link = (href, label, key) => `<a href="${href}" class="${active === key ? 'on' : ''}">${label}</a>`;
  return new Response(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Real Estate</title><style>${CSS}</style></head><body><main>
<nav><a class="brand" href="/">Real Estate</a>${link('/', 'Übersicht', 'home')}${link('/vergleich', 'Vergleich', 'cmp')}${link('/news', 'News', 'news')}</nav>${body}</main></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=60' } },
  );
}
const json = (o, s = 200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const notFound = (m = 'Nicht gefunden') => layout('404', '', `<h1>${esc(m)}</h1><p><a href="/">Zur Übersicht</a></p>`, 404);
const all = async (env, sql, ...p) => (await env.DB.prepare(sql).bind(...p).all()).results ?? [];
const first = async (env, sql, ...p) => (await env.DB.prepare(sql).bind(...p).first()) ?? null;

const CMP_ROWS = [
  ['Börse / Ticker', (r) => esc([r.exchange, r.ticker].filter(Boolean).join(' · ') || '–')],
  ['Letzter FY', (r) => esc(r.fy_label ?? '–')],
  ['Kurs (CHF)', (r) => num(r.price, 2)],
  ['Marktkapitalisierung (Mio.)', (r) => num(r.market_cap, 0)],
  ['Portfoliowert (Mio.)', (r) => num(r.portfolio_value, 1)],
  ['Mietertrag / NLE (Mio.)', (r) => num(r.rental_income, 1)],
  ['Reingewinn (Mio.)', (r) => num(r.net_profit, 1)],
  ['EPRA-/Gewinn ohne Bewertung (Mio.)', (r) => num(r.epra_profit, 1)],
  ['LTV', (r) => pct(r.ltv_pct)],
  ['Ø Zinssatz', (r) => pct(r.avg_interest_rate_pct, 2)],
  ['Eigenkapitalquote', (r) => pct(r.equity_ratio_pct)],
  ['Leerstand', (r) => pct(r.vacancy_rate_pct)],
  ['Nettorendite (EPRA)', (r) => pct(r.net_yield_epra_pct)],
  ['WALT (Jahre)', (r) => num(r.walt_years, 1)],
  ['NAV je Aktie (CHF)', (r) => num(r.epra_nav_ps, 2)],
  ['Dividende je Aktie (CHF)', (r) => num(r.dividend_ps, 2)],
  ['Eigenkapital ohne Minderheiten (Mio.)', (r) => num(r.equity, 1)],
  ['Anzahl Aktien (Mio.)', (r) => num(r.shares_mio, 3)],
  ['NAV je Aktie berechnet (EK / Aktien, CHF)', (r) => num(r.nav_ps_calc, 2)],
  ['Agio / Disagio auf NAV', (r) => pct(r.agio_pct)],
  ['Kurs / NAV', (r) => num(r.price_to_nav, 2)],
  ['Ausschüttungsrendite', (r) => pct(r.dividend_yield_pct, 2)],
];

const FIN_ROWS = [
  ['Mietertrag / NLE', 'rental_income', 1], ['Annualisierter Mietertrag', 'annualised_rent', 1], ['EBITDA', 'ebitda', 1], ['EBIT', 'ebit', 1],
  ['Reingewinn', 'net_profit', 1], ['EPRA-/Gewinn ohne Bewertung', 'epra_profit', 1], ['EPS (CHF)', 'eps', 2], ['EPS ohne Bewertung (CHF)', 'epra_eps', 2],
  ['Neubewertung', 'revaluation_gain', 1], ['Leerstand %', 'vacancy_rate_pct', 1], ['Nettorendite EPRA %', 'net_yield_epra_pct', 1], ['WALT (Jahre)', 'walt_years', 1],
  ['Portfoliowert', 'portfolio_value', 1], ['Bilanzsumme', 'total_assets', 1], ['Eigenkapital', 'equity', 1], ['EK-Quote %', 'equity_ratio_pct', 1],
  ['Hypotheken', 'mortgages', 1], ['LTV %', 'ltv_pct', 1], ['Ø Zinssatz %', 'avg_interest_rate_pct', 2], ['NAV je Aktie (CHF)', 'epra_nav_ps', 2], ['Dividende (CHF)', 'dividend_ps', 2],
];

async function home(env) {
  const rows = await all(env, `SELECT c.id,c.short_name,c.ticker,c.status,c.focus,v.fy_label,v.portfolio_value,v.ltv_pct,v.avg_interest_rate_pct,v.price_to_nav,v.agio_pct,v.dividend_yield_pct FROM company c LEFT JOIN v_comparison v ON v.short_name=c.short_name ORDER BY (c.status='active') DESC, c.short_name`);
  const body = rows
    .map((r) => `<tr><td><a href="/profil/${r.id}">${esc(r.short_name)}</a><div class="sub">${esc(r.ticker ?? '')}${r.status !== 'active' ? ' · <span class="muted">noch zu recherchieren</span>' : ''}</div></td><td>${num(r.portfolio_value, 0)}</td><td>${pct(r.ltv_pct)}</td><td>${pct(r.avg_interest_rate_pct, 2)}</td><td>${num(r.price_to_nav, 2)}</td><td>${pct(r.agio_pct)}</td><td>${pct(r.dividend_yield_pct, 2)}</td></tr>`)
    .join('');
  const latest = await all(env, `SELECT n.published_date d,n.title t,n.category c,n.company_id i,c.short_name s FROM news n JOIN company c ON c.id=n.company_id ORDER BY n.published_date DESC LIMIT 6`);
  return layout('Übersicht', 'home', `<h1>Schweizer Immobiliengesellschaften</h1><p class="sub">${rows.length} Gesellschaften, ${rows.filter((r) => r.status === 'active').length} mit Daten</p>
<div class="card scroll"><table><tr><th>Gesellschaft</th><th>Portfolio Mio.</th><th>LTV</th><th>Zins</th><th>P/NAV</th><th>Agio</th><th>Rendite</th></tr>${body}</table></div>
<h2>Neueste News</h2><div class="card news">${latest.map((x) => `<p><span class="d">${dt(x.d)}</span> <span class="tag">${esc(x.c)}</span><a href="/profil/${x.i}">${esc(x.s)}</a>: ${esc(x.t)}</p>`).join('')}</div>`);
}

async function profile(env, id) {
  const c = await first(env, `SELECT * FROM company WHERE id=?`, id);
  if (!c) return notFound('Gesellschaft nicht gefunden');
  const p = await first(env, `SELECT * FROM v_company_profile WHERE id=?`, id);
  const fins = (await all(env, `SELECT * FROM financials WHERE company_id=? ORDER BY period_end DESC LIMIT 6`, id));
  const mk = await first(env, `SELECT * FROM v_latest_market WHERE company_id=?`, id);
  const news = await all(env, `SELECT * FROM news WHERE company_id=? ORDER BY published_date DESC LIMIT 15`, id);
  const people = await all(env, `SELECT * FROM people WHERE company_id=? ORDER BY (until IS NOT NULL), role`, id);
  const sh = await all(env, `SELECT * FROM shareholders WHERE company_id=? ORDER BY pct DESC`, id);
  const lp = fins[0];
  const ag = await first(env, `SELECT * FROM v_agio WHERE company_id=?`, id);
  const kpi = (l, v) => `<div class="kpi"><small>${l}</small><b>${v}</b></div>`;
  const finTable = fins.length
    ? `<div class="card scroll"><table><tr><th></th>${fins.map((f) => `<th>${esc(f.period_label)}</th>`).join('')}</tr>${FIN_ROWS.filter(([, k]) => fins.some((f) => f[k] !== null)).map(([l, k, d]) => `<tr><td>${l}</td>${fins.map((f) => `<td>${num(f[k], d)}</td>`).join('')}</tr>`).join('')}</table><p class="sub">Beträge in Mio. CHF, sofern nicht anders angegeben.</p>${fins.some((f) => f.notes) ? `<details><summary class="sub">Notizen zu den Zahlen</summary>${fins.filter((f) => f.notes).map((f) => `<p class="sub"><b>${esc(f.period_label)}:</b> ${esc(f.notes)}${f.source_url ? ` <a href="${esc(f.source_url)}">Quelle</a>` : ''}</p>`).join('')}</details>` : ''}</div>`
    : `<div class="card muted">Noch keine Finanzdaten erfasst.</div>`;
  const cur = people.filter((x) => !x.until), past = people.filter((x) => x.until);
  return layout(c.short_name, '', `<div class="card"><div class="row"><div><h1>${esc(c.short_name)}</h1><div class="sub">${esc([c.ticker, c.exchange, c.hq].filter(Boolean).join(' · '))}</div></div>
<div style="text-align:right"><b style="font-size:18px;font-weight:500">${mk ? 'CHF ' + num(mk.price, 2) : '–'}</b><div class="sub">${mk ? 'Kurs ' + dt(mk.as_of) : ''}</div></div></div>
<p class="sub" style="margin:8px 0 0">${esc(c.description ?? c.focus ?? '')}</p>
<div class="grid" style="margin-top:12px">${kpi('Portfoliowert', lp ? num(lp.portfolio_value, 1) + ' Mio.' : '–')}${kpi('LTV', lp ? pct(p?.latest_ltv ?? lp.ltv_pct) : '–')}${kpi('Ø Zinssatz', p?.fy_interest != null ? pct(p.fy_interest, 2) : '–')}${kpi('Leerstand', lp ? pct(lp.vacancy_rate_pct) : '–')}${kpi('Agio auf NAV', ag?.agio_pct != null ? pct(ag.agio_pct) : '–')}</div>
<p class="sub" style="margin:8px 0 0">Stand: ${lp ? esc(lp.period_label) : '–'}${mk && mk.market_cap ? ' · Marktkap. ' + num(mk.market_cap, 0) + ' Mio.' : ''}${mk && mk.target_price ? ' · Kursziel ' + num(mk.target_price, 0) : ''}${ag?.nav_ps_calc != null ? ` · NAV/Aktie ${num(ag.nav_ps_calc, 2)} (EK ${num(ag.equity_mio, 1)} Mio. / ${num(ag.shares_mio, 3)} Mio. Aktien)` : ''}</p></div>
<h2>Kennzahlen</h2>${finTable}
<h2>News</h2><div class="card news">${news.length ? news.map((x) => `<p><span class="d">${dt(x.published_date)}</span> <span class="tag">${esc(x.category ?? '')}</span><b>${esc(x.title)}</b></p><p class="sub">${esc(x.summary ?? '')}${x.url ? ` <a href="${esc(x.url)}">Quelle</a>` : ''}</p>`).join('<hr style="border:0;border-top:1px solid var(--bd)">') : '<span class="muted">Keine News erfasst.</span>'}</div>
<h2>Organe</h2><div class="card">${cur.map((x) => `<p style="margin:3px 0">${esc(x.name)} <span class="sub">· ${esc(x.role)}${x.since ? ' seit ' + esc(String(x.since).slice(0, 10)) : ''}</span></p>`).join('') || '<span class="muted">Keine Angaben.</span>'}${past.length ? `<details><summary class="sub">Ehemalige</summary>${past.map((x) => `<p class="sub" style="margin:3px 0">${esc(x.name)} · ${esc(x.role)} bis ${esc(String(x.until).slice(0, 10))}</p>`).join('')}</details>` : ''}</div>
${sh.length ? `<h2>Aktionäre</h2><div class="card scroll"><table>${sh.map((x) => `<tr><td>${esc(x.holder)}</td><td>${num(x.pct, 2)} %</td></tr>`).join('')}</table><p class="sub">${esc(sh[0].source ?? '')}</p></div>` : ''}
<p class="sub"><a href="/api/company/${id}">JSON</a> · <a href="/vergleich?ids=${id}">Im Vergleich</a></p>`);
}

async function compareData(env, ids) {
  let rows = await all(env, `SELECT c.id,v.* FROM v_comparison v JOIN company c ON c.short_name=v.short_name ORDER BY c.short_name`);
  rows = rows.filter((r) => r.fy_label !== null);
  return { rows, picked: ids.length ? rows.filter((r) => ids.includes(r.id)) : rows };
}
const parseIds = (u) => (u.searchParams.get('ids') ?? '').split(',').map((x) => parseInt(x, 10)).filter(Number.isFinite);

async function compare(env, url) {
  const { rows, picked } = await compareData(env, parseIds(url));
  const sel = parseIds(url);
  const head = picked.map((r) => `<th><a href="/profil/${r.id}">${esc(r.short_name)}</a></th>`).join('');
  const csv = url.searchParams.get('format') === 'csv';
  if (csv) {
    const strip = (s) => String(s).replace(/&amp;/g, '&');
    const lines = [['Kennzahl', ...picked.map((r) => r.short_name)], ...CMP_ROWS.map(([l, f]) => [l, ...picked.map((r) => strip(f(r)))])];
    return new Response(lines.map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="vergleich.csv"' } });
  }
  return layout('Vergleich', 'cmp', `<h1>Vergleich</h1>
<form method="get" class="card"><div>${rows.map((r) => `<label class="chk"><input type="checkbox" name="c" value="${r.id}" ${!sel.length || sel.includes(r.id) ? 'checked' : ''}> ${esc(r.short_name)}</label>`).join('')}</div>
<input type="hidden" name="ids" id="ids"><button type="submit">Anwenden</button> <a class="sub" href="/vergleich?${new URLSearchParams({ ids: picked.map((r) => r.id).join(','), format: 'csv' })}">CSV</a></form>
<script>document.currentScript.previousElementSibling.addEventListener('submit',e=>{e.target.ids.value=[...e.target.querySelectorAll('[name=c]:checked')].map(x=>x.value).join(',');e.target.querySelectorAll('[name=c]').forEach(x=>x.disabled=true)})</script>
<div class="card scroll"><table><tr><th>Kennzahl</th>${head}</tr>${CMP_ROWS.map(([l, f]) => `<tr><td>${l}</td>${picked.map((r) => `<td>${f(r)}</td>`).join('')}</tr>`).join('')}</table></div>
<p class="sub">Basis: jeweils letzter Geschäftsjahresabschluss und letzter erfasster Kurs. Kennzahlen sind je Gesellschaft nicht immer identisch definiert (siehe Notizen im Profil).</p>`);
}

async function newsPage(env, url) {
  const cat = url.searchParams.get('cat');
  const cats = (await all(env, `SELECT DISTINCT category c FROM news WHERE category IS NOT NULL ORDER BY 1`)).map((x) => x.c);
  const rows = await all(env, `SELECT n.*,c.short_name FROM news n JOIN company c ON c.id=n.company_id ${cat ? 'WHERE n.category=?' : ''} ORDER BY n.published_date DESC LIMIT 100`, ...(cat ? [cat] : []));
  return layout('News', 'news', `<h1>News</h1><nav><a href="/news" class="${!cat ? 'on' : ''}">Alle</a>${cats.map((c) => `<a href="/news?cat=${encodeURIComponent(c)}" class="${cat === c ? 'on' : ''}">${esc(c)}</a>`).join('')}</nav>
<div class="card news">${rows.map((x) => `<p><span class="d">${dt(x.published_date)}</span> <span class="tag">${esc(x.category ?? '')}</span><a href="/profil/${x.company_id}">${esc(x.short_name)}</a>: <b>${esc(x.title)}</b></p><p class="sub">${esc(x.summary ?? '')}${x.url ? ` <a href="${esc(x.url)}">Quelle</a>` : ''}</p>`).join('<hr style="border:0;border-top:1px solid var(--bd)">') || '<span class="muted">Keine News.</span>'}</div>`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
      if (path === '/') return await home(env);
      let m;
      if ((m = path.match(/^\/profil\/(\d+)$/))) return await profile(env, parseInt(m[1], 10));
      if (path === '/vergleich') return await compare(env, url);
      if (path === '/news') return await newsPage(env, url);
      if (path === '/api/companies') return json(await all(env, `SELECT * FROM v_company_profile ORDER BY short_name`));
      if ((m = path.match(/^\/api\/company\/(\d+)$/))) {
        const id = parseInt(m[1], 10);
        const c = await first(env, `SELECT * FROM v_company_profile WHERE id=?`, id);
        if (!c) return json({ error: 'not found' }, 404);
        return json({ profile: c, financials: await all(env, `SELECT * FROM financials WHERE company_id=? ORDER BY period_end DESC`, id), market: await all(env, `SELECT * FROM market_data WHERE company_id=? ORDER BY as_of DESC`, id), news: await all(env, `SELECT * FROM news WHERE company_id=? ORDER BY published_date DESC`, id), people: await all(env, `SELECT * FROM people WHERE company_id=?`, id), shareholders: await all(env, `SELECT * FROM shareholders WHERE company_id=? ORDER BY pct DESC`, id) });
      }
      if (path === '/api/compare') return json((await compareData(env, parseIds(url))).picked);
      return notFound();
    } catch (e) {
      return new Response('Fehler: ' + e.message, { status: 500 });
    }
  },
};
