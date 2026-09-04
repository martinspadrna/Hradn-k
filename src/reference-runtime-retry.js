/* Hradník — deterministic reference shell runtime.
   The app renders asynchronously, so this layer waits for the real navigation,
   moves it into the reference rail and routes before older capture listeners. */
const LABELS=['Mapa','Seznam','Oblíbené','Vyhledávání','Kategorie','O aplikaci']
const ICONS=['map','list','favorites','search','nav-grid','nav-info']
let firstMapDone=false
let frameQueued=false

function addStyle(){
  let style=document.getElementById('reference-runtime-style')
  if(!style){style=document.createElement('style');style.id='reference-runtime-style';document.head.appendChild(style)}
  style.textContent=`
body #app header .account>#logout.reference-hidden-logout,
body #app header .account>button:not(.reference-header-action){display:none!important}
body #app header .reference-header-action{display:grid!important;place-items:center!important;position:relative!important}
body #app header .reference-header-action::before,body #app header .reference-header-action::after{display:none!important;content:none!important}
body #app header .reference-header-action img{display:block!important;position:static!important;margin:0!important;width:22px!important;height:22px!important}
.reference-mobile-drawer{display:none;position:fixed;inset:104px 0 76px;z-index:12000;background:rgba(0,0,0,.66)}
.reference-mobile-drawer.open{display:block}.reference-mobile-drawer-panel{width:min(330px,88vw);height:100%;box-sizing:border-box;background:#0f1519;border-right:1px solid #2b3439;padding:18px;box-shadow:18px 0 50px rgba(0,0,0,.45)}
.reference-mobile-drawer-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:15px;border-bottom:1px solid #283137}.reference-mobile-drawer-head img{width:150px;height:auto}.reference-mobile-drawer-close{border:0;background:transparent;color:#eee;font-size:28px}
.reference-mobile-drawer button[data-ref-mobile]{width:100%;min-height:48px;margin:3px 0;border:0;border-radius:9px;background:transparent;color:#f3f1eb;text-align:left;padding:0 12px;font-weight:700}.reference-mobile-drawer button[data-ref-mobile]:active{background:#302a1d;color:#f0c44a}
.reference-category-page,.reference-about-page{max-width:1040px;margin:0 auto;padding:34px 32px 60px}.reference-category-page h1,.reference-about-page h1{font-family:Georgia,'Times New Roman',serif;margin:6px 0 22px;font-size:34px}
.reference-category-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.reference-category-card{min-height:116px;border:1px solid #2b3439;border-radius:12px;background:#11171b;color:#f3f1eb;padding:18px;display:flex;align-items:center;gap:16px;text-align:left;cursor:pointer}.reference-category-card:hover{border-color:#665527;background:#171a18}.reference-category-card img{width:38px;height:38px}.reference-category-card b{display:block;font-size:17px}.reference-category-card small{display:block;color:#99a3a9;margin-top:5px}
.reference-about-card{max-width:680px;border:1px solid #2b3439;border-radius:14px;background:#11171b;padding:28px}.reference-about-card>img{width:210px;max-width:70%;margin-bottom:22px}.reference-about-card p{color:#aeb7bc;line-height:1.7}
.reference-settings-overlay{position:fixed;inset:0;z-index:13000;display:grid;place-items:center;background:rgba(0,0,0,.70);padding:20px}.reference-settings-panel{width:min(520px,100%);box-sizing:border-box;border:1px solid #323b40;border-radius:15px;background:#10161a;padding:22px;box-shadow:0 25px 70px rgba(0,0,0,.48)}.reference-settings-head{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px}.reference-settings-head h2{margin:0}.reference-settings-close{width:36px;height:36px;border:1px solid #313a3f;border-radius:9px;background:#171d20;color:#eee;font-size:22px}.reference-settings-row{padding:15px 0;border-top:1px solid #283137}.reference-settings-row b{display:block}.reference-settings-row small{display:block;color:#98a3a9;margin-top:4px;line-height:1.45}.reference-settings-actions{display:flex;gap:9px;margin-top:13px;flex-wrap:wrap}.reference-settings-actions button{min-height:40px;border:1px solid #4e452a;border-radius:9px;background:#302a1d;color:#f0c44a;padding:0 14px;font-weight:800}
@media(max-width:850px){
 body #app header .top{height:104px!important;min-height:104px!important;position:relative!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 12px!important}
 body #app header .top>div:first-child{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:auto!important;min-width:0!important;flex:none!important;margin:0!important;padding:0!important;display:block!important}
 body #app header .top>div:first-child .logo{display:block!important;width:136px!important;height:38px!important;margin:0!important;background:url('/hradnik-logo.svg') center/contain no-repeat!important;font-size:0!important;color:transparent!important}
 body #app header .mobileHeaderMenu{position:relative!important;left:auto!important;top:auto!important;transform:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;width:42px!important;height:42px!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;z-index:5!important}
 body #app header .mobileHeaderMenu span{display:block!important;width:22px!important;height:2px!important;min-height:2px!important;margin:0!important;border-radius:2px!important;background:#f0efeb!important}
 body #app header .mobileHeaderSearch{position:relative!important;right:auto!important;top:auto!important;display:grid!important;place-items:center!important;width:42px!important;height:42px!important;margin:0 0 0 auto!important;padding:0!important;border:0!important;background:transparent!important;z-index:5!important}
 body #app header .mobileHeaderSearch img{display:block!important;width:24px!important;height:24px!important;margin:0!important}
 .reference-category-page,.reference-about-page{padding:24px 16px 38px}.reference-category-grid{grid-template-columns:1fr 1fr}.reference-category-page h1,.reference-about-page h1{font-size:28px}
}
@media(max-width:520px){.reference-category-grid{grid-template-columns:1fr}}
  `
  // Keep this style last even when linked styles finish loading after the module.
  if(style!==document.head.lastElementChild) document.head.appendChild(style)
}

