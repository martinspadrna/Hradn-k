/* Reference entry point: desktop/mobile open on the Mapa screen shown in the supplied mockup. */
let started=false
function startReference(){
  if(started)return
  const nav=document.querySelector('.redesign-sidebar .nav')
  const first=nav?.querySelector('button')
  if(!nav||!first)return
  started=true
  if(!document.querySelector('#map')){
    setTimeout(()=>first.click(),0)
  }
}
const observer=new MutationObserver(startReference)
const boot=()=>{observer.observe(document.body,{childList:true,subtree:true});startReference()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()
