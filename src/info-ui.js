import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cgshssdjgzzuprlwnabl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_'
const db = createClient(SUPABASE_URL, SUPABASE_KEY)
const cache = new Map()

const esc = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const normalize = (value='') => String(value).toLocaleLowerCase('cs-CZ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()

async function loadInfo(name){
  const key=normalize(name)
  if(!key) return null
  if(cache.has(key)) return cache.get(key)
  const {data,error}=await db.from('hradnik_places')
    .select('name,info_summary,info_source,info_source_url,info_updated_at')
    .eq('is_visible',true).eq('is_current',true)
    .limit(1000)
  if(error){cache.set(key,null);return null}
  const row=(data||[]).find(x=>normalize(x.name)===key)
  cache.set(key,row||null)
  return row||null
}

async function enrichSheet(sheet){
  if(!sheet?.isConnected || sheet.querySelector('.infoSummaryCard')) return
  const title=sheet.querySelector('h1')?.textContent?.trim()
  if(!title) return
  const row=await loadInfo(title)
  if(!row?.info_summary || !sheet.isConnected) return
  if(sheet.querySelector('.infoSummaryCard')) return
  const grid=sheet.querySelector('.detailGrid')
  if(!grid) return
  const card=document.createElement('div')
  card.className='card infoSummaryCard'
  const source=row.info_source_url?`<a href="${esc(row.info_source_url)}" target="_blank" rel="noreferrer">${esc(row.info_source||'Zdroj')}</a>`:esc(row.info_source||'')
  const date=row.info_updated_at?new Date(row.info_updated_at).toLocaleDateString('cs-CZ'):''
  card.innerHTML=`<h3>📜 Co je to?</h3><p>${esc(row.info_summary)}</p>${source||date?`<small class="infoMeta">${source}${source&&date?' · ':''}${date?`ověřeno ${date}`:''}</small>`:''}`
  grid.parentNode.insertBefore(card,grid)
}

function scan(){document.querySelectorAll('.sheet').forEach(s=>{void enrichSheet(s)})}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true})
window.addEventListener('DOMContentLoaded',scan)
setTimeout(scan,700)
setTimeout(scan,1500)
