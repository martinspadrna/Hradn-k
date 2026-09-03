/* Hradník — force the supplied reference shell onto the real DOM. */
const LABELS=['Mapa','Seznam','Oblíbené','Vyhledávání','Kategorie','O aplikaci']
const ICONS=['map','list','favorites','search','nav-grid','nav-info']
let done=false
function findNav(){
  const candidates=[...document.querySelectorAll('nav,.nav')].filter(n=>!n.closest('.redesign-sidebar')&&n.querySelectorAll('button').length>=6)
  return candidates.sort((a,b)=>b.querySelectorAll('button').length-a.querySelectorAll('button').length)[0]||null
}
function forceShell(){
  const app=document.querySelector('#app'), header=document.querySelector('header'), nav=findNav()
  if(!app||!header||!nav)return false
  let side=app.querySelector('.redesign-sidebar')
  if(!side){side=document.createElement('aside');side.className='redesign-sidebar';app.insertBefore(side,app.firstChild)}
  if(nav.parentElement!==side)side.appendChild(nav)
  nav.classList.add('redesign-nav')
  ;[...nav.querySelectorAll('button')].slice(0,6).forEach((b,i)=>{
    b.textContent=''
    b.setAttribute('aria-label',LABELS[i])
    b.dataset.redesignReady='1'
    const img=document.createElement('img');img.src=`/icons/${ICONS[i]}.svg`;img.alt='';img.setAttribute('aria-hidden','true')
    const span=document.createElement('span');span.textContent=LABELS[i]
    b.append(img,span)
  })
  side.querySelector('.redesign-side-footer')?.remove()
  if(!document.querySelector('.reference-force-brand')){const f=document.createElement('div');f.className='reference-force-brand';f.innerHTML='<img src="/hradnik-logo.svg" alt="Hradník"><span>Objevuj.<br>Poznávej.<br>Chraň.</span>';side.appendChild(f)}
  done=true
  return true
}
function start(){
  if(forceShell())return
  const o=new MutationObserver(()=>{if(forceShell())o.disconnect()})
  o.observe(document.body,{childList:true,subtree:true})
  setTimeout(()=>{if(!done)o.disconnect()},12000)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
