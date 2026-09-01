import 'leaflet/dist/leaflet.css'
import './styles.css'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cgshssdjgzzuprlwnabl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_' 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const AUTH_URL = `${SUPABASE_URL}/functions/v1/hradnik-auth`
const app = document.querySelector('#app')
const types = ['Vše','Hrad','Zámek','Zřícenina','Tvrz','Klášter','Opevněné místo']
const ui = { tab:'home', type:'Vše', q:'', places:[], mine:new Map(), user:null, map:null }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const icon = k => ({'Zřícenina':'🧱','Tvrz':'🛡️','Klášter':'⛪','Zámek':'🏯','Opevněné místo':'🏛️'}[k] || '🏰')
const getState = id => ui.mine.get(String(id)) || {status:'none',favorite:false,rating:0,visited_on:null,note:''}
const stateLabel = s => s==='visited' ? '🟢 Navštíveno' : s==='want' ? '🔵 Chceme' : '⚪ Nenavštíveno'

async function authApi(action, body = {}, token = localStorage.getItem('hradnik_session')) {
  const headers = {'Content-Type':'application/json'}
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(AUTH_URL, { method:'POST', headers, body:JSON.stringify({action,...body}) })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || 'Požadavek se nepodařilo dokončit.')
  return data
}

async function loadCatalog() {
  const all=[]
  for(let from=0;;from+=1000){
    const {data,error}=await supabase.from('hradnik_places')
      .select('id,name,kind,character,district,region,municipality,latitude,longitude,description,official_url,ticket_url,opening_hours,ticket_prices,photo_urls,source_url,source_updated_at,last_verified_at')
      .eq('is_visible',true).eq('is_current',true).order('name',{ascending:true}).range(from,from+999)
    if(error) throw error
    all.push(...(data||[]))
    if(!data || data.length<1000) break
  }
  ui.places=all
}

async function loadMine() {
  const data = await authApi('state_list')
  ui.mine = new Map((data.state||[]).map(x => [String(x.place_id),x]))
}

function renderCard(p){
  const s=getState(p.id),el=document.createElement('article');el.className='place'
  el.innerHTML=`<button class="placeMain"><span class="placeIcon">${icon(p.kind)}</span><span class="placeCopy"><b>${esc(p.name)}${s.favorite?' ⭐':''}</b><small>${esc(p.kind||'Historické místo')} · ${esc(p.district||p.region||'')}</small><small>${stateLabel(s.status)}</small></span></button><span class="quick"><button class="want">🔵</button><button class="visit">🟢</button></span>`
  el.querySelector('.placeMain').onclick=()=>detail(p.id)
  el.querySelector('.want').onclick=e=>{e.stopPropagation();setState(p.id,'want')}
  el.querySelector('.visit').onclick=e=>{e.stopPropagation();setState(p.id,'visited')}
  return el
}

function home(){
  const v=ui.places.filter(p=>getState(p.id).status==='visited').length,w=ui.places.filter(p=>getState(p.id).status==='want').length,f=ui.places.filter(p=>getState(p.id).favorite).length
  content.innerHTML=`<section class="hero"><div><p class="eyebrow">HRADNÍK</p><h1>Naše hradní výprava</h1><p class="muted">Katalog se aktualizuje automaticky na pozadí. Ty jen vybíráš, kam chcete jet.</p></div><div class="stats"><div><b>${v}</b><span>navštíveno</span></div><div><b>${w}</b><span>chceme</span></div><div><b>${f}</b><span>oblíbené</span></div><div><b>${ui.places.length}</b><span>v katalogu</span></div></div></section><section><div class="sectionTitle"><h2>🔵 Chceme navštívit</h2><button id="allMine" class="linkish">Zobrazit vše</button></div><div id="homeList" class="list"></div></section>`
  const wanted=ui.places.filter(p=>getState(p.id).status==='want').slice(0,6),list=document.getElementById('homeList')
  wanted.forEach(p=>list.appendChild(renderCard(p)))
  if(!wanted.length) list.innerHTML='<div class="empty">Zatím nic v plánu.</div>'
  allMine.onclick=()=>{ui.tab='mine';render()}
}

function catalog(){
  content.innerHTML=`<section><div class="sectionTitle"><div><p class="eyebrow">KATALOG</p><h1>Historická místa</h1></div><b id="count" class="pill"></b></div><input id="search" class="search" placeholder="Hledat název, okres nebo kraj…"><div id="chips" class="chips"></div><div id="list" class="list"></div></section>`
  const search=document.getElementById('search');search.value=ui.q;search.oninput=()=>{ui.q=search.value;renderCatalogList()}
  const chips=document.getElementById('chips')
  types.forEach(t=>{const b=document.createElement('button');b.textContent=t;b.className=t===ui.type?'active':'';b.onclick=()=>{ui.type=t;catalog()};chips.appendChild(b)})
  renderCatalogList()
}
function filtered(){const q=ui.q.toLocaleLowerCase('cs-CZ').trim();return ui.places.filter(p=>(ui.type==='Vše'||p.kind===ui.type)&&(`${p.name} ${p.district||''} ${p.region||''}`).toLocaleLowerCase('cs-CZ').includes(q))}
function renderCatalogList(){const a=filtered(),list=document.getElementById('list');if(!list)return;document.getElementById('count').textContent=a.length.toLocaleString('cs-CZ');list.innerHTML='';a.slice(0,800).forEach(p=>list.appendChild(renderCard(p)));if(!a.length)list.innerHTML='<div class="empty">Nic nenalezeno.</div>'}

