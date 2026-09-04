/* Hradník — deterministic reference shell runtime.
   Runs independently of the async data bootstrap so the reference navigation
   is always moved into the left rail on desktop and bottom rail on mobile. */
const LABELS = ['Mapa','Seznam','Oblíbené','Vyhledávání','Kategorie','O aplikaci']
const ICONS = ['map','list','favorites','search','nav-grid','nav-info']
let initialMapRequested = false
let scheduled = false

function injectRuntimeStyle(){
  if(document.getElementById('reference-runtime-style')) return
  const style = document.createElement('style')
  style.id = 'reference-runtime-style'
  style.textContent = `
.reference-hidden-logout{display:none!important}
.reference-header-action{display:grid!important;place-items:center!important}
.reference-mobile-drawer{display:none;position:fixed;inset:104px 0 76px;z-index:990;background:rgba(0,0,0,.62)}
.reference-mobile-drawer.open{display:block}
.reference-mobile-drawer-panel{width:min(330px,88vw);height:100%;box-sizing:border-box;background:#0f1519;border-right:1px solid #2b3439;padding:18px;box-shadow:18px 0 50px rgba(0,0,0,.45)}
.reference-mobile-drawer-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #283137}
.reference-mobile-drawer-head img{width:150px;height:auto}.reference-mobile-drawer-close{border:0;background:transparent;color:#eee;font-size:28px}
.reference-mobile-drawer button[data-ref-mobile]{width:100%;min-height:48px;margin:3px 0;border:0;border-radius:9px;background:transparent;color:#f3f1eb;text-align:left;padding:0 12px;font-weight:700}
.reference-mobile-drawer button[data-ref-mobile]:active{background:#302a1d;color:#f0c44a}
.reference-category-page,.reference-about-page{max-width:1040px;margin:0 auto;padding:34px 32px 60px}
.reference-category-page h1,.reference-about-page h1{font-family:Georgia,'Times New Roman',serif;margin:6px 0 22px;font-size:34px}
.reference-category-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.reference-category-card{min-height:116px;border:1px solid #2b3439;border-radius:12px;background:#11171b;color:#f3f1eb;padding:18px;display:flex;align-items:center;gap:16px;text-align:left;cursor:pointer}
.reference-category-card:hover{border-color:#665527;background:#171a18}.reference-category-card img{width:38px;height:38px}.reference-category-card b{display:block;font-size:17px}.reference-category-card small{display:block;color:#99a3a9;margin-top:5px}
.reference-about-card{max-width:680px;border:1px solid #2b3439;border-radius:14px;background:#11171b;padding:28px}.reference-about-card>img{width:210px;max-width:70%;margin-bottom:22px}.reference-about-card p{color:#aeb7bc;line-height:1.7}
.reference-settings-overlay{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;background:rgba(0,0,0,.68);padding:20px}
.reference-settings-panel{width:min(520px,100%);box-sizing:border-box;border:1px solid #323b40;border-radius:15px;background:#10161a;padding:22px;box-shadow:0 25px 70px rgba(0,0,0,.48)}
.reference-settings-head{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px}.reference-settings-head h2{margin:0}.reference-settings-close{width:36px;height:36px;border:1px solid #313a3f;border-radius:9px;background:#171d20;color:#eee;font-size:22px}
.reference-settings-row{padding:15px 0;border-top:1px solid #283137}.reference-settings-row b{display:block}.reference-settings-row small{display:block;color:#98a3a9;margin-top:4px;line-height:1.45}
.reference-settings-actions{display:flex;gap:9px;margin-top:13px;flex-wrap:wrap}.reference-settings-actions button{min-height:40px;border:1px solid #4e452a;border-radius:9px;background:#302a1d;color:#f0c44a;padding:0 14px;font-weight:800}
@media(max-width:850px){.reference-category-page,.reference-about-page{padding:24px 16px 38px}.reference-category-grid{grid-template-columns:1fr 1fr}.reference-category-page h1,.reference-about-page h1{font-size:28px}}
@media(max-width:520px){.reference-category-grid{grid-template-columns:1fr}}
  `
  document.head.appendChild(style)
}

function content(){ return document.getElementById('content') }
function navButtons(nav){ return [...nav.querySelectorAll(':scope > button')] }
function currentNav(){
  return document.querySelector('.redesign-sidebar > .nav') || document.querySelector('main.redesign-main > .nav') || document.querySelector('main > .nav')
}

