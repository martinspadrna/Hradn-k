/* Keeps the existing detail behavior, but makes its presentation state explicit. */
const syncDetailState=()=>{
  const open=!!document.querySelector('.overlay .sheet')
  document.body.classList.toggle('hradnik-detail-open',open)
}
const observer=new MutationObserver(syncDetailState)
const start=()=>{observer.observe(document.body,{childList:true,subtree:true});syncDetailState()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
