/* Keep map detail sheets from leaking into another screen without touching list details. */
function closeOverlay(){
  document.querySelector('.overlay')?.remove()
  document.body.classList.remove('hradnik-detail-open')
}
function isNavigationTarget(target){
  return !!target?.closest?.('.redesign-sidebar>.redesign-nav>button,.reference-mobile-drawer [data-ref-mobile],.reference-favorites-button,.mobileHeaderSearch,.globalSearchWrap')
}
function start(){
  document.addEventListener('click',e=>{
    if(!document.getElementById('map'))return
    if(!document.querySelector('.overlay'))return
    if(isNavigationTarget(e.target))closeOverlay()
  },true)
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOverlay()})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
