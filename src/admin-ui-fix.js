function installAdminUiFix(){
  if(document.getElementById('hradnik-admin-ui-fix')) return
  const style=document.createElement('style')
  style.id='hradnik-admin-ui-fix'
  style.textContent=`
    .hradnik-admin-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;column-gap:12px!important;position:relative!important;overflow:visible!important;isolation:isolate!important}
    .hradnik-admin-row-main{min-width:0!important;overflow:hidden!important}
    .hradnik-admin-row-actions{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;min-width:max-content!important;width:max-content!important;flex:0 0 auto!important;position:relative!important;z-index:100!important;opacity:1!important;visibility:visible!important}
    .hradnik-admin-row-actions button{display:inline-flex!important;align-items:center!important;justify-content:center!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:101!important;width:auto!important;min-width:46px!important;height:42px!important;min-height:42px!important;padding:8px 11px!important;border:1px solid #d5d9e2!important;border-radius:11px!important;background:#eef1f6!important;color:#18212c!important;font-size:17px!important;font-weight:900!important;line-height:1!important;box-shadow:0 1px 3px rgba(0,0,0,.08)!important}
    .hradnik-admin-row-actions button.edit{background:#eeeaff!important;border-color:#cfc4ff!important;color:#4e38b5!important}
    .hradnik-admin-row-actions button.delete{background:#fff0f0!important;border-color:#f0c5c5!important;color:#b42318!important}
    .hradnik-admin-row-actions button.restore{background:#ecf8f1!important;border-color:#c5e6d2!important;color:#18794e!important}
    .hradnik-admin-row-actions button::after{font-size:11px;font-weight:850;margin-left:5px;letter-spacing:.01em}
    .hradnik-admin-row-actions button.edit::after{content:'Upravit'}
    .hradnik-admin-row-actions button.delete::after{content:'Odebrat'}
    .hradnik-admin-row-actions button.restore::after{content:'Obnovit'}
    .hradnik-admin-card{position:relative!important;z-index:1!important;overflow:visible!important}
    .hradnik-admin-list{position:relative!important;z-index:2!important;overflow:visible!important}
    @media(max-width:900px){
      .hradnik-admin-row{grid-template-columns:minmax(0,1fr) auto!important}
      .hradnik-admin-row-actions button::after{display:none!important}
    }
    @media(max-width:520px){
      .hradnik-admin-row-actions{gap:5px!important}
      .hradnik-admin-row-actions button{min-width:42px!important;width:42px!important;height:42px!important;padding:8px 0!important;font-size:18px!important}
    }
  `
  document.head.appendChild(style)
}

function cleanMalformedAdminRows(){
  document.querySelectorAll('.hradnik-admin-row').forEach(row=>{
    if((row.textContent||'').includes('�')) row.remove()
    row.querySelectorAll('.hradnik-admin-row-actions button').forEach(button=>{
      button.style.display='inline-flex'
      button.style.visibility='visible'
      button.style.opacity='1'
      button.style.position='relative'
      button.style.zIndex='200'
    })
  })
}

installAdminUiFix()
const adminUiObserver=new MutationObserver(()=>cleanMalformedAdminRows())
adminUiObserver.observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('DOMContentLoaded',cleanMalformedAdminRows)
setTimeout(cleanMalformedAdminRows,300)
setTimeout(cleanMalformedAdminRows,1000)