const content=()=>document.getElementById('content')
const currentNav=()=>document.querySelector('.redesign-sidebar>.nav')||document.querySelector('main.redesign-main>.nav')||document.querySelector('main>.nav')
const buttons=nav=>nav?[...nav.querySelectorAll(':scope>button')]:[]

function mark(nav,index){buttons(nav).forEach((b,i)=>{b.classList.toggle('active',i===index);b.classList.toggle('redesign-active',i===index)})}
function syncActive(nav){
  if(document.querySelector('.reference-about-page'))return mark(nav,5)
  if(document.querySelector('.reference-category-page'))return mark(nav,4)
  if(document.getElementById('map'))return mark(nav,0)
  if(document.getElementById('mineList'))return mark(nav,2)
  if(document.getElementById('search'))return mark(nav,document.activeElement?.id==='search'?3:1)
}

function captureNative(nav){
  buttons(nav).slice(0,5).forEach(b=>{
    if(!b.__hradnikMainOnclick&&typeof b.onclick==='function')b.__hradnikMainOnclick=b.onclick
  })
}

function callNative(button,tab){
  if(!button)return false
  button.dataset.tab=tab
  const fn=button.__hradnikMainOnclick
  if(typeof fn==='function'){fn.call(button);return true}
  return false
}

function route(index,nav=currentNav()){
  const bs=buttons(nav);if(bs.length<5)return
  if(index===0){callNative(bs[0],'map');return}
  if(index===1){callNative(bs[1],'catalog');return}
  if(index===2){callNative(bs[2],'mine');setTimeout(()=>document.getElementById('mf')?.click(),120);return}
  if(index===3){callNative(bs[1],'catalog');setTimeout(()=>document.getElementById('search')?.focus(),120);return}
  if(index===4){showCategories(nav);return}
  if(index===5){showAbout(nav)}
}

function configure(nav){
  captureNative(nav)
  nav.classList.add('redesign-nav')
  let bs=buttons(nav)
  while(bs.length<6){const b=document.createElement('button');b.type='button';if(bs.length===5)b.className='reference-about-nav';nav.appendChild(b);bs=buttons(nav)}
  bs.slice(0,6).forEach((b,i)=>{b.innerHTML=`<img src="/icons/${ICONS[i]}.svg" alt=""><span>${LABELS[i]}</span>`;b.setAttribute('aria-label',LABELS[i])})
  bs[0].dataset.tab='map';bs[1].dataset.tab='catalog';bs[2].dataset.tab='mine';bs[3].dataset.tab='catalog';bs[4].removeAttribute('data-tab');bs[5].removeAttribute('data-tab')
}