function showCategories(nav){
  const host = content(); if(!host) return
  host.innerHTML = `<section class="reference-category-page"><p class="eyebrow">KATEGORIE</p><h1>Objevujte podle typu</h1><div class="reference-category-grid"></div></section>`
  const grid = host.querySelector('.reference-category-grid')
  const categories = [
    ['Hrad','home','Hrady a hradní areály'],
    ['Zámek','chateau','Zámky a zámecké areály'],
    ['Zřícenina','ruin','Zříceniny a ruiny'],
    ['Tvrz','fortress','Tvrze a opevněná sídla'],
    ['Klášter','monastery','Kláštery a komendy'],
    ['Opevněné místo','home','Další opevněná místa']
  ]
  categories.forEach(([label,icon,description])=>{
    const button = document.createElement('button')
    button.className = 'reference-category-card'
    button.innerHTML = `<img src="/icons/${icon}.svg" alt=""><span><b>${label}</b><small>${description}</small></span>`
    button.onclick = ()=>{
      navButtons(nav)[1]?.click()
      setTimeout(()=>document.querySelector('#typeChips button')?.parentElement?.querySelectorAll('button') && [...document.querySelectorAll('#typeChips button')].find(b=>b.textContent.trim()===label)?.click(),120)
    }
    grid.appendChild(button)
  })
  markActive(nav,4)
}

function showAbout(nav){
  const host = content(); if(!host) return
  host.innerHTML = `<section class="reference-about-page"><p class="eyebrow">O APLIKACI</p><h1>Hradník</h1><div class="reference-about-card"><img src="/hradnik-logo.svg" alt="Hradník"><p>Osobní průvodce českými hrady, zámky, zříceninami, tvrzemi, kláštery a dalšími historickými místy.</p><p><b>Objevuj. Poznávej. Chraň.</b></p></div></section>`
  markActive(nav,5)
}

function markActive(nav,index){
  navButtons(nav).forEach((button,i)=>{
    button.classList.toggle('active',i===index)
    button.classList.toggle('redesign-active',i===index)
  })
}

function syncActive(nav){
  if(document.querySelector('.reference-about-page')) return markActive(nav,5)
  if(document.querySelector('.reference-category-page')) return markActive(nav,4)
  if(document.querySelector('#map')) return markActive(nav,0)
  if(document.querySelector('#mineList')) return markActive(nav,2)
  if(document.querySelector('#search')) return markActive(nav,document.activeElement?.id==='search'?3:1)
}

function configureNav(nav){
  nav.classList.add('redesign-nav')
  let buttons = navButtons(nav)
  while(buttons.length<6){
    const button = document.createElement('button')
    button.type = 'button'
    button.className = buttons.length===5 ? 'reference-about-nav' : ''
    nav.appendChild(button)
    buttons = navButtons(nav)
  }
  buttons.slice(0,6).forEach((button,i)=>{
    button.innerHTML = `<img src="/icons/${ICONS[i]}.svg" alt=""><span>${LABELS[i]}</span>`
    button.setAttribute('aria-label',LABELS[i])
  })
  buttons[0].dataset.tab = 'map'
  buttons[1].dataset.tab = 'catalog'
  buttons[2].dataset.tab = 'mine'
  buttons[3].dataset.tab = 'catalog'
  buttons[4].removeAttribute('data-tab')
  buttons[5].removeAttribute('data-tab')

  // The original handlers read data-tab at click time, so map/catalog/mine stay native.
  buttons[2].onclick = ()=>{
    buttons[2].dataset.tab = 'mine'
    const original = document.querySelector('main .nav button[data-tab="mine"]')
    // When the nav is in the sidebar, dispatching through the main handler is no longer possible.
    // Reuse the handler captured by the button before this override when available via a one-shot clone fallback.
    const old = buttons[2].dataset.referenceBoundMine
    if(old) return
    buttons[2].dataset.referenceBoundMine = '1'
    buttons[2].dataset.tab = 'mine'
    // Temporarily restore a native-looking click by using the preserved data-tab and the app's render listener on next rebuild.
    const evt = new CustomEvent('hradnik:navigate',{detail:{tab:'mine'}})
    window.dispatchEvent(evt)
  }

  // Native handlers on the first three are preserved unless we explicitly replace below.
  // Favorites/search need a post-render action, therefore preserve the current onclick first.
  const mineNative = buttons[2].__hradnikNative || buttons[2].onclick
  const searchNative = buttons[3].__hradnikNative || buttons[3].onclick
  if(!buttons[2].__hradnikNative && mineNative) buttons[2].__hradnikNative = mineNative
  if(!buttons[3].__hradnikNative && searchNative) buttons[3].__hradnikNative = searchNative

  // Rebind using direct clicks on the original route-compatible buttons after each render.
  buttons[2].onclick = ()=>{
    buttons[2].dataset.tab='mine'
    // Main's listener may have been overwritten by previous shell passes; use a hidden bridge if present.
    const bridge = document.querySelector('[data-reference-route="mine"]')
    if(bridge) bridge.click()
    else {
      const descriptor = buttons[2].__originalOnclick
      if(typeof descriptor==='function') descriptor.call(buttons[2])
      else {
        // data-tab is read by the main handler installed on every fresh render; dispatch before override is captured in ensure().
        buttons[2].__nativeOnclick?.call(buttons[2])
      }
    }
    setTimeout(()=>document.getElementById('mf')?.click(),120)
  }
  buttons[3].onclick = ()=>{
    buttons[1].click()
    setTimeout(()=>document.getElementById('search')?.focus(),120)
  }
  buttons[4].onclick = ()=>showCategories(nav)
  buttons[5].onclick = ()=>showAbout(nav)
}

