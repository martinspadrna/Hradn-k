const AUTH_URL='https://cgshssdjgzzuprlwnabl.supabase.co/functions/v1/hradnik-auth'
let user=null
let busy=false
let ensureQueued=false

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function token(){return localStorage.getItem('hradnik_session')||''}
async function api(action,body={},auth=token()){
  const headers={'Content-Type':'application/json'}
  if(auth)headers.Authorization=`Bearer ${auth}`
  const r=await fetch(AUTH_URL,{method:'POST',headers,body:JSON.stringify({action,...body})})
  const d=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(d.error||'Požadavek se nepodařilo dokončit.')
  return d
}
function addStyle(){if(document.getElementById('hradnik-account-style'))return;const s=document.createElement('style');s.id='hradnik-account-style';s.textContent=`
.reference-profile-button{display:grid!important;place-items:center!important}.reference-profile-button img{width:22px!important;height:22px!important}.reference-profile-button.logged-in{border-color:#6b5724!important;background:#2d281c!important}
.hradnik-profile-overlay{position:fixed;inset:0;z-index:14000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.74)}.hradnik-profile-card{width:min(440px,100%);box-sizing:border-box;border:1px solid #303a3f;border-radius:16px;background:#10161a;color:#f3f1eb;padding:22px;box-shadow:0 28px 80px rgba(0,0,0,.55)}.hradnik-profile-head{display:flex;align-items:center;gap:13px;margin-bottom:18px}.hradnik-profile-head img{width:42px;height:42px}.hradnik-profile-head h2{margin:0;font-size:22px}.hradnik-profile-close{margin-left:auto;width:36px;height:36px;border:1px solid #303a3f;border-radius:9px;background:#171d20;color:#eee;font-size:22px}.hradnik-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:16px}.hradnik-auth-tabs button{height:40px;border:1px solid #303a3f;border-radius:8px;background:#141b1f;color:#abb4b8;font-weight:800}.hradnik-auth-tabs button.active{border-color:#6d5825;background:#312a1c;color:#f0c44a}.hradnik-profile-form label{display:block;margin:12px 0 0;font-size:12px;font-weight:800}.hradnik-profile-form input{width:100%;height:44px;box-sizing:border-box;margin-top:6px;padding:0 12px;border:1px solid #303a3f;border-radius:9px;background:#0b1114;color:#f3f1eb}.hradnik-profile-submit,.hradnik-profile-logout{width:100%;height:44px;margin-top:16px;border:1px solid #6d5825;border-radius:9px;background:#312a1c;color:#f0c44a;font-weight:900}.hradnik-profile-error{min-height:18px;margin-top:10px;color:#e98585;font-size:12px}.hradnik-profile-user{padding:14px;border:1px solid #293238;border-radius:10px;background:#0d1418}.hradnik-profile-user b,.hradnik-profile-user small{display:block}.hradnik-profile-user small{margin-top:4px;color:#97a2a7}.reference-mobile-drawer [data-ref-mobile="profile"]{display:flex!important;align-items:center!important;gap:10px}.reference-mobile-drawer [data-ref-mobile="profile"] img{width:22px;height:22px}
`;document.head.appendChild(s)}
async function refreshUser(){if(!token()){user=null;syncButtons();return}try{const d=await api('session');user=d.user||null}catch{user=null;localStorage.removeItem('hradnik_session')}syncButtons()}
function syncButtons(){
  document.querySelectorAll('.reference-profile-button').forEach(b=>{b.classList.toggle('logged-in',!!user);b.title=user?`Profil: ${user.display_name||user.username}`:'Přihlásit se'})
  const label=user?`Profil · ${user.display_name||user.username}`:'Přihlásit se'
  document.querySelectorAll('[data-ref-mobile="profile"] span').forEach(s=>{if(s.textContent!==label)s.textContent=label})
}
function ensureButtons(){
  addStyle()
  const account=document.querySelector('#app header .account')
  if(account&&!account.querySelector('.reference-profile-button')){const b=document.createElement('button');b.type='button';b.className='reference-header-action reference-profile-button';b.setAttribute('aria-label','Profil');b.innerHTML='<img src="/icons/menu-account.svg" alt="">';b.onclick=()=>openProfile();account.prepend(b)}
  const panel=document.querySelector('.reference-mobile-drawer-panel')
  if(panel&&!panel.querySelector('[data-ref-mobile="profile"]')){const b=document.createElement('button');b.type='button';b.dataset.refMobile='profile';b.innerHTML='<img src="/icons/menu-account.svg" alt=""><span>Přihlásit se</span>';b.onclick=()=>{document.querySelector('.reference-mobile-drawer')?.classList.remove('open');openProfile()};panel.querySelector('.reference-mobile-drawer-head')?.after(b)}
  syncButtons()
}
function scheduleEnsure(){if(ensureQueued)return;ensureQueued=true;requestAnimationFrame(()=>{ensureQueued=false;ensureButtons()})}
function authForm(mode='login'){return `<div class="hradnik-auth-tabs"><button data-mode="login" class="${mode==='login'?'active':''}">Přihlášení</button><button data-mode="register" class="${mode==='register'?'active':''}">Registrace</button></div><form class="hradnik-profile-form"><label>Uživatelské jméno<input name="username" autocomplete="username" minlength="3" maxlength="32" required></label><label>Heslo<input name="password" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" minlength="8" required></label><button class="hradnik-profile-submit" type="submit">${mode==='login'?'Přihlásit se':'Vytvořit účet'}</button><div class="hradnik-profile-error"></div></form>`}
function openProfile(mode='login'){
  document.querySelector('.hradnik-profile-overlay')?.remove();const o=document.createElement('div');o.className='hradnik-profile-overlay';const card=document.createElement('div');card.className='hradnik-profile-card';o.appendChild(card);document.body.appendChild(o)
  const paint=(m=mode)=>{card.innerHTML=`<div class="hradnik-profile-head"><img src="/icons/menu-account.svg" alt=""><div><h2>${user?'Profil':'Účet Hradníku'}</h2></div><button class="hradnik-profile-close" aria-label="Zavřít">×</button></div>${user?`<div class="hradnik-profile-user"><b>${esc(user.display_name||user.username)}</b><small>@${esc(user.username)}</small></div><button class="hradnik-profile-logout">Odhlásit se</button>`:authForm(m)}`;card.querySelector('.hradnik-profile-close').onclick=()=>o.remove();if(user){card.querySelector('.hradnik-profile-logout').onclick=async()=>{if(busy)return;busy=true;try{await api('logout')}catch{}localStorage.removeItem('hradnik_session');location.reload()};return}card.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>paint(b.dataset.mode));card.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const form=e.currentTarget,err=form.querySelector('.hradnik-profile-error'),btn=form.querySelector('.hradnik-profile-submit'),data=new FormData(form);err.textContent='';btn.disabled=true;btn.textContent='Pracuji…';try{const d=await api(m,{username:String(data.get('username')||''),password:String(data.get('password')||'')},'');localStorage.setItem('hradnik_session',d.session.token);location.reload()}catch(x){err.textContent=x.message;btn.disabled=false;btn.textContent=m==='login'?'Přihlásit se':'Vytvořit účet';busy=false}}}
  paint(mode);o.onclick=e=>{if(e.target===o)o.remove()}
}
window.hradnikOpenProfile=openProfile
function start(){
  ensureButtons();refreshUser()
  const app=document.getElementById('app')
  if(app)new MutationObserver(scheduleEnsure).observe(app,{childList:true,subtree:true})
  ;[100,250,600,1400,3000].forEach(ms=>setTimeout(ensureButtons,ms))
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
