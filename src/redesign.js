const NAV_LABELS=['Mapa','Seznam','Oblíbené','Vyhledávání','Kategorie','O aplikaci']
const NAV_ICONS=['map','list','favorites','search','grid','info']
const iconForKind=kind=>{const k=String(kind||'').toLocaleLowerCase('cs-CZ');if(k.includes('klášter'))return'/icons/diary.svg';if(k.includes('tvrz'))return'/icons/list.svg';return'/icons/home.svg'}

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
  const label=NAV_LABELS[i]||b.textContent.trim()
  b.textContent=label
  b.dataset.redesignReady='1'
  let img=b.querySelector('img[data-redesign-icon]')
  if(!img){img=document.createElement('img');img.dataset.redesignIcon='1';img.alt='';img.setAttribute('aria-hidden','true');b.prepend(img)}
  img.src=`/icons/${NAV_ICONS[i]||'home'}.svg`
 })
}

function beautifyPlaces(){document.querySelectorAll('.placeIcon').forEach(node=>{if(node.dataset.redesigned==='1')return;const kind=node.parentElement?.querySelector('.placeCopy small')?.textContent?.split('·')[0]?.trim()||'';node.textContent='';const img=document.createElement('img');img.src=iconForKind(kind);img.alt='';node.appendChild(img);node.dataset.redesigned='1'})}

function ensureNearbyPanel(){return}

function enhanceMap(){
 const map=document.querySelector('#map');if(!map)return
 if(map.parentElement?.classList.contains('map-layout'))return
 const parent=map.parentElement;if(!parent)return
 const layout=document.createElement('div');layout.className='map-layout';parent.insertBefore(layout,map);layout.appendChild(map)
 const panel=document.createElement('aside');panel.className='map-focus-card';panel.innerHTML='<div class="focus-placeholder"><strong>Klikni na památku v mapě</strong><br><span>Otevře se její detail přímo vedle mapy s fotografií, informacemi, stavem návštěvy a navigací.</span></div>'
 layout.appendChild(panel)
 requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))
}

function polishPage(){
 const main=document.querySelector('main.wrap');if(!main)return
 main.classList.add('redesign-main')
 const title=document.querySelector('#content h1');if(title)title.classList.add('redesign-title')
 beautifyPlaces();enhanceMap()
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

function scheduleApply(){if(applyQueued)return;applyQueued=true;queueMicrotask(()=>{applyQueued=false;apply()})}
observer=new MutationObserver(scheduleApply)
const start=()=>{const app=document.querySelector('#app');if(!app)return;observer.observe(app,{childList:true,subtree:true});apply()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