function ensureFooter(side){
  if(side.querySelector('.reference-force-brand')) return
  const footer = document.createElement('div')
  footer.className = 'reference-force-brand'
  footer.innerHTML = '<img src="/hradnik-app-icon.svg" alt=""><span>Objevuj.<br>Poznávej.<br>Chraň.</span>'
  side.appendChild(footer)
}

function openSettings(){
  document.querySelector('.reference-settings-overlay')?.remove()
  const overlay = document.createElement('div')
  overlay.className = 'reference-settings-overlay'
  overlay.innerHTML = `<div class="reference-settings-panel" role="dialog" aria-modal="true" aria-label="Nastavení"><div class="reference-settings-head"><h2>Nastavení</h2><button class="reference-settings-close" aria-label="Zavřít">×</button></div><div class="reference-settings-row"><b>Aktualizace aplikace</b><small class="reference-update-status">Hradník automaticky kontroluje nové verze. Když je nová verze stažená, nabídne její okamžité použití.</small><div class="reference-settings-actions"><button class="reference-check-update">Zkontrolovat aktualizaci</button></div></div></div>`
  document.body.appendChild(overlay)
  const close = ()=>overlay.remove()
  overlay.querySelector('.reference-settings-close').onclick = close
  overlay.onclick = e=>{ if(e.target===overlay) close() }
  overlay.querySelector('.reference-check-update').onclick = async()=>{
    const status = overlay.querySelector('.reference-update-status')
    status.textContent = 'Kontroluji novou verzi…'
    try{
      await window.hradnikPwaCheck?.()
      setTimeout(()=>{ if(status.isConnected) status.textContent = window.hradnikPwaUpdateAvailable ? 'Nová verze je připravená. Použijte tlačítko Aktualizovat v oznámení.' : 'Máte nejnovější dostupnou verzi.' },700)
    }catch{ status.textContent = 'Kontrolu se nepodařilo dokončit. Zkuste to znovu.' }
  }
}

function ensureHeader(header,nav){
  const top = header.querySelector('.top'); if(!top) return
  if(!top.querySelector('.globalSearchWrap')){
    const wrap = document.createElement('div')
    wrap.className = 'globalSearchWrap'
    wrap.innerHTML = '<img class="reference-force-search-icon" src="/icons/search.svg" alt=""><input class="globalSearch" aria-label="Hledat památku" placeholder="Hledat památku..." autocomplete="off">'
    top.insertBefore(wrap,top.querySelector('.account')||null)
    const input = wrap.querySelector('input')
    input.onkeydown = e=>{
      if(e.key!=='Enter') return
      navButtons(nav)[1]?.click()
      setTimeout(()=>{
        const search = document.getElementById('search')
        if(search){ search.value=input.value.trim(); search.dispatchEvent(new Event('input',{bubbles:true})); search.focus() }
      },120)
    }
  }
  if(!top.querySelector('.reference-force-count')){
    const count = document.createElement('div')
    count.className = 'reference-force-count'
    count.textContent = 'Památky po celé ČR'
    top.querySelector('.globalSearchWrap')?.after(count)
  }
  const mapCount = document.getElementById('mapCount')?.textContent?.match(/[\d\s.]+/)?.[0]?.trim()
  if(mapCount) top.querySelector('.reference-force-count').textContent = `${mapCount} památek`

  let account = top.querySelector('.account')
  if(!account){ account=document.createElement('div'); account.className='account'; top.appendChild(account) }
  account.querySelector('#logout')?.classList.add('reference-hidden-logout')
  if(!account.querySelector('.reference-favorites-button')){
    const fav = document.createElement('button')
    fav.type='button'; fav.className='reference-header-action reference-favorites-button'; fav.setAttribute('aria-label','Oblíbené')
    fav.innerHTML='<img src="/icons/favorites.svg" alt="">'; fav.onclick=()=>navButtons(nav)[2]?.click(); account.prepend(fav)
  }
  if(!account.querySelector('.reference-settings-button')){
    const settings = document.createElement('button')
    settings.type='button'; settings.className='reference-header-action reference-settings-button'; settings.setAttribute('aria-label','Nastavení')
    settings.innerHTML='<img src="/icons/menu-settings.svg" alt="">'; settings.onclick=openSettings; account.appendChild(settings)
  }

  if(!top.querySelector('.mobileHeaderMenu')){
    const menu = document.createElement('button')
    menu.type='button'; menu.className='mobileHeaderMenu'; menu.setAttribute('aria-label','Nabídka'); menu.innerHTML='<span></span><span></span><span></span>'
    menu.onclick=()=>ensureMobileDrawer(nav).classList.add('open')
    top.prepend(menu)
  }
  if(!top.querySelector('.mobileHeaderSearch')){
    const search = document.createElement('button')
    search.type='button'; search.className='mobileHeaderSearch'; search.setAttribute('aria-label','Hledat'); search.innerHTML='<img src="/icons/search.svg" alt="">'
    search.onclick=()=>{ navButtons(nav)[3]?.click(); setTimeout(()=>document.getElementById('search')?.focus(),120) }
    top.append(search)
  }
}

