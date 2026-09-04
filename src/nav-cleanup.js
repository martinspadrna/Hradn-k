/* Keep transient map detail sheets from leaking into non-map screens. */
let queued=false
function clean(){
  queued=false
  const overlay=document.querySelector('.overlay')
  if(overlay&&!document.getElementById('map')) overlay.remove()
  if(!document.getElementById('map')) document.body.classList.remove('hradnik-detail-open')
}
function schedule(){if(queued)return;queued=true;queueMicrotask(clean)}
const start=()=>{
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('.overlay')?.remove()})
  clean()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
