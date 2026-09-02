import L from 'leaflet'

/* Hradník reference mode: map-first UI, satellite map and shield markers. */
const SHIELD='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHBhdGggZD0iTTMyIDMgNTYgMTB2MjBjMCAxNC0xMCAyNC0yNCAzMUMxOCA1NCA4IDQ0IDggMzBWMTBMMzIgM1oiIGZpbGw9IiMwYjBmMGYiIHN0cm9rZT0iI2U1YjczYiIgc3Ryb2tlLXdpZHRoPSIzIi8+PHBhdGggZD0iTTE4IDQyVjI0aDZ2LThoN3Y4aDR2LThoN3Y4aDZ2MThIMThabTctNWgxNHYtN0gyNXY3WiIgZmlsbD0iI2U1YjczYiIvPjwvc3ZnPg=='

const originalTileLayer=L.tileLayer.bind(L)
L.tileLayer=function(url,options={}){
  if(String(url).includes('openstreetmap.org')){
    return originalTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{...options,attribution:'© Esri, Maxar, Earthstar Geographics'})
  }
  return originalTileLayer(url,options)
}

const originalCircle=L.circleMarker.bind(L)
L.circleMarker=function(latlng,options={}){
  const ring=options.color||'#ffffff'
  const icon=L.divIcon({className:'hradnik-shield-marker',html:`<span class="hradnik-marker-ring" style="border-color:${ring}"><img src="${SHIELD}" alt=""></span>`,iconSize:[34,34],iconAnchor:[17,17]})
  return L.marker(latlng,{icon,keyboard:true})
}

let booted=false
function setupReferenceMode(){
  const app=document.querySelector('#app')
  if(!app || app.querySelector('.auth') || !app.querySelector('#nav')) return
  const nav=app.querySelector('#nav')
  const buttons=[...nav.querySelectorAll('button')]
  if(buttons.length<6) return
  const ordered=[buttons[2],buttons[1],buttons[3],buttons[4],buttons[5],buttons[0]]
  const labels=['Mapa','Seznam','Oblíbené','Vyhledávání','Kategorie','O aplikaci']
  const icons=['map','list','favorites','search','grid','info']
  if(nav.dataset.referenceReady!=='1'){
    ordered.forEach((b,i)=>{
      b.textContent=labels[i]
      b.setAttribute('aria-label',labels[i])
      let img=b.querySelector('img[data-reference-icon]')
      if(!img){img=document.createElement('img');img.dataset.referenceIcon='1';img.alt='';img.setAttribute('aria-hidden','true');b.prepend(img)}
      img.src=`/icons/${icons[i]}.svg`
      nav.appendChild(b)
    })
    nav.dataset.referenceReady='1'
  }
  const active=ordered.find(b=>b.classList.contains('active'))
  ordered.forEach(b=>b.classList.toggle('reference-active',b===active))
  if(!booted){booted=true;setTimeout(()=>{if(!document.querySelector('#map'))ordered[0].click()},80)}
}
const observer=new MutationObserver(()=>queueMicrotask(setupReferenceMode))
const start=()=>{const app=document.querySelector('#app');if(app){observer.observe(app,{childList:true,subtree:true});setupReferenceMode()}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
