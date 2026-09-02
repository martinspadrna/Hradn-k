const NAV_ICONS=['home','list','map','favorites','diary','stats']
const iconForKind=kind=>{const k=String(kind||'').toLocaleLowerCase('cs-CZ');if(k.includes('zřícen'))return'/icons/home.svg';if(k.includes('zámek'))return'/icons/home.svg';if(k.includes('tvrz'))return'/icons/list.svg';if(k.includes('klášter'))return'/icons/diary.svg';if(k.includes('opev'))return'/icons/home.svg';return'/icons/home.svg'}

function addGlobalSearch(header){
  const top=header.querySelector('.top'); if(!top)return
  let wrap=top.querySelector('.globalSearchWrap')
  if(wrap)return
  wrap=document.createElement('div'); wrap.className='globalSearchWrap'
  const input=document.createElement('input'); input.className='globalSearch'; input.placeholder='Hledat památku...'; input.autocomplete='off'
  input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const value=input.value.trim();const catalogBtn=document.querySelector('.redesign-sidebar .nav button:nth-child(2)');if(catalogBtn)catalogBtn.click();setTimeout(()=>{const s=document.querySelector('#search');if(s){s.value=value;s.dispatchEvent(new Event('input',{bubbles:true}))}},0)})
  wrap.appendChild(input)
  top.insertBefore(wrap,top.querySelector('.account')||null)
}

function buildSidebar(app,header,nav){
  let side=app.querySelector('.redesign-sidebar')
  if(!side){
    side=document.createElement('aside'); side.className='redesign-sidebar'
    const brand=document.createElement('div'); brand.className='redesign-brand'; brand.innerHTML='<img src="/hradnik-app-icon.svg" alt=""><div><b>HRADNÍK</b><span>Hrady · zámky · zříceniny<br>· tvrze · kláštery</span></div>'
    const foot=document.createElement('div'); foot.className='redesign-side-footer'; foot.innerHTML='<b>Hradník</b>Objevuj. Poznávej.<br>Uchovávej vzpomínky.'
    side.append(brand,foot);app.insertBefore(side,app.firstChild)
  }
  if(nav.parentElement!==side)side.insertBefore(nav,side.querySelector('.redesign-side-footer'))
  nav.classList.add('redesign-nav')
  nav.querySelectorAll('button').forEach((b,i)=>{
    if(b.querySelector('img'))return
    const img=document.createElement('img');img.src=`/icons/${NAV_ICONS[i]||'home'}.svg`;img.alt='';img.setAttribute('aria-hidden','true');b.prepend(img)
  })
}

function beautifyPlaces(){
  document.querySelectorAll('.placeIcon').forEach((node)=>{
    if(node.dataset.redesigned==='1')return
    const kind=node.parentElement?.querySelector('.placeCopy small')?.textContent?.split('·')[0]?.trim()||''
    node.textContent='';const img=document.createElement('img');img.src=iconForKind(kind);img.alt='';node.appendChild(img);node.dataset.redesigned='1'
  })
}

function enhanceMap(){
  const map=document.querySelector('#map'); if(!map)return
  if(!map.parentElement.classList.contains('map-layout')){
    const parent=map.parentElement;const layout=document.createElement('div');layout.className='map-layout';parent.insertBefore(layout,map);layout.appendChild(map)
    const panel=document.createElement('aside');panel.className='map-focus-card';panel.innerHTML='<div class="map-focus-brand"><img src="/hradnik-app-icon.svg" alt=""><b>VYBRANÁ PAMÁTKA</b></div><div class="focus-placeholder"><strong>Klikni na památku v mapě</strong><br><span>Otevře se její detail s informacemi, stavem návštěvy a možností navigace.</span></div>';layout.appendChild(panel)
  }
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))
}

function polishPage(){
  const main=document.querySelector('main.wrap'); if(!main)return
  main.classList.add('redesign-main')
  const title=document.querySelector('#content h1'); if(title)title.classList.add('redesign-title')
  beautifyPlaces();
  if(document.querySelector('#map'))enhanceMap()
}

function apply(){
  const app=document.querySelector('#app'); if(!app)return
  const header=app.querySelector('header'); const nav=app.querySelector('#nav')
  if(header&&nav){buildSidebar(app,header,nav);addGlobalSearch(header)}
  polishPage()
}

let busy=false
const observer=new MutationObserver(()=>{if(busy)return;busy=true;queueMicrotask(()=>{try{apply()}finally{busy=false}})})
const start=()=>{const app=document.querySelector('#app');if(!app)return;observer.observe(app,{childList:true,subtree:true});apply()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
