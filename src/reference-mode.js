/* Hradník reference mode: the supplied design is the map-first desktop/mobile home. */
let booted=false
function setupReferenceMode(){
  const app=document.querySelector('#app');
  if(!app || app.querySelector('.auth') || !app.querySelector('#nav')) return;
  const nav=app.querySelector('#nav');
  const buttons=[...nav.querySelectorAll('button')];
  if(buttons.length<6) return;
  const labels=['Mapa','Seznam','Oblíbené','Vyhledávání','Kategorie','O aplikaci'];
  const icons=['map','list','favorites','search','grid','info'];
  buttons.forEach((b,i)=>{
    b.dataset.referenceIndex=String(i);
    b.setAttribute('aria-label',labels[i]);
    const text=labels[i];
    b.textContent=text;
    let img=b.querySelector('img[data-reference-icon]');
    if(!img){img=document.createElement('img');img.dataset.referenceIcon='1';img.alt='';img.setAttribute('aria-hidden','true');b.prepend(img)}
    img.src=`/icons/${icons[i]}.svg`;
  });
  // Keep the existing application actions, but present them in the same order as the reference.
  const map=buttons[2],list=buttons[1],mine=buttons[3],diary=buttons[4],stats=buttons[5],home=buttons[0];
  const ordered=[map,list,mine,diary,stats,home];
  ordered.forEach(b=>nav.appendChild(b));
  if(!booted){
    booted=true;
    setTimeout(()=>{
      if(!app.querySelector('#map')) map.click();
    },40);
  }
  const active=buttons.find(b=>b.classList.contains('active'));
  buttons.forEach(b=>b.classList.remove('reference-active'));
  if(active) active.classList.add('reference-active');
}
const observer=new MutationObserver(()=>queueMicrotask(setupReferenceMode));
const start=()=>{const app=document.querySelector('#app');if(app){observer.observe(app,{childList:true,subtree:true});setupReferenceMode()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
