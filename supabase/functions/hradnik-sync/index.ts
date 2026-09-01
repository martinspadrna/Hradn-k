import { createClient } from 'npm:@supabase/supabase-js@2.112.4'

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const PAGES = [
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet.htm',
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet2.htm',
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet3.htm',
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet4.htm',
]

function clean(s: string) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180)
}
function hrefFrom(html: string) {
  const m = html.match(/href\s*=\s*["']([^"']+)["']/i)
  return m?.[1] || ''
}
function absolute(base: string, href: string) {
  try { return new URL(href, base).href } catch { return base }
}
function parseTableRows(t: string, u: string) {
  const rows: any[] = []
  for (const m of t.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: string[] = []
    const rawCells: string[] = []
    for (const c of m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
      rawCells.push(c[1])
      cells.push(clean(c[1]))
    }
    if (cells.length < 3) continue
    const num = Number(cells[0].replace(/[^0-9]/g, ''))
    if (!Number.isFinite(num) || num < 1 || num > 5000) continue
    const name = cells.find((x, i) => i > 0 && x.length >= 2 && x.length <= 150) || ''
    const nameIdx = cells.indexOf(name)
    const character = cells[nameIdx + 1] || ''
    const district = cells[nameIdx + 2] || ''
    const region = cells[nameIdx + 3] || ''
    if (!name || !character) continue
    if (!/(hrad|zámek|zřícen|tvrz|klášter|komenda|opevně|bašta|věž|palác)/i.test(character)) continue
    const nameHtml = rawCells[nameIdx] || ''
    const href = absolute(u, hrefFrom(nameHtml))
    rows.push({
      source_key: 'hrady_zriceniny',
      external_id: slug(name + '-' + district),
      name,
      kind: classifyKind(character),
      character,
      district,
      region,
      source_url: href || u,
      is_visible: true,
      is_current: true,
    })
  }
  return rows
}
function parseFallbackLines(t: string, u: string) {
  const lines = t.split(/\r?\n/).map(clean).filter(Boolean)
  const rows: any[] = []
  for (let i = 0; i < lines.length - 3; i++) {
    const m = lines[i].match(/^(\d+)\s+(.+)$/)
    if (!m) continue
    const n = +m[1]
    const name = m[2].trim()
    const character = lines[i + 1] || ''
    const district = lines[i + 2] || ''
    const region = lines[i + 3] || ''
    if (n < 1 || n > 5000 || name.length < 2 || name.length > 150) continue
    if (!/(hrad|zámek|zřícen|tvrz|klášter|komenda|opevně|bašta|věž|palác)/i.test(character)) continue
    rows.push({ source_key:'hrady_zriceniny', external_id:slug(name+'-'+district), name, kind:classifyKind(character), character, district, region, source_url:u, is_visible:true, is_current:true })
  }
  return rows
}
function classifyKind(c: string) {
  const s = c.toLowerCase()
  if (s.includes('zřícen')) return 'Zřícenina'
  if (s.includes('tvrz')) return 'Tvrz'
  if (s.includes('klášter') || s.includes('komenda')) return 'Klášter'
  if (s.includes('zámek')) return 'Zámek'
  if (s.includes('opevně') || s.includes('bašta') || s.includes('věž')) return 'Opevněné místo'
  return 'Hrad'
}
async function fetchTimeout(url:string, init:RequestInit={}, ms=45000) {
  const c=new AbortController();const t=setTimeout(()=>c.abort(),ms)
  try { return await fetch(url,{...init,signal:c.signal}) } finally { clearTimeout(t) }
}
async function fetchPage(url:string) {
  const r=await fetchTimeout(url,{headers:{'User-Agent':'Hradnik/1.0'}})
  if(!r.ok)throw new Error(`source ${r.status}`)
  return r.text()
}
function parseHrady(t:string,u:string) {
  const table=parseTableRows(t,u)
  return table.length ? table : parseFallbackLines(t,u)
}
async function osm() {
  const q='[out:json][timeout:60];area["ISO3166-1"="CZ"]["admin_level"=2]->.cz;(nwr["historic"="castle"](area.cz);nwr["historic"="manor"](area.cz);nwr["historic"="fort"](area.cz);nwr["historic"="monastery"](area.cz);nwr["historic"="abbey"](area.cz);nwr["historic"="ruins"]["ruins"~"castle|fort|monastery|abbey|manor",i](area.cz););out center tags;'
  const r=await fetchTimeout('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Hradnik/1.0'},body:'data='+encodeURIComponent(q)},60000)
  if(!r.ok)throw new Error(`OSM ${r.status}`)
  const j=await r.json();const out:any[]=[]
  for(const e of j.elements||[]){
    const t=e.tags||{}
    if(t.abandoned||t.demolished||t.destroyed||t['disused:historic'])continue
    const name=t['name:cs']||t.name;if(!name)continue
    const h=String(t.historic||'').toLowerCase(),ru=String(t.ruins||'').toLowerCase()
    let k:string|null=null
    if(h==='ruins'&&/castle|fort|monastery|abbey|manor/.test(ru))k='Zřícenina'
    else if(h==='castle')k='Hrad'
    else if(h==='manor')k='Zámek'
    else if(h==='fort')k='Opevněné místo'
    else if(h==='monastery'||h==='abbey')k='Klášter'
    if(!k)continue
    const lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;if(lat==null||lon==null)continue
    out.push({source_key:'osm',external_id:`${e.type}-${e.id}`,osm_id:`${e.type}-${e.id}`,wikidata_id:t.wikidata||'',name,kind:k,character:h,municipality:t['addr:city']||t['addr:place']||'',latitude:lat,longitude:lon,description:t['description:cs']||t.description||'',official_url:t.website||t['contact:website']||'',source_url:`https://www.openstreetmap.org/${e.type}/${e.id}`,is_visible:true,is_current:true})
  }
  return out
}
async function wikidata() {
  const q=`SELECT DISTINCT ?item ?itemLabel ?coord ?image ?website ?classLabel WHERE {
    VALUES ?class { wd:Q23413 wd:Q16560 wd:Q27686 wd:Q2977 wd:Q16870173 wd:Q57821 }
    ?item wdt:P31/wdt:P279* ?class ; wdt:P17 wd:Q213 ; wdt:P625 ?coord .
    OPTIONAL{?item wdt:P18 ?image} OPTIONAL{?item wdt:P856 ?website}
    SERVICE wikibase:label { bd:serviceParam wikibase:language "cs,en". }
  } LIMIT 10000`
  const r=await fetchTimeout('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q),{headers:{Accept:'application/sparql-results+json','User-Agent':'Hradnik/1.0'}},30000)
  if(!r.ok)throw new Error(`Wikidata ${r.status}`)
  const j=await r.json();const out:any[]=[]
  for(const x of j.results?.bindings||[]){
    const id=x.item?.value?.split('/').pop(),name=x.itemLabel?.value,coord=x.coord?.value?.match(/Point\(([-0-9.]+) ([-0-9.]+)\)/)
    if(!id||!name||!coord)continue
    out.push({source_key:'wikidata',external_id:id,wikidata_id:id,name,kind:classifyWikidataKind(x.classLabel?.value||''),character:x.classLabel?.value||'historické místo',latitude:+coord[2],longitude:+coord[1],official_url:x.website?.value||'',photo_urls:x.image?.value?[x.image.value]:[],source_url:`https://www.wikidata.org/wiki/${id}`,is_visible:true,is_current:true})
  }
  return out
}
function classifyWikidataKind(label:string){const s=label.toLowerCase();if(/ruin|zřícen/.test(s))return'Zřícenina';if(/manor|chateau|palace|zámek/.test(s))return'Zámek';if(/fort|tvrz/.test(s))return'Tvrz';if(/monastery|abbey|klášter/.test(s))return'Klášter';return'Hrad'}
async function ingest(rows:any[]) {
  let inserted=0,updated=0,linked=0,errors=0
  for(let i=0;i<rows.length;i+=250){
    const {data,error}=await db.rpc('hradnik_ingest_source_records',{p_records:rows.slice(i,i+250)})
    if(error){errors++;console.error(error)}else{inserted+=Number(data?.inserted||0);updated+=Number(data?.updated||0);linked+=Number(data?.linked||0)}
  }
  return {inserted,updated,linked,errors}
}

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('POST only',{status:405})
  const {data:control}=await db.from('hradnik_sync_control').select('sync_key').eq('id',true).maybeSingle()
  if(!control?.sync_key||req.headers.get('x-hradnik-sync-key')!==control.sync_key)return new Response('Unauthorized',{status:401})
  const run=(await db.from('hradnik_sync_runs').insert({status:'running',sources:[...PAGES,'osm:overpass','wikidata:sparql']}).select('id').single()).data
  let rows:any[]=[],errors=0;const result:any={}
  const pageResults=await Promise.allSettled(PAGES.map(async p=>parseHrady(await fetchPage(p),p)))
  pageResults.forEach((x,i)=>{if(x.status==='fulfilled'){rows.push(...x.value);result[`hrady_${i+1}`]=x.value.length}else{errors++;result[`hrady_${i+1}`]='error';console.error(x.reason)}})
  try{const x=await osm();rows.push(...x);result.osm=x.length}catch(e){errors++;result.osm='error';console.error(e)}
  try{const x=await wikidata();rows.push(...x);result.wikidata=x.length}catch(e){errors++;result.wikidata='error';console.error(e)}
  const uniq=new Map<string,any>();for(const r of rows)uniq.set(r.source_key+'|'+r.external_id,r)
  const ing=await ingest([...uniq.values()]);errors+=ing.errors
  await db.from('hradnik_sources').update({last_success_at:new Date().toISOString(),last_error:errors?`partial ${errors}`:null,updated_at:new Date().toISOString()}).in('source_key',['hrady_zriceniny','osm','wikidata'])
  if(run?.id)await db.from('hradnik_sync_runs').update({finished_at:new Date().toISOString(),status:errors?'partial':'success',discovered:uniq.size,inserted_count:ing.inserted,updated_count:ing.updated,error_count:errors,sources:result,message:`Canonical sync: ${uniq.size} source records; linked=${ing.linked}.`}).eq('id',run.id)
  return Response.json({ok:true,discovered:uniq.size,sourceResults:result,...ing,errors})
})
