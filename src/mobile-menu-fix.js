/* Mobile uses the existing left hamburger. It opens the same drawer as the former top trigger. */
const bindMobileMenuFix=()=>{
  const mobile=document.querySelector('.mobileHeaderMenu')
  const account=document.querySelector('.redesign-menu-trigger')
  if(!mobile||!account||mobile.dataset.menuFixBound)return
  mobile.dataset.menuFixBound='1'
  account.classList.add('mobile-menu-trigger-proxy')
  mobile.addEventListener('click',e=>{
    e.preventDefault()
    e.stopImmediatePropagation()
    account.click()
  },{capture:true})
}
const installMobileMenuStyles=()=>{
  if(document.getElementById('mobile-menu-fix-styles'))return
  const style=document.createElement('style')
  style.id='mobile-menu-fix-styles'
  style.textContent='@media(max-width:700px){.redesign-menu-trigger.mobile-menu-trigger-proxy{display:none!important}}'
  document.head.appendChild(style)
}
const observer=new MutationObserver(bindMobileMenuFix)
const start=()=>{
  installMobileMenuStyles()
  observer.observe(document.body,{childList:true,subtree:true})
  bindMobileMenuFix()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