function mine(){
  content.innerHTML=`<section><p class="eyebrow">MOJE</p><h1>Naše místa</h1><div class="chips"><button id="mw">🔵 Chceme</button><button id="mv">🟢 Navštívili jsme</button><button id="mf">⭐ Oblíbené</button></div><div id="mineList" class="list"></div></section>`
  const show=k=>{const list=document.getElementById('mineList');list.innerHTML='';const a=ui.places.filter(p=>k==='favorite'?getState(p.id).favorite:getState(p.id).status===k);a.forEach(p=>list.appendChild(renderCard(p)));if(!a.length)list.innerHTML='<div class="empty">Zatím prázdné.</div>'}
  mw.onclick=()=>show('want');mv.onclick=()=>show('visited');mf.onclick=()=>show('favorite');show('want')
}

function diary(){
  const a=ui.places.filter(p=>getState(p.id).status==='visited').sort((x,y)=>String(getState(y.id).visited_on||'').localeCompare(String(getState(x.id).visited_on||'')))
  content.innerHTML=`<section><p class="eyebrow">DENÍK</p><h1>Naše návštěvy</h1><div id="diaryList" class="list"></div></section>`
  a.forEach(p=>diaryList.appendChild(renderCard(p)))
  if(!a.length)diaryList.innerHTML='<div class="empty">Zatím žádné návštěvy.</div>'
}

function stats(){
  const s={v:ui.places.filter(p=>getState(p.id).status==='visited').length,w:ui.places.filter(p=>getState(p.id).status==='want').length,f:ui.places.filter(p=>getState(p.id).favorite).length}
  const by={};ui.places.filter(p=>getState(p.id).status==='visited').forEach(p=>by[p.kind]=(by[p.kind]||0)+1)
  content.innerHTML=`<section><p class="eyebrow">STATISTIKY</p><h1>Naše sbírka</h1><div class="stats big"><div><b>${s.v}</b><span>navštíveno</span></div><div><b>${s.w}</b><span>chceme</span></div><div><b>${s.f}</b><span>oblíbené</span></div><div><b>${ui.places.length}</b><span>katalog</span></div></div><div class="card">${Object.entries(by).map(([k,v])=>`<div class="row"><span>${icon(k)} ${esc(k)}</span><b>${v}</b></div>`).join('')||'<span class="muted">Zatím bez návštěv.</span>'}</div></section>`
}

function mapView(){
  content.innerHTML='<section><p class="eyebrow">MAPA</p><h1>Mapa památek</h1><div id="map"></div></section>'
  ui.map?.remove();ui.map=L.map('map').setView([49.8,15.5],7)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(ui.map)
  ui.places.filter(p=>p.latitude&&p.longitude).forEach(p=>L.marker([p.latitude,p.longitude]).addTo(ui.map).bindPopup(`<b>${esc(p.name)}</b><br>${stateLabel(getState(p.id).status)}`))
}

function render(){
  app.innerHTML=`<header><div class="wrap top"><div><div class="logo">🏰 Hradník</div><div class="sub">Hrady · zámky · zříceniny · tvrze · kláštery</div></div><div><b>${esc(ui.user?.username||'')}</b> <button id="logout">Odhlásit</button></div></div></header><main class="wrap"><nav id="nav" class="nav"></nav><div id="content"></div></main>`
  const items=[['home','🏠 Domů'],['catalog','🏰 Katalog'],['map','🗺️ Mapa'],['mine','❤️ Moje'],['diary','📖 Deník'],['stats','📊 Statistiky']]
  items.forEach(([id,label])=>{const b=document.createElement('button');b.textContent=label;b.className=ui.tab===id?'active':'';b.onclick=()=>{ui.tab=id;render()};nav.appendChild(b)})
  logout.onclick=async()=>{try{await authApi('logout')}catch{}localStorage.removeItem('hradnik_session');localStorage.removeItem('hradnik_user');location.reload()}
  if(ui.tab==='home')home();if(ui.tab==='catalog')catalog();if(ui.tab==='map')mapView();if(ui.tab==='mine')mine();if(ui.tab==='diary')diary();if(ui.tab==='stats')stats()
}

