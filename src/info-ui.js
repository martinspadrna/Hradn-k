import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL='https://cgshssdjgzzuprlwnabl.supabase.co'
const SUPABASE_KEY='sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_'
const db=createClient(SUPABASE_URL,SUPABASE_KEY)
const cache=new Map()
const inflight=new WeakSet()
const enriched=new WeakSet()
const esc=(value='')=>String(value).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
const normalize=(value='')=>String(value).toLocaleLowerCase('cs-CZ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()

function statusMeta(row){
  const confidence=Number(row?.info_confidence||0)
  const source=String(row?.info_source||'')
  if(source.startsWith('NPÚ')||source.includes('Wikipedie')||source==='Hrady.cz'||source==='Hrady-zříceniny.cz'||confidence>=0.9){
    return {label:'🟢 Ověřený popis',className:'verified',help:'Informace pochází z dohledaného externího zdroje.'}
  }
  if(confidence>=0.65){
    return {label:'🟡 Částečně ověřený',className:'partial',help:'Hradník našel zdrojové informace, ale jistota je nižší.'}
  }
  return {label:'⚪ Automatický základ',className:'fallback',help:'Zatím nebyl nalezen dostatečný externí popis. Hradník jej bude zkoušet dohledat znovu.'}
}

function ensureInfoStyle(){
  if(document.getElementById('hradnik-info-status-style'))return
  const style=document.createElement('style')
  style.id='hradnik-info-status-style'
  style.textContent=`
    .infoMeta{display:grid;gap:5px;margin-top:10px;font-size:11px;line-height:1.35}
    .infoStatusBadge{display:inline-flex;align-items:center;width:max-content;padding:4px 8px;border-radius:999px;font-weight:800;letter-spacing:.01em}
    .infoStatusBadge.verified{background:#e6f7ee;color:#17663f}.infoStatusBadge.partial{background:#fff4db;color:#7a5b13}.infoStatusBadge.fallback{background:#eef1f5;color:#687383}
    .infoSource{color:#737b8b}.infoSource a{font-weight:700;text-decoration:none}.infoSource a:hover{text-decoration:underline}
  `
  document.head.appendChild(style)
}

async function loadInfo(name){
  const key=normalize(name)
  if(!key)return null
  if(cache.has(key))return cache.get(key)
  let row=null
  const exact=await db.from('hradnik_places').select('id,name,info_summary,info_source,info_source_url,info_updated_at,info_confidence,info_status').eq('is_visible',true).eq('is_current',true).eq('name',name).maybeSingle()
  if(!exact.error&&exact.data)row=exact.data
  if(!row){
    const fallback=await db.from('hradnik_places').select('id,name,info_summary,info_source,info_source_url,info_updated_at,info_confidence,info_status').eq('is_visible',true).eq('is_current',true).eq('normalized_name',key).limit(1).maybeSingle()
    if(!fallback.error)row=fallback.data||null
  }
  cache.set(key,row)
  return row
}

async function enrichSheet(sheet){
  if(!sheet?.isConnected||inflight.has(sheet)||enriched.has(sheet))return
  const title=sheet.querySelector('h1')?.textContent?.trim()
  const grid=sheet.querySelector('.detailGrid')
  if(!title||!grid)return

  inflight.add(sheet)
  try{
    ensureInfoStyle()
    const row=await loadInfo(title)
    if(!sheet.isConnected)return
    const cards=[...grid.querySelectorAll('.card')]
    const basic=cards.find(c=>/Základní informace/i.test(c.querySelector('h3')?.textContent||''))||cards[0]
    if(!basic)return
    let p=basic.querySelector('p')
    if(!p){p=document.createElement('p');basic.appendChild(p)}
    let meta=basic.querySelector('.infoMeta')
    if(!meta){meta=document.createElement('div');meta.className='infoMeta';basic.appendChild(meta)}
    if(row?.info_summary){
      if(p.textContent!==row.info_summary)p.textContent=row.info_summary
      const status=statusMeta(row)
      const badge=`<span class="infoStatusBadge ${status.className}" title="${esc(status.help)}">${esc(status.label)}</span>`
      const source=row.info_source_url?`<a href="${esc(row.info_source_url)}" target="_blank" rel="noreferrer">${esc(row.info_source||'Zdroj')}</a>`:esc(row.info_source||'')
      const date=row.info_updated_at?new Date(row.info_updated_at).toLocaleDateString('cs-CZ'):''
      const sourceLine=`${source}${source&&date?' · ':''}${date?`ověřeno ${date}`:''}`
      const nextMeta=`${badge}${sourceLine?`<span class="infoSource">${sourceLine}</span>`:''}`
      if(meta.innerHTML!==nextMeta)meta.innerHTML=nextMeta
    }else{
      const fallback='Informace se právě doplňují. Zatím nemáme ověřený podrobný popis této památky.'
      if(p.textContent!==fallback)p.textContent=fallback
      const status=statusMeta({info_confidence:0,info_source:'Hradník – automatický základ'})
      meta.innerHTML=`<span class="infoStatusBadge ${status.className}">${esc(status.label)}</span><span class="infoSource">Hradník bude zkoušet dohledat lepší zdroj.</span>`
    }
    sheet.dataset.infoEnriched='1'
    enriched.add(sheet)
  }finally{
    inflight.delete(sheet)
  }
}

function scan(){
  document.querySelectorAll('.sheet').forEach(s=>{void enrichSheet(s)})
}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true})
window.addEventListener('DOMContentLoaded',scan)
setTimeout(scan,400)
setTimeout(scan,1000)
setTimeout(scan,2000)