function ensureMobileDrawer(nav){
  let drawer = document.querySelector('.reference-mobile-drawer')
  if(drawer) return drawer
  drawer = document.createElement('div')
  drawer.className='reference-mobile-drawer'
  drawer.innerHTML = `<div class="reference-mobile-drawer-panel"><div class="reference-mobile-drawer-head"><img src="/hradnik-logo.svg" alt="Hradník"><button class="reference-mobile-drawer-close" aria-label="Zavřít">×</button></div><button data-ref-mobile="categories">Kategorie</button><button data-ref-mobile="about">O aplikaci</button><button data-ref-mobile="settings">Nastavení</button></div>`
  document.body.appendChild(drawer)
  const close=()=>drawer.classList.remove('open')
  drawer.onclick=e=>{ if(e.target===drawer) close() }
  drawer.querySelector('.reference-mobile-drawer-close').onclick=close
  drawer.querySelector('[data-ref-mobile="categories"]').onclick=()=>{close();showCategories(nav)}
  drawer.querySelector('[data-ref-mobile="about"]').onclick=()=>{close();showAbout(nav)}
  drawer.querySelector('[data-ref-mobile="settings"]').onclick=()=>{close();openSettings()}
  return drawer
}

function preserveNativeHandlers(nav){
  const buttons = navButtons(nav)
  buttons.forEach(button=>{ if(!button.__nativeOnclick && typeof button.onclick==='function') button.__nativeOnclick = button.onclick })
}

function configureRoutes(nav){
  const buttons=navButtons(nav)
  // Restore native app navigation for map/list/favorites bridge before overriding special destinations.
  const callNative = (button,tab)=>{
    button.dataset.tab=tab
    const fn=button.__nativeOnclick
    if(typeof fn==='function') fn.call(button)
  }
  buttons[0].onclick=()=>callNative(buttons[0],'map')
  buttons[1].onclick=()=>callNative(buttons[1],'catalog')
  buttons[2].onclick=()=>{ callNative(buttons[2],'mine'); setTimeout(()=>document.getElementById('mf')?.click(),130) }
  buttons[3].onclick=()=>{ callNative(buttons[3],'catalog'); setTimeout(()=>document.getElementById('search')?.focus(),130) }
  buttons[4].onclick=()=>showCategories(nav)
  buttons[5].onclick=()=>showAbout(nav)
}

function ensure(){
  injectRuntimeStyle()
  const app=document.getElementById('app')
  const header=app?.querySelector('header')
  const main=app?.querySelector('main.redesign-main,main')
  const nav=currentNav()
  if(!app||!header||!main||!nav) return false

  preserveNativeHandlers(nav)
  let side=app.querySelector('.redesign-sidebar')
  if(!side){ side=document.createElement('aside'); side.className='redesign-sidebar'; app.insertBefore(side,header.nextSibling||main) }
  if(nav.parentElement!==side) side.insertBefore(nav,side.firstChild)
  configureNav(nav)
  configureRoutes(nav)
  ensureFooter(side)
  ensureHeader(header,nav)
  ensureMobileDrawer(nav)
  syncActive(nav)

  if(!initialMapRequested){
    initialMapRequested=true
    if(!document.getElementById('map')) setTimeout(()=>navButtons(nav)[0]?.click(),40)
  }
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))
  return true
}

function schedule(){
  if(scheduled) return
  scheduled=true
  requestAnimationFrame(()=>{ scheduled=false; ensure() })
}

const start=()=>{
  injectRuntimeStyle()
  const app=document.getElementById('app')
  if(!app) return
  const observer=new MutationObserver(schedule)
  observer.observe(app,{childList:true,subtree:true})
  ensure()
  // Async auth/catalog bootstrap can take a while on a cold PWA start.
  ;[80,200,450,900,1600,2800,4500,7000,10000].forEach(ms=>setTimeout(ensure,ms))
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start()
