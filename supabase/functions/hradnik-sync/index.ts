import { createClient } from '@supabase/supabase-js'

const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(url, serviceKey, { auth: { persistSession: false } })

const pages = [
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet.htm',
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet2.htm',
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet3.htm',
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet4.htm',
]

const clean = (s:string) => s.replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()
const keep = (s:string) => {
  const x=s.toLowerCase()
  if(x.includes('terénní pozůstat')||x.includes('domněl')||x.includes('možn')) return false
  if(x.includes('zaniklý')&&!x.includes('zámek')) return false
  if(x.includes('pozůstatky po')&&!x.includes('zřícen')) return false
  return /(hrad|zámek|zřícen|tvrz|klášter|komenda|opevně|bašta|věž|palác)/i.test(x)
}
const kind=(s:string) => {
  const x=s.toLowerCase()
  if(x.includes('zřícen')) return 'Zřícenina'
  if(x.includes('tvrz')) return 'Tvrz'
  if(x.includes('klášter')||x.includes('komenda')) return 'Klášter'
  if(x.includes('zámek')) return 'Zámek'
  if(x.includes('opevně')||x.includes('bašta')||x.includes('věž')) return 'Opevněné místo'
  return 'Hrad'
}
const key=(name:string,district:string) => `${name}|${district}`.toLocaleLowerCase('cs-CZ')

async function fetchSource(page:string){
  const r=await fetch(`https://r.jina.ai/http://${page.replace(/^https?:\/\//,'')}`)
  if(!r.ok) throw new Error(`${page}: HTTP ${r.status}`)
  return await r.text()
}
function parse(text:string,page:string){
  const lines=text.split(/\r?\n/).map(clean).filter(Boolean), out:any[]=[]
  for(let i=0;i<lines.length-3;i++){
    const m=lines[i].match(/^(\d+)\s+(.+)$/); if(!m) continue
    const nameLine=m[2], ch=lines[i+1]||'', district=lines[i+2]||'', region=lines[i+3]||''
    if(!keep(ch)) continue
    const link=nameLine.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)/)
    const name=link?link[1]:nameLine
    if(name.length<2||name.length>150) continue
    out.push({source_key:'hrady_zriceniny',external_id:m[1]+'-'+name,dedup:key(name,district),name,kind:kind(ch),character:ch,district,region,source_url:link?link[2]:page,is_visible:true,is_current:true})
  }
  return out
}

Deno.serve(async req=>{
  if(req.method!=='POST') return new Response('POST only',{status:405})
  const secret=req.headers.get('x-hradnik-sync-secret')
  const {data:control}=await db.from('hradnik_sync_control').select('sync_key').eq('id',true).maybeSingle()
  if(!control?.sync_key||secret!==control.sync_key) return new Response('Unauthorized',{status:401})

  const run=(await db.from('hradnik_sync_runs').insert({status:'running',sources:pages}).select('id').maybeSingle()).data
  const all:any[]=[]; let errors=0
  for(const page of pages){ try { all.push(...parse(await fetchSource(page),page)) } catch(e){ errors++; console.error(String(e)) } }
  const uniq=new Map<string,any>(); for(const p of all) if(!uniq.has(p.dedup)) uniq.set(p.dedup,p)
  let upserted=0
  for(const p of uniq.values()){
    const {error}=await db.from('hradnik_places').upsert({...p,source_url:p.source_url,updated_at:new Date().toISOString(),source_updated_at:new Date().toISOString()},{onConflict:'source_key,external_id'})
    if(error){errors++;console.error(error)} else upserted++
  }
  await db.from('hradnik_sync_runs').update({finished_at:new Date().toISOString(),status:errors?'partial':'success',discovered:uniq.size,updated_count:upserted,error_count:errors}).eq('id',run?.id||-1)
  return Response.json({ok:true,discovered:uniq.size,upserted,errors})
})
