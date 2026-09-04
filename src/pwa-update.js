import { registerSW } from 'virtual:pwa-register'

// Hradník PWA updater — explicit update flow inspired by the RaK behaviour.
// A new deployment is downloaded in the background. Once ready, the user gets
// one clear action that activates the waiting worker and reloads into the new version.
let registration = null
let updateAvailable = false
let applyingUpdate = false
let lastCheckAt = 0
const CHECK_THROTTLE_MS = 45_000
const PERIODIC_CHECK_MS = 15 * 60_000

function injectStyle(){
  if(document.getElementById('hradnik-pwa-update-style')) return
  const style=document.createElement('style')
  style.id='hradnik-pwa-update-style'
  style.textContent=`
#hradnik-update-banner{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:20000;width:min(620px,calc(100% - 28px));box-sizing:border-box;display:flex;align-items:center;gap:14px;padding:13px 14px 13px 16px;border:1px solid #5f5129;border-radius:13px;background:rgba(17,23,27,.98);box-shadow:0 18px 55px rgba(0,0,0,.52);color:#f3f1eb;backdrop-filter:blur(12px)}
#hradnik-update-banner .hradnik-update-icon{width:40px;height:40px;flex:0 0 40px;border-radius:10px;border:1px solid #554822;background:#2d281b;display:grid;place-items:center}#hradnik-update-banner .hradnik-update-icon img{width:26px;height:26px}
#hradnik-update-banner .hradnik-update-copy{min-width:0;flex:1}#hradnik-update-banner b{display:block;font-size:14px}#hradnik-update-banner small{display:block;color:#aab3b8;margin-top:3px;line-height:1.35}
#hradnik-update-banner button{min-height:40px;flex:0 0 auto;border:1px solid #7a652b;border-radius:9px;background:#3a311c;color:#f0c44a;padding:0 15px;font-weight:800;cursor:pointer}#hradnik-update-banner button:disabled{opacity:.62;cursor:wait}
.hradnik-pwa-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:19999;padding:10px 14px;border:1px solid #30383d;border-radius:10px;background:#11171b;color:#d9dfdf;font-size:13px;box-shadow:0 12px 35px rgba(0,0,0,.4)}
@media(max-width:850px){#hradnik-update-banner{bottom:88px;align-items:flex-start}#hradnik-update-banner .hradnik-update-icon{display:none}#hradnik-update-banner button{min-height:42px}.hradnik-pwa-toast{bottom:88px}}
@media(max-width:520px){#hradnik-update-banner{display:grid;grid-template-columns:1fr}#hradnik-update-banner button{width:100%}}
  `
  document.head.appendChild(style)
}

function toast(message){
  injectStyle()
  document.querySelector('.hradnik-pwa-toast')?.remove()
  const el=document.createElement('div')
  el.className='hradnik-pwa-toast'
  el.textContent=message
  document.body.appendChild(el)
  setTimeout(()=>el.remove(),2600)
}

function showUpdateBanner(){
  injectStyle()
  let banner=document.getElementById('hradnik-update-banner')
  if(!banner){
    banner=document.createElement('div')
    banner.id='hradnik-update-banner'
    banner.setAttribute('role','status')
    banner.innerHTML=`<div class="hradnik-update-icon"><img src="/hradnik-app-icon.svg" alt=""></div><div class="hradnik-update-copy"><b>Je připravená nová verze Hradníku</b><small>Aktualizace už je stažená. Použijte ji jedním klepnutím.</small></div><button type="button">Aktualizovat</button>`
    document.body.appendChild(banner)
  }
  const button=banner.querySelector('button')
  button.disabled=false
  button.textContent='Aktualizovat'
  button.onclick=applyUpdate
}

async function checkForUpdate(force=false){
  if(!('serviceWorker' in navigator)) return false
  const now=Date.now()
  if(!force && now-lastCheckAt<CHECK_THROTTLE_MS) return updateAvailable
  lastCheckAt=now
  try{
    registration = registration || await navigator.serviceWorker.getRegistration()
    await registration?.update()
    return updateAvailable
  }catch(error){
    console.warn('[Hradník PWA] Kontrola aktualizace selhala',error)
    return false
  }
}

async function applyUpdate(){
  if(applyingUpdate) return
  applyingUpdate=true
  const banner=document.getElementById('hradnik-update-banner')
  const button=banner?.querySelector('button')
  if(button){ button.disabled=true; button.textContent='Aktualizuji…' }
  try{
    await updateSW(true)
  }catch(error){
    console.warn('[Hradník PWA] Aktivace aktualizace selhala',error)
    applyingUpdate=false
    if(button){ button.disabled=false; button.textContent='Zkusit znovu' }
    return
  }
  // iOS standalone can occasionally delay controllerchange. A guarded reload
  // makes sure the already-installed worker actually becomes the visible app.
  setTimeout(()=>{
    if(document.visibilityState!=='hidden') location.reload()
  },5000)
}

const updateSW = registerSW({
  immediate:true,
  onNeedRefresh(){
    updateAvailable=true
    window.hradnikPwaUpdateAvailable=true
    showUpdateBanner()
    window.dispatchEvent(new CustomEvent('hradnik:pwa-update-ready'))
  },
  onOfflineReady(){
    // Keep this deliberately subtle; first install must not look like an update.
    if(sessionStorage.getItem('hradnik_offline_ready_seen')) return
    sessionStorage.setItem('hradnik_offline_ready_seen','1')
    toast('Hradník je připravený i pro spuštění z PWA.')
  },
  onRegisteredSW(_swUrl,reg){
    registration=reg || null
    setTimeout(()=>checkForUpdate(true),1500)
  },
  onRegisterError(error){
    console.warn('[Hradník PWA] Service worker se nepodařilo zaregistrovat',error)
  }
})

window.hradnikPwaUpdateAvailable=false
window.hradnikPwaCheck=()=>checkForUpdate(true)
window.hradnikPwaApply=applyUpdate

window.addEventListener('focus',()=>checkForUpdate(false))
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible') checkForUpdate(false)
})
setInterval(()=>checkForUpdate(false),PERIODIC_CHECK_MS)
