/* Make the account drawer visually consistent with Hradník's gold line-icon system. */
const MENU_ICON={account:'/icons/menu-account.svg',settings:'/icons/menu-settings.svg',mapsettings:'/icons/map.svg',help:'/icons/menu-help.svg',about:'/icons/menu-info.svg',logout:'/icons/menu-logout.svg'}
const polishMenu=()=>{
  const drawer=document.querySelector('.redesign-drawer')
  if(!drawer)return
  const brand=drawer.querySelector('.redesign-drawer-brand')
  if(brand&&!brand.dataset.polished){brand.dataset.polished='1';brand.innerHTML='<img src="/hradnik-logo.svg" alt="Hradník">'}
  const user=drawer.querySelector('.redesign-menu-user')
  if(user&&!user.querySelector('.redesign-user-icon')){
    const name=user.querySelector('b')?.textContent?.trim()||'Uživatel'
    const sub=user.querySelector('small')?.textContent?.trim()||'Váš Hradník účet'
    user.innerHTML='<div class="redesign-user-icon"><img src="/icons/menu-account.svg" alt=""></div><div class="redesign-user-copy"><b></b><small></small></div>'
    user.querySelector('b').textContent=name
    user.querySelector('small').textContent=sub
  }
  drawer.querySelectorAll('[data-menu]').forEach(item=>{
    const key=item.dataset.menu
    const icon=item.querySelector('.redesign-menu-icon')
    if(icon&&MENU_ICON[key]&&!icon.dataset.polished){icon.dataset.polished='1';icon.innerHTML=`<img src="${MENU_ICON[key]}" alt="">`}
  })
}
const observer=new MutationObserver(polishMenu)
const start=()=>{observer.observe(document.body,{childList:true,subtree:true});polishMenu()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
