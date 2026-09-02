const NAV_LABELS=['Domů','Katalog','Mapa','Moje','Deník','Statistiky']
const NAV_ICONS=['nav-map','nav-list','nav-heart','nav-search','nav-grid','nav-info']
const iconForKind=kind=>{const k=String(kind||'').toLocaleLowerCase('cs-CZ');if(k.includes('zřícen'))return'/icons/home.svg';if(k.includes('zámek'))return'/icons/home.svg';if(k.includes('tvrz'))return'/icons/list.svg';if(k.includes('klášter'))return'/icons/diary.svg';if(k.includes('opev'))return'/icons/home.svg';return'/icons/home.svg'}

let observer=null
let applying=false
let applyQueued=false

function addGlobalSearch(header){
 const top=header?.querySelector('.top');if(!top)return
 if(top.querySelector('.globalSearchWrap'))return
 const wrap=document.createElement('div');wrap.className='globalSearchWrap'
 const input=document.createElement('input');input.className='globalSearch';input.placeholder='Hledat památku...';input.autocomplete='off';input.setAttribute('aria-label','Hledat památku')
 input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const value=input.value.trim();const catalogBtn=document.querySelector('.redesign-sidebar .nav button:nth-child(2)');if(catalogBtn)catalogBtn.click();setTimeout(()=>{const s=document.querySelector('#search');if(s){s.value=value;s.dispatchEvent(new Event('input',{bubbles:true}))}},0)})
 wrap.appendChild(input);top.insertBefore(wrap,top.querySelector('.account')||null)
}

function buildSidebar(app,nav){
 if(!nav)return
 let side=app.querySelector('.redesign-sidebar')
 if(!side){
  side=document.createElement('aside');side.className='redesign-sidebar'
  const brand=document.createElement('div');brand.className='redesign-brand';brand.innerHTML='<img src="/hradnik-app-icon.svg" alt=""><div><b>HRADNÍK</b><span>Hrady · zámky · zříceniny<br>· tvrze · kláštery</span></div>'
  const foot=document.createElement('div');foot.className='redesign-side-footer';foot.innerHTML='<b>Hradník</b>Objevuj.<br>Poznávej.<br>Chraň.'
  side.append(brand,foot);app.insertBefore(side,app.firstChild)
 }
 const footer=side.querySelector('.redesign-side-footer');if(nav.parentElement!==side)side.insertBefore(nav,footer||null)
 nav.classList.add('redesign-nav')
 nav.querySelectorAll('button').forEach((b,i)=>{
  if(b.dataset.redesignReady==='1')return
  const label=NAV_LABELS[i]||b.textContent.trim();b.textContent=label
  const img=document.createElement('img');img.src=`/icons/${NAV_ICONS[i]||'nav-map'}.svg`;img.alt='';img.setAttribute('aria-hidden','true');b.prepend(img);b.dataset.redesignReady='1'
 })
}

function beautifyPlaces(){document.querySelectorAll('.placeIcon').forEach(node=>{if(node.dataset.redesigned==='1')return;const kind=node.parentElement?.querySelector('.placeCopy small')?.textContent?.split('·')[0]?.trim()||'';node.textContent='';const img=document.createElement('img');img.src=iconForKind(kind);img.alt='';node.appendChild(img);node.dataset.redesigned='1'})}

function ensureNearbyPanel(){
 const content=document.querySelector('#content');if(!content)return
 if(!document.querySelector('.hero'))return
 if(content.querySelector('.nearbyPanel'))return
 const hero=content.querySelector('.hero');if(!hero)return
 const panel=document.createElement('section');panel.className='nearbyPanel';panel.innerHTML='<div class="nearbyRow"><div><p class="eyebrow">HRADNÍK</p><h2>Co máme poblíž?</h2><p class="muted">Najdi hrady, zámky a zříceniny, které stojí za další výpravu.</p></div><button class="nearbyButton">Otevřít mapu</button></div>'
 panel.querySelector('.nearbyButton').onclick=()=>{const mapBtn=document.querySelector('.redesign-sidebar .nav button:nth-child(3)');if(mapBtn)mapBtn.click()}
 hero.replaceWith(panel)
}

function enhanceMap(){
 const map=document.querySelector('#map');if(!map)return
 if(map.parentElement?.classList.contains('map-layout'))return
 const parent=map.parentElement;if(!parent)return
 const layout=document.createElement('div');layout.className='map-layout';parent.insertBefore(layout,map);layout.appendChild(map)
 const panel=document.createElement('aside');panel.className='map-focus-card';panel.innerHTML='<div class="map-focus-brand"><img src="/hradnik-app-icon.svg" alt=""><b>VYBRANÁ PAMÁTKA</b></div><div class="focus-placeholder"><strong>Klikni na památku v mapě</strong><br><span>Otevře se její detail s informacemi, stavem návštěvy a možností navigace.</span></div>'
 layout.appendChild(panel)
 requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))
}

function polishPage(){
 const main=document.querySelector('main.wrap');if(!main)return
 main.classList.add('redesign-main')
 const title=document.querySelector('#content h1');if(title)title.classList.add('redesign-title')
 beautifyPlaces();ensureNearbyPanel();if(document.querySelector('#map'))enhanceMap()
}

function apply(){
 if(applying)return
 applying=true
 observer?.disconnect()
 try{
  const app=document.querySelector('#app');if(!app)return
  if(document.querySelector('.auth'))return
  const header=app.querySelector('header');const nav=app.querySelector('#nav')
  if(header&&nav){buildSidebar(app,nav);addGlobalSearch(header)}
  polishPage()
 }finally{applying=false;const app=document.querySelector('#app');if(app)observer?.observe(app,{childList:true,subtree:true})}
}

function scheduleApply(){
 if(applyQueued)return
 applyQueued=true
 queueMicrotask(()=>{applyQueued=false;apply()})
}

observer=new MutationObserver(scheduleApply)
const start=()=>{const app=document.querySelector('#app');if(!app)return;observer.observe(app,{childList:true,subtree:true});apply()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