function showCategories(nav){
  const host=content();if(!host)return
  host.innerHTML='<section class="reference-category-page"><p class="eyebrow">KATEGORIE</p><h1>Objevujte podle typu</h1><div class="reference-category-grid"></div></section>'
  const data=[['Hrad','home','Hrady a hradní areály'],['Zámek','chateau','Zámky a zámecké areály'],['Zřícenina','ruin','Zříceniny a ruiny'],['Tvrz','fortress','Tvrze a opevněná sídla'],['Klášter','monastery','Kláštery a komendy'],['Opevněné místo','home','Další opevněná místa']]
  const grid=host.querySelector('.reference-category-grid')
  data.forEach(([label,icon,desc])=>{const b=document.createElement('button');b.className='reference-category-card';b.innerHTML=`<img src="/icons/${icon}.svg" alt=""><span><b>${label}</b><small>${desc}</small></span>`;b.onclick=()=>{route(1,currentNav());setTimeout(()=>[...document.querySelectorAll('#typeChips button')].find(x=>x.textContent.trim()===label)?.click(),150)};grid.appendChild(b)})
  mark(nav,4)
}
function showAbout(nav){const host=content();if(!host)return;host.innerHTML='<section class="reference-about-page"><p class="eyebrow">O APLIKACI</p><h1>Hradník</h1><div class="reference-about-card"><img src="/hradnik-logo.svg" alt="Hradník"><p>Osobní průvodce českými hrady, zámky, zříceninami, tvrzemi, kláštery a dalšími historickými místy.</p><p><b>Objevuj. Poznávej. Chraň.</b></p></div></section>';mark(nav,5)}

function footer(side){if(side.querySelector('.reference-force-brand'))return;const f=document.createElement('div');f.className='reference-force-brand';f.innerHTML='<img src="/hradnik-app-icon.svg" alt=""><span>Objevuj.<br>Poznávej.<br>Chraň.</span>';side.appendChild(f)}

function openSettings(){
  document.querySelector('.reference-settings-overlay')?.remove();const o=document.createElement('div');o.className='reference-settings-overlay';o.innerHTML='<div class="reference-settings-panel" role="dialog" aria-modal="true" aria-label="Nastavení"><div class="reference-settings-head"><h2>Nastavení</h2><button class="reference-settings-close" aria-label="Zavřít">×</button></div><div class="reference-settings-row"><b>Aktualizace aplikace</b><small class="reference-update-status">Hradník automaticky kontroluje nové verze. Jakmile je nová verze stažená, nabídne její okamžité použití.</small><div class="reference-settings-actions"><button class="reference-check-update">Zkontrolovat aktualizaci</button></div></div></div>';document.body.appendChild(o)
  const close=()=>o.remove();o.querySelector('.reference-settings-close').onclick=close;o.onclick=e=>{if(e.target===o)close()};o.querySelector('.reference-check-update').onclick=async()=>{const s=o.querySelector('.reference-update-status');s.textContent='Kontroluji novou verzi…';try{await window.hradnikPwaCheck?.();setTimeout(()=>{if(s.isConnected)s.textContent=window.hradnikPwaUpdateAvailable?'Nová verze je připravená. Klepněte na Aktualizovat v oznámení.':'Máte nejnovější dostupnou verzi.'},700)}catch{s.textContent='Kontrolu se nepodařilo dokončit. Zkuste to znovu.'}}
}

function drawer(nav){
  let d=document.querySelector('.reference-mobile-drawer');if(d)return d
  d=document.createElement('div');d.className='reference-mobile-drawer';d.innerHTML='<div class="reference-mobile-drawer-panel"><div class="reference-mobile-drawer-head"><img src="/hradnik-logo.svg" alt="Hradník"><button class="reference-mobile-drawer-close" aria-label="Zavřít">×</button></div><button data-ref-mobile="categories">Kategorie</button><button data-ref-mobile="about">O aplikaci</button><button data-ref-mobile="settings">Nastavení</button></div>';document.body.appendChild(d)
  const close=()=>d.classList.remove('open');d.onclick=e=>{if(e.target===d)close()};d.querySelector('.reference-mobile-drawer-close').onclick=close;d.querySelector('[data-ref-mobile="categories"]').onclick=()=>{close();route(4,currentNav())};d.querySelector('[data-ref-mobile="about"]').onclick=()=>{close();route(5,currentNav())};d.querySelector('[data-ref-mobile="settings"]').onclick=()=>{close();openSettings()};return d
}