async function setState(id,status){const old=getState(id);const next={...old,status,visited_on:status==='visited'?(old.visited_on||new Date().toISOString().slice(0,10)):old.visited_on};await authApi('state_upsert',{place_id:id,status:next.status,favorite:!!next.favorite,rating:next.rating||0,visited_on:next.visited_on||null,note:next.note||''});ui.mine.set(String(id),next);render()}
async function toggleFavorite(id){const old=getState(id);const next={...old,favorite:!old.favorite};await authApi('state_upsert',{place_id:id,status:next.status,favorite:next.favorite,rating:next.rating||0,visited_on:next.visited_on||null,note:next.note||''});ui.mine.set(String(id),next);render()}

function detail(id){
  const p=ui.places.find(x=>String(x.id)===String(id));if(!p)return;const s=getState(id)
  const o=document.createElement('div');o.className='overlay';o.innerHTML=`<div class="sheet"><button class="close" id="closeDetail">✕</button><div class="bigIcon">${icon(p.kind)}</div><p class="eyebrow">${esc(p.kind)}</p><h1>${esc(p.name)}</h1><p class="muted">${esc(p.district||'')} ${p.region?'· '+esc(p.region):''}</p><div class="actions"><button id="want" class="primary">🔵 Chceme</button><button id="visit" class="primary">🟢 Byli jsme</button><button id="fav">⭐ ${s.favorite?'Zrušit oblíbené':'Oblíbené'}</button>${p.latitude&&p.longitude?`<a class="btn" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}">📍 Navigovat</a>`:''}</div><div class="detailGrid"><div class="card"><h3>ℹ️ Informace</h3><p>${esc(p.description||'Popis zatím není ověřený.')}</p></div><div class="card"><h3>🕐 Otevírací doba</h3><p>${p.opening_hours?esc(JSON.stringify(p.opening_hours)):'Zatím neověřeno'}</p></div><div class="card"><h3>🎟️ Vstupné</h3><p>${p.ticket_prices?esc(JSON.stringify(p.ticket_prices)):'Zatím neověřeno'}</p></div><div class="card"><h3>🔗 Odkazy</h3><p>${p.official_url?`<a target="_blank" href="${esc(p.official_url)}">Oficiální web</a>`:'Web zatím není'}</p></div></div>${s.status==='visited'?`<div class="card"><h3>📖 Zápis z návštěvy</h3><input id="visitDate" type="date" value="${s.visited_on||''}"><textarea id="visitNote" placeholder="Poznámka…">${esc(s.note||'')}</textarea><button id="saveVisit" class="primary">Uložit zápis</button></div>`:''}</div>`
  document.body.appendChild(o)
  closeDetail.onclick=()=>o.remove();want.onclick=()=>{o.remove();setState(id,'want')};visit.onclick=()=>{o.remove();setState(id,'visited')};fav.onclick=()=>{o.remove();toggleFavorite(id)}
  document.getElementById('saveVisit')?.addEventListener('click',async()=>{await authApi('state_upsert',{place_id:id,status:'visited',favorite:!!s.favorite,rating:s.rating||0,visited_on:visitDate.value||null,note:visitNote.value});ui.mine.set(String(id),{...s,status:'visited',visited_on:visitDate.value||null,note:visitNote.value});o.remove();render()})
}

function authScreen(mode='login',error=''){
  app.innerHTML=`<div class="auth"><div class="authCard"><div class="logo">🏰 Hradník</div><h1>${mode==='login'?'Přihlášení':'Registrace'}</h1><p class="muted">Stačí uživatelské jméno a heslo.</p>${error?`<div class="notice">${esc(error)}</div>`:''}<form id="authForm"><label>Uživatelské jméno<input id="username" autocomplete="username" minlength="3" maxlength="32" required></label><label>Heslo<input id="password" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" minlength="8" required></label>${mode==='register'?'<label>Heslo znovu<input id="password2" type="password" autocomplete="new-password" minlength="8" required></label>':''}<button class="primary wide" type="submit">${mode==='login'?'Přihlásit':'Vytvořit účet'}</button></form><button id="switch" class="linkish">${mode==='login'?'Nemám účet – registrace':'Už mám účet – přihlášení'}</button></div></div>`
  switch.onclick=()=>authScreen(mode==='login'?'register':'login')
  authForm.onsubmit=async e=>{e.preventDefault();const u=username.value.trim(),p=password.value;if(mode==='register'&&p!==password2.value){authScreen(mode,'Hesla se neshodují.');return}try{const data=await authApi(mode==='login'?'login':'register',{username:u,password:p},null);localStorage.setItem('hradnik_session',data.session.token);localStorage.setItem('hradnik_user',JSON.stringify(data.user));await boot()}catch(err){authScreen(mode,err.message)}}
}

async function boot(){
  const token=localStorage.getItem('hradnik_session')
  if(!token){authScreen();return}
  try{
    const me=await authApi('session',{},token);ui.user=me.user
    await Promise.all([loadCatalog(),loadMine()]);render()
  }catch(err){localStorage.removeItem('hradnik_session');localStorage.removeItem('hradnik_user');authScreen('login','Relace vypršela. Přihlas se znovu.')}
}
boot()
