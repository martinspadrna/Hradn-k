/* Keeps the existing detail behavior, but makes its presentation state explicit. */
const syncDetailState=()=>{
  const open=!!document.querySelector('.overlay .sheet')
  document.body.classList.toggle('hradnik-detail-open',open)
}
const observer=new MutationObserver(syncDetailState)
const start=()=>{observer.observe(document.body,{childList:true,subtree:true});syncDetailState()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()

/* The visual redesign adds a capture-phase router to the same nav buttons.
   Calling the underlying button's onclick directly avoids recursive routing. */
const installNavRouteGuard=()=>{
  const nav=document.querySelector('.redesign-nav')
  if(!nav||nav.dataset.routeGuardInstalled==='1')return
  nav.dataset.routeGuardInstalled='1'
  const route=[2,1,3,1,4,5]
  window.addEventListener('click',e=>{
    const button=e.target?.closest?.('.redesign-nav button')
    if(!button||!nav.contains(button))return
    const buttons=[...nav.querySelectorAll('button')]
    const i=buttons.indexOf(button)
    if(i<0)return
    const target=buttons[route[i]]||button
    e.preventDefault()
    e.stopImmediatePropagation()
    if(typeof target.onclick==='function')target.onclick.call(target,e)
    if(i===3)setTimeout(()=>document.querySelector('#search')?.focus(),80)
  },true)
}
const routeGuardObserver=new MutationObserver(installNavRouteGuard)
const startRouteGuard=()=>{installNavRouteGuard();routeGuardObserver.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startRouteGuard,{once:true});else startRouteGuard()
