/* Hradník — map dashboard matching the approved reference composition. */
const RECENT_KEY='hradnik_recent_places_v1'
let queued=false
let lastOverlaySignature=''

function iconFor(kind=''){
  const k=kind.toLocaleLowerCase('cs-CZ')
  if(k.includes('zřícen'))return'/icons/ruin.svg'
  if(k.includes('zámek'))return'/icons/chateau.svg'
  if(k.includes('tvrz'))return'/icons/fortress.svg'
  if(k.includes('klášter'))return'/icons/monastery.svg'
  return'/icons/map-marker-reference.svg'
}
function recent(){try{return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]')}catch{return[]}}
function saveRecent(item){
  if(!item?.name)return
  const next=[item,...recent().filter(x=>x.name!==item.name)].slice(0,5)
  localStorage.setItem(RECENT_KEY,JSON.stringify(next))
  renderRecent()
}
function openRecent(item){
  const name=item?.name
  if(!name)return
  const nav=document.querySelector('.redesign-sidebar>.redesign-nav')
  const listButton=nav?.querySelectorAll(':scope>button')?.[1]
  listButton?.click()
  setTimeout(()=>{
    const input=document.getElementById('search')
    if(!input)return
    input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}))
    setTimeout(()=>{
      document.querySelector('#list .placeMain')?.click()
      // Preserve the opened detail and return to its exact point on the map.
      setTimeout(()=>nav?.querySelector(':scope>button')?.click(),140)
    },100)
  },160)
}

function renderRecent(){
  const rail=document.querySelector('.reference-recent-list')
  if(!rail)return
  const items=recent()
  const signature=JSON.stringify(items)
  if(rail.dataset.recentSignature===signature)return
  rail.dataset.recentSignature=signature
  rail.innerHTML=''
  if(!items.length){
    rail.innerHTML='<div class="reference-recent-empty"><img src="/icons/favorites.svg" alt=""><span><b>Zatím tu nic není</b><small>Otevřete památku na mapě a objeví se tady pro rychlý návrat.</small></span></div>'
    return
  }
  items.forEach(item=>{
    const button=document.createElement('button')
    button.type='button';button.className='reference-recent-card'
    const visual=item.photo?`<img class="reference-recent-photo" src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name)} – fotografie">`:`<span class="reference-recent-emblem"><img src="${iconFor(item.kind)}" alt=""></span>`
    button.innerHTML=`<div class="reference-recent-visual">${visual}</div><div class="reference-recent-copy"><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.kind||'Historické místo')}</span><small>${escapeHtml(item.location||'')}</small></div><img class="reference-recent-heart" src="/icons/favorites.svg" alt="">`
    button.onclick=()=>openRecent(item)
    rail.appendChild(button)
  })
}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function ensureMapLayout(){
  const map=document.getElementById('map')
  if(!map)return false
  const section=map.closest('section')
  if(!section)return false
  section.classList.add('reference-map-dashboard')
  let layout=map.closest('.map-layout')
  if(!layout){
    layout=document.createElement('div');layout.className='map-layout'
    map.parentElement.insertBefore(layout,map);layout.appendChild(map)
  }
  let panel=layout.querySelector('.map-focus-card')
  if(!panel){panel=document.createElement('aside');panel.className='map-focus-card';layout.appendChild(panel)}
  if(!panel.dataset.referenceReady){
    panel.dataset.referenceReady='1'
    panel.innerHTML='<div class="reference-map-placeholder"><img src="/hradnik-app-icon.svg" alt=""><p class="eyebrow">DETAIL PAMÁTKY</p><h2>Vyberte místo na mapě</h2><p>Klepnutím na štít otevřete informace o památce přímo vedle mapy.</p><div class="reference-placeholder-line"></div><small>Hrady · zámky · zříceniny · tvrze · kláštery</small></div>'
  }

  if(!section.querySelector('.reference-filter-button')){
    const filter=document.createElement('button');filter.type='button';filter.className='reference-filter-button';filter.innerHTML='<img src="/icons/filter.svg" alt=""><span>Filtry</span><span class="reference-filter-chevron">⌄</span>'
    filter.onclick=e=>{e.stopPropagation();const box=section.querySelector('.mapFilters');box?.classList.toggle('reference-filter-open');filter.classList.toggle('active',box?.classList.contains('reference-filter-open'))}
    section.appendChild(filter)
  }
  const filters=section.querySelector('.mapFilters')
  if(filters&&!filters.dataset.referenceOutsideBound){
    filters.dataset.referenceOutsideBound='1'
    document.addEventListener('click',e=>{if(!section.isConnected)return;if(e.target.closest('.mapFilters,.reference-filter-button'))return;filters.classList.remove('reference-filter-open');section.querySelector('.reference-filter-button')?.classList.remove('active')})
  }

  if(!section.querySelector('.reference-recent')){
    const lower=document.createElement('div');lower.className='reference-recent';lower.innerHTML='<div class="reference-recent-head"><b>Nedávno zobrazené</b><button type="button" class="reference-recent-all">Zobrazit vše</button></div><div class="reference-recent-list"></div>'
    layout.after(lower)
    lower.querySelector('.reference-recent-all').onclick=()=>document.querySelector('.redesign-sidebar>.redesign-nav>button:nth-child(2)')?.click()
  }
  renderRecent()
  updateCount()
  return true
}

function updateCount(){
  const raw=document.getElementById('mapCount')?.textContent||''
  const count=raw.match(/[\d\s.]+/)?.[0]?.trim()
  const target=document.querySelector('.reference-force-count')
  if(count&&target)target.textContent=`${count} památek`
}

function watchOverlay(){
  const sheet=document.querySelector('.overlay .sheet')
  if(!sheet)return
  // Do not allow raw object serialization to leak into the UI.
  sheet.querySelectorAll('.detailGrid p').forEach(p=>{if(p.textContent.trim()==='[object Object]')p.textContent='Podrobné informace jsou dostupné ve zdroji památky.'})
  const name=sheet.querySelector('h1')?.textContent?.trim()
  const kind=sheet.querySelector('.eyebrow')?.textContent?.trim()
  const location=sheet.querySelector('h1 + .muted')?.textContent?.trim()||sheet.querySelector('.muted')?.textContent?.trim()
  const photo=sheet.querySelector('.detailPhoto')?.src||''
  const signature=`${name}|${kind}|${location}|${photo}`
  if(name&&signature!==lastOverlaySignature){lastOverlaySignature=signature;saveRecent({name,kind,location,photo})}
}

function apply(){queued=false;ensureMapLayout();watchOverlay()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(apply)}
const start=()=>{
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})
  apply();[100,220,400,700,1100,1600,2500,4500].forEach(ms=>setTimeout(apply,ms))
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
