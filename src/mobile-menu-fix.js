/* Mobile uses the existing left hamburger. The redesign account-menu trigger must not create a second hamburger. */
const bindMobileMenuFix=()=>{
  const mobile=document.querySelector('.mobileHeaderMenu')
  const account=document.querySelector('.redesign-menu-trigger')
  if(!mobile||!account||mobile.dataset.menuFixBound)return
  mobile.dataset.menuFixBound='1'
  account.style.display='none'
  mobile.addEventListener('click',e=>{
    e.preventDefault()
    e.stopImmediatePropagation()
    account.click()
  },{capture:true})
}
const observer=new MutationObserver(bindMobileMenuFix)
const start=()=>{observer.observe(document.body,{childList:true,subtree:true});bindMobileMenuFix()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
