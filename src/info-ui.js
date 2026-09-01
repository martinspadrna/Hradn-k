import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL='https://cgshssdjgzzuprlwnabl.supabase.co'
const SUPABASE_KEY='sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_'
const db=createClient(SUPABASE_URL,SUPABASE_KEY)
const cache=new Map()
const inflight=new WeakSet()
const enriched=new WeakSet()
const esc=(value='')=>String(value).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]))
const normalize=(value='')=>String(value).toLocaleLowerCase('cs-CZ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()

async function loadInfo(name){
  const key=normalize(name)
  if(!key)return null
  if(cache.has(key))return cache.get(key)
  let row=null
  const exact=await db.from('hradnik_places').select('id,name,info_summary,info_source,info_source_url,info_updated_at,info_confidence').eq('is_visible',true).eq('is_current',true).eq('name',name).maybeSingle()
  if(!exact.error&&exact.data)row=exact.data
  if(!row){const fallback=await db.from('hradnik_places').select('id,name,info_summary,info_source,info_source_url,info_updated_at,info_confidence').eq('is_visible',true).eq('is_current',true).eq('normalized_name',key).limit(1).maybeSingle();if(!fallback.error)row=fallback.data||null}
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
    const row=await loadInfo(title)
    if(!sheet.isConnected)return
    const cards=[...grid.querySelectorAll('.card')]
    const basic=cards.find(c=>/Základní informace/i.test(c.querySelector('h3')?.textContent||''))||cards[0]
    if(!basic)return
    let p=basic.querySelector('p')
    if(!p){p=document.createElement('p');basic.appendChild(p)}
    if(row?.info_summary){
      if(p.textContent!==row.info_summary)p.textContent=row.info_summary
      let meta=basic.querySelector('.infoMeta')
      if(!meta){meta=document.createElement('small');meta.className='infoMeta';basic.appendChild(meta)}
      const source=row.info_source_url?`<a href="${esc(row.info_source_url)}" target="_blank" rel="noreferrer">${esc(row.info_source||'Zdroj')}</a>`:esc(row.info_source||'')
      const date=row.info_updated_at?new Date(row.info_updated_at).toLocaleDateString('cs-CZ'):''
      const nextMeta=`${source}${source&&date?' · ':''}${date?`ověřeno ${date}`:''}`
      if(meta.innerHTML!==nextMeta)meta.innerHTML=nextMeta
    }else if(!p.textContent?.trim()||/Popis zatím není ověřený/i.test(p.textContent)){
      const fallback='Informace se právě doplňují. Zatím nemáme ověřený podrobný popis této památky.'
      if(p.textContent!==fallback)p.textContent=fallback
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
