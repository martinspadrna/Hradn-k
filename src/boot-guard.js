const app=document.getElementById('app')
if(app&&!app.childElementCount){
  app.innerHTML='<div id="hradnik-boot-guard" role="status" aria-live="polite"><img src="/hradnik-app-icon.svg" alt=""><div>Hradník</div><small>Načítám mapu a památky…</small></div>'
}
const style=document.createElement('style')
style.id='hradnik-boot-guard-style'
style.textContent=`#hradnik-boot-guard{position:fixed;inset:0;z-index:2;display:grid;place-content:center;justify-items:center;gap:10px;background:#080b0e;color:#f2efe7;font:700 18px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#hradnik-boot-guard img{width:66px;height:66px}#hradnik-boot-guard small{color:#929ca1;font-size:12px;font-weight:600}`
document.head.appendChild(style)
setTimeout(()=>{
  const guard=document.getElementById('hradnik-boot-guard')
  if(!guard)return
  guard.querySelector('small').textContent='Načítání trvá déle. Zkuste aplikaci zavřít a znovu otevřít.'
},8000)
window.addEventListener('error',()=>{
  const guard=document.getElementById('hradnik-boot-guard')
  if(guard)guard.querySelector('small').textContent='Aplikaci se nepodařilo spustit. Klepněte sem pro nový pokus.'
},{once:true})
app?.addEventListener('click',e=>{if(e.target.closest('#hradnik-boot-guard')&&document.getElementById('hradnik-boot-guard')?.querySelector('small')?.textContent.includes('nepodařilo'))location.reload()})
