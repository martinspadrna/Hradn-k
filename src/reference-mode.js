/* Hradník reference mode: the supplied design is the map-first desktop/mobile home. */
let booted=false
function setupReferenceMode(){
  const app=document.querySelector('#app');
  if(!app || app.querySelector('.auth') || !app.querySelector('#nav')) return;
  const nav=app.querySelector('#nav');
  const buttons=[...nav.querySelectorAll('button')];
  if(buttons.length<6) return;
  const ordered=[buttons[2],buttons[1],buttons[3],buttons[4],buttons[5],buttons[0]];
  const labels=['Mapa','Seznam','Oblíbené','Vyhledávání','Kategorie','O aplikaci'];
  const icons=['map','list','favorites','search','grid','info'];
  if(nav.dataset.referenceReady!=='1'){
    ordered.forEach((b,i)=>{
      b.textContent=labels[i];
      b.setAttribute('aria-label',labels[i]);
      let img=b.querySelector('img[data-reference-icon]');
      if(!img){img=document.createElement('img');img.dataset.referenceIcon='1';img.alt='';img.setAttribute('aria-hidden','true');b.prepend(img)}
      img.src=`/icons/${icons[i]}.svg`;
      nav.appendChild(b);
    });
    nav.dataset.referenceReady='1';
  }
  const active=ordered.find(b=>b.classList.contains('active'));
  ordered.forEach(b=>b.classList.toggle('reference-active',b===active));
  if(!booted){
    booted=true;
    setTimeout(()=>{if(!document.querySelector('#map')) ordered[0].click()},80);
  }
}
const observer=new MutationObserver(()=>queueMicrotask(setupReferenceMode));
const start=()=>{const app=document.querySelector('#app');if(app){observer.observe(app,{childList:true,subtree:true});setupReferenceMode()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
