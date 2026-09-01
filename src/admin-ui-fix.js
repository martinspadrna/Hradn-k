function installAdminUiFix(){
  if(document.getElementById('hradnik-admin-ui-fix')) return
  const style=document.createElement('style')
  style.id='hradnik-admin-ui-fix'
  style.textContent=`
    .hradnik-admin-row-actions{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;flex-shrink:0!important}
    .hradnik-admin-row-actions button{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:46px!important;min-height:42px!important;padding:8px 11px!important;border:1px solid #d5d9e2!important;border-radius:11px!important;background:#eef1f6!important;color:#18212c!important;font-size:17px!important;font-weight:900!important;line-height:1!important;opacity:1!important;visibility:visible!important}
    .hradnik-admin-row-actions button.edit{background:#eeeaff!important;border-color:#cfc4ff!important;color:#4e38b5!important}
    .hradnik-admin-row-actions button.delete{background:#fff0f0!important;border-color:#f0c5c5!important;color:#b42318!important}
    .hradnik-admin-row-actions button.restore{background:#ecf8f1!important;border-color:#c5e6d2!important;color:#18794e!important}
    .hradnik-admin-row-actions button:hover{transform:translateY(-1px)!important;filter:none!important}
    .hradnik-admin-row-actions button::after{font-size:11px;font-weight:800;margin-left:5px;letter-spacing:.01em}
    .hradnik-admin-row-actions button.edit::after{content:'Upravit'}
    .hradnik-admin-row-actions button.delete::after{content:'Odebrat'}
    .hradnik-admin-row-actions button.restore::after{content:'Obnovit'}
    @media(max-width:520px){
      .hradnik-admin-row-actions{gap:5px!important;flex-direction:row!important}
      .hradnik-admin-row-actions button{min-width:42px!important;width:42px!important;padding:8px 0!important;font-size:18px!important}
      .hradnik-admin-row-actions button::after{display:none!important}
    }
  `
  document.head.appendChild(style)
}

installAdminUiFix()
new MutationObserver(installAdminUiFix).observe(document.documentElement,{childList:true,subtree:true})
