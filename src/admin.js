const ADMIN_URL = 'https://cgshssdjgzzuprlwnabl.supabase.co/functions/v1/hradnik-admin'
const adminState = { user: null, places: [], search: '', includeDeleted: false }
const adminToken = () => localStorage.getItem('hradnik_session') || ''

function adminHeaders() {
  const token = adminToken()
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

async function adminApi(action, body = {}) {
  const res = await fetch(ADMIN_URL, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ action, ...body }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Admin požadavek se nepodařilo dokončit.')
  return data
}

const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
const fmtJson = value => value && typeof value === 'object' ? JSON.stringify(value, null, 2) : ''
const inputValue = (value, key) => {
  if (key === 'latitude' || key === 'longitude') return value ?? ''
  return value == null ? '' : value
}

function ensureStyle() {
  if (document.getElementById('hradnik-admin-style')) return
  const style = document.createElement('style')
  style.id = 'hradnik-admin-style'
  style.textContent = `
    .hradnik-admin-btn{background:#111827!important;color:#fff!important;border:1px solid #ffffff55!important}
    .hradnik-admin-backdrop{position:fixed;inset:0;z-index:20000;background:#11131db8;display:flex;align-items:center;justify-content:center;padding:14px}
    .hradnik-admin-panel{width:min(1180px,100%);max-height:96dvh;overflow:hidden;background:#f6f7fb;border-radius:24px;box-shadow:0 26px 100px #0007;display:flex;flex-direction:column}
    .hradnik-admin-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;background:#fff;border-bottom:1px solid #e3e6ee}
    .hradnik-admin-title{font-size:20px;font-weight:900;margin:0}.hradnik-admin-sub{font-size:12px;color:#737b8b;margin-top:2px}
    .hradnik-admin-head button{min-height:42px}
    .hradnik-admin-toolbar{padding:12px 16px;background:#fff;border-bottom:1px solid #e3e6ee;display:flex;gap:8px;flex-wrap:wrap}
    .hradnik-admin-toolbar input{flex:1;min-width:220px;padding:11px 13px;border:1px solid #d9dde7;border-radius:12px;outline:0}
    .hradnik-admin-toolbar button{min-height:42px}
    .hradnik-admin-body{overflow:auto;padding:14px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(360px,.9fr);gap:14px}
    .hradnik-admin-card{background:#fff;border:1px solid #e3e6ee;border-radius:18px;padding:14px;box-shadow:0 5px 22px #14192708}
    .hradnik-admin-list{display:grid;gap:8px}.hradnik-admin-row{display:flex;align-items:center;gap:10px;padding:11px;border:1px solid #e6e9ef;border-radius:14px;background:#fff}
    .hradnik-admin-row-main{flex:1;min-width:0}.hradnik-admin-row-main b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hradnik-admin-row-main small{color:#737b8b}
    .hradnik-admin-row-actions{display:flex;gap:6px}.hradnik-admin-row-actions button{padding:8px 10px;min-height:38px}
    .hradnik-admin-form{display:grid;gap:10px}.hradnik-admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hradnik-admin-field{display:grid;gap:5px}.hradnik-admin-field.full{grid-column:1/-1}
    .hradnik-admin-field label{font-size:12px;font-weight:850;color:#5c6575}.hradnik-admin-field input,.hradnik-admin-field select,.hradnik-admin-field textarea{width:100%;padding:10px 11px;border:1px solid #d9dde7;border-radius:11px;outline:0;background:#fff;box-sizing:border-box}.hradnik-admin-field textarea{min-height:92px;resize:vertical}
    .hradnik-admin-actions{display:flex;gap:7px;flex-wrap:wrap}.hradnik-admin-actions button{min-height:44px}.hradnik-admin-status{padding:10px 11px;border-radius:11px;background:#f1f4f9;color:#556071;font-size:12px}.hradnik-admin-status.warn{background:#fff4db;color:#745d1b}.hradnik-admin-status.ok{background:#e8f7ef;color:#16663f}
    .hradnik-admin-empty{padding:34px 16px;text-align:center;color:#737b8b;border:1px dashed #d9dde7;border-radius:14px}
    @media(max-width:900px){.hradnik-admin-body{grid-template-columns:1fr}.hradnik-admin-editor{order:-1}.hradnik-admin-panel{max-height:100dvh;border-radius:20px}.hradnik-admin-body{padding:10px}}
    @media(max-width:520px){.hradnik-admin-backdrop{padding:0}.hradnik-admin-panel{width:100%;height:100%;max-height:none;border-radius:0}.hradnik-admin-body{grid-template-columns:1fr}.hradnik-admin-grid{grid-template-columns:1fr}.hradnik-admin-field.full{grid-column:auto}.hradnik-admin-toolbar{padding:10px}.hradnik-admin-toolbar input{min-width:0}.hradnik-admin-row{align-items:flex-start}.hradnik-admin-row-actions{flex-direction:column}.hradnik-admin-row-actions button{width:42px;padding:8px 0}.hradnik-admin-head{padding:12px}.hradnik-admin-title{font-size:18px}}
  `
  document.head.appendChild(style)
}

function injectAdminButton() {
  if (!adminState.user?.role || adminState.user.role !== 'admin') return
  const account = document.querySelector('.account')
  if (!account || account.querySelector('.hradnik-admin-btn')) return
  ensureStyle()
  const button = document.createElement('button')
  button.className = 'hradnik-admin-btn'
  button.type = 'button'
  button.textContent = '⚙️ Admin'
  button.title = 'Správa památek'
  button.onclick = openAdmin
  account.insertBefore(button, account.firstChild)
}

async function checkAdmin() {
  if (!adminToken()) return
  try {
    const data = await adminApi('me')
    adminState.user = data.user
    injectAdminButton()
  } catch {
    adminState.user = null
  }
}

function placeForm(place = {}) {
  const p = {
    id: place.id || '', name: place.name || '', kind: place.kind || 'Hrad', character: place.character || '',
    district: place.district || '', region: place.region || '', municipality: place.municipality || '',
    latitude: inputValue(place.latitude, 'latitude'), longitude: inputValue(place.longitude, 'longitude'),
    description: place.description || '', official_url: place.official_url || '', ticket_url: place.ticket_url || '',
    opening_hours: fmtJson(place.opening_hours), ticket_prices: fmtJson(place.ticket_prices),
    photo_urls: Array.isArray(place.photo_urls) ? place.photo_urls.join('\n') : '',
  }
  return `<form id="hradnikAdminForm" class="hradnik-admin-form">
    <div class="hradnik-admin-grid">
      <div class="hradnik-admin-field full"><label>Název *</label><input name="name" value="${esc(p.name)}" required maxlength="180"></div>
      <div class="hradnik-admin-field"><label>Hlavní typ</label><select name="kind">${['Hrad','Zámek','Zřícenina','Tvrz','Klášter','Opevněné místo'].map(x=>`<option ${p.kind===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="hradnik-admin-field"><label>Charakter / stav</label><input name="character" value="${esc(p.character)}" maxlength="220" placeholder="např. zřícenina hradu"></div>
      <div class="hradnik-admin-field"><label>Obec</label><input name="municipality" value="${esc(p.municipality)}"></div>
      <div class="hradnik-admin-field"><label>Okres</label><input name="district" value="${esc(p.district)}"></div>
      <div class="hradnik-admin-field full"><label>Kraj</label><input name="region" value="${esc(p.region)}"></div>
      <div class="hradnik-admin-field"><label>Zeměpisná šířka</label><input name="latitude" type="number" step="any" value="${esc(p.latitude)}"></div>
      <div class="hradnik-admin-field"><label>Zeměpisná délka</label><input name="longitude" type="number" step="any" value="${esc(p.longitude)}"></div>
      <div class="hradnik-admin-field full"><label>Popis</label><textarea name="description">${esc(p.description)}</textarea></div>
      <div class="hradnik-admin-field"><label>Oficiální web</label><input name="official_url" type="url" value="${esc(p.official_url)}"></div>
      <div class="hradnik-admin-field"><label>Vstupenky</label><input name="ticket_url" type="url" value="${esc(p.ticket_url)}"></div>
      <div class="hradnik-admin-field full"><label>Otevírací doba (JSON)</label><textarea name="opening_hours" placeholder='{"sezóna":"duben–říjen"}'>${esc(p.opening_hours)}</textarea></div>
      <div class="hradnik-admin-field full"><label>Vstupné (JSON)</label><textarea name="ticket_prices" placeholder='{"dospělí":"150 Kč","dítě":"100 Kč"}'>${esc(p.ticket_prices)}</textarea></div>
      <div class="hradnik-admin-field full"><label>Fotky – URL, každá na samostatný řádek</label><textarea name="photo_urls">${esc(p.photo_urls)}</textarea></div>
    </div>
    <div class="hradnik-admin-actions"><button type="submit" class="primary">${p.id ? '💾 Uložit změny' : '➕ Přidat památku'}</button><button type="button" id="hradnikAdminCancel">Zrušit</button></div>
    ${p.id ? `<div class="hradnik-admin-status">ID: ${esc(p.id)}${place.admin_deleted?' · odebraná památka':''}</div>` : '<div class="hradnik-admin-status">Nová památka bude označena jako ruční záznam.</div>'}
  </form>`
}

function openAdmin() {
  if (document.querySelector('.hradnik-admin-backdrop')) return
  ensureStyle()
  const back = document.createElement('div')
  back.className = 'hradnik-admin-backdrop'
  back.innerHTML = `<div class="hradnik-admin-panel"><div class="hradnik-admin-head"><div><h2 class="hradnik-admin-title">⚙️ Správa památek</h2><div class="hradnik-admin-sub">Přidávání, úpravy a odebrání objektů</div></div><button id="hradnikAdminClose">✕</button></div><div class="hradnik-admin-toolbar"><input id="hradnikAdminSearch" placeholder="Hledat památku…"><button id="hradnikAdminNew" class="primary">➕ Nová památka</button><button id="hradnikAdminDeleted">Zobrazit odebrané</button></div><div class="hradnik-admin-body"><div class="hradnik-admin-card"><div id="hradnikAdminList" class="hradnik-admin-list"><div class="hradnik-admin-empty">Načítám…</div></div></div><div class="hradnik-admin-card hradnik-admin-editor"><div id="hradnikAdminEditor"><div class="hradnik-admin-empty">Vyber památku nebo vytvoř novou.</div></div></div></div></div>`
  document.body.appendChild(back)
  back.querySelector('#hradnikAdminClose').onclick = () => back.remove()
  back.addEventListener('click', e => { if (e.target === back) back.remove() })
  back.querySelector('#hradnikAdminSearch').oninput = e => { adminState.search = e.target.value; renderAdminList() }
  back.querySelector('#hradnikAdminNew').onclick = () => renderEditor({})
  back.querySelector('#hradnikAdminDeleted').onclick = () => { adminState.includeDeleted = !adminState.includeDeleted; back.querySelector('#hradnikAdminDeleted').textContent = adminState.includeDeleted ? 'Skrýt odebrané' : 'Zobrazit odebrané'; renderAdminList() }
  loadAdminPlaces()
}

async function loadAdminPlaces() {
  try {
    const data = await adminApi('list')
    adminState.places = data.places || []
    renderAdminList()
  } catch (e) {
    const list = document.getElementById('hradnikAdminList')
    if (list) list.innerHTML = `<div class="hradnik-admin-empty">${esc(e.message)}</div>`
  }
}

function filteredPlaces() {
  const q = adminState.search.trim().toLocaleLowerCase('cs-CZ')
  return adminState.places.filter(p => (adminState.includeDeleted || !p.admin_deleted) && (!q || `${p.name} ${p.district||''} ${p.region||''} ${p.municipality||''}`.toLocaleLowerCase('cs-CZ').includes(q)))
}

function renderAdminList() {
  const list = document.getElementById('hradnikAdminList')
  if (!list) return
  const rows = filteredPlaces()
  if (!rows.length) { list.innerHTML = '<div class="hradnik-admin-empty">Nic nenalezeno.</div>'; return }
  list.innerHTML = rows.map(p => `<div class="hradnik-admin-row"><div class="hradnik-admin-row-main"><b>${esc(p.name)}</b><small>${esc(p.kind||'')} · ${esc(p.region||p.district||'')}${p.admin_deleted?' · 🗑️ odebraná':''}</small></div><div class="hradnik-admin-row-actions"><button class="edit" data-id="${p.id}" title="Upravit">✏️</button>${p.admin_deleted?'<button class="restore" data-id="'+p.id+'" title="Obnovit">↩️</button>':'<button class="delete" data-id="'+p.id+'" title="Odebrat">🗑️</button>'}</div></div>`).join('')
  list.querySelectorAll('.edit').forEach(b => b.onclick = () => { const p=adminState.places.find(x=>String(x.id)===b.dataset.id); if(p) renderEditor(p) })
  list.querySelectorAll('.delete').forEach(b => b.onclick = () => removePlace(Number(b.dataset.id)))
  list.querySelectorAll('.restore').forEach(b => b.onclick = () => restorePlace(Number(b.dataset.id)))
}

function renderEditor(place) {
  const editor = document.getElementById('hradnikAdminEditor')
  if (!editor) return
  editor.innerHTML = placeForm(place)
  editor.querySelector('#hradnikAdminCancel').onclick = () => { editor.innerHTML = '<div class="hradnik-admin-empty">Vyber památku nebo vytvoř novou.</div>' }
  editor.querySelector('#hradnikAdminForm').onsubmit = e => savePlace(e, place.id || null)
}

function parseObject(raw, label) {
  const t = raw.trim()
  if (!t) return {}
  try { const v = JSON.parse(t); if (!v || Array.isArray(v) || typeof v !== 'object') throw new Error(); return v }
  catch { throw new Error(`${label} musí být platný JSON objekt.`) }
}

async function savePlace(event, id) {
  event.preventDefault()
  const form = event.currentTarget
  const f = new FormData(form)
  try {
    const payload = {
      id: id || undefined,
      name: String(f.get('name')||'').trim(), kind: String(f.get('kind')||'Hrad'), character: String(f.get('character')||'').trim(),
      municipality: String(f.get('municipality')||'').trim(), district: String(f.get('district')||'').trim(), region: String(f.get('region')||'').trim(),
      latitude: f.get('latitude') === '' ? null : Number(f.get('latitude')), longitude: f.get('longitude') === '' ? null : Number(f.get('longitude')),
      description: String(f.get('description')||'').trim(), official_url: String(f.get('official_url')||'').trim(), ticket_url: String(f.get('ticket_url')||'').trim(),
      opening_hours: parseObject(String(f.get('opening_hours')||''), 'Otevírací doba'), ticket_prices: parseObject(String(f.get('ticket_prices')||''), 'Vstupné'),
      photo_urls: String(f.get('photo_urls')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),
    }
    if (!payload.name) throw new Error('Název je povinný.')
    if (payload.latitude !== null && !Number.isFinite(payload.latitude)) throw new Error('Neplatná zeměpisná šířka.')
    if (payload.longitude !== null && !Number.isFinite(payload.longitude)) throw new Error('Neplatná zeměpisná délka.')
    await adminApi('save', payload)
    await loadAdminPlaces()
    document.getElementById('hradnikAdminEditor').innerHTML = '<div class="hradnik-admin-status ok">✓ Uloženo.</div>'
    setTimeout(() => { if (document.getElementById('hradnikAdminEditor')) renderEditor(payload.id ? adminState.places.find(x=>String(x.id)===String(payload.id)) : {}) }, 450)
  } catch (e) {
    const old = form.querySelector('.hradnik-admin-status')
    const box = document.createElement('div');box.className='hradnik-admin-status warn';box.textContent=e.message
    form.prepend(box);setTimeout(()=>box.remove(),4000)
  }
}

async function removePlace(id) {
  const p = adminState.places.find(x=>Number(x.id)===id)
  if (!p) return
  if (!confirm(`Odebrat „${p.name}“ z katalogu?\n\nPamátka se pouze skryje a půjde případně obnovit.`)) return
  try { await adminApi('delete',{id}); await loadAdminPlaces() }
  catch (e) { alert(e.message) }
}

async function restorePlace(id) {
  try { await adminApi('restore',{id}); await loadAdminPlaces() }
  catch (e) { alert(e.message) }
}

const observer = new MutationObserver(() => injectAdminButton())
observer.observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', () => { ensureStyle(); void checkAdmin() })
setTimeout(() => { void checkAdmin() }, 1000)
