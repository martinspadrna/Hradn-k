/* Hradník — force the supplied reference shell onto the real DOM. */
const LABELS=['Mapa','Seznam','Oblíbené','Vyhledávání','Kategorie','O aplikaci']
const ICONS=['map','list','favorites','search','nav-grid','nav-info']
let done=false
function install(){
  if(document.getElementById('reference-force-style'))return
  const s=document.createElement('style');s.id='reference-force-style';s.textContent=`
@media(min-width:851px){
html,body,#app{background:#080b0e!important;color:#f3f1eb!important}
header{position:fixed!important;left:0!important;right:0!important;top:0!important;height:85px!important;padding:0 24px!important;background:#080b0e!important;border-bottom:1px solid #252e33!important;z-index:910!important}
header .top{height:85px!important;min-height:85px!important;margin:0!important;display:flex!important;align-items:center!important;gap:18px!important}
header .top>div:first-child{display:flex!important;align-items:center!important;flex:0 0 220px!important;min-width:220px!important}
header .top>div:first-child .logo{width:190px!important;height:54px!important;margin:0!important;padding:0!important;font-size:0!important;background:url('/hradnik-logo.svg') left center/contain no-repeat!important;color:transparent!important}
header .top>div:first-child .sub{display:none!important}
header .top .globalSearchWrap{display:block!important;flex:0 0 410px!important;width:410px!important}
header .top .globalSearch{width:410px!important;height:45px!important;box-sizing:border-box!important;border-radius:8px!important;background:#11171b!important;border:1px solid #30383d!important;color:#f3f1eb!important;padding:0 16px 0 44px!important;font-size:15px!important}
header .top .reference-force-search-icon{position:absolute!important;width:20px!important;height:20px!important;margin-left:14px!important;pointer-events:none!important}
header .top .reference-force-count{font-size:15px!important;font-weight:700!important;white-space:nowrap!important;color:#f3f1eb!important}
header .account{margin-left:auto!important;display:flex!important;align-items:center!important;gap:10px!important}
header .account b{display:none!important}
header .account button{width:46px!important;height:46px!important;border-radius:10px!important;background:#11171b!important;border:1px solid #30383d!important;color:#eee!important;font-size:0!important}
.redesign-sidebar{display:flex!important;position:fixed!important;left:0!important;top:85px!important;bottom:0!important;width:194px!important;box-sizing:border-box!important;padding:25px 15px 20px!important;background:linear-gradient(180deg,#0d1317,#0a0e11)!important;border-right:1px solid #252e33!important;z-index:900!important;box-shadow:none!important;flex-direction:column!important}
.redesign-sidebar .nav{display:flex!important;flex-direction:column!important;gap:5px!important;width:100%!important;margin:0!important;padding:0!important}
.redesign-sidebar .nav button{display:flex!important;width:100%!important;height:53px!important;box-sizing:border-box!important;align-items:center!important;justify-content:flex-start!important;gap:15px!important;padding:0 16px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:#f0efeb!important;font-size:15px!important;font-weight:700!important}
.redesign-sidebar .nav button img{width:24px!important;height:24px!important;flex:0 0 24px!important;margin:0!important}.redesign-sidebar .nav button.active{background:#37301f!important;color:#f0c44a!important}
.reference-force-brand{display:flex!important;align-items:center!important;gap:13px!important;margin-top:auto!important;padding:15px 12px!important;border:1px solid #293238!important;border-radius:10px!important;color:#f1eee5!important;font-size:13px!important;line-height:1.45!important}.reference-force-brand img{width:52px!important;height:52px!important;object-fit:contain!important}
main.wrap{margin:85px 0 0 194px!important;width:calc(100% - 194px)!important;max-width:none!important;padding:0!important}
#content>section{max-width:none!important;margin:0!important;padding:0!important}.hero{display:none!important}
}
@media(max-width:850px){
header{height:104px!important;position:sticky!important;top:0!important;padding:0 15px!important;background:#080b0e!important;border-bottom:1px solid #242d32!important}header .top{height:104px!important;min-height:104px!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;position:relative!important}
header .top>div:first-child{position:absolute!important;left:50%!important;transform:translateX(-50%)!important;display:flex!important;align-items:center!important}header .top>div:first-child .logo{width:135px!important;height:36px!important;font-size:0!important;background:url('/hradnik-logo.svg') center/contain no-repeat!important;color:transparent!important}header .top>div:first-child .sub,header .account{display:none!important}
.mobileHeaderMenu{display:grid!important;place-items:center!important;width:38px!important;height:38px!important;padding:0!important;border:0!important;background:transparent!important;z-index:3!important}.mobileHeaderMenu span{display:block!important;width:21px!important;height:2px!important;background:#eee!important;margin:2px 0!important}.mobileHeaderSearch{display:grid!important;place-items:center!important;width:38px!important;height:38px!important;border:0!important;background:transparent!important;padding:0!important;margin-left:auto!important}.mobileHeaderSearch img{width:24px!important;height:24px!important}
main.wrap{width:100%!important;margin:0!important;padding:0 8px 84px!important}.redesign-sidebar{height:76px!important;top:auto!important;bottom:0!important;left:0!important;right:0!important;width:100%!important;padding:4px 8px calc(4px + env(safe-area-inset-bottom))!important;background:#090d10!important;border-top:1px solid #273137!important;box-sizing:border-box!important}.redesign-sidebar .nav{height:68px!important;display:grid!important;grid-template-columns:repeat(5,1fr)!important;gap:1px!important}.redesign-sidebar .nav button{height:66px!important;padding:5px 2px!important;border-radius:8px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;color:#f0f0ed!important;font-size:10px!important;font-weight:700!important}.redesign-sidebar .nav button img{width:24px!important;height:24px!important;margin:0!important}.redesign-sidebar .nav button.active{background:#37301f!important;color:#f0c44a!important}.redesign-sidebar .nav button:nth-child(6){display:none!important}.redesign-sidebar .nav button:nth-child(5) span{display:none!important}.redesign-sidebar .nav button:nth-child(5)::after{content:'Více';font-size:10px!important;color:inherit!important}.reference-force-brand{display:none!important}.hero{display:none!important}
}
`;document.head.appendChild(s)
}
function findNav(){
  const candidates=[...document.querySelectorAll('nav,.nav')].filter(n=>!n.closest('.redesign-sidebar')&&n.querySelectorAll('button').length>=6)
  return candidates.sort((a,b)=>b.querySelectorAll('button').length-a.querySelectorAll('button').length)[0]||null
}
function addTopControls(header){
  const top=header.querySelector('.top');if(!top)return
  if(!top.querySelector('.globalSearchWrap')){
    const wrap=document.createElement('div');wrap.className='globalSearchWrap';const icon=document.createElement('img');icon.className='reference-force-search-icon';icon.src='/icons/search.svg';icon.alt='';const input=document.createElement('input');input.className='globalSearch';input.placeholder='Hledat památku...';input.autocomplete='off';wrap.append(icon,input);top.insertBefore(wrap,top.querySelector('.account')||null)
  }
  if(!top.querySelector('.reference-force-count')){const c=document.createElement('div');c.className='reference-force-count';c.textContent='2 672 památek';const wrap=top.querySelector('.globalSearchWrap');wrap?.after(c)}
  const account=top.querySelector('.account');if(account){const buttons=[...account.querySelectorAll('button')];if(buttons.length>=1)buttons[0].innerHTML='<img src="/icons/favorites.svg" alt="">';if(buttons.length>=2)buttons[1].innerHTML='<img src="/icons/menu-settings.svg" alt="">'}
}
function forceShell(){
  install();
  const app=document.querySelector('#app'),header=document.querySelector('header'),nav=findNav();if(!app||!header||!nav)return false
  addTopControls(header)
  let side=app.querySelector('.redesign-sidebar');if(!side){side=document.createElement('aside');side.className='redesign-sidebar';app.insertBefore(side,app.firstChild)}
  if(nav.parentElement!==side)side.appendChild(nav)
  nav.classList.add('redesign-nav')
  ;[...nav.querySelectorAll('button')].slice(0,6).forEach((b,i)=>{
    b.innerHTML=`<img src="/icons/${ICONS[i]}.svg" alt=""><span>${LABELS[i]}</span>`
    b.setAttribute('aria-label',LABELS[i]);b.dataset.redesignReady='1'
  })
  side.querySelector('.redesign-side-footer')?.remove()
  if(!side.querySelector('.reference-force-brand')){const f=document.createElement('div');f.className='reference-force-brand';f.innerHTML='<img src="/hradnik-logo.svg" alt="Hradník"><span>Objevuj.<br>Poznávej.<br>Chraň.</span>';side.appendChild(f)}
  done=true;return true
}
function start(){
  if(forceShell())return
  const o=new MutationObserver(()=>{if(forceShell())o.disconnect()});o.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{if(!done)o.disconnect()},12000)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