function headerControls(header,nav){
  const top=header.querySelector('.top');if(!top)return
  if(!top.querySelector('.globalSearchWrap')){const w=document.createElement('div');w.className='globalSearchWrap';w.innerHTML='<img class="reference-force-search-icon" src="/icons/search.svg" alt=""><input class="globalSearch" aria-label="Hledat památku" placeholder="Hledat památku..." autocomplete="off">';top.insertBefore(w,top.querySelector('.account')||null);w.querySelector('input').onkeydown=e=>{if(e.key!=='Enter')return;const value=e.currentTarget.value.trim();route(1,currentNav());setTimeout(()=>{const q=document.getElementById('search');if(q){q.value=value;q.dispatchEvent(new Event('input',{bubbles:true}));q.focus()}},140)}}
  if(!top.querySelector('.reference-force-count')){const c=document.createElement('div');c.className='reference-force-count';c.textContent='Památky po celé ČR';top.querySelector('.globalSearchWrap')?.after(c)}
  const n=document.getElementById('mapCount')?.textContent?.match(/[\d\s.]+/)?.[0]?.trim();if(n)top.querySelector('.reference-force-count').textContent=`${n} památek`
  let account=top.querySelector('.account');if(!account){account=document.createElement('div');account.className='account';top.appendChild(account)}account.querySelector('#logout')?.classList.add('reference-hidden-logout')
  if(!account.querySelector('.reference-favorites-button')){const b=document.createElement('button');b.type='button';b.className='reference-header-action reference-favorites-button';b.setAttribute('aria-label','Oblíbené');b.innerHTML='<img src="/icons/favorites.svg" alt="">';b.onclick=()=>route(2,currentNav());account.prepend(b)}
  if(!account.querySelector('.reference-settings-button')){const b=document.createElement('button');b.type='button';b.className='reference-header-action reference-settings-button';b.setAttribute('aria-label','Nastavení');b.innerHTML='<img src="/icons/menu-settings.svg" alt="">';b.onclick=openSettings;account.appendChild(b)}
  if(!top.querySelector('.mobileHeaderMenu')){const b=document.createElement('button');b.type='button';b.className='mobileHeaderMenu';b.setAttribute('aria-label','Nabídka');b.innerHTML='<span></span><span></span><span></span>';b.onclick=()=>drawer(currentNav()).classList.add('open');top.prepend(b)}
  if(!top.querySelector('.mobileHeaderSearch')){const b=document.createElement('button');b.type='button';b.className='mobileHeaderSearch';b.setAttribute('aria-label','Hledat');b.innerHTML='<img src="/icons/search.svg" alt="">';b.onclick=()=>route(3,currentNav());top.appendChild(b)}
}

function ensure(){
  addStyle();const app=document.getElementById('app'),header=app?.querySelector('header'),main=app?.querySelector('main'),nav=currentNav();if(!app||!header||!main||!nav)return false
  captureNative(nav);let side=app.querySelector('.redesign-sidebar');if(!side){side=document.createElement('aside');side.className='redesign-sidebar';app.insertBefore(side,main)}if(nav.parentElement!==side)side.insertBefore(nav,side.firstChild);configure(nav);footer(side);headerControls(header,nav);drawer(nav);syncActive(nav)
  if(!firstMapDone){firstMapDone=true;setTimeout(()=>{if(!document.getElementById('map'))route(0,currentNav())},60)}
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));return true
}
function schedule(){if(frameQueued)return;frameQueued=true;requestAnimationFrame(()=>{frameQueued=false;ensure()})}

// Route at the earliest capture point. Older design scripts use capture listeners
// on the nav; intercepting on window prevents them from stealing the click.
window.addEventListener('click',e=>{
  const b=e.target?.closest?.('.redesign-sidebar>.redesign-nav>button');if(!b)return
  const nav=b.parentElement,index=buttons(nav).indexOf(b);if(index<0)return
  e.preventDefault();e.stopImmediatePropagation();route(index,nav)
},true)

function start(){addStyle();const app=document.getElementById('app');if(!app)return;new MutationObserver(schedule).observe(app,{childList:true,subtree:true});ensure();[80,180,350,700,1200,2200,4000,6500,9500].forEach(ms=>setTimeout(ensure,ms));window.addEventListener('load',()=>{addStyle();ensure()},{once:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
